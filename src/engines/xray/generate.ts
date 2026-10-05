/**
 * Producing an XRay configuration.
 *
 * Every constraint here came out of Xray-core's own parser rather than the
 * documentation — `infra/conf/transport_security.go` for REALITY,
 * `proxy/vless/inbound/inbound.go` for flow, `transport/internet/splithttp`
 * for XHTTP. Where the core would reject a value, this refuses to emit it.
 */

import { cryptoBytes, cryptoRnd, cryptoPick } from "@/shared/rng";
import { generateX25519Pair, toBase64Url } from "@/shared/x25519";
import { bytesToHex } from "@/shared/hex";
import { fingerprintById } from "@/shared/fingerprints";
import { xrayCaps, type XhttpModeSupport } from "./versions";
import { buildFinalMask, defaultFinalMask } from "./finalmask";
import { buildTransport, defaultTransport } from "./transports";
import { buildSockopt, defaultSockopt } from "./sockopt";
import { REALITY_TRANSPORTS } from "./types";
import type {
  LimitFallback,
  XrayConfig,
  XrayInput,
  XrayClient,
  XrayTransport,
  XrayFlow,
  XraySecurity,
  XhttpMode,
  XhttpSettings,
} from "./types";

/* ── Small pieces ─────────────────────────────────────────────────────────── */

/** RFC 4122 version 4, from the crypto source rather than Math.random. */
export function uuidV4(): string {
  const b = cryptoBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = bytesToHex(b);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

/**
 * A REALITY shortId.
 *
 * The core decodes it with `hex.Decode` into an 8-byte buffer and rejects
 * anything longer than 16 characters, so the length is even and capped. An
 * odd length would fail to decode — which is why this takes bytes and doubles
 * rather than taking a character count directly.
 */
export function makeShortId(hexChars: number): string {
  const even = Math.max(2, Math.min(16, hexChars - (hexChars % 2)));
  return bytesToHex(cryptoBytes(even / 2));
}

/**
 * The VLESS Encryption string.
 *
 * Format from `infra/conf/vless.go`: `mlkem768x25519plus.<mode>.<seconds>`
 * followed by key material, where an element shorter than 20 characters is
 * padding and anything longer must decode to 32 or 64 bytes.
 */
export function makeVlessEncryption(
  mode: string,
  seconds: string,
): { decryption: string; encryption: string } {
  const key = toBase64Url(cryptoBytes(32));
  const head = `mlkem768x25519plus.${mode}.${seconds}`;
  return {
    decryption: `${head}.${key}`,
    encryption: `${head}.${key}`,
  };
}

/**
 * Resolve XHTTP's `auto`.
 *
 * The core does this in `splithttp/dialer.go`: `packet-up` normally,
 * `stream-one` under REALITY, and `stream-up` when a separate download
 * transport is configured. Resolving it here means the config records what
 * will actually happen rather than leaving the reader to work it out.
 */
export function resolveXhttpMode(
  mode: XhttpMode,
  isReality: boolean,
  splitDownload: boolean,
  supported: XhttpModeSupport = ALL_XHTTP_MODES,
): Exclude<XhttpMode, "auto"> {
  const wanted = pickXhttpMode(mode, isReality, splitDownload);
  if (supported.includes(wanted)) return wanted;

  // v24.11.11 has no `stream-one`, and a config naming it does not load at
  // all. `stream-up` is the closest thing that core has: still a streamed
  // upload, just with the download on its own request.
  if (wanted === "stream-one" && supported.includes("stream-up")) {
    return "stream-up";
  }
  return supported[0] ?? "packet-up";
}

function pickXhttpMode(
  mode: XhttpMode,
  isReality: boolean,
  splitDownload: boolean,
): Exclude<XhttpMode, "auto"> {
  if (mode !== "auto") return mode;
  if (!isReality) return "packet-up";
  return splitDownload ? "stream-up" : "stream-one";
}

const ALL_XHTTP_MODES: XhttpModeSupport = [
  "packet-up",
  "stream-up",
  "stream-one",
];

/* ── Defaults ─────────────────────────────────────────────────────────────── */

/** Paths that look like something a real site would serve. */
const PLAUSIBLE_PATHS = [
  "/api/v1/stream",
  "/assets/chunk",
  "/media/segment",
  "/static/bundle",
  "/cdn/asset",
];

/**
 * Parameter names that read like something a real site would use.
 *
 * The core's own defaults — `x_padding`, `X-Padding`, `x_session` — are what
 * make a padded XHTTP request identifiable as one, and they are the same for
 * every deployment on earth. Drawing from a pool of plausible alternatives is
 * the cheapest anti-fingerprinting this generator can do.
 */
const QUERY_NAMES = ["cb", "v", "_t", "rev", "sid", "nonce", "ts", "tk"];

/**
 * Slots the session id and the sequence counter can ride in.
 *
 * `auto` is excluded on purpose: it resolves to `path` in the core, and a
 * path-borne id is what every default deployment produces.
 */
const ID_PLACEMENTS = ["path", "query", "cookie", "header"] as const;

/** Slots the padding can ride in. `queryInHeader` is the core default. */
const PADDING_PLACEMENTS = ["queryInHeader", "query", "cookie", "header"] as const;
const HEADER_NAMES = [
  "X-Request-Id",
  "X-Correlation-Id",
  "X-Trace-Id",
  "X-Client-Token",
  "X-Cache-Key",
];

export function defaultXhttp(): XhttpSettings {
  return {
    mode: "auto",
    path: cryptoPick(PLAUSIBLE_PATHS),
    host: "",

    paddingBytes: "100-1000",
    // Obfuscated padding is the whole point of a tool like this; the core
    // leaves it off, which is why leaving it off is what most traffic does.
    paddingObfsMode: true,
    // The slot the padding rides in is a shape of its own; queryInHeader is
    // what the core picks unless told, so everyone leaving it looks alike.
    paddingPlacement: cryptoPick(PADDING_PLACEMENTS),
    paddingKey: cryptoPick(QUERY_NAMES),
    paddingHeader: cryptoPick(HEADER_NAMES),
    // A run of the letter x is the giveaway the core produces by default.
    paddingMethod: "tokenish",

    // Where the session id rides is itself a shape: everyone leaving it in
    // the path looks the same, and the core has three other slots for it.
    sessionIdPlacement: cryptoPick(ID_PLACEMENTS),
    sessionIdLength: "8-16",
    sessionIdKey: cryptoPick(QUERY_NAMES),
    // Empty means the core's own alphabet: a custom one has to be large
    // enough that the id space still exceeds 2^31, and the core checks.
    sessionIdTable: "",

    seqPlacement: cryptoPick(ID_PLACEMENTS),
    seqKey: cryptoPick(QUERY_NAMES),

    uplinkDataPlacement: "auto",
    // Only meaningful once a placement is chosen, and the default leaves
    // that to the core — so this stays unset with it.
    uplinkDataKey: "",
    uplinkChunkSize: "",
    // Empty means the core's own default, POST — the same convention the
    // other unset knobs use, so "not chosen" reads the same everywhere.
    uplinkHttpMethod: "",

    // These headers are what make an XHTTP stream read as gRPC or as SSE.
    // Dropping them is the point of a tool like this; the core keeps them.
    noGrpcHeader: true,
    noSseHeader: true,
    headers: {},

    scMaxEachPostBytes: "",
    scMinPostsIntervalMs: "",
    scMaxBufferedPosts: "",
    scStreamUpServerSecs: "",

    serverMaxHeaderBytes: "",

    // Empty means "draw one": the xmux numbers are the client's own
    // connection behaviour, and leaving them at the core defaults makes every
    // Architect client behave identically where it is most visible.
    xmuxMaxConcurrency: "",
    xmuxMaxConnections: "",
    xmuxCMaxReuseTimes: "",
    xmuxHMaxRequestTimes: "",
    xmuxHMaxReusableSecs: "",
    xmuxHKeepAlivePeriod: "",

    splitDownload: false,
  };
}

/** Settings a fresh visitor starts from: REALITY over RAW with Vision. */
export function createDefaults(): XrayInput {
  return {
    version: "26.7.11",
    address: "",
    port: 443,
    transport: "raw",
    security: "reality",
    flow: "xtls-rprx-vision",
    // Probed rather than assumed: HTTP/2 and TLS 1.3, 200 OK with no
    // redirect, certificate chain 4466 bytes, and — the part that matters —
    // not behind Cloudflare. The old default was www.cloudflare.com, which
    // is, and a donor sharing a CDN with the server pretending to be it is
    // the classic way a REALITY setup gives itself away.
    dest: "www.bing.com:443",
    serverNames: ["www.bing.com"],
    xver: 0,
    shortIdCount: 3,
    shortIdLength: 8,
    useMldsa65: false,
    maxClientVer: "",
    maxTimeDiff: 0,
    limitFallbackUpload: "",
    limitFallbackDownload: "",
    // On by default: an untuned spider crawls the donor site the same way for
    // everyone, which is a shape in itself.
    spiderTuning: true,
    useVlessEncryption: false,
    vlessEncryptionMode: "native",
    vlessEncryptionSeconds: "0-600",
    fingerprint: "chrome",
    pinFingerprint: false,
    xhttp: defaultXhttp(),
    transportSettings: defaultTransport(),
    sockopt: defaultSockopt(),
    finalMask: defaultFinalMask(),
    clientCount: 1,
  };
}

/**
 * A spiderX with the crawl tuned.
 *
 * The core parses five parameters out of the query — `p` padding, `c`
 * concurrency, `t` times, `i` interval, `r` return — each a single number or
 * a range, into the ten integers it calls spiderY. An untuned spider crawls
 * the donor site identically for everyone, which is a shape of its own.
 */
export function spiderX(): string {
  const span = (lo: number, hi: number) => {
    const from = cryptoRnd(lo, hi);
    return `${from}-${cryptoRnd(from, hi)}`;
  };
  const query = new URLSearchParams({
    p: span(1, 6),
    c: span(1, 4),
    t: span(1, 4),
    i: span(20, 120),
    r: span(1, 3),
  });
  return `/?${query.toString()}`;
}

/**
 * Read "afterBytes/bytesPerSec/burstBytesPerSec" into the block the core
 * wants, or null when the user left it alone.
 */
export function parseLimitFallback(text: string): LimitFallback | null {
  const parts = text.split("/").map((p) => Number(p.trim()));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) {
    return null;
  }
  const [afterBytes, bytesPerSec, burstBytesPerSec] = parts as [
    number,
    number,
    number,
  ];
  // All zeroes is the same as not setting it, and writing it would only add
  // noise to the config.
  if (!afterBytes && !bytesPerSec && !burstBytesPerSec) return null;
  return { afterBytes, bytesPerSec, burstBytesPerSec };
}

/* ── Generation ───────────────────────────────────────────────────────────── */

/**
 * Build a configuration.
 *
 * Choices the core would refuse are corrected rather than emitted: Vision is
 * dropped when the security layer cannot carry it, and REALITY is dropped on
 * a transport it does not support. Validation still reports the correction, so
 * the user is told rather than silently overridden.
 */
/* ── The pieces a config is made of ───────────────────────────────────────── */

/**
 * What the core will actually accept, given what was asked for.
 *
 * Two corrections, both from `transport_internet.go`: Vision needs a TLS or
 * REALITY layer to hide inside, and REALITY only runs over RAW, XHTTP and
 * gRPC. Making them here rather than emitting the request verbatim means the
 * config loads; the validator still reports the correction, so the user is
 * told rather than silently overridden.
 */
function resolveLayers(input: XrayInput): {
  flow: XrayFlow;
  security: XraySecurity;
  transport: XrayTransport;
} {
  // Hysteria arrived in v26.1.13. An older core answers "unknown transport
  // protocol: hysteria" and refuses the config outright, so it falls back to
  // the transport nearest in spirit — XHTTP, which is what the core itself
  // points people at.
  const transport =
    input.transport === "hysteria" && !xrayCaps(input.version).hysteria
      ? "xhttp"
      : input.transport;

  const canVision = input.security === "reality" || input.security === "tls";
  const security =
    input.security === "reality" && !REALITY_TRANSPORTS.includes(transport)
      ? "tls"
      : input.security;

  return { flow: canVision ? input.flow : "", security, transport };
}

/** One account per client, all sharing the flow and the encryption ticket. */
function buildClients(
  count: number,
  flow: XrayFlow,
  encryption?: { encryption: string },
): XrayClient[] {
  return Array.from({ length: Math.max(1, count) }, () => ({
    id: uuidV4(),
    flow,
    ...(encryption ? { encryption: encryption.encryption } : {}),
  }));
}

/**
 * The REALITY block.
 *
 * The ML-DSA-65 seed is not simply the user's choice: v25.7.23 rejects a
 * REALITY inbound that has no seed, so on that core it is emitted whether or
 * not it was asked for.
 */
function buildReality(
  input: XrayInput,
  caps: ReturnType<typeof xrayCaps>,
): NonNullable<XrayConfig["reality"]> {
  const fp = fingerprintById(input.fingerprint);
  const utls = fp?.utls;
  const fingerprint =
    input.pinFingerprint && utls?.modern ? utls.modern : (utls?.preset ?? "chrome");

  const seedNeeded =
    caps.mldsa65 === "required" ||
    (input.useMldsa65 && caps.mldsa65 === "optional");

  return {
    dest: input.dest,
    serverNames: [...input.serverNames],
    xver: input.xver,
    keys: generateX25519Pair(),
    shortIds: Array.from({ length: Math.max(1, input.shortIdCount) }, () =>
      makeShortId(input.shortIdLength),
    ),
    fingerprint,
    // The core defaults spiderX to "/" and requires a leading slash. The
    // query, when tuned, is what it reads into spiderY.
    spiderX: input.spiderTuning ? spiderX() : "/",
    ...(input.maxClientVer ? { maxClientVer: input.maxClientVer } : {}),
    ...(input.maxTimeDiff > 0 ? { maxTimeDiff: input.maxTimeDiff } : {}),
    // v24.11.11 has no such field, so writing it there would be a knob the
    // user set and the core never reads.
    ...(caps.realityLimitFallback && parseLimitFallback(input.limitFallbackUpload)
      ? { limitFallbackUpload: parseLimitFallback(input.limitFallbackUpload)! }
      : {}),
    ...(caps.realityLimitFallback &&
    parseLimitFallback(input.limitFallbackDownload)
      ? {
          limitFallbackDownload: parseLimitFallback(
            input.limitFallbackDownload,
          )!,
        }
      : {}),
    ...(seedNeeded
      ? {
          mldsa65: {
            seed: toBase64Url(cryptoBytes(32)),
            // The 1952-byte verification key is derived by ML-DSA-65 itself.
            // Deriving it needs the algorithm, which this page does not carry,
            // so the field is left for the core's own tool to fill and the
            // validator says so rather than emitting something wrong.
            verify: "",
          },
        }
      : {}),
    ...(caps.defaultMinClientVer ? {} : { minClientVer: "24.11.11" }),
  };
}

/** The XHTTP block, with `auto` resolved to what this core actually has. */
/** A range the core will accept: `"lo-hi"`, never `{from,to}`. */
function range(lo: number, span: number): string {
  const start = cryptoRnd(lo, lo + span);
  return `${start}-${start + cryptoRnd(1, span)}`;
}

/**
 * How the client multiplexes its XHTTP connections.
 *
 * These are the client's own numbers — how many streams it will put on one
 * connection, how long it will keep one, how many requests it will send down
 * it before opening another. Left unset they take the core's defaults, which
 * means every Architect user's client behaves identically at the connection
 * level: the same 16-32 concurrency, the same reuse counts, the same session
 * lengths. That is a pattern, and a pattern is what the whole tool exists to
 * avoid. Drawn per config, two users look like two deployments.
 *
 * `maxConcurrency` and `maxConnections` are mutually exclusive — the core
 * rejects a config setting both — so one is chosen and the other zeroed.
 */
function buildXmux(x: XhttpSettings): Pick<
  XhttpSettings,
  | "xmuxMaxConcurrency"
  | "xmuxMaxConnections"
  | "xmuxCMaxReuseTimes"
  | "xmuxHMaxRequestTimes"
  | "xmuxHMaxReusableSecs"
  | "xmuxHKeepAlivePeriod"
> {
  // Anything the user set by hand stays exactly as they set it. Empty is the
  // signal to draw, the same convention every other unset knob here uses.
  const byConnections = Boolean(x.xmuxMaxConnections.trim());
  const byConcurrency = Boolean(x.xmuxMaxConcurrency.trim());

  return {
    // Concurrency counts streams on one connection; connections counts the
    // connections themselves. Both at once is the one combination the core
    // refuses outright, so whichever was asked for wins and the other is
    // zeroed.
    xmuxMaxConcurrency: byConnections ? "0" : byConcurrency ? x.xmuxMaxConcurrency : range(8, 16),
    xmuxMaxConnections: byConnections ? x.xmuxMaxConnections : "0",

    // How many times a connection is reused before being dropped. Zero means
    // no limit, which is the core's default and the most identifiable choice.
    xmuxCMaxReuseTimes: x.xmuxCMaxReuseTimes || range(32, 64),

    // The H-prefixed three apply to HTTP/2 and HTTP/3, where one connection
    // carries many requests over a long life.
    xmuxHMaxRequestTimes: x.xmuxHMaxRequestTimes || range(400, 400),
    xmuxHMaxReusableSecs: x.xmuxHMaxReusableSecs || range(900, 1500),

    // A keepalive ping interval. Zero — the default — means none, and a
    // connection that never pings is as distinctive as one that pings on a
    // fixed schedule, so this alternates rather than settling on either.
    xmuxHKeepAlivePeriod:
      x.xmuxHKeepAlivePeriod || (cryptoRnd(0, 1) ? String(cryptoRnd(30, 90)) : "0"),
  };
}

/**
 * How the upload is paced.
 *
 * The core has a default for every one of these, and a default is a shape:
 * posts of the same size at the same interval with the same amount allowed to
 * queue, from every deployment that never touched them. The numbers below sit
 * in the same neighbourhood as the core's — the traffic still has to work —
 * but no two configs land on the same point in it.
 *
 * Anything the user set by hand is left exactly as they set it; empty is the
 * signal to draw, which is the convention the rest of this block already uses.
 */
function buildPacing(x: XhttpSettings): Pick<
  XhttpSettings,
  | "scMaxEachPostBytes"
  | "scMinPostsIntervalMs"
  | "scMaxBufferedPosts"
  | "scStreamUpServerSecs"
  | "uplinkChunkSize"
  | "serverMaxHeaderBytes"
> {
  return {
    // Around a megabyte per POST, the core's own order of magnitude.
    scMaxEachPostBytes: x.scMaxEachPostBytes || range(800_000, 400_000),
    // Tens of milliseconds between posts: fast enough to be usable, slow
    // enough not to look like a flood.
    scMinPostsIntervalMs: x.scMinPostsIntervalMs || range(20, 30),
    scMaxBufferedPosts: x.scMaxBufferedPosts || String(cryptoRnd(20, 60)),
    // How long the server holds a stream-up request open before the client
    // opens the next. A fixed value here is a heartbeat anyone can time.
    scStreamUpServerSecs: x.scStreamUpServerSecs || range(20, 40),

    uplinkChunkSize: x.uplinkChunkSize || String(cryptoRnd(32, 96) * 1024),

    // The server's cap on request headers. Padding rides in headers, so the
    // ceiling has to clear the padding this config actually sends.
    serverMaxHeaderBytes: x.serverMaxHeaderBytes || String(cryptoRnd(12, 24) * 1024),
  };
}

/** The alphabet a custom session-id table is drawn from. */
const BASE62 =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

/**
 * A custom alphabet for the session id.
 *
 * Left empty, the core uses its own table, so every session id in the world is
 * drawn from the same characters — a property of the string that survives
 * however random the id itself is.
 *
 * The core rejects a table too small to keep the id space above 2^31. With the
 * shortest id this generator produces being eight characters, that needs at
 * least fifteen distinct characters; thirty-two is the floor here, which
 * clears it by orders of magnitude.
 */
function sessionIdTable(): string {
  const pool = [...BASE62];
  // Fisher-Yates from the crypto source, so the alphabet is not merely
  // shuffled but unpredictably so.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = cryptoRnd(0, i);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, cryptoRnd(32, 48)).join("");
}

/**
 * Request headers a real client would be carrying anyway.
 *
 * An XHTTP request with nothing but the core's own headers is a short, oddly
 * bare request. These are the ones a browser or an app sends without being
 * asked, and adding a couple costs nothing.
 *
 * `Host` is deliberately absent: the core refuses it here and has its own
 * field for it.
 */
const PLAUSIBLE_HEADERS: [string, string[]][] = [
  ["Accept-Language", ["en-US,en;q=0.9", "ru-RU,ru;q=0.9,en;q=0.8", "en-GB,en;q=0.9"]],
  ["Cache-Control", ["no-cache", "max-age=0"]],
  ["Sec-Fetch-Dest", ["empty"]],
  ["Sec-Fetch-Mode", ["cors", "no-cors"]],
  ["Sec-Fetch-Site", ["same-origin", "same-site"]],
  ["X-Requested-With", ["XMLHttpRequest"]],
  ["Pragma", ["no-cache"]],
];

function buildHeaders(existing: Record<string, string>): Record<string, string> {
  if (Object.keys(existing).length) return existing;

  const pool = [...PLAUSIBLE_HEADERS];
  const headers: Record<string, string> = {};
  for (let i = 0; i < cryptoRnd(2, 4) && pool.length; i++) {
    const [name, values] = pool.splice(cryptoRnd(0, pool.length - 1), 1)[0]!;
    headers[name] = cryptoPick(values);
  }
  return headers;
}

function buildXhttp(
  input: XrayInput,
  caps: ReturnType<typeof xrayCaps>,
  security: XraySecurity,
): NonNullable<XrayConfig["xhttp"]> {
  const resolvedMode = resolveXhttpMode(
    input.xhttp.mode,
    security === "reality",
    input.xhttp.splitDownload,
    caps.xhttpModes,
  );

  return {
    ...input.xhttp,
    ...buildXmux(input.xhttp),
    ...buildPacing(input.xhttp),
    sessionIdTable: input.xhttp.sessionIdTable || sessionIdTable(),
    headers: buildHeaders(input.xhttp.headers),
    // GET is only legal in packet-up — the core refuses it anywhere else —
    // and there it is an ordinary thing for a client to do, which is the
    // point of choosing between them rather than always sending POST. The
    // choice is recorded either way rather than left blank for POST, so the
    // config says what it decided instead of implying nothing was decided.
    uplinkHttpMethod:
      input.xhttp.uplinkHttpMethod ||
      (resolvedMode === "packet-up" ? cryptoPick(["GET", "POST"]) : ""),
    resolvedMode,
  };
}

/**
 * Build a configuration.
 *
 * Assembly only: each block is built by the function that understands it, so
 * "what goes in the REALITY block" has one answer and adding a block does not
 * mean growing this function. It used to be one 70-line body where the flow
 * correction, the client loop, the REALITY keys and the XHTTP mode were all
 * interleaved.
 */
export function generateXray(input: XrayInput): XrayConfig {
  const caps = xrayCaps(input.version);
  const { flow, security, transport } = resolveLayers(input);

  const encryption =
    input.useVlessEncryption && caps.vlessEncryption
      ? makeVlessEncryption(
          input.vlessEncryptionMode,
          input.vlessEncryptionSeconds,
        )
      : undefined;

  return {
    version: input.version,
    address: input.address,
    port: input.port,
    transport,
    security,
    flow,
    clients: buildClients(input.clientCount, flow, encryption),
    transportSettings: buildTransport(input.transportSettings),
    sockopt: buildSockopt(input.sockopt),
    ...(encryption ? { vlessEncryption: encryption } : {}),
    ...(security === "reality" ? { reality: buildReality(input, caps) } : {}),
    ...(transport === "xhttp"
      ? { xhttp: buildXhttp(input, caps, security) }
      : {}),
    // FinalMask arrived in v26.6.22; older cores do not know the key and a
    // config carrying it would be one they refuse.
    //
    // Congestion control lives in the same block and is worth setting on its
    // own, so a mask of "none" with a congestion choice still produces one.
    ...(caps.finalMask &&
    (input.finalMask.kind !== "none" || input.finalMask.quicCongestion)
      ? { finalMask: buildFinalMask(input.finalMask) }
      : {}),
  };
}

/** Several independent configurations, for provisioning more than one server. */
export function generateXrayBatch(
  input: XrayInput,
  count: number,
): XrayConfig[] {
  return Array.from({ length: count }, () => generateXray(input));
}

/** Kept for symmetry with the AmneziaWG generator's random helpers. */
