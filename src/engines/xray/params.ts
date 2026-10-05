/**
 * Every XRay parameter this product knows about, described once.
 *
 * AmneziaWG got this treatment first and it immediately paid for itself:
 * "which version has S3" stopped being a question you answered by reading
 * four files. XRay had nothing equivalent — its version rules lived as
 * booleans inside the generator, which is exactly how three of them ended up
 * disagreeing with the released cores.
 *
 * Two things make this catalogue different from AmneziaWG's:
 *
 *   1. It is deliberately larger than what the generator emits today. Every
 *      entry carries `generated`, so "what is left to support" is a query
 *      against data rather than an opinion, and `params.test.ts` fails if the
 *      generator and the catalogue drift apart.
 *   2. `since` is a CalVer string, so the ordering is the version list's, not
 *      a string comparison's.
 *
 * Field names and constraints are read from Xray-core v26.7.11:
 * `infra/conf/transport_internet.go`, `transport_security.go` and
 * `transport_method.go`. Where a bound is stated, it is one the core enforces
 * — not advice.
 */

import type { ParamDescriptor, ParamSet } from "@/types/protocol";
import {
  hasParam as hasParamIn,
  paramFor as paramForIn,
  paramSetFor,
  paramsInScope,
  type ParamCatalogue,
} from "@/shared/params";
import { XRAY_VERSIONS } from "./versions";

/**
 * An XRay parameter, and how far Architect supports it.
 *
 * Two flags rather than one, because a single one conflated two different
 * states and made the coverage number wrong in both directions.
 *
 *   - `offered` — the user can set it and the value reaches the config.
 *   - `generated` — Architect chooses a value without being asked.
 *
 * Most parameters want both. Some want only `offered`, and deliberately:
 * `acceptProxyProtocol` breaks the inbound unless something upstream really
 * does speak PROXY protocol, and `maxTimeDiff` cuts off clients whose clocks
 * are wrong. Inventing a value for either would be a worse tool, not a more
 * complete one — so the gap that matters is `offered: false`, and that is
 * what the roadmap counts.
 *
 * The flags are on the catalogue rather than in a TODO comment because a
 * comment cannot be tested.
 */
export interface XrayParam extends ParamDescriptor {
  /** Which block of the config it belongs to, for grouping in the UI. */
  group:
    | "inbound"
    | "reality"
    | "tls"
    | "vless"
    | "xhttp"
    | "xmux"
    | "transport"
    | "sockopt"
    | "finalmask";
  /** True when `generateXray` chooses a value on its own. */
  generated: boolean;
  /**
   * True when the user can set it and the value reaches the config.
   *
   * Defaults to `generated`: anything Architect produces is by definition
   * wired through. Set it explicitly for the parameters that are settable but
   * deliberately not invented.
   */
  offered: boolean;
}

const FLOOR = "24.11.11";

/** Shorthand: most entries share the floor version and are server-side. */
function p(
  param: Omit<XrayParam, "since" | "offered"> & {
    since?: string;
    offered?: boolean;
  },
): XrayParam {
  return { since: FLOOR, offered: param.generated, ...param };
}

/* ── The catalogue ────────────────────────────────────────────────────────── */

export const XRAY_PARAMETERS: readonly XrayParam[] = [
  /* ── Inbound ──────────────────────────────────────────────────────────── */
  p({
    key: "port",
    group: "inbound",
    kind: "int",
    scope: "shared",
    field: "port",
    bounds: { min: 1, max: 65535 },
    generated: true,
    note: "xrayParam.inbound.port",
  }),
  p({
    key: "id",
    group: "vless",
    kind: "text",
    scope: "shared",
    field: "clients.0.id",
    generated: true,
    source: "proxy/vless/inbound: non-UUID strings are hashed into one",
    note: "xrayParam.vless.id",
  }),
  p({
    key: "flow",
    group: "vless",
    kind: "enum",
    scope: "shared",
    field: "clients.0.flow",
    bounds: { oneOf: ["", "xtls-rprx-vision"] },
    generated: true,
    source: "infra/conf/vless.go",
    note: "xrayParam.vless.flow",
  }),
  p({
    key: "decryption",
    group: "vless",
    kind: "text",
    scope: "shared",
    since: "26.1.13",
    field: "vlessEncryption.decryption",
    generated: true,
    source: "infra/conf/vless.go: mlkem768x25519plus.<mode>.<seconds>.<key>",
    note: "xrayParam.vless.decryption",
  }),
  p({
    key: "fallbacks",
    group: "inbound",
    kind: "text",
    scope: "local",
    field: "fallbacks",
    generated: false,
    source: "infra/conf/vless.go: FallbackConfig",
    note: "xrayParam.inbound.fallbacks",
  }),

  /* ── REALITY ──────────────────────────────────────────────────────────── */
  p({
    key: "target",
    group: "reality",
    kind: "text",
    scope: "local",
    field: "reality.dest",
    generated: true,
    aliases: ["dest"],
    source: "transport_security.go: c.Target overrides c.Dest",
    note: "xrayParam.reality.target",
  }),
  p({
    key: "serverNames",
    group: "reality",
    kind: "text",
    scope: "shared",
    field: "reality.serverNames",
    generated: true,
    source: 'transport_security.go: empty "serverNames" is refused',
    note: "xrayParam.reality.serverNames",
  }),
  p({
    key: "privateKey",
    group: "reality",
    kind: "key",
    scope: "shared",
    field: "reality.keys.privateKey",
    bounds: { byteLength: 32 },
    generated: true,
    source: "transport_security.go: base64.RawURLEncoding, 32 bytes",
  }),
  p({
    key: "shortIds",
    group: "reality",
    kind: "hex",
    scope: "shared",
    field: "reality.shortIds.0",
    bounds: { max: 16 },
    generated: true,
    source: "transport_security.go: hex.Decode into 8 bytes, length ≤ 16",
    note: "xrayParam.reality.shortIds",
  }),
  p({
    key: "xver",
    group: "reality",
    kind: "int",
    scope: "local",
    field: "reality.xver",
    bounds: { min: 0, max: 2 },
    generated: true,
    source: 'transport_security.go: "xver" only accepts 0, 1, 2',
  }),
  p({
    key: "minClientVer",
    group: "reality",
    kind: "text",
    scope: "shared",
    field: "reality.minClientVer",
    generated: true,
    source: "transport_security.go: three bytes, each < 256",
    note: "xrayParam.reality.minClientVer",
  }),
  p({
    key: "maxClientVer",
    group: "reality",
    kind: "text",
    scope: "shared",
    field: "reality.maxClientVer",
    generated: false,
    offered: true,
    source: "transport_security.go: MaxClientVer",
    note: "xrayParam.reality.maxClientVer",
  }),
  p({
    key: "maxTimeDiff",
    group: "reality",
    kind: "int",
    scope: "shared",
    field: "reality.maxTimeDiff",
    generated: false,
    offered: true,
    source: "transport_security.go: MaxTimeDiff",
    note: "xrayParam.reality.maxTimeDiff",
  }),
  p({
    key: "mldsa65Seed",
    group: "reality",
    kind: "key",
    scope: "shared",
    since: "25.7.23",
    field: "reality.mldsa65.seed",
    bounds: { byteLength: 32 },
    generated: true,
    source: "transport_security.go: 32 bytes, must differ from privateKey",
    note: "xrayParam.reality.mldsa65Seed",
  }),
  p({
    key: "mldsa65Verify",
    group: "reality",
    kind: "key",
    scope: "shared",
    since: "25.7.23",
    field: "reality.mldsa65.verify",
    bounds: { byteLength: 1952 },
    generated: false,
    source: "transport_security.go: 1952 bytes",
    note: "xrayParam.reality.mldsa65Verify",
  }),
  p({
    key: "limitFallbackUpload",
    group: "reality",
    kind: "text",
    scope: "local",
    // Established by probe: v24.11.11 ignores the field entirely.
    since: "25.7.23",
    field: "reality.limitFallbackUpload",
    generated: false,
    offered: true,
    source: "transport_security.go: LimitFallback",
    note: "xrayParam.reality.limitFallbackUpload",
  }),
  p({
    key: "limitFallbackDownload",
    group: "reality",
    kind: "text",
    scope: "local",
    // Established by probe: v24.11.11 ignores the field entirely.
    since: "25.7.23",
    field: "reality.limitFallbackDownload",
    generated: false,
    offered: true,
    source: "transport_security.go: LimitFallback",
  }),
  p({
    key: "fingerprint",
    // Not an enum: the uTLS fingerprint list is long, changes between
    // releases and lives in the shared fingerprint registry. A `oneOf` here
    // would go stale the first time uTLS adds a browser.
    group: "reality",
    kind: "text",
    scope: "local",
    field: "reality.fingerprint",
    generated: true,
    source: 'transport_security.go: "unsafe" and "hellogolang" are refused',
    note: "xrayParam.reality.fingerprint",
  }),
  p({
    key: "spiderX",
    group: "reality",
    kind: "text",
    scope: "local",
    field: "reality.spiderX",
    generated: true,
    source: "transport_security.go: must start with /",
    note: "xrayParam.reality.spiderX",
  }),
  p({
    key: "spiderY",
    group: "reality",
    kind: "text",
    scope: "local",
    // Not a field of its own: the core parses p/c/t/i/r out of spiderX's
    // query into the ten integers it calls spiderY, so the value lives there.
    field: "reality.spiderX",
    generated: true,
    source: "transport_security.go: parse(p|c|t|i|r) into ten int64s",
    note: "xrayParam.reality.spiderY",
  }),

  /* ── XHTTP ────────────────────────────────────────────────────────────── */
  p({
    key: "path",
    group: "xhttp",
    kind: "text",
    scope: "shared",
    field: "xhttp.path",
    generated: true,
    source: "transport_method.go: SplitHTTPConfig.Path",
    note: "xrayParam.xhttp.path",
  }),
  p({
    key: "host",
    group: "xhttp",
    kind: "text",
    scope: "shared",
    field: "xhttp.host",
    generated: true,
    source: "transport_method.go: priority host > serverName > address",
    note: "xrayParam.xhttp.host",
  }),
  p({
    key: "mode",
    group: "xhttp",
    kind: "enum",
    scope: "shared",
    field: "xhttp.resolvedMode",
    bounds: { oneOf: ["auto", "packet-up", "stream-up", "stream-one"] },
    generated: true,
    source: "transport_method.go: unsupported mode is a hard error",
    note: "xrayParam.xhttp.mode",
  }),
  p({
    key: "headers",
    group: "xhttp",
    kind: "text",
    scope: "shared",
    field: "xhttp.headers",
    generated: true,
    source: 'transport_method.go: "headers" can not contain "host"',
  }),
  p({
    key: "xPaddingBytes",
    group: "xhttp",
    kind: "range",
    scope: "sender",
    field: "xhttp.paddingBytes",
    generated: true,
    source: "transport_method.go: xPaddingBytes cannot be disabled",
    note: "xrayParam.xhttp.xPaddingBytes",
  }),
  p({
    key: "xPaddingObfsMode",
    group: "xhttp",
    kind: "flag",
    scope: "sender",
    field: "xhttp.paddingObfsMode",
    generated: true,
  }),
  p({
    key: "xPaddingPlacement",
    group: "xhttp",
    kind: "enum",
    scope: "shared",
    field: "xhttp.paddingPlacement",
    bounds: { oneOf: ["auto", "cookie", "header", "query", "queryInHeader"] },
    generated: true,
    source: "transport_method.go: default queryInHeader",
    note: "xrayParam.xhttp.xPaddingPlacement",
  }),
  p({
    key: "xPaddingKey",
    group: "xhttp",
    kind: "text",
    scope: "shared",
    field: "xhttp.paddingKey",
    generated: true,
    source: "transport_method.go: default x_padding",
    note: "xrayParam.xhttp.xPaddingKey",
  }),
  p({
    key: "xPaddingHeader",
    group: "xhttp",
    kind: "text",
    scope: "shared",
    field: "xhttp.paddingHeader",
    generated: true,
    source: "transport_method.go: default X-Padding",
  }),
  p({
    key: "xPaddingMethod",
    group: "xhttp",
    kind: "enum",
    scope: "shared",
    field: "xhttp.paddingMethod",
    bounds: { oneOf: ["repeat-x", "tokenish"] },
    generated: true,
    source: "transport_method.go: default repeat-x",
    note: "xrayParam.xhttp.xPaddingMethod",
  }),
  p({
    key: "uplinkHTTPMethod",
    group: "xhttp",
    kind: "text",
    scope: "shared",
    field: "xhttp.uplinkHttpMethod",
    generated: true,
    source: "transport_method.go: GET only in packet-up mode",
  }),
  p({
    key: "sessionIDPlacement",
    group: "xhttp",
    kind: "enum",
    scope: "shared",
    field: "xhttp.sessionIdPlacement",
    bounds: { oneOf: ["auto", "path", "cookie", "header", "query"] },
    generated: true,
    source: "transport_method.go: default path",
    note: "xrayParam.xhttp.sessionIDPlacement",
  }),
  p({
    key: "sessionIDLength",
    group: "xhttp",
    kind: "range",
    scope: "shared",
    field: "xhttp.sessionIdLength",
    generated: true,
    source: "transport_method.go: checked against sessionIDTable room",
    note: "xrayParam.xhttp.sessionIDLength",
  }),
  p({
    key: "sessionIDKey",
    group: "xhttp",
    kind: "text",
    scope: "shared",
    field: "xhttp.sessionIdKey",
    generated: true,
    source: "transport_method.go: default x_session / X-Session",
    note: "xrayParam.xhttp.sessionIDKey",
  }),
  p({
    key: "sessionIDTable",
    group: "xhttp",
    kind: "text",
    scope: "shared",
    field: "xhttp.sessionIdTable",
    generated: true,
    source: "transport_method.go: ASCII only, room must exceed 2^31",
    note: "xrayParam.xhttp.sessionIDTable",
  }),
  p({
    key: "seqPlacement",
    group: "xhttp",
    kind: "enum",
    scope: "shared",
    field: "xhttp.seqPlacement",
    bounds: { oneOf: ["path", "cookie", "header", "query"] },
    generated: true,
    source: "transport_method.go: default path",
    note: "xrayParam.xhttp.seqPlacement",
  }),
  p({
    key: "seqKey",
    group: "xhttp",
    kind: "text",
    scope: "shared",
    field: "xhttp.seqKey",
    generated: true,
    source: "transport_method.go: default x_seq / X-Seq",
    note: "xrayParam.xhttp.seqKey",
  }),
  p({
    key: "uplinkDataPlacement",
    group: "xhttp",
    kind: "enum",
    scope: "shared",
    field: "xhttp.uplinkDataPlacement",
    bounds: { oneOf: ["auto", "body", "cookie", "header"] },
    generated: false,
    offered: true,
    source: "transport_method.go: cookie/header only in packet-up",
  }),
  p({
    key: "uplinkDataKey",
    group: "xhttp",
    kind: "text",
    scope: "shared",
    field: "xhttp.uplinkDataKey",
    generated: false,
    offered: true,
    source: "transport_method.go: default x_data / X-Data",
    note: "xrayParam.xhttp.uplinkDataKey",
  }),
  p({
    key: "uplinkChunkSize",
    group: "xhttp",
    kind: "range",
    scope: "sender",
    field: "xhttp.uplinkChunkSize",
    generated: true,
  }),
  p({
    key: "noGRPCHeader",
    group: "xhttp",
    kind: "flag",
    scope: "shared",
    field: "xhttp.noGrpcHeader",
    generated: true,
    source: "transport_method.go: NoGRPCHeader",
    note: "xrayParam.xhttp.noGRPCHeader",
  }),
  p({
    key: "noSSEHeader",
    group: "xhttp",
    kind: "flag",
    scope: "shared",
    field: "xhttp.noSseHeader",
    generated: true,
    source: "transport_method.go: NoSSEHeader",
    note: "xrayParam.xhttp.noSSEHeader",
  }),
  p({
    key: "scMaxEachPostBytes",
    group: "xhttp",
    kind: "range",
    scope: "sender",
    field: "xhttp.scMaxEachPostBytes",
    generated: true,
    note: "xrayParam.xhttp.scMaxEachPostBytes",
  }),
  p({
    key: "scMinPostsIntervalMs",
    group: "xhttp",
    kind: "range",
    scope: "sender",
    field: "xhttp.scMinPostsIntervalMs",
    generated: true,
  }),
  p({
    key: "scMaxBufferedPosts",
    group: "xhttp",
    kind: "int",
    scope: "sender",
    field: "xhttp.scMaxBufferedPosts",
    generated: true,
  }),
  p({
    key: "scStreamUpServerSecs",
    group: "xhttp",
    kind: "range",
    scope: "sender",
    field: "xhttp.scStreamUpServerSecs",
    generated: true,
  }),
  p({
    key: "serverMaxHeaderBytes",
    group: "xhttp",
    kind: "int",
    scope: "local",
    field: "xhttp.serverMaxHeaderBytes",
    bounds: { min: 0 },
    generated: true,
    source: "transport_method.go: negative is refused",
  }),
  p({
    key: "downloadSettings",
    group: "xhttp",
    kind: "text",
    scope: "shared",
    field: "xhttp.downloadSettings",
    generated: false,
    source: "transport_method.go: forbidden in stream-one mode",
    note: "xrayParam.xhttp.downloadSettings",
  }),

  /* ── XMUX ─────────────────────────────────────────────────────────────── */
  p({
    key: "maxConcurrency",
    group: "xmux",
    kind: "range",
    scope: "sender",
    field: "xhttp.xmuxMaxConcurrency",
    generated: true,
    source: "transport_method.go: cannot be set together with maxConnections",
  }),
  p({
    key: "maxConnections",
    group: "xmux",
    kind: "range",
    scope: "sender",
    field: "xhttp.xmuxMaxConnections",
    generated: true,
  }),
  p({
    key: "cMaxReuseTimes",
    group: "xmux",
    kind: "range",
    scope: "sender",
    field: "xhttp.xmuxCMaxReuseTimes",
    generated: true,
  }),
  p({
    key: "hMaxRequestTimes",
    group: "xmux",
    kind: "range",
    scope: "sender",
    field: "xhttp.xmuxHMaxRequestTimes",
    generated: true,
  }),
  p({
    key: "hMaxReusableSecs",
    group: "xmux",
    kind: "range",
    scope: "sender",
    field: "xhttp.xmuxHMaxReusableSecs",
    generated: true,
  }),
  p({
    key: "hKeepAlivePeriod",
    group: "xmux",
    kind: "int",
    scope: "sender",
    field: "xhttp.xmuxHKeepAlivePeriod",
    generated: true,
  }),

  /* ── Other transports ─────────────────────────────────────────────────── */
  p({
    key: "acceptProxyProtocol",
    group: "transport",
    kind: "flag",
    scope: "local",
    field: "transportSettings.acceptProxyProtocol",
    generated: false,
    offered: true,
    source: "transport_method.go: TCPConfig, WebSocketConfig, HttpUpgradeConfig",
  }),
  p({
    key: "header",
    group: "transport",
    kind: "text",
    scope: "shared",
    field: "transportSettings.rawHttpHeader",
    generated: true,
    source: "transport_method.go: tcpHeaderLoader, none | http",
    note: "xrayParam.transport.header",
  }),
  p({
    key: "heartbeatPeriod",
    group: "transport",
    kind: "int",
    scope: "sender",
    field: "transportSettings.wsHeartbeatPeriod",
    generated: true,
    source: "transport_method.go: WebSocketConfig",
  }),
  p({
    key: "serviceName",
    group: "transport",
    kind: "text",
    scope: "shared",
    field: "transportSettings.resolvedServiceName",
    generated: true,
    source: "transport_method.go: GRPCConfig",
  }),
  p({
    key: "multiMode",
    group: "transport",
    kind: "flag",
    scope: "shared",
    field: "transportSettings.grpcMultiMode",
    generated: true,
    source: "transport_method.go: GRPCConfig.MultiMode",
    note: "xrayParam.transport.multiMode",
  }),
  p({
    key: "hysteria",
    group: "transport",
    kind: "text",
    scope: "shared",
    since: "26.1.13",
    field: "transportSettings.resolvedAuth",
    generated: true,
    source: "transport_method.go: HysteriaConfig, version must be 2",
    note: "xrayParam.transport.hysteria",
  }),

  /* ── sockopt and finalmask ────────────────────────────────────────────── */
  p({
    key: "tcpcongestion",
    group: "sockopt",
    kind: "enum",
    scope: "local",
    field: "sockopt.tcpCongestion",
    bounds: { oneOf: ["", "bbr", "cubic", "reno"] },
    generated: false,
    offered: true,
    source: "transport_internet.go: SocketConfig.TcpCongestion",
    note: "xrayParam.sockopt.tcpcongestion",
  }),
  p({
    key: "tcpKeepAliveIdle",
    group: "sockopt",
    kind: "int",
    scope: "local",
    field: "sockopt.tcpKeepAliveIdle",
    generated: true,
    source: "transport_internet.go: SocketConfig.TcpKeepAliveIdle",
    note: "xrayParam.sockopt.tcpKeepAliveIdle",
  }),
  p({
    key: "tcpKeepAliveInterval",
    group: "sockopt",
    kind: "int",
    scope: "local",
    field: "sockopt.tcpKeepAliveInterval",
    generated: true,
    source: "transport_internet.go: SocketConfig.TcpKeepAliveInterval",
    note: "xrayParam.sockopt.tcpKeepAliveInterval",
  }),
  p({
    key: "tcpUserTimeout",
    group: "sockopt",
    kind: "int",
    scope: "local",
    field: "sockopt.tcpUserTimeout",
    generated: true,
    source: "transport_internet.go: SocketConfig.TcpUserTimeout",
  }),
  p({
    key: "tcpNoDelay",
    group: "sockopt",
    kind: "flag",
    scope: "local",
    field: "sockopt.tcpNoDelay",
    generated: true,
    source: "transport_internet.go: SocketConfig.TcpNoDelay",
  }),
  p({
    key: "tcpFastOpen",
    group: "sockopt",
    kind: "flag",
    scope: "local",
    field: "sockopt.tcpFastOpen",
    generated: false,
    offered: true,
    source: "transport_internet.go: SocketConfig.Tfo",
    note: "xrayParam.sockopt.tcpFastOpen",
  }),
  p({
    key: "tcpMptcp",
    group: "sockopt",
    kind: "flag",
    scope: "local",
    field: "sockopt.tcpMptcp",
    generated: false,
    offered: true,
    source: "transport_internet.go: SocketConfig.TcpMptcp",
    note: "xrayParam.sockopt.tcpMptcp",
  }),
  p({
    key: "tcpMaxSeg",
    group: "sockopt",
    kind: "int",
    scope: "local",
    field: "sockopt.tcpMaxSeg",
    generated: false,
    offered: true,
    source: "transport_internet.go: SocketConfig.TcpMaxSeg",
  }),
  p({
    key: "domainStrategy",
    group: "sockopt",
    kind: "enum",
    scope: "local",
    field: "sockopt.domainStrategy",
    bounds: { oneOf: ["AsIs", "UseIP", "UseIPv4", "UseIPv6"] },
    generated: false,
    offered: true,
    source: "transport_internet.go: SocketConfig.DomainStrategy",
  }),
  p({
    key: "mark",
    group: "sockopt",
    kind: "int",
    scope: "local",
    field: "sockopt.mark",
    generated: false,
    offered: true,
    source: "transport_internet.go: SocketConfig.Mark",
    note: "xrayParam.sockopt.mark",
  }),
  p({
    key: "interface",
    group: "sockopt",
    kind: "text",
    scope: "local",
    field: "sockopt.bindInterface",
    generated: false,
    offered: true,
    source: "transport_internet.go: SocketConfig.Interface",
    note: "xrayParam.sockopt.interface",
  }),
  p({
    key: "finalmask",
    group: "finalmask",
    kind: "enum",
    scope: "shared",
    since: "26.6.22",
    field: "finalMask.kind",
    bounds: {
      oneOf: ["none", "noise", "fragment", "sudoku", "salamander", "mkcp-legacy"],
    },
    generated: true,
    source: "transport_finalmask.go: tcpmaskLoader and udpmaskLoader",
    note: "xrayParam.finalmask.finalmask",
  }),
  p({
    key: "quicParams.congestion",
    group: "finalmask",
    kind: "enum",
    scope: "local",
    since: "26.6.22",
    field: "finalMask.quicCongestion",
    bounds: { oneOf: ["", "bbr", "reno", "brutal"] },
    generated: true,
    source: "transport_internet.go: unknown congestion control is refused",
    note: "xrayParam.finalmask.quicParams.congestion",
  }),
  p({
    key: "finalmask.infrastructure",
    group: "finalmask",
    kind: "text",
    scope: "shared",
    since: "26.6.22",
    field: "finalMask.external",
    generated: false,
    source: "transport_finalmask.go: header-custom, xmc, xdns, xicmp, realm",
    note: "xrayParam.finalmask.finalmask.infrastructure",
  }),
];

/* ── Sets and questions ───────────────────────────────────────────────────── */

/** The catalogue with XRay's version ordering — oldest first. */
export const XRAY_CATALOGUE: ParamCatalogue<XrayParam> = {
  parameters: XRAY_PARAMETERS,
  order: [...XRAY_VERSIONS].map((v) => v.id).reverse(),
};

/** Parameters a version understands. */
export function xrayParamsFor(version: string): ParamSet<XrayParam> {
  return paramSetFor(XRAY_CATALOGUE, version);
}

/** The description a version uses for a key, if it has one. */
export function xrayParamFor(version: string, key: string) {
  return paramForIn(XRAY_CATALOGUE, version, key);
}

/** Does this version understand this key at all? */
export function xrayHasParam(version: string, key: string): boolean {
  return hasParamIn(XRAY_CATALOGUE, version, key);
}

/** Parameters both ends must agree on. */
export function xraySharedParams(version: string): ParamSet<XrayParam> {
  return paramsInScope(XRAY_CATALOGUE, version, "shared");
}

/* ── Coverage ─────────────────────────────────────────────────────────────── */

/** Parameters the generator emits today. */
export const XRAY_GENERATED = XRAY_PARAMETERS.filter((p) => p.generated);

/**
 * Parameters the core accepts and Architect does not offer yet.
 *
 * This list is the roadmap. It is data rather than a comment so it can be
 * counted, grouped and shown — and so that adding support for one means
 * flipping a flag, not remembering to delete a TODO.
 */
/**
 * Parameters the core accepts and Architect cannot express at all.
 *
 * This, and not the un-generated set, is the roadmap. A parameter the user can
 * set is supported whether or not anything invents a value for it — and for
 * several of them inventing one would be a defect, since the right value
 * depends on infrastructure Architect cannot see.
 */
export const XRAY_MISSING = XRAY_PARAMETERS.filter((p) => !p.offered);

/**
 * Parameters that are settable but never chosen for you.
 *
 * Kept separate rather than folded into either side: it is a real category,
 * and one worth showing, because a user reading the panel should know which
 * fields stay at the core's defaults unless they act.
 */
export const XRAY_MANUAL = XRAY_PARAMETERS.filter((p) => p.offered && !p.generated);

/** How much of the known surface Architect covers, per block. */
export function xrayCoverage(): Record<
  string,
  { done: number; manual: number; total: number }
> {
  const out: Record<string, { done: number; manual: number; total: number }> = {};
  for (const param of XRAY_PARAMETERS) {
    const bucket = (out[param.group] ??= { done: 0, manual: 0, total: 0 });
    bucket.total += 1;
    if (param.generated) bucket.done += 1;
    else if (param.offered) bucket.manual += 1;
  }
  return out;
}
