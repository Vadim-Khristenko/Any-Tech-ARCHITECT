/**
 * Where each AmneziaWG parameter's value comes from.
 *
 * The generator used to draw every parameter by name, in one function, with
 * the bounds written as literals beside the draw: `rnd(1, 150)` for S1, a
 * table of H pools, an intensity map for Jmin. Adding a parameter meant
 * editing that function, and the catalogue that describes parameters had no
 * say in what got generated — which is how the config object and the rendered
 * `.conf` managed to disagree about S3 and S4.
 *
 * Here each parameter has a strategy, and the generator walks the version's
 * parameter set rather than a list it carries itself. A parameter the version
 * does not have is not drawn; a parameter with no strategy falls back to what
 * its `kind` implies. The bounds a strategy respects are the ones the
 * catalogue and the client state, not ones repeated here.
 */

import type { ParamDescriptor, ParamSet } from "@/types/protocol";
import { rnd, rRange, RANGE_MAX_WIDTH } from "./utils";
import type { AWGVersion, Intensity } from "./types";
import type { AwgClientLimits } from "./clients";

/** Everything a strategy is allowed to know. */
export interface DrawContext {
  version: AWGVersion;
  /** Limits of the client this config is for. */
  client: AwgClientLimits;
  intensity: Intensity;
  /** Low-power devices: fewer and smaller everything. */
  routerMode: boolean;
  /** Push the ceilings the protocol allows rather than the ones it expects. */
  extreme: boolean;
  /** How much junk the user asked for. */
  junkLevel: number;
  /** Narrow H1-H4 ranges for the 3.1 bug workaround. */
  narrowH?: boolean;
}

/** Produce one parameter's value. */
export type Draw = (ctx: DrawContext, param: ParamDescriptor) => string | number;

/* ── Headers ──────────────────────────────────────────────────────────────── */

/**
 * Non-overlapping zones for H1–H4 that fit under the client's ceiling.
 *
 * Overlapping ranges mean the receiver cannot tell two message types apart,
 * so the zones are laid out first and drawn from second. For a client that
 * caps H at 2^31-1 the whole layout scales down rather than being clamped —
 * clamping put every range's upper bound on the cap itself.
 */
export function headerZones(
  client: AwgClientLimits,
  extreme: boolean,
  narrowH = false,
) {
  // Narrow mode for the 3.1 bug: clamp to ~20k instead of 100M. The bug
  // is header-interval scanning cost; a small window fixes it and still
  // leaves enough entropy to avoid the "all headers on the cap" signature.
  const narrowSpread = 20_000;
  const narrowH4Spread = 30_000;
  const wide = narrowH ? narrowSpread : extreme ? 10_000_000 : 100_000_000;
  const wideH4 = narrowH ? narrowH4Spread : extreme ? 15_000_000 : 150_000_000;
  const max = client.maxHValue;

  if (max >= 4_294_967_295) {
    return {
      H1: { min: 100_000_000, max: 900_000_000, spread: wide },
      H2: { min: 1_200_000_000, max: 2_000_000_000, spread: wide },
      H3: { min: 2_400_000_000, max: 3_200_000_000, spread: wide },
      H4: { min: 3_600_000_000, max: 4_000_000_000, spread: wideH4 },
    };
  }

  // Five zones so the fourth has room above it for the range to run into.
  const zone = Math.floor(max / 5);
  const gap = 10_000;
  const spread = (want: number) => Math.min(want, zone - gap);
  return {
    H1: { min: zone, max: zone * 2 - gap, spread: spread(wide) },
    H2: { min: zone * 2, max: zone * 3 - gap, spread: spread(wide) },
    H3: { min: zone * 3, max: zone * 4 - gap, spread: spread(wide) },
    H4: { min: zone * 4, max, spread: spread(wideH4) },
  };
}

type HeaderKey = keyof ReturnType<typeof headerZones>;

const isHeaderKey = (key: string): key is HeaderKey =>
  key === "H1" || key === "H2" || key === "H3" || key === "H4";

/**
 * A ranged header: a window inside the parameter's own zone.
 *
 * The base is drawn with room left for what `rRange` adds on top of it. It
 * used to be drawn across the whole zone, and the spread and the window width
 * then carried the range past the zone's top — on a client capped at 2^31 the
 * zones are close enough together that the range landed in the next one, the
 * validator refused the config, and generation threw where nothing catches
 * it. Roughly one click in forty thousand did nothing at all.
 *
 * Leaving the room also stops the last zone's range ending exactly on the
 * client's ceiling, which it did in one config out of six: an upper bound of
 * 2147483647 is not a random number, it is a signature.
 */
const drawHeaderRange: Draw = (ctx, param) => {
  if (!isHeaderKey(param.key)) return 0;
  const zone = headerZones(ctx.client, ctx.extreme, ctx.narrowH)[param.key];

  const headroom = zone.spread + RANGE_MAX_WIDTH;
  const top = Math.max(zone.min, zone.max - headroom);

  return rRange(rnd(zone.min, top), zone.spread, ctx.client.maxHValue);
};

/**
 * A single header, for 1.0 and 1.5.
 *
 * Out of the same zones as the ranges. These used to be absolute constants
 * clamped to the client's ceiling, which on a capped client put H2, H3 and H4
 * all on the cap — three identical headers, the same three for every user.
 */
const drawHeaderSingle: Draw = (ctx, param) => {
  if (!isHeaderKey(param.key)) return 0;
  const zone = headerZones(ctx.client, ctx.extreme, ctx.narrowH)[param.key];
  const spread =
    param.key === "H1"
      ? ctx.extreme
        ? 10_000_000
        : 4_000_000
      : zone.spread;
  return Math.min(zone.min + rnd(0, spread), ctx.client.maxHValue);
};

/* ── Padding sizes ────────────────────────────────────────────────────────── */

/**
 * The ceilings the padding draws respect.
 *
 * Exported because the draw is not the only place that touches these numbers:
 * `resolveSizes` breaks collisions afterwards, and a repair that does not know
 * the ceiling will step straight over it. They used to be written twice.
 */
/** Router mode keeps handshake padding small; the link is the bottleneck. */
export const ROUTER_S_MAX = 20;
export const S_MAX = 150;
export const S3_MAX = 64;
export const S3_MAX_EXTREME = 256;

/**
 * What router mode allows the junk train to be.
 *
 * Ranges rather than ceilings that always win. The previous version wrote
 * `Math.min(jmin, 40)` against a draw whose lowest possible value was 64, so
 * the minimum always won and every router-mode config this tool has ever
 * produced carried the same three numbers — Jc 3, Jmin 40, Jmax 128 — across
 * every version, intensity, junk level and client. Three constants is not a
 * light configuration, it is a fingerprint that names the tool and the mode.
 */
const ROUTER_JC_MAX = 3;

/*
 * The two ranges are chosen together, not separately. `resolveJmax` lifts a
 * Jmax that leaves Jmin less than 64 bytes of room — a correct rule, and one
 * that knows nothing about router mode, so a badly chosen pair let it
 * overshoot the cap. With Jmin topping out at 31 the floor never reaches 96,
 * and the repair has nothing to repair.
 *
 * The ceilings are the ones router mode always had — 40 and 128. What it did
 * not have was any room underneath them.
 */
const ROUTER_JMIN: [number, number] = [16, 31];
const ROUTER_JMAX: [number, number] = [96, 128];

const drawS1S2: Draw = (ctx) =>
  rnd(1, ctx.routerMode ? ROUTER_S_MAX : S_MAX);

const drawS3: Draw = (ctx) =>
  ctx.extreme ? rnd(S3_MAX + 1, S3_MAX_EXTREME) : rnd(1, S3_MAX);

const drawS4: Draw = (ctx, param) => {
  // The protocol caps S4; a client may cap it lower still.
  const ceiling = Math.min(param.bounds?.max ?? 32, ctx.client.maxS4);
  return rnd(1, ceiling);
};

/* ── Junk train ───────────────────────────────────────────────────────────── */

const JMIN_BY_INTENSITY: Record<Intensity, [number, number]> = {
  low: [64, 256],
  medium: [128, 512],
  high: [256, 768],
};

const JMAX_BY_INTENSITY: Record<Intensity, [number, number]> = {
  low: [256, 512],
  medium: [512, 1024],
  high: [768, 1280],
};

/**
 * How many junk packets go out before the handshake.
 *
 * 1.0 wants at least four — below that the train is short enough to look like
 * a retry rather than noise. Later versions take the user's level with a
 * little variance so two people on the same setting do not produce the same
 * count.
 */
const drawJc: Draw = (ctx) => {
  const ceiling = Math.min(ctx.extreme ? 128 : 15, ctx.client.maxJc);

  let jc = ctx.junkLevel;
  if (ctx.version === "1.0") {
    // The ceiling applies here too. This branch used to skip it, so a level
    // above what the client accepts went straight through — the health check
    // only warns, so the config shipped.
    jc = Math.min(ceiling, Math.max(4, jc));
  } else if (jc > 0) {
    jc = Math.max(1, Math.min(ceiling, jc + rnd(-1, 1)));
  }

  if (ctx.extreme && ctx.junkLevel === 0 && ctx.version !== "1.0") {
    jc = rnd(1, Math.min(8, ceiling));
  }

  if (ctx.routerMode) {
    // A cap, applied to whatever was drawn. Zero stays zero: a user who
    // turned the junk train off asked for it off, and router mode used to
    // hand them three packets anyway.
    const cap = Math.min(ctx.version === "1.0" ? 4 : ROUTER_JC_MAX, ctx.client.maxJc);
    jc = jc === 0 ? 0 : Math.min(jc, cap);
  }
  return jc;
};

const drawJmin: Draw = (ctx) => {
  const [lo, hi] = ctx.routerMode ? ROUTER_JMIN : JMIN_BY_INTENSITY[ctx.intensity];
  return rnd(lo, hi);
};

const drawJmax: Draw = (ctx) => {
  const [lo, hi] = ctx.routerMode ? ROUTER_JMAX : JMAX_BY_INTENSITY[ctx.intensity];
  return rnd(lo, hi);
};

/* ── The registry ─────────────────────────────────────────────────────────── */

/**
 * By key first, then by kind.
 *
 * The kind fallback is what makes a new parameter generate at all: add it to
 * the catalogue with a `kind` and it produces a plausible value immediately,
 * rather than silently coming out empty.
 */
const BY_KEY: Record<string, Draw> = {
  S1: drawS1S2,
  S2: drawS1S2,
  S3: drawS3,
  S4: drawS4,
  Jc: drawJc,
  Jmin: drawJmin,
  Jmax: drawJmax,
};

/**
 * A range with no header zone behind it: drawn from the parameter's own
 * bounds. Without bounds there is nothing to draw from, and `strategyFor`
 * declines rather than inventing a spread.
 */
const drawBoundedRange: Draw = (_ctx, param) => {
  const min = param.bounds?.min ?? 0;
  const max = param.bounds?.max ?? min;
  const lo = rnd(min, max);
  return `${lo}-${rnd(lo, max)}`;
};

const BY_KIND: Partial<Record<ParamDescriptor["kind"], Draw>> = {
  int: (ctx, param) => rnd(param.bounds?.min ?? 1, param.bounds?.max ?? 64),
  range: drawBoundedRange,
};

/**
 * The strategy for a parameter, or null when nothing knows how to draw it.
 *
 * H1–H4 are matched by key before kind, because the same key is a single
 * value on 1.x and a range on 2.0+ and both come out of the same zone. A
 * `range` that is not a header — `ContentPaddingAddition` — is not a header
 * range, and mapping the kind straight to the header strategy quietly gave it
 * a zone it has no business in.
 */
export function strategyFor(param: ParamDescriptor): Draw | null {
  if (isHeaderKey(param.key)) {
    return param.kind === "range" ? drawHeaderRange : drawHeaderSingle;
  }

  const byKey = BY_KEY[param.key];
  if (byKey) return byKey;

  // The 3.0 block is produced by `genAwg3`, which knows what its timers mean.
  if (param.field.startsWith("awg3.")) return null;

  if (param.kind === "range" && param.bounds?.max === undefined) return null;
  return BY_KIND[param.kind] ?? null;
}

/**
 * Draw every parameter of a set, keyed by the field it lives on.
 *
 * Parameters with no strategy — the CPS chain, the 3.0 block — are skipped
 * rather than guessed at: those are produced by code that knows what they
 * mean, and a value invented here would be worse than no value.
 */
export function drawParams(
  set: ParamSet,
  ctx: DrawContext,
): Record<string, string | number> {
  const drawn: Record<string, string | number> = {};
  for (const param of set) {
    const draw = strategyFor(param);
    if (!draw) continue;
    drawn[param.field] = draw(ctx, param);
  }
  return drawn;
}
