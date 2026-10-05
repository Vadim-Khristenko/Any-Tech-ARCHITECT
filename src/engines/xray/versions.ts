/**
 * Xray-core versions the generator supports, and what each one changed.
 *
 * Xray-core uses CalVer and ships every couple of weeks, so "which version"
 * is a real question for anyone with a server they have not updated. The
 * capability flags below are what the generator branches on; the notes record
 * why a flag exists, taken from the commit that introduced it.
 *
 * The floor is v24.11.11. Below it XHTTP is missing `stream-up` and the
 * upload/download split, which is most of what makes XHTTP worth choosing —
 * a config generated here would name settings the core does not understand.
 * We do not intend to support older cores.
 */

import type { VersionDescriptor } from "@/types/protocol";

/**
 * How a core treats REALITY's ML-DSA-65 seed.
 *
 * A boolean was wrong in both directions. v25.7.23 introduced the field and
 * *requires* it: a REALITY inbound without `mldsa65Seed` is rejected with
 * `invalid "mldsa65Seed": ""`. From v25.8.29 it is optional again. Verified
 * against the released cores, not read off a changelog.
 */
export type Mldsa65Support = "none" | "required" | "optional";

/** XHTTP modes a core understands. `auto` is resolved before it is emitted. */
export type XhttpModeSupport = readonly ("packet-up" | "stream-up" | "stream-one")[];

export interface XrayVersion extends VersionDescriptor {
  /** ML-DSA-65 post-quantum verification for REALITY. Since v25.7.23. */
  mldsa65: Mldsa65Support;
  /**
   * VLESS Encryption, the ML-KEM-768 + X25519 layer.
   *
   * v25.8.29 does not have it — the core has no `vlessenc` command and
   * rejects an `mlkem768x25519plus…` decryption string outright. It lands in
   * v26.1.13.
   */
  vlessEncryption: boolean;
  /**
   * XHTTP modes this core accepts.
   *
   * v24.11.11 has no `stream-one`; asking for it fails the config with
   * `unsupported mode: stream-one`, which is how it was found.
   */
  xhttpModes: XhttpModeSupport;
  /** Hysteria as a transport. Since v26.1.13. */
  hysteria: boolean;
  /**
   * FinalMask: XRay's own obfuscation below the transport. Since v26.6.22.
   *
   * The closest thing the core has to what AmneziaWG does — junk packets and
   * fragmentation rather than hiding inside another protocol.
   */
  finalMask: boolean;
  /**
   * The XHTTP knob set beyond path, mode, padding size and xmux.
   *
   * Padding placement, method, key and header; session id placement, length,
   * key and table; the sequence counter; uplink data placement and method;
   * the server header cap. All of it arrived together in v26.6.22.
   *
   * This was previously modelled as a rename — `session*` before v26.6.22 and
   * `sessionID*` from it — which was wrong in a way only the core could
   * settle: probing every release with a deliberately invalid value showed
   * that `sessionPlacement` is read by *no* version. There was no older
   * spelling; the knobs did not exist. Writing them to an older core produces
   * a config that loads and quietly ignores half of what the user chose.
   */
  xhttpAdvanced: boolean;

  /** Extra request headers on XHTTP. Since v25.7.23. */
  xhttpHeaders: boolean;

  /**
   * Throttling the traffic handed to the REALITY donor site. Since v25.7.23.
   *
   * Established by probe rather than by reading: a string where the core
   * expects a struct is rejected if it knows the field and ignored if it does
   * not. v24.11.11 ignores it.
   */
  realityLimitFallback: boolean;
  /**
   * Stream settings call the transport `method`. Before v26.7.11 the only
   * name was `network`, which is still accepted — so `network` is always
   * safe and `method` only from v26.7.11.
   */
  methodName: boolean;
  /**
   * The core supplies a default `minClientVer` of 26.3.27. Before v26.7.11
   * there was no default, so a config that omits it behaves differently.
   */
  defaultMinClientVer: boolean;
}

/**
 * Newest first. Only versions that changed something the generator emits are
 * listed — there is no value in offering a release that produces byte-identical
 * output to the one above it.
 */
export const XRAY_VERSIONS: readonly XrayVersion[] = [
  {
    id: "26.7.11",
    label: "v26.7.11+",
    isNewest: true,
    mldsa65: "optional",
    vlessEncryption: true,
    xhttpModes: ["packet-up", "stream-up", "stream-one"],
    hysteria: true,
    finalMask: true,
    xhttpAdvanced: true,
    xhttpHeaders: true,
    realityLimitFallback: true,
    methodName: true,
    defaultMinClientVer: true,
  },
  {
    id: "26.6.22",
    label: "v26.6.22",
    mldsa65: "optional",
    vlessEncryption: true,
    xhttpModes: ["packet-up", "stream-up", "stream-one"],
    hysteria: true,
    finalMask: true,
    xhttpAdvanced: true,
    xhttpHeaders: true,
    realityLimitFallback: true,
    methodName: false,
    defaultMinClientVer: false,
  },
  {
    id: "26.1.13",
    label: "v26.1.13",
    mldsa65: "optional",
    vlessEncryption: true,
    xhttpModes: ["packet-up", "stream-up", "stream-one"],
    hysteria: true,
    finalMask: false,
    xhttpAdvanced: false,
    xhttpHeaders: true,
    realityLimitFallback: true,
    methodName: false,
    defaultMinClientVer: false,
  },
  {
    id: "25.8.29",
    label: "v25.8.29",
    mldsa65: "optional",
    vlessEncryption: false,
    xhttpModes: ["packet-up", "stream-up", "stream-one"],
    hysteria: false,
    finalMask: false,
    xhttpAdvanced: false,
    xhttpHeaders: true,
    realityLimitFallback: true,
    methodName: false,
    defaultMinClientVer: false,
  },
  {
    id: "25.7.23",
    label: "v25.7.23",
    mldsa65: "required",
    vlessEncryption: false,
    xhttpModes: ["packet-up", "stream-up", "stream-one"],
    hysteria: false,
    finalMask: false,
    xhttpAdvanced: false,
    xhttpHeaders: true,
    realityLimitFallback: true,
    methodName: false,
    defaultMinClientVer: false,
  },
  {
    id: "24.11.11",
    label: "v24.11.11",
    isLegacy: true,
    isFloor: true,
    mldsa65: "none",
    vlessEncryption: false,
    xhttpModes: ["packet-up", "stream-up"],
    hysteria: false,
    finalMask: false,
    xhttpAdvanced: false,
    xhttpHeaders: false,
    realityLimitFallback: false,
    methodName: false,
    defaultMinClientVer: false,
  },
];

export type XrayVersionId = (typeof XRAY_VERSIONS)[number]["id"];

const BY_ID = new Map(XRAY_VERSIONS.map((v) => [v.id, v]));

/**
 * Capabilities for a version.
 *
 * Falls back to the newest entry rather than returning undefined: an unknown
 * string means the caller was handed a version this build predates, and
 * assuming the richest feature set is a better failure than rendering nothing.
 */
export function xrayCaps(version: string): XrayVersion {
  return BY_ID.get(version) ?? XRAY_VERSIONS[0];
}

/** The oldest version offered, for the "anything below this" notice. */
export const XRAY_FLOOR = XRAY_VERSIONS.find((v) => v.isFloor)!;

/** Is this version at or above the floor? */
export function isSupportedVersion(version: string): boolean {
  return BY_ID.has(version);
}
