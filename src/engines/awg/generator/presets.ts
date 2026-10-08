/**
 * What each protocol version's switches start from.
 *
 * Picking a version is picking a feature set, so the switches follow it: the
 * page applies the preset whenever the version changes, and on first load for
 * the version it remembers. One place, so the page, the lite build and the
 * tests cannot each hold their own idea of "recommended".
 */

import type { AWGVersion, GeneratorInput } from "./types";

/** The fields a preset sets. Everything else stays as the user left it. */
export type VersionPreset = Pick<
  GeneratorInput,
  | "mtu"
  | "useHeaderProtection"
  | "useContentPadding"
  | "useRandomTimings"
  | "useRandomTrailers"
  | "useDisableCookies"
  | "useNarrowH"
  | "useSameS"
  | "useDisableH"
>;

/** MTU for everything but 3.1: the Ethernet default the tool always had. */
const MTU_DEFAULT = 1500;

/**
 * 3.1 starts at 1280, the IPv6 minimum.
 *
 * Random trailers lengthen a packet up to the largest one seen from the peer
 * (amneziawg-go `peer.udpWindow`, raised in `receive.go`, read in
 * `send.go`), so with trailers on a large share of the traffic goes out at
 * full size. Full size has to be a size every path carries without
 * fragmenting, since a fragmented tunnel is both slower and conspicuous, and
 * 1280 is the one size every IPv6 path is required to carry.
 */
const MTU_31 = 1280;

const OFF: VersionPreset = {
  mtu: MTU_DEFAULT,
  useHeaderProtection: false,
  useContentPadding: false,
  useRandomTimings: false,
  useRandomTrailers: false,
  useDisableCookies: false,
  useNarrowH: false,
  useSameS: false,
  useDisableH: false,
};

const PRESETS: Record<AWGVersion, VersionPreset> = {
  "1.0": OFF,
  "1.5": OFF,
  "2.0": OFF,
  "3.0": {
    ...OFF,
    useHeaderProtection: true,
    useContentPadding: true,
    useRandomTimings: true,
  },
  /*
   * 3.1 turns on random trailers and, with them and header protection on,
   * plain 1-4 headers: the ranges hide nothing under the cipher, and under
   * trailers their width is lost packets. Cookies stay on, since silencing
   * them breaks keepalive behind NAT under load.
   */
  "3.1": {
    ...OFF,
    mtu: MTU_31,
    useHeaderProtection: true,
    useContentPadding: true,
    useRandomTimings: true,
    useRandomTrailers: true,
    useDisableH: true,
  },
};

export function versionPreset(version: AWGVersion): VersionPreset {
  return { ...PRESETS[version] };
}

/**
 * Whether the switches that hang off header protection and random trailers
 * can act: "Disable H1-H4" and "Unite S1-S4". 3.1 only, both parents on.
 * The page shows them on the same condition, and a hidden switch must not act.
 */
export function linkedSwitchesOn(
  input: Pick<GeneratorInput, "version" | "useHeaderProtection" | "useRandomTrailers">,
): boolean {
  return input.version === "3.1" && input.useHeaderProtection && input.useRandomTrailers;
}

/** H1-H4 when they are disabled: WireGuard's own message types. */
export const DISABLED_HEADERS = ["1", "2", "3", "4"] as const;
