/**
 * AmneziaWG Architect — Core Generator public API.
 *
 * This module wires together types, constants, RNG utilities, profile
 * generators and validators to produce a complete AWG configuration.
 */

import type {
  AWGConfig,
  AWGVersion,
  GeneratorInput,
  Intensity,
  MimicProfile,
} from "./types";
import { PROFILE_LABELS } from "./constants";
import { clientCaps } from "./clients";
import {
  drawParams,
  ROUTER_S_MAX,
  S_MAX,
  S3_MAX,
  S3_MAX_EXTREME,
} from "./strategy";
import { paramsFor } from "./params";
import { rnd, rRange } from "./utils";
import {
  mkQUICi,
  mkQUIC0,
  mkHTTP3,
  mkTLS,
  mkNoise,
  mkDTLS12,
  mkSIP,
  mkDNS,
  mkEntropy,
} from "./profiles";
import { validateGeneratedConfig } from "./validators";
import { genAwg3, MIN_S_WITH_HEADER_PROTECTION } from "./awg3";
import { capsFor } from "./versions";
import {
  INIT_TO_RESPONSE,
  INIT_TO_COOKIE,
  RESPONSE_TO_COOKIE,
} from "../messageSizes";

export * from "./types";
export * from "./constants";
export * from "./utils";
export * from "./validators";
export * from "./clients";
export * from "./awg3";
export * from "./render";
export * from "./summary";

export { mkQUICi, mkQUIC0, mkHTTP3, mkTLS, mkNoise, mkDTLS12, mkSIP, mkDNS, mkEntropy };
/** @deprecated pre-4.2.0 name for mkDTLS12. */
export { mkDTLS12 as mkDTLS };

/**
 * Pre-4.2.0 id for the DTLS 1.2 profile. Old links, history entries and
 * stored inputs still carry it — normalize, don't break them.
 */
export const LEGACY_DTLS_PROFILE = "dtls" as const;

/** Map a stored or incoming profile id to a current one. Unknown ids pass through. */
export function normalizeProfile(profile: string): MimicProfile {
  if (profile === LEGACY_DTLS_PROFILE) return "dtls_1_2";
  return profile as MimicProfile;
}

/**
 * genI1 — выбирает и вызывает нужный генератор по профилю мимикрии.
 * При profile="random" — случайный выбор из всех профилей кроме random.
 */
export function genI1(
  input: GeneratorInput,
  profile: MimicProfile,
  iv: number,
): string {
  const id = normalizeProfile(profile);
  const dispatch: Record<string, (i: GeneratorInput, iv: number) => string> = {
    quic_initial: mkQUICi,
    quic_0rtt: mkQUIC0,
    tls_client_hello: mkTLS,
    wireguard_noise: mkNoise,
    dtls_1_2: mkDTLS12,
    dtls_1_3: mkDTLS12,
    http3: mkHTTP3,
    sip: mkSIP,
    dns_query: mkDNS,
    tls_to_quic: mkTLS,
    quic_burst: mkQUICi,
  };

  if (id === "random") {
    const keys = Object.keys(dispatch) as MimicProfile[];
    return genI1(input, keys[rnd(0, keys.length - 1)], iv);
  }

  const fn = dispatch[id] ?? dispatch.quic_initial;
  return fn(input, iv);
}

/**
 * Bring a value up to `floor` without collapsing onto it.
 *
 * `Math.max(value, floor)` was the obvious way to enforce the AWG 3.0 minimum
 * and the wrong one: S3 draws from 1–64 and S4 from 1–32, so most draws land
 * under 12 and clamping turns them all into exactly 12. A config with three
 * identical S values is a signature — the opposite of what padding is for.
 *
 * Redrawing from what is left of the range keeps the spread. Only when the
 * range has nothing above the floor does the floor itself remain.
 */
function liftAboveFloor(value: number, floor: number, high: number): number {
  if (value >= floor) return value;
  return high > floor ? rnd(floor, high) : floor;
}

/**
 * Step a size off a colliding length without leaving its range.
 *
 * Nudging up by one is the cheap way to break a collision, and it was the only
 * way this did it — so a value already sitting on its ceiling stepped over it.
 * S1 94 with S2 150 produced S2 151, past a cap the draw had honoured; the same
 * shape sent S3 to 65 out of a 1–64 range. Rare enough to look like a flaky
 * test rather than what it was: a config carrying a padding size the client
 * will not accept.
 *
 * At the ceiling the step goes down instead. The direction does not matter to
 * the rule — the collision is with one specific length, and either neighbour
 * misses it — and downwards never runs out of room, because the smallest
 * colliding value any of the three rules can produce is 29.
 */
export function avoidCollision(
  value: number,
  ceiling: number,
  collides: (v: number) => boolean,
): number {
  if (!collides(value)) return value;

  const step = value >= ceiling ? -1 : 1;
  let v = value + step;
  for (let attempts = 0; collides(v) && attempts < 10; attempts++) v += step;
  return v;
}


/* ── Constraints between parameters ───────────────────────────────────────── */

/** Padding sizes, after the rules that involve more than one of them. */
interface Sizes {
  s1: number;
  s2: number;
  s3: number;
  s4: number;
}

interface SizeRules {
  hasExtraSizes: boolean;
  /** AWG 3.0 header protection reads its nonce from the S-padding. */
  needsFloor: boolean;
  routerMode: boolean;
  extreme: boolean;
  maxS4: number;
}

/**
 * Apply the rules that no single parameter can satisfy alone.
 *
 * Two message types that end up the same length are one signal, and padding
 * exists precisely so they do not. There are three ways for that to happen —
 * `S2 = S1 + 56`, `S3 = S1 + 84`, `S3 = S2 + 28` — and the offsets are derived
 * from the message sizes rather than written out, because two of the three
 * used to be written out wrongly.
 *
 * The 3.0 floor comes last: header protection takes its ChaCha20 nonce from
 * the first twelve bytes of padding, so nothing after it may pull a size back
 * under twelve — including router mode, which otherwise caps at twenty.
 */
function resolveSizes(drawn: Sizes, rules: SizeRules): Sizes {
  let { s1, s2, s3, s4 } = drawn;

  // Router mode caps S1/S2 at 20; S3 draws high only in extreme mode.
  const sMax = rules.routerMode ? ROUTER_S_MAX : S_MAX;
  const s3Max = rules.extreme ? S3_MAX_EXTREME : S3_MAX;

  if (!rules.hasExtraSizes) {
    s3 = 0;
    s4 = 0;
  }

  // A collision is cheap to break: step by one and the lengths differ again.
  s2 = avoidCollision(s2, sMax, (v) => v === s1 + INIT_TO_RESPONSE);
  if (rules.hasExtraSizes) {
    s3 = avoidCollision(
      s3,
      s3Max,
      (v) => v === s1 + INIT_TO_COOKIE || v === s2 + RESPONSE_TO_COOKIE,
    );
    s4 = Math.min(s4, rules.maxS4);
  }

  if (rules.needsFloor) {
    const floor = MIN_S_WITH_HEADER_PROTECTION;
    // The redraw range narrows to 12–20 under router mode rather than
    // disappearing.
    s1 = liftAboveFloor(s1, floor, sMax);
    s2 = liftAboveFloor(s2, floor, sMax);
    s2 = avoidCollision(s2, sMax, (v) => v === s1 + INIT_TO_RESPONSE);

    if (rules.hasExtraSizes) {
      s3 = liftAboveFloor(s3, floor, s3Max);
      s4 = liftAboveFloor(s4, floor, rules.maxS4);
      s3 = avoidCollision(
        s3,
        s3Max,
        (v) => v === s1 + INIT_TO_COOKIE || v === s2 + RESPONSE_TO_COOKIE,
      );
      s4 = Math.min(s4, rules.maxS4);
    }
  }

  return { s1, s2, s3, s4 };
}

/** Junk packet sizes: Jmax has to leave Jmin room to vary underneath it. */
function resolveJmax(jmin: number, drawn: number, version: AWGVersion): number {
  let jmax = drawn;
  const floor = jmin + 64;
  if (jmax <= floor) jmax = floor + rnd(64, 256);

  // 1.0 sends its junk before a fixed-size initiation, so a small Jmax makes
  // the train the same length every time.
  if (version === "1.0" && jmax <= 81) jmax = 82 + rnd(50, 200);
  return jmax;
}

/**
 * Generate a complete AmneziaWG obfuscation configuration.
 */
export function genCfg(input: GeneratorInput): AWGConfig {
  const { version, intensity, iterCount, junkLevel, useExtremeMax } = input;
  const profile = normalizeProfile(input.profile);

  /** What this protocol version supports — see ./versions.ts. */
  const caps = capsFor(version);

  const client = clientCaps(input.clientId, input.clientRelease).limits;

  // Enforce client capability limits without mutating the caller's input.
  const effectiveInput: GeneratorInput = {
    ...input,
    profile,
    useTagC: client.supportsCpsTagC && input.useTagC,
    useTagRC: client.supportsCpsTagRC && input.useTagRC,
    useTagRD: client.supportsCpsTagRD && input.useTagRD,
  };

  const imap: Record<Intensity, number> = { low: 1, medium: 2, high: 3 };
  const iv = imap[intensity] + (iterCount > 3 ? 1 : 0);

  /*
   * Draw every parameter this version has.
   *
   * The set comes from the catalogue, so a version that does not have S3 does
   * not get one — which is the bug this replaced: S3 and S4 used to be drawn
   * for 1.0 and 1.5 and hidden by the renderer, leaving the config object and
   * the .conf disagreeing about what the config contained.
   */
  const drawn = drawParams(paramsFor(version), {
    version,
    client,
    intensity,
    routerMode: input.routerMode,
    extreme: useExtremeMax,
    junkLevel,
    narrowH: input.version === "3.1" && !!input.useNarrowH,
  });

  const int = (field: string, fallback = 0): number => {
    const value = drawn[field];
    return typeof value === "number" ? value : fallback;
  };
  const text = (field: string): string => String(drawn[field] ?? "");

  const h1 = text("h1");
  const h2 = text("h2");
  const h3 = text("h3");
  const h4 = text("h4");
  const h1s = int("h1s");
  const h2s = int("h2s");
  const h3s = int("h3s");
  const h4s = int("h4s");

  const sizes = resolveSizes(
    {
      s1: int("s1", 1),
      s2: int("s2", 1),
      s3: int("s3"),
      s4: int("s4"),
    },
    {
      hasExtraSizes: caps.extraSizes,
      needsFloor: caps.headerProtection && input.useHeaderProtection,
      routerMode: input.routerMode,
      extreme: useExtremeMax,
      maxS4: Math.min(32, client.maxS4),
    },
  );
  const { s1, s2, s3, s4 } = sizes;

  const jcv = int("jc");
  const jmin = int("jmin");
  const jmax = resolveJmax(jmin, int("jmax"), version);

  /*
   * Both the protocol version and the client have to want a chain.
   *
   * `supportsI1I5` was declared with the matrix and then never read, so a
   * client that ignores I1-I5 was handed one anyway. WireSock is the case
   * that matters: it drops the fields without complaining. The tunnel comes
   * up either way, since the chain is junk the client sends and the far end
   * discards, so what is lost is the mimicry alone and nothing reports it.
   * Writing five fields that will not be sent only tells the reader they have
   * an obfuscation they do not have.
   */
  const hasCPS = caps.cps && client.supportsI1I5;
  const isComposite = profile === "tls_to_quic" || profile === "quic_burst";
  const isDns = profile === "dns_query";

  let i1 = "",
    i2 = "",
    i3 = "",
    i4 = "",
    i5 = "";

  if (!hasCPS) {
    // AWG 1.0 — без CPS
  } else if (isComposite && profile === "tls_to_quic") {
    i1 = mkTLS(effectiveInput, iv);
    i2 = mkQUICi(effectiveInput, iv);
    i3 = mkEntropy(effectiveInput, 2, iv);
    i4 = mkEntropy(effectiveInput, 3, iv);
    i5 = mkEntropy(effectiveInput, 4, iv);
  } else if (isComposite && profile === "quic_burst") {
    i1 = mkQUICi(effectiveInput, iv);
    i2 = mkQUIC0(effectiveInput, iv);
    i3 = mkHTTP3(effectiveInput, iv);
    i4 = mkEntropy(effectiveInput, 3, iv);
    i5 = mkEntropy(effectiveInput, 4, iv);
  } else if (isDns) {
    i1 = mkDNS(effectiveInput, iv);
    i2 = input.mimicAll
      ? mkDNS(effectiveInput, iv + 1)
      : mkEntropy(effectiveInput, 1, iv);
    i3 = input.mimicAll
      ? mkDNS(effectiveInput, iv + 2)
      : mkEntropy(effectiveInput, 2, iv);
    i4 = input.mimicAll
      ? mkDNS(effectiveInput, iv + 3)
      : mkEntropy(effectiveInput, 3, iv);
    i5 = input.mimicAll
      ? mkDNS(effectiveInput, iv + 4)
      : mkEntropy(effectiveInput, 4, iv);
  } else {
    i1 = genI1(effectiveInput, profile, iv);
    i2 = input.mimicAll
      ? genI1(effectiveInput, profile, iv)
      : mkEntropy(effectiveInput, 1, iv);
    i3 = input.mimicAll
      ? genI1(effectiveInput, profile, iv)
      : mkEntropy(effectiveInput, 2, iv);
    i4 = input.mimicAll
      ? genI1(effectiveInput, profile, iv)
      : mkEntropy(effectiveInput, 3, iv);
    i5 = input.mimicAll
      ? genI1(effectiveInput, profile, iv)
      : mkEntropy(effectiveInput, 4, iv);
  }

  if (input.routerMode && hasCPS) {
    i2 = "";
    i3 = "";
    i4 = "";
    i5 = "";
  }

  const cfg: AWGConfig = {
    version,
    profile,
    h1,
    h2,
    h3,
    h4,
    h1s,
    h2s,
    h3s,
    h4s,
    s1,
    s2,
    s3,
    s4,
    jc: jcv,
    jmin,
    jmax,
    i1,
    i2,
    i3,
    i4,
    i5,
    ...(caps.headerProtection ? { awg3: genAwg3(input, caps) } : {}),
  };

  // Safety net: throw if we ever emit a config that fails our own validators.
  const findings = validateGeneratedConfig(cfg, input.clientId);
  const fatal = findings.filter((f) => f.level === "error");
  if (fatal.length > 0) {
    throw new Error(
      `Generated config failed validation: ${fatal.map((f) => `${f.field}: ${f.msg}`).join("; ")}`,
    );
  }

  return cfg;
}

/**
 * Generate multiple independent configurations at once.
 * Each config is generated from a fresh random seed, but with the same
 * input preferences (version, intensity, profile, client, etc.).
 */
export function generateBatch(
  input: GeneratorInput,
  count: number,
): AWGConfig[] {
  if (!Number.isFinite(count) || count < 1) {
    throw new RangeError("generateBatch: count must be a positive integer");
  }
  if (count > 1000) {
    throw new RangeError("generateBatch: count must not exceed 1000");
  }

  const out: AWGConfig[] = [];
  for (let i = 0; i < count; i++) {
    out.push(genCfg({ ...input, iterCount: input.iterCount + i }));
  }
  return out;
}

/** Convenience re-export of profile labels for the UI. */
export { PROFILE_LABELS };
