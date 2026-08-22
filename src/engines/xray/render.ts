/**
 * Turning a configuration into what people actually paste.
 *
 * Two outputs, because XRay has two audiences: a JSON inbound for the server,
 * and a `vless://` link for the client. They are generated from one config so
 * they cannot disagree — the pair being out of step is the classic way a
 * REALITY setup fails.
 *
 * Key spellings follow the version. `network` and `session*` are emitted for
 * older cores, `method` and `sessionID*` from the release that renamed them,
 * because a config is only useful on the core it was written for.
 */

import type { EngineLine } from "@/types/engine";
import { xrayCaps } from "./versions";
import { inboundFlow } from "./types";
import { renderFinalMask } from "./finalmask";
import { renderSockopt } from "./sockopt";
import {
  grpcSettings,
  httpUpgradeSettings,
  hysteriaSettings,
  rawSettings,
  wsSettings,
} from "./transports";
import type { XrayConfig } from "./types";

/* ── JSON as lines ────────────────────────────────────────────────────────── */

/**
 * Pretty-print JSON into lines the preview can highlight.
 *
 * Emitting lines rather than a blob lets the same render feed the plain text,
 * the syntax-coloured preview and the copy button, exactly as the AmneziaWG
 * renderer does.
 */
function jsonToLines(value: unknown, indent = 0): EngineLine[] {
  const pad = "  ".repeat(indent);
  const lines: EngineLine[] = [];

  const push = (text: string, type: EngineLine["type"] = "kv", key = "") =>
    lines.push({ key, value: text, type });

  if (Array.isArray(value)) {
    push(`${pad}[`, "section");
    value.forEach((item, i) => {
      const inner = jsonToLines(item, indent + 1);
      const last = i === value.length - 1;
      inner.forEach((l, j) => {
        const isEnd = j === inner.length - 1;
        push(isEnd && !last ? `${l.value},` : l.value, l.type, l.key);
      });
    });
    push(`${pad}]`, "section");
    return lines;
  }

  if (value && typeof value === "object") {
    push(`${pad}{`, "section");
    const entries = Object.entries(value as Record<string, unknown>);
    entries.forEach(([key, val], i) => {
      const last = i === entries.length - 1;
      const comma = last ? "" : ",";
      if (val && typeof val === "object") {
        const inner = jsonToLines(val, indent + 1);
        push(`${pad}  "${key}": ${inner[0].value.trim()}`, "section", key);
        inner.slice(1, -1).forEach((l) => push(l.value, l.type, l.key));
        push(`${inner[inner.length - 1].value}${comma}`, "section", key);
      } else {
        push(`${pad}  "${key}": ${JSON.stringify(val)}${comma}`, "kv");
      }
    });
    push(`${pad}}`, "section");
    return lines;
  }

  push(`${pad}${JSON.stringify(value)}`, "kv");
  return lines;
}

/* ── Server side ──────────────────────────────────────────────────────────── */

/** The XHTTP settings object, spelled for the target version. */
function xhttpSettings(cfg: XrayConfig): Record<string, unknown> | undefined {
  const x = cfg.xhttp;
  if (!x) return undefined;
  const caps = xrayCaps(cfg.version);

  /** Only write a knob the user actually set: empty means the core's default. */
  const set = <T>(key: string, value: T | "" | undefined) =>
    value === "" || value === undefined ? {} : { [key]: value };

  /**
   * Knobs that arrived in v26.6.22, written only where they are read.
   *
   * A core ignores keys it does not know, so writing these to an older one
   * produces a config that loads and quietly drops half of what the user
   * chose — the worst outcome, because it looks like it worked.
   */
  const advanced = caps.xhttpAdvanced
    ? {
        // The core's defaults here — x_padding and X-Padding — are identical
        // for every deployment on earth, so naming them otherwise is the
        // whole point of setting them.
        ...set("xPaddingKey", x.paddingKey),
        ...set("xPaddingHeader", x.paddingHeader),
        ...set("xPaddingMethod", x.paddingMethod),
        ...(x.paddingPlacement !== "auto"
          ? { xPaddingPlacement: x.paddingPlacement }
          : {}),

        ...(x.sessionIdPlacement !== "auto"
          ? { sessionIDPlacement: x.sessionIdPlacement }
          : {}),
        sessionIDLength: x.sessionIdLength,
        // A key means nothing when the id is in the path; the core ignores it
        // and writing it anyway is noise in the config.
        ...(x.sessionIdPlacement !== "auto" && x.sessionIdPlacement !== "path"
          ? set("sessionIDKey", x.sessionIdKey)
          : {}),
        ...set("sessionIDTable", x.sessionIdTable),

        ...(x.seqPlacement !== "auto" ? { seqPlacement: x.seqPlacement } : {}),
        ...(x.seqPlacement !== "auto" && x.seqPlacement !== "path"
          ? set("seqKey", x.seqKey)
          : {}),

        ...(x.uplinkDataPlacement !== "auto"
          ? { uplinkDataPlacement: x.uplinkDataPlacement }
          : {}),
        ...(x.uplinkDataPlacement !== "auto" && x.uplinkDataPlacement !== "body"
          ? set("uplinkDataKey", x.uplinkDataKey)
          : {}),
        ...set("uplinkChunkSize", x.uplinkChunkSize),
        // GET is only legal in packet-up; the core refuses it anywhere else.
        ...(x.uplinkHttpMethod &&
        x.uplinkHttpMethod !== "POST" &&
        x.resolvedMode === "packet-up"
          ? { uplinkHTTPMethod: x.uplinkHttpMethod }
          : {}),

        ...(x.noGrpcHeader ? { noGRPCHeader: true } : {}),
        ...set("scMaxBufferedPosts", numberOr(x.scMaxBufferedPosts)),
        ...set("scStreamUpServerSecs", x.scStreamUpServerSecs),
        ...set("serverMaxHeaderBytes", numberOr(x.serverMaxHeaderBytes)),
        ...set("hMaxRequestTimes", x.xmuxHMaxRequestTimes),
        ...set("hMaxReusableSecs", x.xmuxHMaxReusableSecs),
        ...set("hKeepAlivePeriod", numberOr(x.xmuxHKeepAlivePeriod)),
      }
    : {};

  // The three xmux fields that predate the rest live at the top level of the
  // xmux object either way, so they are split out from `advanced`.
  const { hMaxRequestTimes, hMaxReusableSecs, hKeepAlivePeriod, ...topLevel } =
    advanced as Record<string, unknown>;

  return {
    path: x.path,
    ...(x.host ? { host: x.host } : {}),
    mode: x.resolvedMode,
    ...(caps.xhttpHeaders && Object.keys(x.headers).length
      ? { headers: x.headers }
      : {}),

    xPaddingBytes: x.paddingBytes,
    ...(x.paddingObfsMode ? { xPaddingObfsMode: true } : {}),

    ...(x.noSseHeader ? { noSSEHeader: true } : {}),
    ...set("scMaxEachPostBytes", x.scMaxEachPostBytes),
    ...set("scMinPostsIntervalMs", x.scMinPostsIntervalMs),

    ...topLevel,

    xmux: {
      maxConcurrency: x.xmuxMaxConcurrency,
      maxConnections: x.xmuxMaxConnections,
      ...set("cMaxReuseTimes", x.xmuxCMaxReuseTimes),
      ...(hMaxRequestTimes !== undefined ? { hMaxRequestTimes } : {}),
      ...(hMaxReusableSecs !== undefined ? { hMaxReusableSecs } : {}),
      ...(hKeepAlivePeriod !== undefined ? { hKeepAlivePeriod } : {}),
    },
  };
}

/** A plain integer where the core wants one rather than a range string. */
function numberOr(text: string): number | "" {
  if (!text.trim()) return "";
  const value = Number(text);
  return Number.isFinite(value) ? value : "";
}

/**
 * The `realitySettings` block.
 *
 * Only the server half: `privateKey` rather than `password`, `serverNames`
 * rather than `serverName`. The core decides which half it is reading by
 * whether `target` is present, and rejects a client config that carries
 * `serverNames` — so the two halves are built by different code on purpose.
 */
function realitySettings(cfg: XrayConfig): Record<string, unknown> | undefined {
  const reality = cfg.reality;
  if (!reality) return undefined;

  return {
    show: false,
    target: reality.dest,
    xver: reality.xver,
    serverNames: reality.serverNames,
    privateKey: reality.keys.privateKey,
    shortIds: reality.shortIds,
    ...(reality.minClientVer ? { minClientVer: reality.minClientVer } : {}),
    ...(reality.maxClientVer ? { maxClientVer: reality.maxClientVer } : {}),
    ...(reality.maxTimeDiff ? { maxTimeDiff: reality.maxTimeDiff } : {}),
    ...(reality.mldsa65?.seed ? { mldsa65Seed: reality.mldsa65.seed } : {}),
    ...(reality.limitFallbackUpload
      ? { limitFallbackUpload: reality.limitFallbackUpload }
      : {}),
    ...(reality.limitFallbackDownload
      ? { limitFallbackDownload: reality.limitFallbackDownload }
      : {}),
  };
}

/**
 * `streamSettings`: the transport and whatever wraps it.
 *
 * The transport's own key changed name — `network` before v26.7.11, `method`
 * from it — and the older spelling is still accepted, so the version decides
 * which one is written.
 */
function streamSettings(cfg: XrayConfig): Record<string, unknown> {
  const transportKey = xrayCaps(cfg.version).methodName ? "method" : "network";

  const reality = realitySettings(cfg);
  const xhttp = xhttpSettings(cfg);
  const finalmask = renderFinalMask(cfg.finalMask);
  const sockopt = renderSockopt(cfg.sockopt);

  return {
    [transportKey]: cfg.transport,
    security: cfg.security,
    ...(reality ? { realitySettings: reality } : {}),
    ...(xhttp ? { xhttpSettings: xhttp } : {}),
    ...transportBlock(cfg),
    ...(finalmask ? { finalmask } : {}),
    ...(sockopt ? { sockopt } : {}),
  };
}

/**
 * The settings block belonging to the chosen transport.
 *
 * One per transport and only the one in use: writing `wsSettings` beside a
 * RAW stream is a key the core reads and applies to nothing.
 */
function transportBlock(cfg: XrayConfig): Record<string, unknown> {
  const t = cfg.transportSettings;
  // XHTTP already has its own block, built above.
  const path = cfg.xhttp?.path ?? "/";

  switch (cfg.transport) {
    case "raw": {
      const raw = rawSettings(t);
      return raw ? { rawSettings: raw } : {};
    }
    case "ws":
      return { wsSettings: wsSettings(t, path) };
    case "httpupgrade":
      return { httpupgradeSettings: httpUpgradeSettings(t, path) };
    case "grpc":
      return { grpcSettings: grpcSettings(t) };
    case "hysteria":
      return { hysteriaSettings: hysteriaSettings(t) };
    default:
      return {};
  }
}

/** The VLESS accounts and how the inbound decrypts them. */
function inboundSettings(cfg: XrayConfig): Record<string, unknown> {
  return {
    clients: cfg.clients.map((client) => ({
      id: client.id,
      // The inbound never carries the client-only `-udp443` suffix.
      ...(client.flow ? { flow: inboundFlow(client.flow) } : {}),
    })),
    // "none" is a value, not an absence: the core requires the field.
    decryption: cfg.vlessEncryption?.decryption ?? "none",
  };
}

/**
 * The server's inbound, as Xray-core expects it.
 *
 * Assembly only. Each block is built by the function that understands it, so
 * a change to REALITY does not mean reading past the client loop to find it.
 */
export function buildServerInbound(cfg: XrayConfig): Record<string, unknown> {
  return {
    listen: "0.0.0.0",
    port: cfg.port,
    protocol: "vless",
    settings: inboundSettings(cfg),
    streamSettings: streamSettings(cfg),
  };
}

/** Server config as renderable lines. */
export function renderServer(cfg: XrayConfig): EngineLine[] {
  return jsonToLines(buildServerInbound(cfg));
}

/**
 * The same inbound, spelled for hosting panels.
 *
 * Panels validate a pasted streamSettings against a schema of their own, and
 * theirs still speaks only the pre-rename vocabulary: the network value
 * `raw` and the key `rawSettings` are unknown to it, so an inbound the core
 * accepts comes back from the panel as an input error.
 *
 * The core takes both spellings — `case "raw", "tcp"` normalises to tcp, and
 * a `rawSettings` block is folded into `TCPSettings` — so renaming here costs
 * nothing on the wire and buys a config that pastes cleanly.
 *
 * What is deliberately not renamed: `maxTimeDiff`. The panel's model keeps a
 * legacy spelling of that field and strips ours silently; renaming would
 * trade a silent drop for a key the core does not read. Neither reaches the
 * device, and saying so beats papering over it.
 */
export function buildPanelInbound(cfg: XrayConfig): Record<string, unknown> {
  const inbound = buildServerInbound(cfg) as Record<string, unknown>;
  const stream = {
    ...(inbound.streamSettings as Record<string, unknown>),
  };

  // The network value: `raw` is the new name, `tcp` the one panels know.
  if (stream.method === "raw") stream.method = "tcp";
  if (stream.network === "raw") stream.network = "tcp";

  // The transport block, for the one transport that changed its key.
  if ("rawSettings" in stream) {
    stream.tcpSettings = stream.rawSettings;
    delete stream.rawSettings;
  }

  return { ...inbound, streamSettings: stream };
}

/* ── Client side ──────────────────────────────────────────────────────────── */

/**
 * The `vless://` share link for one client.
 *
 * Query keys are the ones clients read: `security`, `sni`, `pbk`, `sid`, `fp`,
 * `flow`, `type`. `pbk` carries the public key — the field the core now calls
 * `password` on the client side.
 */
export function buildClientUri(cfg: XrayConfig, index = 0): string | null {
  const client = cfg.clients[index];
  if (!client || !cfg.address) return null;

  const params = new URLSearchParams();
  params.set("type", cfg.transport);
  params.set("security", cfg.security);

  if (cfg.reality) {
    params.set("sni", cfg.reality.serverNames[0] ?? "");
    params.set("pbk", cfg.reality.keys.publicKey);
    if (cfg.reality.shortIds[0]) params.set("sid", cfg.reality.shortIds[0]);
    params.set("fp", cfg.reality.fingerprint);
    if (cfg.reality.spiderX !== "/") params.set("spx", cfg.reality.spiderX);
  }

  if (client.flow) params.set("flow", client.flow);
  if (client.encryption) params.set("encryption", client.encryption);

  if (cfg.xhttp) {
    params.set("path", cfg.xhttp.path);
    params.set("mode", cfg.xhttp.resolvedMode);
    if (cfg.xhttp.host) params.set("host", cfg.xhttp.host);
  }

  const host = cfg.address.includes(":") ? `[${cfg.address}]` : cfg.address;
  const label = cfg.reality?.serverNames[0] ?? cfg.address;
  return `vless://${client.id}@${host}:${cfg.port}?${params}#${encodeURIComponent(label)}`;
}

/** Every client's link, for handing out more than one. */
export function buildClientUris(cfg: XrayConfig): string[] {
  return cfg.clients
    .map((_, i) => buildClientUri(cfg, i))
    .filter((u): u is string => u !== null);
}
