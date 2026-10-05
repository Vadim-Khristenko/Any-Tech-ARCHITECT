/**
 * Reading an XRay configuration somebody else wrote.
 *
 * Two shapes arrive in practice: a `vless://` link pasted from a client, and a
 * JSON inbound copied off a server. Both are read here into the same config,
 * so validation says the same things about either.
 *
 * As with AmneziaWG, structural breakage fails the parse and a config that
 * reads fine but breaks a rule comes back with findings attached — that second
 * case is the one worth having.
 */

import { error, warn } from "@/shared/findings";
import type { Finding } from "@/types/findings";
import type { ParseResult } from "@/types/engine";
import { parseFailed } from "@/types/engine";
import { xrayCaps, isSupportedVersion, XRAY_VERSIONS } from "./versions";
import { defaultXhttp } from "./generate";
import { buildTransport, defaultTransport } from "./transports";
import { parseSockopt } from "./sockopt";
import type { TransportConfig, TransportInput } from "./transports";
import type {
  XrayConfig,
  XrayClient,
  XrayFlow,
  XrayTransport,
  XraySecurity,
  XhttpMode,
} from "./types";

const NEWEST = XRAY_VERSIONS[0].id;

/** Transport names the core accepts, normalised to the current spelling. */
function normaliseTransport(value: string): XrayTransport | null {
  switch (value.toLowerCase()) {
    case "raw":
    case "tcp":
      return "raw";
    case "xhttp":
    case "splithttp":
      return "xhttp";
    case "grpc":
      return "grpc";
    case "ws":
    case "websocket":
      return "ws";
    case "httpupgrade":
      return "httpupgrade";
    default:
      return null;
  }
}

function normaliseFlow(value: string | undefined): XrayFlow {
  return value === "xtls-rprx-vision" ? "xtls-rprx-vision" : "";
}

/* ── vless:// ─────────────────────────────────────────────────────────────── */

export function parseVlessUri(input: string): ParseResult<XrayConfig> {
  const text = input.trim();
  if (!text.toLowerCase().startsWith("vless://")) {
    return parseFailed<XrayConfig>("uri", "xray.parse.not_vless");
  }

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return parseFailed<XrayConfig>("uri", "xray.parse.malformed_uri");
  }

  const id = decodeURIComponent(url.username);
  if (!id) return parseFailed<XrayConfig>("id", "xray.parse.no_uuid");

  const address = url.hostname.replace(/^\[|\]$/g, "");
  const port = Number(url.port || 443);
  const q = url.searchParams;

  const findings: Finding[] = [];

  const transport = normaliseTransport(q.get("type") ?? "raw");
  if (!transport) {
    return parseFailed<XrayConfig>("type", "xray.parse.unknown_transport", {
      transport: q.get("type") ?? "",
    });
  }

  const rawSecurity = (q.get("security") ?? "none").toLowerCase();
  const security: XraySecurity =
    rawSecurity === "reality" || rawSecurity === "tls" ? rawSecurity : "none";

  const flow = normaliseFlow(q.get("flow") ?? undefined);
  const client: XrayClient = {
    id,
    flow,
    ...(q.get("encryption") && q.get("encryption") !== "none"
      ? { encryption: q.get("encryption")! }
      : {}),
  };

  const config: XrayConfig = {
    // A link does not carry the core version it was made for, so the newest is
    // assumed and the reader is told rather than left to wonder.
    version: NEWEST,
    address,
    port,
    transport,
    security,
    flow,
    clients: [client],
    transportSettings: buildTransport(defaultTransport()),
    // A URI carries no socket options; nothing was set, so nothing is claimed.
    sockopt: parseSockopt(undefined),
  };
  findings.push(warn("version", "xray.parse.version_assumed", { version: NEWEST }));

  if (security === "reality") {
    const pbk = q.get("pbk") ?? "";
    if (!pbk) findings.push(error("publicKey", "xray.parse.no_public_key"));

    config.reality = {
      dest: "",
      serverNames: q.get("sni") ? [q.get("sni")!] : [],
      xver: 0,
      keys: { privateKey: "", publicKey: pbk },
      shortIds: q.get("sid") ? [q.get("sid")!] : [],
      fingerprint: q.get("fp") ?? "chrome",
      spiderX: q.get("spx") ?? "/",
    };
    // A share link is the client half; the private key and the target never
    // travel in it, and saying so avoids "the parser lost my key".
    findings.push(warn("privateKey", "xray.parse.client_half_only"));
  }

  if (transport === "xhttp") {
    const mode = (q.get("mode") ?? "auto") as XhttpMode;
    config.xhttp = {
      ...defaultXhttp(),
      mode,
      path: q.get("path") ?? "/",
      host: q.get("host") ?? "",
      paddingBytes: "",
      paddingObfsMode: false,
      paddingPlacement: "auto",
      sessionIdPlacement: "auto",
      sessionIdLength: "",
      noGrpcHeader: false,
      noSseHeader: false,
      xmuxMaxConcurrency: "",
      xmuxMaxConnections: "",
      splitDownload: false,
      resolvedMode: mode === "auto" ? "packet-up" : mode,
    };
  }

  return { ok: true, config, findings };
}

/* ── JSON inbound ─────────────────────────────────────────────────────────── */

type Json = Record<string, unknown>;

const asObject = (v: unknown): Json | undefined =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : undefined;

export function parseXrayJson(input: string): ParseResult<XrayConfig> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return parseFailed<XrayConfig>("json", "xray.parse.bad_json");
  }

  const root = asObject(parsed);
  if (!root) return parseFailed<XrayConfig>("json", "xray.parse.bad_json");

  // Accept either a bare inbound or a whole config with an inbounds array.
  const inbounds = Array.isArray(root.inbounds) ? root.inbounds : null;
  const inbound = asObject(inbounds?.[0]) ?? root;

  if (inbound.protocol !== "vless") {
    return parseFailed<XrayConfig>("protocol", "xray.parse.not_vless_inbound", {
      protocol: String(inbound.protocol ?? ""),
    });
  }

  const findings: Finding[] = [];
  const settings = asObject(inbound.settings) ?? {};
  const stream = asObject(inbound.streamSettings) ?? {};

  const transportRaw = String(stream.method ?? stream.network ?? "raw");
  const transport = normaliseTransport(transportRaw);
  if (!transport) {
    return parseFailed<XrayConfig>("transport", "xray.parse.unknown_transport", {
      transport: transportRaw,
    });
  }

  const rawSecurity = String(stream.security ?? "none").toLowerCase();
  const security: XraySecurity =
    rawSecurity === "reality" || rawSecurity === "tls" ? rawSecurity : "none";

  const rawClients = Array.isArray(settings.clients) ? settings.clients : [];
  const clients: XrayClient[] = rawClients.map((c) => {
    const obj = asObject(c) ?? {};
    return {
      id: String(obj.id ?? ""),
      flow: normaliseFlow(obj.flow as string | undefined),
      ...(obj.encryption ? { encryption: String(obj.encryption) } : {}),
    };
  });

  if (!clients.length) findings.push(error("clients", "xray.parse.no_clients"));

  // `method` only exists from v26.7.11, so its presence dates the config.
  const version = stream.method ? NEWEST : "24.11.11";
  if (!isSupportedVersion(version)) {
    findings.push(warn("version", "xray.parse.version_assumed", { version: NEWEST }));
  }

  const config: XrayConfig = {
    version: version as XrayConfig["version"],
    address: String(inbound.listen ?? ""),
    port: Number(inbound.port ?? 0),
    transport,
    security,
    flow: clients[0]?.flow ?? "",
    clients,
    transportSettings: readTransport(stream),
    sockopt: parseSockopt(asObject(stream.sockopt)),
  };

  const decryption = settings.decryption;
  if (typeof decryption === "string" && decryption !== "none") {
    config.vlessEncryption = { decryption, encryption: decryption };
  }

  const realitySettings = asObject(stream.realitySettings);
  if (security === "reality" && realitySettings) {
    config.reality = {
      dest: String(realitySettings.target ?? realitySettings.dest ?? ""),
      serverNames: Array.isArray(realitySettings.serverNames)
        ? realitySettings.serverNames.map(String)
        : [],
      xver: Number(realitySettings.xver ?? 0),
      keys: {
        privateKey: String(realitySettings.privateKey ?? ""),
        // The server half never carries the public key; it is derived.
        publicKey: "",
      },
      shortIds: Array.isArray(realitySettings.shortIds)
        ? realitySettings.shortIds.map(String)
        : [],
      fingerprint: String(realitySettings.fingerprint ?? "chrome"),
      spiderX: String(realitySettings.spiderX ?? "/"),
      ...(realitySettings.minClientVer
        ? { minClientVer: String(realitySettings.minClientVer) }
        : {}),
      ...(realitySettings.mldsa65Seed
        ? {
            mldsa65: {
              seed: String(realitySettings.mldsa65Seed),
              verify: String(realitySettings.mldsa65Verify ?? ""),
            },
          }
        : {}),
    };
    findings.push(warn("publicKey", "xray.parse.server_half_only"));
  }

  const xhttpSettings =
    asObject(stream.xhttpSettings) ?? asObject(stream.splithttpSettings);
  if (transport === "xhttp" && xhttpSettings) {
    // Both spellings are read: a config in the wild may carry either, even
    // though only sessionID* is a key any core acts on.
    const mode = String(xhttpSettings.mode ?? "auto") as XhttpMode;
    config.xhttp = {
      ...defaultXhttp(),
      mode,
      path: String(xhttpSettings.path ?? "/"),
      host: String(xhttpSettings.host ?? ""),
      paddingBytes: String(xhttpSettings.xPaddingBytes ?? ""),
      paddingObfsMode: Boolean(xhttpSettings.xPaddingObfsMode),
      paddingPlacement: (xhttpSettings.xPaddingPlacement ??
        "auto") as XrayConfig["xhttp"] extends undefined
        ? never
        : "auto",
      sessionIdPlacement: ((xhttpSettings.sessionIDPlacement ?? xhttpSettings.sessionPlacement) ??
        "auto") as never,
      sessionIdLength: String((xhttpSettings.sessionIDLength ?? xhttpSettings.sessionLength) ?? ""),
      noGrpcHeader: Boolean(xhttpSettings.noGRPCHeader),
      noSseHeader: Boolean(xhttpSettings.noSSEHeader),
      xmuxMaxConcurrency: String(
        asObject(xhttpSettings.xmux)?.maxConcurrency ?? "",
      ),
      xmuxMaxConnections: String(
        asObject(xhttpSettings.xmux)?.maxConnections ?? "",
      ),
      splitDownload: Boolean(xhttpSettings.downloadSettings),
      resolvedMode: mode === "auto" ? "packet-up" : mode,
    };
  }

  return { ok: true, config, findings };
}

/* ── Either ───────────────────────────────────────────────────────────────── */

/** Read whichever form was pasted. */
export function parseXray(input: string): ParseResult<XrayConfig> {
  const text = input.trim();
  if (!text) return parseFailed<XrayConfig>("config", "parse.empty");
  if (text.toLowerCase().startsWith("vless://")) return parseVlessUri(text);
  if (text.startsWith("{")) return parseXrayJson(text);
  return parseFailed<XrayConfig>("config", "xray.parse.unrecognised");
}


/**
 * Read the per-transport block back out of a stream.
 *
 * Only what the renderer writes: the HTTP masquerade, the PROXY protocol
 * flag, the WebSocket heartbeat, the gRPC service name and mode, and the
 * Hysteria auth. Anything the config does not carry keeps its default, which
 * is what makes the round trip stable rather than merely lossless.
 */
function readTransport(stream: Record<string, unknown>): TransportConfig {
  const raw = asObject(stream.rawSettings) ?? asObject(stream.tcpSettings);
  const ws = asObject(stream.wsSettings);
  const upgrade = asObject(stream.httpupgradeSettings);
  const grpc = asObject(stream.grpcSettings);
  const hysteria = asObject(stream.hysteriaSettings);

  const header = raw ? asObject(raw.header) : undefined;
  const request = header ? asObject(header.request) : undefined;
  const headers = request ? asObject(request.headers) : undefined;
  const hosts = Array.isArray(headers?.Host)
    ? (headers.Host as unknown[]).map(String)
    : [];

  const masquerade = hysteria ? asObject(hysteria.masquerade) : undefined;

  const requestPath = Array.isArray(request?.path)
    ? String((request!.path as unknown[])[0] ?? "/")
    : "/";

  return {
    ...buildTransport({
    ...defaultTransport(),
    rawHttpHeader: header?.type === "http",
    rawHttpHosts: hosts,
    acceptProxyProtocol: Boolean(
      raw?.acceptProxyProtocol ??
        ws?.acceptProxyProtocol ??
        upgrade?.acceptProxyProtocol,
    ),
    wsHeartbeatPeriod: Number(ws?.heartbeatPeriod ?? 0),
    grpcServiceName: String(grpc?.serviceName ?? ""),
    grpcMultiMode: Boolean(grpc?.multiMode),
    hysteriaAuth: String(hysteria?.auth ?? ""),
    hysteriaMasquerade: (masquerade?.type ??
      "none") as TransportInput["hysteriaMasquerade"],
    hysteriaMasqueradeValue: String(
      masquerade?.url ?? masquerade?.dir ?? masquerade?.content ?? "",
    ),
    }),
    resolvedPath: requestPath,
  };
}
