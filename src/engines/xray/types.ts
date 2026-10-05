/**
 * XRay generator input and output.
 *
 * Shaped after what Xray-core actually accepts rather than after AmneziaWG's
 * model: there is no counterpart here to Jc or S1–S4, and the interesting
 * choices are structural — which transport, which security layer, whether the
 * uplink and downlink travel the same way.
 */

import type { XrayVersionId } from "./versions";

/* ── Choices ──────────────────────────────────────────────────────────────── */

/**
 * Transport, under the names the core accepts today.
 *
 * `raw` and `xhttp` are the current spellings of `tcp` and `splithttp`. gRPC,
 * WebSocket and HTTPUpgrade still work but the core prints a deprecation
 * notice pointing at XHTTP, so they are offered only for existing servers.
 */
export type XrayTransport =
  | "raw"
  | "xhttp"
  | "grpc"
  | "ws"
  | "httpupgrade"
  /** QUIC-based, with its own masquerade. Since v26.1.13. */
  | "hysteria";

/** Transports REALITY can sit on: "REALITY only supports RAW, XHTTP and gRPC". */
export const REALITY_TRANSPORTS: readonly XrayTransport[] = [
  "raw",
  "xhttp",
  "grpc",
];

/** The security layer wrapping the stream. */
export type XraySecurity = "reality" | "tls" | "none";

/**
 * VLESS flow.
 *
 * Vision needs TLS 1.3 underneath and must match on both ends. Anything not
 * listed here is an "unknown request flow" to the core.
 *
 * The `-udp443` suffix is an **outbound** value: it tells a client not to
 * intercept UDP/443, so QUIC goes direct instead of through the tunnel. The
 * inbound does not accept it, which is why the renderer writes the base value
 * into the server and the full one into the client link. Treating them as one
 * string is how a config ends up with a flow the server rejects.
 */
export type XrayFlow = "" | "xtls-rprx-vision" | "xtls-rprx-vision-udp443";

/** What the server side may carry, with any client-only suffix removed. */
export function inboundFlow(flow: XrayFlow): string {
  return flow.replace(/-udp443$/, "");
}

/**
 * XHTTP mode. `auto` resolves in the core: `packet-up` normally, `stream-one`
 * under REALITY, `stream-up` when a separate download transport is set.
 */
export type XhttpMode = "auto" | "packet-up" | "stream-up" | "stream-one";

/** Where XHTTP hides a piece of itself. Seven slots, from common.go. */
export type XhttpPlacement =
  | "auto"
  | "queryInHeader"
  | "cookie"
  | "header"
  | "query"
  | "path"
  | "body";

/**
 * How XHTTP fills its padding.
 *
 * `repeat-x` is a run of the letter x, which is what the core does unless
 * told otherwise and therefore what a middlebox learns to look for.
 * `tokenish` produces something that reads like an opaque token instead.
 */
export type XhttpPaddingMethod = "repeat-x" | "tokenish";

/**
 * Where the uplink data itself travels.
 *
 * `cookie` and `header` are only legal in `packet-up` mode — the core refuses
 * the config outright anywhere else.
 */
export type XhttpUplinkPlacement = "auto" | "body" | "cookie" | "header";

/**
 * Rate limit for traffic handed to the donor site.
 *
 * `afterBytes` is the grace: the first N bytes go at full speed and the
 * throttle applies past it. That keeps a genuine visitor's page load fast
 * while a prober pulling gigabytes gets nothing.
 */
export interface LimitFallback {
  afterBytes: number;
  bytesPerSec: number;
  burstBytesPerSec: number;
}

/** VLESS Encryption mode, the middle element of the decryption string. */
export type VlessEncryptionMode = "native" | "xorpub" | "random";

import type { FinalMaskConfig, FinalMaskInput } from "./finalmask";
import type { TransportConfig, TransportInput } from "./transports";
import type { SockoptConfig, SockoptInput } from "./sockopt";

/* ── Input ────────────────────────────────────────────────────────────────── */

/** XHTTP knobs, grouped the way the panels group them. */
export interface XhttpSettings {
  mode: XhttpMode;
  /** Request path. Always starts with a slash. */
  path: string;
  /** Host header, when it should differ from the address. */
  host: string;

  /** Padding, six knobs the core exposes separately. */
  paddingBytes: string;
  paddingObfsMode: boolean;
  paddingPlacement: XhttpPlacement;
  /**
   * What the padding parameter is called.
   *
   * The core defaults to `x_padding` and `X-Padding`, which is exactly what
   * makes a padded XHTTP request recognisable as one. Naming them something
   * else is the cheapest thing this generator can do about that.
   */
  paddingKey: string;
  paddingHeader: string;
  /** `repeat-x` fills with the letter x; `tokenish` looks like a token. */
  paddingMethod: XhttpPaddingMethod;

  /** Session identity. */
  sessionIdPlacement: XhttpPlacement;
  sessionIdLength: string;
  /** Parameter name, when the session id is not in the path. */
  sessionIdKey: string;
  /** Alphabet the session id is drawn from. Empty means the core's own. */
  sessionIdTable: string;

  /** The chunk counter: where it rides and what it is called. */
  seqPlacement: XhttpPlacement;
  seqKey: string;

  /** Where the uplink data itself goes, and under what name. */
  uplinkDataPlacement: XhttpUplinkPlacement;
  uplinkDataKey: string;
  /** Bytes per uplink chunk. */
  uplinkChunkSize: string;
  /** `POST` normally; `GET` is only legal in packet-up. */
  uplinkHttpMethod: string;

  /** Mimicry: dropping these headers makes the stream look less like gRPC/SSE. */
  noGrpcHeader: boolean;
  noSseHeader: boolean;

  /** Extra request headers. `host` is refused by the core; use `host` above. */
  headers: Record<string, string>;

  /** Upload pacing: how much per POST, how often, how much may queue. */
  scMaxEachPostBytes: string;
  scMinPostsIntervalMs: string;
  scMaxBufferedPosts: string;
  /** How long the server holds a stream-up request open. */
  scStreamUpServerSecs: string;

  /** Server-side cap on request header size. Zero means the core's default. */
  serverMaxHeaderBytes: string;

  /** Multiplexing. */
  xmuxMaxConcurrency: string;
  xmuxMaxConnections: string;
  xmuxCMaxReuseTimes: string;
  xmuxHMaxRequestTimes: string;
  xmuxHMaxReusableSecs: string;
  xmuxHKeepAlivePeriod: string;

  /** Send the downlink over its own transport. Turns `auto` into `stream-up`. */
  splitDownload: boolean;
}

/** Everything the user chooses. */
export interface XrayInput {
  version: XrayVersionId;

  /** Server address and port, as they will appear in the client config. */
  address: string;
  port: number;

  transport: XrayTransport;
  security: XraySecurity;
  flow: XrayFlow;

  /** REALITY target: the site the handshake is dressed as. */
  dest: string;
  /** Names offered as SNI. The first is what a client uses. */
  serverNames: string[];
  /** PROXY protocol version in front of the target: 0, 1 or 2. */
  xver: number;

  /** How many shortIds to issue, and how long each is (hex characters). */
  shortIdCount: number;
  shortIdLength: number;

  /** Post-quantum verification, where the version supports it. */
  useMldsa65: boolean;

  /**
   * Newest client version the server will accept. Empty means no ceiling.
   *
   * The mirror of `minClientVer`: useful when a newer client changes
   * something the deployment is not ready for.
   */
  maxClientVer: string;

  /**
   * How far the two clocks may differ, in milliseconds. Zero is the core's
   * own default.
   *
   * REALITY authenticates with a timestamp, so a client whose clock has
   * drifted past this is refused — which is a real support case, and the
   * reason the knob is worth exposing rather than hiding.
   */
  maxTimeDiff: number;

  /**
   * Throttle applied to traffic that failed authentication and was passed to
   * the donor site, as "afterBytes/bytesPerSec/burstBytesPerSec".
   *
   * Without it, anyone probing the port gets the donor site at full speed on
   * the server's bandwidth.
   */
  limitFallbackUpload: string;
  limitFallbackDownload: string;

  /**
   * Tune the client-side crawl of the donor site.
   *
   * The core reads `p`, `c`, `t`, `i` and `r` out of spiderX's query —
   * padding, concurrency, times, interval and return — into the ten numbers
   * it calls spiderY. Leaving them unset makes every client crawl alike.
   */
  spiderTuning: boolean;

  /** VLESS Encryption instead of, or beside, the TLS layer. */
  useVlessEncryption: boolean;
  vlessEncryptionMode: VlessEncryptionMode;
  /** Ticket lifetime, seconds; a range widens it. */
  vlessEncryptionSeconds: string;

  /** Browser to imitate, resolved through the shared fingerprint registry. */
  fingerprint: string;
  /** Pin the exact uTLS profile rather than the rolling alias. */
  pinFingerprint: boolean;

  xhttp: XhttpSettings;

  /**
   * Per-transport settings.
   *
   * Every one of these blocks used to be left out, so a generated config ran
   * on the core's defaults for whichever transport it chose — including RAW,
   * where the default is no HTTP masquerade at all.
   */
  transportSettings: TransportInput;

  /**
   * Options on the socket underneath everything else.
   *
   * Congestion control and keepalive timing are visible from outside and
   * identical across every deployment that never set them.
   */
  sockopt: SockoptInput;

  /**
   * FinalMask: XRay's own obfuscation, below the transport.
   *
   * The closest thing the core has to what AmneziaWG does — junk packets and
   * fragmentation, rather than hiding inside another protocol.
   */
  finalMask: FinalMaskInput;

  /** How many client UUIDs to issue. */
  clientCount: number;
}

/* ── Output ───────────────────────────────────────────────────────────────── */

/** A REALITY key pair, both halves in the encoding the core wants. */
export interface RealityKeys {
  /** base64 RawURL, 32 bytes. Server side. */
  privateKey: string;
  /** base64 RawURL, 32 bytes. Client side, named `password` in newer cores. */
  publicKey: string;
}

/** ML-DSA-65 pair. The verify half is 1952 bytes, which is not a typo. */
export interface Mldsa65Keys {
  seed: string;
  verify: string;
}

/** One client identity. */
export interface XrayClient {
  id: string;
  flow: XrayFlow;
  /** Present only when VLESS Encryption is on. */
  encryption?: string;
}

/**
 * A generated configuration.
 *
 * Holds both halves — what goes on the server and what goes to the client —
 * because they are generated together and only make sense as a pair.
 */
export interface XrayConfig {
  version: XrayVersionId;

  address: string;
  port: number;
  transport: XrayTransport;
  security: XraySecurity;
  flow: XrayFlow;

  clients: XrayClient[];

  /** REALITY block. Absent when security is not reality. */
  reality?: {
    dest: string;
    serverNames: string[];
    xver: number;
    keys: RealityKeys;
    shortIds: string[];
    mldsa65?: Mldsa65Keys;
    fingerprint: string;
    /** Path plus, when tuned, the p/c/t/i/r query the core reads into spiderY. */
    spiderX: string;
    /** Only set when the version supplies no default of its own. */
    minClientVer?: string;
    maxClientVer?: string;
    maxTimeDiff?: number;
    limitFallbackUpload?: LimitFallback;
    limitFallbackDownload?: LimitFallback;
  };

  /** VLESS Encryption strings: `decryption` for the server, `encryption` per client. */
  vlessEncryption?: {
    decryption: string;
    encryption: string;
  };

  /** XHTTP block. Absent for other transports. */
  xhttp?: XhttpSettings & { resolvedMode: Exclude<XhttpMode, "auto"> };

  /** Settings for whichever transport was chosen. */
  transportSettings: TransportConfig;

  /** Socket options, below every other layer. */
  sockopt: SockoptConfig;

  /**
   * FinalMask: XRay obfuscating its own traffic, below the transport.
   *
   * Absent when no mask is chosen. This is the closest XRay comes to what
   * AmneziaWG does — changing the shape of the bytes rather than hiding them
   * inside another protocol.
   */
  finalMask?: FinalMaskConfig;
}
