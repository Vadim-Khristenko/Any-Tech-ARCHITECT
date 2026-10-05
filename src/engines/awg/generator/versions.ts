/**
 * AmneziaWG Architect — protocol version capabilities.
 *
 * The UI used to ask `version === "2.0"` in each place that needed to know
 * whether headers are ranges or S3/S4 exist. That drifts: 3.0 inherits 2.0's
 * parameter shape, so every one of those checks was a separate chance to
 * forget a version — and one of them did, which is why 3.0 rendered 1.x-shaped
 * headers while the .conf underneath was correct.
 *
 * Capabilities are declared once here instead. Adding AWG 4.0 means adding one
 * entry, not auditing every `=== "2.0"` in the codebase.
 */

import type { AWGVersion } from "./types";

/** What a protocol version supports, as far as the parameter shape goes. */
export interface VersionCapability {
  id: AWGVersion;

  /** Tab label. Not translated: the protocol spells itself the same anywhere. */
  label: string;

  /** Marks the newest release so the tab can flag it. */
  isNewest?: boolean;

  /** H1–H4 are `"lo-hi"` ranges rather than one value each. */
  rangedHeaders: boolean;

  /** S3/S4 packet-size prefixes exist alongside S1/S2. */
  extraSizes: boolean;

  /** CPS signature chain I1–I5 is available. */
  cps: boolean;

  /** Carries the 3.x block: header protection, content padding, timers. */
  headerProtection: boolean;

  /**
   * Understands the 3.1 switches: RandomTrailers and DisableCookies.
   * A 3.0 device rejects both keys at config parse, so they are emitted
   * only where the version reads them.
   */
  featureFlags: boolean;
}

/**
 * Newest first — the tab strip renders in this order.
 */
export const AWG_VERSIONS: readonly VersionCapability[] = [
  {
    id: "3.1",
    label: "AWG 3.1",
    isNewest: true,
    rangedHeaders: true,
    extraSizes: true,
    cps: true,
    headerProtection: true,
    featureFlags: true,
  },
  {
    id: "3.0",
    label: "AWG 3.0",
    rangedHeaders: true,
    extraSizes: true,
    cps: true,
    headerProtection: true,
    featureFlags: false,
  },
  {
    id: "2.0",
    label: "AWG 2.0",
    rangedHeaders: true,
    extraSizes: true,
    cps: true,
    headerProtection: false,
    featureFlags: false,
  },
  {
    id: "1.5",
    label: "AWG 1.5",
    rangedHeaders: false,
    extraSizes: false,
    cps: true,
    headerProtection: false,
    featureFlags: false,
  },
  {
    id: "1.0",
    label: "AWG 1.0",
    rangedHeaders: false,
    extraSizes: false,
    cps: false,
    headerProtection: false,
    featureFlags: false,
  },
] as const;

const BY_ID = new Map<AWGVersion, VersionCapability>(
  AWG_VERSIONS.map((v) => [v.id, v]),
);

/**
 * Capabilities for a version. Falls back to the newest entry rather than
 * returning undefined: an unknown string here means the caller was handed a
 * version this build predates, and rendering it with the richest shape is a
 * better failure than rendering nothing.
 */
export function capsFor(version: AWGVersion): VersionCapability {
  return BY_ID.get(version) ?? AWG_VERSIONS[0];
}
