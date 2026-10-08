/**
 * Every rule about AmneziaWG obfuscation parameters, in one place.
 *
 * There were two places, and they overlapped. `awgValidate.ts` checked a flat
 * field map for the editor; `generator/validators.ts` checked a generated
 * config. Both knew that S4 caps at 32, that S4 = 0 disables transport
 * obfuscation, that H ranges must not overlap, that 1–4 is reserved, and that
 * S1 + 56 = S2 makes the handshake sizes collide — each in its own words, and
 * in one of the two cases with a different bound.
 *
 * The rules live here, keyed by code rather than carrying a sentence, so the
 * same finding reads the same whichever door the config came in through and
 * can be read in either language.
 *
 * Bounds come from the implementations, not from advice:
 *   - amneziawg-go `device/uapi.go`, `device/receive.go`
 *   - amneziawg-linux-kernel-module `src/device.c`, `src/messages.h`
 *   - amneziawg-tools `src/config.c`
 */

import { error, warn } from "@/shared/findings";
import type { Finding } from "@/types/findings";
import { parseRangeValue } from "@/shared/validation";
import { MIN_S_WITH_HEADER_PROTECTION } from "./generator/awg3";
import { chainBytes, KMOD_CHAIN_BUDGET } from "./generator/chainBudget";
import {
  INIT_TO_RESPONSE,
  INIT_TO_COOKIE,
  RESPONSE_TO_COOKIE,
} from "./messageSizes";

/* ── Input ────────────────────────────────────────────────────────────────── */

/**
 * A loose field map: what the editor has, and what a parsed config becomes.
 *
 * Besides the Jc/S/H/I fields, `checkSizes` reads `HeaderProtectionKey`:
 * its presence is the 3.x gate for the S-padding floor (see the rule).
 */
export interface AwgParamInput {
  [key: string]: string | number | undefined;
}

export interface AwgRuleOptions {
  /** Interface MTU, for the Jmax fragmentation check. */
  mtu?: number;
  /** Client limits, when a target client is selected. */
  client?: {
    name: string;
    maxS4: number;
    maxJc: number;
    maxHValue: number;
    supportsCpsTagC: boolean;
    supportsCpsTagRC: boolean;
    supportsCpsTagRD: boolean;
    /**
     * The app manages HeaderProtectionKey itself (Amnezia VPN): a pasted
     * config carries no key line, so the keyed floor above cannot see it —
     * but the in-app toggle can still switch the cipher on underneath
     * these sizes. Read where `healthCheck` spreads the client limits.
     */
    managesHeaderProtection?: boolean;
  };
}

/* ── Bounds ───────────────────────────────────────────────────────────────── */

/**
 * Junk packet count.
 *
 * The kernel module accepts 1–128; above 64 the handshake takes noticeably
 * longer because every junk packet goes out before the initiation does.
 */
/**
 * Zero is allowed.
 *
 * The generator offers "0 — Off" and produces `Jc = 0` for it, and this rule
 * called that a hard error — the tool refusing a config it had just written.
 * No junk train is an ordinary choice, not a broken one.
 */
const JC_MIN = 0;
const JC_MAX = 128;
const JC_SLOW = 64;

/**
 * Padding ceilings: a padded message must still fit in a UDP datagram, so the
 * cap is 65535 minus the message it precedes.
 */
const S1_MAX = 1132; // 65535 − MessageInitiationSize (148)
const S2_MAX = 1188; // 65535 − MessageResponseSize (92)
const S3_MAX = 1132; // 65535 − MessageCookieReplySize
const S4_MAX = 32; // amneziawg-tools src/config.c

/** WireGuard's own message types occupy 1–4; an H value there collides. */
const RESERVED_HEADER_MAX = 4;

/** A CPS chain is one or more well-formed tags, concatenated. */
const VALID_CHAIN =
  /^(<(b 0x[0-9a-fA-F]*|t|c|r \d+|rc \d+|rd \d+|d|ds|dz)>)+$/;

const HEADERS = ["H1", "H2", "H3", "H4"] as const;
const CHAIN_FIELDS = ["I1", "I2", "I3", "I4", "I5"] as const;

/* ── Reading values ───────────────────────────────────────────────────────── */

function num(value: string | number | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function range(value: string | number | undefined): [number, number] | null {
  return value === undefined || value === "" ? null : parseRangeValue(value);
}

/* ── The rules ────────────────────────────────────────────────────────────── */

/**
 * Check obfuscation parameters.
 *
 * Missing fields are skipped rather than reported: this runs against a version
 * that may not have S3 at all, and against an editor buffer the user is still
 * typing into. "Which parameters are required" belongs to the version's
 * parameter set, not here.
 */
export function checkAwgParams(
  p: AwgParamInput,
  options: AwgRuleOptions = {},
): Finding[] {
  return [
    ...checkJunk(p, options),
    ...checkSizes(p, options),
    ...checkHeaders(p, options),
    ...checkChains(p, options),
  ];
}

function checkJunk(p: AwgParamInput, options: AwgRuleOptions): Finding[] {
  const found: Finding[] = [];
  const mtu = options.mtu ?? 1280;

  const jc = num(p.Jc);
  if (jc !== null) {
    if (jc < JC_MIN || jc > JC_MAX) {
      found.push(error("Jc", "awg.jc_range", { min: JC_MIN, max: JC_MAX }));
    } else if (jc > JC_SLOW) {
      found.push(warn("Jc", "awg.jc_slow", { jc }));
    }
    const client = options.client;
    if (client && jc > client.maxJc) {
      found.push(
        warn("Jc", "awg.jc_over_client", {
          jc,
          max: client.maxJc,
          client: client.name,
        }),
      );
    }
  }

  const jmin = num(p.Jmin);
  const jmax = num(p.Jmax);
  if (jmin !== null && jmax !== null && jmin >= jmax) {
    found.push(error("Jmin", "awg.jmin_not_below_jmax"));
  }
  if (jmax !== null && jmax >= mtu) {
    found.push(warn("Jmax", "awg.jmax_over_mtu", { jmax, mtu }));
  }

  return found;
}

function checkSizes(p: AwgParamInput, options: AwgRuleOptions): Finding[] {
  const found: Finding[] = [];
  const s1 = num(p.S1);
  const s2 = num(p.S2);
  const s3 = num(p.S3);
  const s4 = num(p.S4);

  /*
   * AWG 3.0/3.1 with header protection: the ChaCha20 nonce is read from the
   * first 12 bytes of every S-padding (amneziawg-go `device/uapi.go`, kernel
   * module `src/netlink.c`), so each of S1–S4 below 12 makes the device
   * refuse the config with EINVAL and the interface never comes up.
   *
   * The gate is the key, not the version, and that is exactly "3.x only":
   * HeaderProtectionKey exists since 3.0 (`params.ts`, `since: "3.0"`), and
   * neither caller here can supply a reliable version anyway — a pasted
   * `.conf` carries no version marker, an editor buffer is still being
   * typed. A config carrying the key is 3.x by construction (older tooling
   * rejects the unknown key at parse, before S values ever matter), and a
   * config without it has no minimum on any version: pre-3.0 accepts any
   * uint16, and keyless 3.x accepts it too. So 1.0–2.0 configs pass through
   * this rule untouched — there is nothing to version-branch on.
   *
   * The bound is “at least 12”, not “more than 12”: both implementations
   * compare `value < 12`, and 12 itself is accepted.
   */
  const rawHpk = p.HeaderProtectionKey;
  const hasHpk =
    typeof rawHpk === "number"
      ? true
      : typeof rawHpk === "string" && rawHpk.trim() !== "";
  // S4 = 0 with the key set is the nonce error below, not the zero warning.
  // Same when the warning below fired: the size is one toggle away from
  // refused, which subsumes "transport obfuscation off".
  let s4NonceError = false;
  let s4NonceWarn = false;
  /*
   * No key line, but the client holds the key itself (Amnezia VPN): with
   * its in-app toggle on, the device refuses these sizes exactly like
   * above — yet the toggle state is not in the file, so that reads as a
   * warning rather than an error. With the toggle off the sizes are
   * perfectly valid, which is why a managed client without the key must
   * not read as broken, only as one toggle away from it.
   */
  const managedOnly =
    !hasHpk && options.client?.managesHeaderProtection === true;
  if (hasHpk || managedOnly) {
    const nonceSizes: [string, number | null][] = [
      ["S1", s1],
      ["S2", s2],
      ["S3", s3],
      ["S4", s4],
    ];
    for (const [key, value] of nonceSizes) {
      if (value === null || value >= MIN_S_WITH_HEADER_PROTECTION) continue;
      const values = {
        name: key,
        value,
        min: MIN_S_WITH_HEADER_PROTECTION,
      };
      if (hasHpk) {
        found.push(error(key, "awg3.s_below_nonce", values));
        if (key === "S4") s4NonceError = true;
      } else {
        found.push(warn(key, "awg.s_small_managed", values));
        if (key === "S4") s4NonceWarn = true;
      }
    }
  }

  const ceilings: [string, number | null, number][] = [
    ["S1", s1, S1_MAX],
    ["S2", s2, S2_MAX],
    ["S3", s3, S3_MAX],
  ];
  for (const [key, value, max] of ceilings) {
    if (value !== null && value > max) {
      found.push(error(key, "awg.size_max", { key, value, max }));
    }
  }

  if (s4 !== null) {
    if (s4 > S4_MAX) {
      found.push(error("S4", "awg.s4_max", { s4, max: S4_MAX }));
    }
    if (s4 === 0 && !s4NonceError && !s4NonceWarn) {
      found.push(warn("S4", "awg.s4_zero"));
    }
    const client = options.client;
    if (client && s4 > client.maxS4) {
      found.push(
        error("S4", "awg.s4_over_client", {
          s4,
          max: client.maxS4,
          client: client.name,
        }),
      );
    }
  }

  // Two message types with the same padded length are one signal, and the
  // whole point of the padding is that they should not be.
  if (s1 !== null && s2 !== null && s1 + INIT_TO_RESPONSE === s2) {
    found.push(warn("S2", "awg.size_collision", { a: "S1", b: "S2" }));
  }
  if (s1 !== null && s3 !== null && s3 === s1 + INIT_TO_COOKIE) {
    found.push(warn("S3", "awg.size_collision", { a: "S1", b: "S3" }));
  }
  if (s2 !== null && s3 !== null && s3 === s2 + RESPONSE_TO_COOKIE) {
    found.push(warn("S3", "awg.size_collision", { a: "S2", b: "S3" }));
  }

  return found;
}

function checkHeaders(p: AwgParamInput, options: AwgRuleOptions): Finding[] {
  const found: Finding[] = [];
  const parsed = HEADERS.map(
    (key) => [key, range(p[key])] as [string, [number, number] | null],
  );

  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const [aKey, a] = parsed[i]!;
      const [bKey, b] = parsed[j]!;
      // Overlapping ranges mean the receiver cannot tell the two message
      // types apart, which is a broken tunnel rather than a weak one.
      if (a && b && !(a[1] < b[0] || b[1] < a[0])) {
        found.push(
          error(`${aKey}/${bKey}`, "awg.h_overlap", { a: aKey, b: bKey }),
        );
      }
    }
  }

  /*
   * With HeaderProtectionKey the type field goes out encrypted, and 1-4 is
   * what Amnezia VPN itself writes into H1-H4 for its 3.x containers: the
   * headers are kept only for compatibility, and nothing on the wire shows
   * them. The reserved zone is a problem only where they are visible. A
   * client that keeps the key in the app (Amnezia VPN) writes no key line,
   * and writes 1-4 only with its protection toggle on.
   */
  const headersVisible =
    !hasValue(p.HeaderProtectionKey) && options.client?.managesHeaderProtection !== true;

  for (const [key, r] of parsed) {
    if (!r) continue;
    if (headersVisible && r[0] >= 1 && r[0] <= RESERVED_HEADER_MAX) {
      found.push(warn(key, "awg.h_reserved", { key }));
    }
    const client = options.client;
    if (client && r[1] > client.maxHValue) {
      found.push(
        error(key, "awg.h_over_client", {
          key,
          max: client.maxHValue,
          client: client.name,
        }),
      );
    }
  }

  const loss = trailerLoss(p);
  if (loss !== null && loss > TRAILER_LOSS_MAX) {
    found.push(
      warn("H1-H3", "awg.h_width_loss", {
        percent: formatPercent(loss),
        oneIn: Math.round(1 / loss).toLocaleString("en-US"),
      }),
    );
  }

  return found;
}

/* ── RandomTrailers and range width ───────────────────────────────────────── */

/**
 * Above this share of lost transport packets the width gets a warning.
 *
 * Three ranges at the generator's own widest (50,000 each) lose 3.5·10⁻⁵, so
 * nothing it produces gets near. 10⁻⁴ is about 430,000 of combined width and
 * catches every config where the loss can actually be felt. The number is the
 * one proposed in issue #14.
 */
export const TRAILER_LOSS_MAX = 1e-4;

/** 2^32: how many values a 4-byte header can take. */
const HEADER_SPACE = 4_294_967_296;

/**
 * The share of transport packets a receiver drops because of H1-H3's width,
 * or null when RandomTrailers is off and the width costs nothing.
 *
 * amneziawg-go `device/receive.go`, `DeterminePacketTypeAndPadding` (tag
 * v3.1.20260828): the init, response and cookie branches are guarded by
 * `size == expectedSize || randomTrailers && size > expectedSize`. With the
 * trailers off, a transport packet never has the size of a handshake and
 * skips them. With them on, the second half swallows the size check, and the
 * four bytes at S1, S2 and S3 of every transport packet, uniform ciphertext,
 * are tested against H1, H2 and H3 in turn. A hit goes to the handshake queue
 * and dies at `CheckMAC1`, logged at Verbosef, counted nowhere.
 *
 * So each range takes width / 2^32 of the traffic, one after another:
 * `1 − Π(1 − Wᵢ / 2^32)`. H4 is checked last and competes with nothing, which
 * is why its width is free.
 */
export function trailerLoss(p: AwgParamInput): number | null {
  if (!flagOn(p.RandomTrailers)) return null;

  let kept = 1;
  for (const key of ["H1", "H2", "H3"] as const) {
    const r = range(p[key]);
    if (!r) continue;
    const width = Math.max(0, r[1] - r[0] + 1);
    kept *= 1 - Math.min(1, width / HEADER_SPACE);
  }
  return 1 - kept;
}

/** A share as a percentage with as many decimals as it takes to show it. */
function formatPercent(share: number): string {
  const pct = share * 100;
  const decimals = pct >= 1 ? 1 : pct >= 0.1 ? 2 : 3;
  return pct.toFixed(decimals);
}

/**
 * amneziawg-tools `parse_bool`: `on`/`off` in any case, or a number where
 * anything but zero is true.
 */
function flagOn(value: string | number | undefined): boolean {
  if (value === undefined) return false;
  if (typeof value === "number") return value !== 0;
  const text = value.trim().toLowerCase();
  if (text === "on") return true;
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) && n !== 0;
}

function hasValue(value: string | number | undefined): boolean {
  return typeof value === "number" || (typeof value === "string" && value.trim() !== "");
}

function checkChains(p: AwgParamInput, options: AwgRuleOptions): Finding[] {
  const found: Finding[] = [];
  const client = options.client;

  for (const key of CHAIN_FIELDS) {
    const value = p[key];
    if (value === undefined || value === "" || value === "0") continue;

    const text = String(value).trim();
    if (!VALID_CHAIN.test(text)) {
      found.push(error(key, "awg.cps_syntax", { key }));
      continue;
    }

    if (!client) continue;
    const unsupported: [string, boolean][] = [
      ["<c>", client.supportsCpsTagC || !/<c>/.test(text)],
      ["<rc N>", client.supportsCpsTagRC || !/<rc \d+>/.test(text)],
      ["<rd N>", client.supportsCpsTagRD || !/<rd \d+>/.test(text)],
    ];
    for (const [tag, ok] of unsupported) {
      if (!ok) {
        found.push(
          error(key, "awg.cps_tag_unsupported", { tag, client: client.name }),
        );
      }
    }
  }

  /*
   * A warning, not an error: amneziawg-go takes any length, and a client on
   * it is fine. The kernel module is not (see generator/chainBudget.ts), and
   * the same block usually goes onto a Linux server running it, where the
   * interface comes up and then carries nothing. Issue #17.
   */
  const total = chainBytes(
    CHAIN_FIELDS.map((key) => {
      const value = p[key];
      return value === undefined || value === "0" ? "" : String(value).trim();
    }),
  );
  if (total > KMOD_CHAIN_BUDGET) {
    found.push(
      warn("I1-I5", "awg.cps_chain_too_long", {
        total,
        max: KMOD_CHAIN_BUDGET,
      }),
    );
  }

  return found;
}
