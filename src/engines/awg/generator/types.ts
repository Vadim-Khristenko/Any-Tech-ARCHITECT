import type { Finding } from "@/types/findings";
import type { DomainRegion } from "@/types/domain";
import type { AwgEngine } from "./engines";
/**
 * AmneziaWG Architect — Generator public types.
 */

export type AWGVersion = "1.0" | "1.5" | "2.0" | "3.0" | "3.1";
export type Intensity = "low" | "medium" | "high";

export type MimicProfile =
  | "quic_initial"
  | "quic_0rtt"
  | "tls_client_hello"
  | "wireguard_noise"
  | "dtls"
  | "http3"
  | "sip"
  | "tls_to_quic"
  | "quic_burst"
  | "dns_query"
  | "random";

/**
 * Which browser the packet sizes imitate.
 *
 * A plain string keyed to `shared/fingerprints` rather than a union spelled
 * out here. The union listed six while the registry held ten, so a browser
 * added to the registry — 360, QQ, iOS — could not be selected however
 * complete its data was: it had to be typed out in a second place first.
 *
 * The empty string means no imitation at all.
 */
export type BrowserProfile = string;

// Lives in shared/fingerprints, beside the data it describes.
export type { BfpSlot } from "@/shared/fingerprints";

/** Input parameters for the generator. */
export interface GeneratorInput {
  version: AWGVersion;
  intensity: Intensity;
  profile: MimicProfile;
  customHost: string;
  mimicAll: boolean;

  useTagC: boolean;
  useTagT: boolean;
  useTagR: boolean;
  useTagRC: boolean;
  useTagRD: boolean;

  useBrowserFp: boolean;
  browserProfile: BrowserProfile;
  mtu: number;
  junkLevel: number;

  /** Failed-attempt counter used for automatic strengthening. */
  iterCount: number;

  /** Low-power router mode (minimal noise). */
  routerMode: boolean;

  /** Use extreme parameter ceilings. */
  useExtremeMax: boolean;

  /**
   * Where the mimicry hostnames should be plausible.
   *
   * A junk packet naming a host nobody near the client would contact is a
   * packet that stands out rather than blends in, so the pool follows the
   * user rather than being global by default.
   */
  hostRegion: DomainRegion | "any";

  /** Target client for compatibility filtering. */
  clientId: string;

  /**
   * A specific older build of that client, when the user has one.
   *
   * Null means the current build. A client is not one set of limits forever —
   * AmneziaWG for Windows capped H values at 2^31-1 until v2.0.2 — and the
   * generator has to produce for the build the config is going to.
   */
  clientRelease?: string | null;

  /**
   * AWG 3.0 — emit a HeaderProtectionKey (ChaCha20 header/message encryption).
   * Forces S1–S4 ≥ 12, because the cipher nonce is read from the S-padding.
   */
  useHeaderProtection: boolean;

  /** AWG 3.0 — emit ContentPaddingAddition (extra random transport padding). */
  useContentPadding: boolean;

  /** AWG 3.0 — randomise the protocol timers instead of the fixed constants. */
  useRandomTimings: boolean;

  /** AWG 3.1 — append a random tail to every packet (RandomTrailers). */
  useRandomTrailers: boolean;

  /** AWG 3.1 — never send cookie replies (DisableCookies). */
  useDisableCookies: boolean;
}

/**
 * The 3.x parameter block.
 *
 * Verified against amneziawg-go v3.0.1 (`device/uapi.go`, `device/send.go`,
 * `device/timers.go`), amneziawg-tools `master` (`src/config.c`) and the
 * v3.1 line (`random_trailers`, `disable_cookies` in `device/uapi.go`).
 */
export interface AWG3Params {
  /**
   * 32-byte ChaCha20 key, base64 with padding — the same encoding `.conf`
   * uses for PrivateKey/PresharedKey. Empty string = feature disabled.
   */
  headerProtectionKey: string;

  /** Extra random padding per transport packet, "lo-hi" seconds-free range. */
  contentPaddingAddition: string;

  /** Randomised protocol timers, each a "lo-hi" range. Empty = client default. */
  rekeyAfterTime: string;
  rekeyTimeout: string;
  rejectAfterTime: string;
  keepaliveTimeout: string;
  maxHandshakeAttempts: string;

  /** AWG 3.1 — a random-length trailer on every packet the device sends. */
  randomTrailers: boolean;

  /**
   * AWG 3.1 — the device stays silent when it would send a cookie reply.
   * Breaks NAT keepalive under load, which is why the generator defaults off.
   */
  disableCookies: boolean;
}

/** Generated AmneziaWG obfuscation configuration. */
export interface AWGConfig {
  version: AWGVersion;
  profile: MimicProfile;

  // Dynamic header ranges (AWG 2.0)
  h1: string;
  h2: string;
  h3: string;
  h4: string;

  // Single header values (AWG 1.x)
  h1s: number;
  h2s: number;
  h3s: number;
  h4s: number;

  // Packet size prefixes
  s1: number;
  s2: number;
  s3: number;
  s4: number;

  // Junk train
  jc: number;
  jmin: number;
  jmax: number;

  // CPS signature chain
  i1: string;
  i2: string;
  i3: string;
  i4: string;
  i5: string;

  /** The 3.x block — present only on versions that carry it (3.0, 3.1). */
  awg3?: AWG3Params;
}

/** Validation result for a single AWG parameter. */
/**
 * A validator finding.
 *
 * The shared type, not one of its own. This used to carry a required Russian
 * `msg` with an optional `code` beside it — the sentence was the real payload
 * and the code was the aspiration. It is the other way round now: the code and
 * its values are the finding, and the sentence is produced from the catalogue
 * in whatever language the reader is using.
 */
export type ValidationFinding = Finding;

/** Compatibility descriptor for a concrete AWG client implementation. */
export interface ClientCapability {
  id: string;
  name: string;
  platforms: string[];
  /** What parses the junk-packet chain underneath — see ./engines.ts. */
  engine: AwgEngine;
  /** Maximum accepted H value (INT32_MAX or UINT32_MAX). */
  maxHValue: number;
  supportsS3S4: boolean;
  supportsCpsTagC: boolean;
  supportsCpsTagRC: boolean;
  supportsCpsTagRD: boolean;
  supportsI1I5: boolean;
  maxJc: number;
  maxS4: number;
  knownIssues: string[];
}
