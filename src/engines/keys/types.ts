/**
 * The shapes a `vpn://` key holds.
 *
 * Named after the container format rather than after any one protocol:
 * the same envelope carries WireGuard, AmneziaWG, XRay and OpenVPN.
 */

import type { LocalisedNote } from "@/shared/errors";


/** AWG container within a VPN config */
export interface AwgContainer {
  [key: string]: unknown;
  Jc?: string;
  Jmin?: string;
  Jmax?: string;
  I1?: string;
  I2?: string;
  I3?: string;
  I4?: string;
  I5?: string;
  last_config?: string;
  config?: string;
}

/** A single container entry in a VPN config */
export interface ContainerEntry {
  container?: string;
  awg?: AwgContainer;
  [key: string]: unknown;
}

/** Decoded VPN configuration object */
export interface VpnConfig {
  containers?: ContainerEntry[];
  defaultContainer?: string;
  description?: string;
  dns1?: string;
  dns2?: string;
  hostName?: string;
  nameOverriddenByUser?: boolean;
  [key: string]: unknown;
}

/** Generated config params (from generator) */
export interface GeneratedParams {
  jc: number;
  jmin: number;
  jmax: number;
  i1?: number;
  i2?: number;
  i3?: number;
  i4?: number;
  i5?: number;
  [key: string]: unknown;
}

/** Obfuscation patch — string values for AWG fields */
export interface ObfuscationPatch {
  Jc: string;
  Jmin: string;
  Jmax: string;
  I1?: string;
  I2?: string;
  I3?: string;
  I4?: string;
  I5?: string;
}

/** Result of applying a patch to VPN config */
export interface PatchResult {
  updated: VpnConfig;
  changed: string[];
  containerCount: number;
}

/** Result of merging multiple VPN configs */
export interface MergeResult {
  merged: VpnConfig;
  warnings: LocalisedNote[];
  stats: {
    total: number;
    unique: number;
    dupes: number;
  };
}

/** AWG version string — matches generator's AWGVersion for patch building */
export type AwgVersion = "1.0" | "1.5" | "2.0" | "3.0" | "3.1";
