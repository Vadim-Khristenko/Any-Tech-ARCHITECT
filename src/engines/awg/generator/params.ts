/**
 * Every AmneziaWG parameter, described once.
 *
 * Until now a parameter existed in four places at once: a field on AWGConfig,
 * a branch in the generator, a line in the renderer and a rule in a validator.
 * Nothing tied them together, so "which version has S3" was answered by
 * reading code in four files and hoping they agreed.
 *
 * This is the single description. Each entry carries what the parameter is,
 * which version introduced it, what shape its value takes, and — the part that
 * matters most in practice — whether both ends have to agree on it. That last
 * field is not a convention we invented: it follows from how amneziawg-go
 * parses an incoming packet, and getting it wrong is what makes a tunnel fail
 * silently. See [[xray-core-constraints]] for the same treatment of XRay.
 *
 * The type is `ParamDescriptor` from `types/protocol` and the set-building is
 * `shared/params`, both of which XRay uses too. This file had its own copy of
 * the scope and kind unions, identical in meaning and separate in code, which
 * is exactly the duplication the shared vocabulary exists to remove.
 */

import type { ParamDescriptor, ParamSet } from "@/types/protocol";
import {
  hasParam as hasParamIn,
  paramFor as paramForIn,
  paramSetFor,
  paramSets,
  paramsInScope,
  type ParamCatalogue,
} from "@/shared/params";
import type { AWGVersion } from "./types";

/**
 * One AmneziaWG parameter.
 *
 * An alias, not a type of its own: plenty of code says `AWGParameter` and
 * there is no reason for it to stop, but there is only one description of what
 * a parameter is.
 */
export interface AWGParameter extends ParamDescriptor {
  /**
   * Which block of a config it belongs to.
   *
   * Here rather than in the view because it is a fact about the protocol, not
   * about the layout: S1 belongs with the packet sizes wherever it is shown.
   * Both the parameter card and the history entry used to decide this with
   * their own copy of the same version branching.
   */
  group: AWGParamGroup;
}

/** The blocks a config is written in, in the order it is written. */
export type AWGParamGroup = "headers" | "sizes" | "junk" | "cps" | "awg3";

export type { ParamScope as AWGParamScope, ParamKind as AWGParamKind } from "@/types/protocol";

/* ── The catalogue ────────────────────────────────────────────────────────── */

/**
 * Ordered as a config is written, not alphabetically: headers, sizes, junk,
 * the CPS chain, then the 3.0 block. Renderers and forms both read in this
 * order, so the order is part of the data.
 */
export const AWG_PARAMETERS: readonly AWGParameter[] = [
  // ── Headers ──────────────────────────────────────────────────────────────
  ...(["1", "2", "3", "4"] as const).map(
    (n): AWGParameter => ({
      key: `H${n}`,
      group: "headers",
      kind: "header",
      scope: "shared",
      since: "1.0",
      field: `h${n}s`,
      note: "awgParam.header",
      source: "device/receive.go: DeterminePacketTypeAndPadding",
    }),
  ),
  ...(["1", "2", "3", "4"] as const).map(
    (n): AWGParameter => ({
      key: `H${n}`,
      group: "headers",
      kind: "range",
      scope: "shared",
      since: "2.0",
      field: `h${n}`,
      note: "awgParam.headerRange",
      source: "device/receive.go: header.Contains(...)",
    }),
  ),

  // ── Packet sizes ─────────────────────────────────────────────────────────
  {
    key: "S1",
    group: "sizes",
    kind: "int",
    scope: "shared",
    since: "1.0",
    field: "s1",
    note: "awgParam.S1",
    source: "device/receive.go: size == padding + MessageInitiationSize",
  },
  {
    key: "S2",
    group: "sizes",
    kind: "int",
    scope: "shared",
    since: "1.0",
    field: "s2",
    note: "awgParam.S2",
    source: "device/receive.go: size == padding + MessageResponseSize",
  },
  {
    key: "S3",
    group: "sizes",
    kind: "int",
    scope: "shared",
    since: "2.0",
    field: "s3",
    note: "awgParam.S3",
    source: "device/receive.go: size == padding + MessageCookieReplySize",
  },
  {
    key: "S4",
    group: "sizes",
    kind: "int",
    scope: "shared",
    since: "2.0",
    field: "s4",
    bounds: { max: 32 },
    note: "awgParam.S4",
    source: "amneziawg-tools src/config.c",
  },

  // ── Junk train ───────────────────────────────────────────────────────────
  {
    key: "Jc",
    group: "junk",
    kind: "int",
    scope: "sender",
    since: "1.0",
    field: "jc",
    note: "awgParam.Jc",
    source: "device/send.go: peer.device.JunkPackets()",
  },
  {
    key: "Jmin",
    group: "junk",
    kind: "int",
    scope: "sender",
    since: "1.0",
    field: "jmin",
    note: "awgParam.Jmin",
  },
  {
    key: "Jmax",
    group: "junk",
    kind: "int",
    scope: "sender",
    since: "1.0",
    field: "jmax",
    note: "awgParam.Jmax",
  },

  // ── CPS chain ────────────────────────────────────────────────────────────
  ...(["1", "2", "3", "4", "5"] as const).map(
    (n): AWGParameter => ({
      key: `I${n}`,
      group: "cps",
      kind: "chain",
      scope: "sender",
      since: "1.5",
      field: `i${n}`,
      note: "awgParam.cpsChain",
      source: "device/send.go: peer.device.ipackets",
    }),
  ),

  // ── AWG 3.0 ──────────────────────────────────────────────────────────────
  {
    key: "HeaderProtectionKey",
    group: "awg3",
    kind: "key",
    scope: "shared",
    since: "3.0",
    field: "awg3.headerProtectionKey",
    note: "awgParam.HeaderProtectionKey",
    source: "noise-protocol.go: HeaderProtectionCipher",
  },
  {
    key: "ContentPaddingAddition",
    group: "awg3",
    kind: "range",
    scope: "sender",
    since: "3.0",
    field: "awg3.contentPaddingAddition",
    note: "awgParam.ContentPaddingAddition",
    source: "device/send.go: randomPaddingAddition",
  },
  ...(
    [
      ["RekeyAfterTime", "rekeyAfterTime"],
      ["RekeyTimeout", "rekeyTimeout"],
      ["RejectAfterTime", "rejectAfterTime"],
      ["KeepaliveTimeout", "keepaliveTimeout"],
      ["MaxHandshakeAttempts", "maxHandshakeAttempts"],
    ] as const
  ).map(
    ([key, field]): AWGParameter => ({
      key,
      group: "awg3",
      kind: "duration",
      scope: "local",
      since: "3.0",
      field: `awg3.${field}`,
      note: "awgParam.timer",
      source: "device/timers.go",
    }),
  ),

  // ── AWG 3.1 ──────────────────────────────────────────────────────────────
  {
    key: "RandomTrailers",
    group: "awg3",
    kind: "flag",
    scope: "local",
    since: "3.1",
    field: "awg3.randomTrailers",
    note: "awgParam.RandomTrailers",
    source: "device/uapi.go: random_trailers",
  },
  {
    key: "DisableCookies",
    group: "awg3",
    kind: "flag",
    scope: "local",
    since: "3.1",
    field: "awg3.disableCookies",
    note: "awgParam.DisableCookies",
    source: "device/uapi.go: disable_cookies",
  },
] as const;

/* ── Per-version sets ─────────────────────────────────────────────────────── */

/**
 * The catalogue plus its version ordering.
 *
 * The order is data: "1.5" is not less than "1.0" by any string comparison,
 * and the sets are a prefix of it.
 */
export const AWG_CATALOGUE: ParamCatalogue<AWGParameter> = {
  parameters: AWG_PARAMETERS,
  order: ["1.0", "1.5", "2.0", "3.0", "3.1"],
};

/** Lookup by version, for code that has the version as a value. */
export const AWG_PARAM_SETS = paramSets(AWG_CATALOGUE) as Record<
  AWGVersion,
  ParamSet<AWGParameter>
>;

/** AmneziaWG 1.0 — junk train, single headers, S1 and S2. */
export const AWGParamSet1 = AWG_PARAM_SETS["1.0"];

/** AmneziaWG 1.5 — adds the I1–I5 chain, sent by the client only. */
export const AWGParamSet15 = AWG_PARAM_SETS["1.5"];

/** AmneziaWG 2.0 — adds S3, S4 and turns the headers into ranges. */
export const AWGParamSet2 = AWG_PARAM_SETS["2.0"];

/** AmneziaWG 3.0 — adds header protection, content padding and the timers. */
export const AWGParamSet3 = AWG_PARAM_SETS["3.0"];

/** AmneziaWG 3.1 — adds the RandomTrailers and DisableCookies switches. */
export const AWGParamSet31 = AWG_PARAM_SETS["3.1"];

/* ── Questions the sets answer ────────────────────────────────────────────── */

/** Does this version understand this parameter at all? */
export function hasParam(version: AWGVersion, key: string): boolean {
  return hasParamIn(AWG_CATALOGUE, version, key);
}

/** The description a version uses for a key, if any. */
export function paramFor(
  version: AWGVersion,
  key: string,
): AWGParameter | undefined {
  return paramForIn(AWG_CATALOGUE, version, key);
}

/** Every parameter a version understands. */
export function paramsFor(version: AWGVersion): ParamSet<AWGParameter> {
  return paramSetFor(AWG_CATALOGUE, version);
}

/**
 * Parameters both ends must agree on. This is the list a "why does my tunnel
 * not come up" answer is built from, so it is derived rather than retyped.
 */
export function sharedParams(version: AWGVersion): ParamSet<AWGParameter> {
  return paramsInScope(AWG_CATALOGUE, version, "shared");
}

/** Parameters each device may set for itself. */
export function senderParams(version: AWGVersion): ParamSet<AWGParameter> {
  return paramsInScope(AWG_CATALOGUE, version, "sender");
}
