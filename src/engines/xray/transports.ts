/**
 * The per-transport blocks, none of which Architect used to emit.
 *
 * `streamSettings` carries a settings object per transport — `rawSettings`,
 * `wsSettings`, `grpcSettings`, `hysteriaSettings` — and every one of them was
 * left out, so every generated config ran on the core's defaults. For most of
 * those defaults that is fine. For one it is not: RAW's `header` wraps the
 * stream in an HTTP request and response, and leaving it off means a raw TLS
 * connection where an HTTP one was available for free.
 *
 * Read from Xray-core v26.7.11 `infra/conf/transport_method.go`.
 */

import { cryptoPick, cryptoRnd } from "@/shared/rng";
import { pickHost as pickDomain } from "@/shared/domains";
import { toBase64Url } from "@/shared/x25519";
import { cryptoBytes } from "@/shared/rng";

/* ── What a user chooses ──────────────────────────────────────────────────── */

/** Masquerade a Hysteria server wears for anything that is not a client. */
export type HysteriaMasquerade = "none" | "file" | "proxy" | "string";

export interface TransportInput {
  /**
   * Wrap RAW in an HTTP request and response.
   *
   * The core calls this `header` with `type: "http"`. Without it a RAW
   * connection is bytes on a socket; with it the first thing on the wire is a
   * GET and a 200, which is what most of the internet looks like.
   */
  rawHttpHeader: boolean;
  /** Host names the masquerade claims. Empty draws plausible ones. */
  rawHttpHosts: string[];

  /**
   * Trust a PROXY protocol header in front of the connection.
   *
   * For a server behind a load balancer that speaks it; wrong anywhere else,
   * because the first bytes would be parsed as a header that is not there.
   */
  acceptProxyProtocol: boolean;

  /** WebSocket keepalive, seconds. Zero is the core's default of none. */
  wsHeartbeatPeriod: number;

  /** gRPC service name. Empty draws one that reads like a real service. */
  grpcServiceName: string;
  /** One gRPC connection carrying several streams. Must match on both ends. */
  grpcMultiMode: boolean;

  /** Hysteria authentication string. Empty generates one. */
  hysteriaAuth: string;
  /** What a Hysteria server shows to anything that is not a client. */
  hysteriaMasquerade: HysteriaMasquerade;
  /** URL to proxy, or the string to serve, depending on the masquerade. */
  hysteriaMasqueradeValue: string;
}

/** The block as it goes into the config, with the blanks filled in. */
export interface TransportConfig extends TransportInput {
  resolvedHosts: string[];
  resolvedServiceName: string;
  resolvedAuth: string;
  /**
   * Path the masqueraded request asks for.
   *
   * Chosen when the config is built, not when it is rendered: rendering the
   * same config twice has to produce the same text, and drawing here meant a
   * round trip came back with a different path than it went in with.
   */
  resolvedPath: string;
}

/* ── Defaults ─────────────────────────────────────────────────────────────── */

/**
 * Hosts a masqueraded RAW connection can claim.
 *
 * The core's own example list is `www.baidu.com` and `www.bing.com`, which is
 * as identifying as any other constant. Drawn from the shared database now,
 * which at least knows the names are real and answering.
 */
function masqueradeHost(): string {
  return pickDomain({ role: "tls" });
}

/** Paths a masqueraded request can ask for. */
const MASQUERADE_PATHS = ["/", "/assets/app.js", "/api/v1/ping", "/favicon.ico"];

/** gRPC service names that read like something a real deployment would run. */
const SERVICE_NAMES = [
  "GunService",
  "grpc.health.v1.Health",
  "api.v1.Sync",
  "telemetry.Collector",
  "media.Stream",
];

export function defaultTransport(): TransportInput {
  return {
    // On by default: an HTTP-shaped RAW connection is strictly less
    // remarkable than a bare one, and it costs nothing.
    rawHttpHeader: true,
    rawHttpHosts: [],
    acceptProxyProtocol: false,
    // An idle WebSocket dies quietly behind NAT; a keepalive in this range
    // is the ordinary fix and is not itself distinctive.
    wsHeartbeatPeriod: cryptoRnd(25, 55),
    grpcServiceName: "",
    // Multi-mode puts several streams down one gRPC connection. Both ends have
    // to agree and Architect writes both, so the choice is free — and a
    // deployment that always makes the same one is a deployment that can be
    // recognised by which one it makes.
    grpcMultiMode: cryptoRnd(0, 1) === 1,
    hysteriaAuth: "",
    hysteriaMasquerade: "none",
    hysteriaMasqueradeValue: "",
  };
}

export function buildTransport(input: TransportInput): TransportConfig {
  return {
    ...input,
    resolvedHosts: input.rawHttpHosts.length
      ? input.rawHttpHosts
      : [masqueradeHost(), masqueradeHost()],
    resolvedServiceName: input.grpcServiceName || cryptoPick(SERVICE_NAMES),
    // Hysteria authenticates on a shared string; an empty one would let
    // anyone in.
    resolvedAuth: input.hysteriaAuth || toBase64Url(cryptoBytes(16)),
    resolvedPath: cryptoPick(MASQUERADE_PATHS),
  };
}

/* ── Rendering ────────────────────────────────────────────────────────────── */

/**
 * The `header` block for RAW: an HTTP request and response to wrap the stream.
 *
 * `infra/conf/transport_method.go` builds these from an `Authenticator`, which
 * fills in a full browser-ish header set when the config gives none. What is
 * written here is the part worth varying — the host, the path, and the method
 * — because those are what an observer reads first.
 */
export function rawSettings(
  cfg: TransportConfig,
): Record<string, unknown> | undefined {
  if (!cfg.rawHttpHeader && !cfg.acceptProxyProtocol) return undefined;

  return {
    ...(cfg.acceptProxyProtocol ? { acceptProxyProtocol: true } : {}),
    ...(cfg.rawHttpHeader
      ? {
          header: {
            type: "http",
            request: {
              version: "1.1",
              method: "GET",
              path: [cfg.resolvedPath],
              headers: {
                Host: cfg.resolvedHosts,
                "Accept-Encoding": ["gzip, deflate"],
                Connection: ["keep-alive"],
                Pragma: "no-cache",
              },
            },
            response: {
              version: "1.1",
              status: "200",
              reason: "OK",
              headers: {
                "Content-Type": ["application/octet-stream", "video/mpeg"],
                "Transfer-Encoding": ["chunked"],
                Connection: ["keep-alive"],
                Pragma: "no-cache",
              },
            },
          },
        }
      : {}),
  };
}

/** The `wsSettings` block. */
export function wsSettings(
  cfg: TransportConfig,
  path: string,
): Record<string, unknown> {
  return {
    path,
    ...(cfg.acceptProxyProtocol ? { acceptProxyProtocol: true } : {}),
    ...(cfg.wsHeartbeatPeriod > 0
      ? { heartbeatPeriod: cfg.wsHeartbeatPeriod }
      : {}),
  };
}

/** The `httpupgradeSettings` block, which has no heartbeat of its own. */
export function httpUpgradeSettings(
  cfg: TransportConfig,
  path: string,
): Record<string, unknown> {
  return {
    path,
    ...(cfg.acceptProxyProtocol ? { acceptProxyProtocol: true } : {}),
  };
}

/** The `grpcSettings` block. */
export function grpcSettings(cfg: TransportConfig): Record<string, unknown> {
  return {
    serviceName: cfg.resolvedServiceName,
    // Both ends have to agree: one side multiplexing and the other not is a
    // connection that opens and carries nothing.
    ...(cfg.grpcMultiMode ? { multiMode: true } : {}),
  };
}

/**
 * The `hysteriaSettings` block.
 *
 * Version 2 is the only one the core builds — anything else is refused
 * outright. The masquerade is what a Hysteria server shows to a plain HTTP
 * request, which is the same idea as REALITY's donor site.
 */
export function hysteriaSettings(
  cfg: TransportConfig,
): Record<string, unknown> {
  const masquerade =
    cfg.hysteriaMasquerade === "none"
      ? {}
      : {
          masquerade: {
            type: cfg.hysteriaMasquerade,
            ...(cfg.hysteriaMasquerade === "proxy"
              ? { url: cfg.hysteriaMasqueradeValue, rewriteHost: true }
              : {}),
            ...(cfg.hysteriaMasquerade === "file"
              ? { dir: cfg.hysteriaMasqueradeValue }
              : {}),
            ...(cfg.hysteriaMasquerade === "string"
              ? { content: cfg.hysteriaMasqueradeValue, statusCode: 200 }
              : {}),
          },
        };

  return {
    version: 2,
    auth: cfg.resolvedAuth,
    // Between 2 and 600, or the core refuses; this is the middle of that.
    udpIdleTimeout: cryptoRnd(45, 120),
    ...masquerade,
  };
}
