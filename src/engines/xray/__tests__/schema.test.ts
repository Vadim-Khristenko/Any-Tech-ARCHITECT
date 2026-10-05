import { describe, it, expect } from "bun:test";

import { xrayEngine, buildServerInbound } from "../index";
import type { XrayInput } from "../types";

/**
 * Does the core recognise every key we emit?
 *
 * The lists below are the `json:"…"` tags read out of Xray-core v26.7.28 —
 * `infra/conf/xray.go` for the inbound, `transport_internet.go` for the
 * stream, `transport_security.go` for REALITY, `transport_method.go` for
 * XHTTP, `vless.go` for the protocol settings.
 *
 * An unknown key is not harmless: the core ignores it, so a typo in something
 * like `shortIds` produces a config that loads happily and then refuses every
 * client. This is the cheapest way to catch that without a running core.
 */

const INBOUND_KEYS = new Set([
  "protocol",
  "port",
  "listen",
  "settings",
  "tag",
  "streamSettings",
  "sniffing",
  "sendThrough",
  "allocate",
]);

const STREAM_KEYS = new Set([
  "address",
  "port",
  "method",
  "network",
  "security",
  "finalmask",
  "tlsSettings",
  "realitySettings",
  "rawSettings",
  "tcpSettings",
  "xhttpSettings",
  "splithttpSettings",
  "kcpSettings",
  "grpcSettings",
  "wsSettings",
  "httpupgradeSettings",
  "hysteriaSettings",
  "sockopt",
  "tag",
  "transportLayer",
]);

const REALITY_KEYS = new Set([
  "masterKeyLog",
  "show",
  "target",
  "dest",
  "type",
  "xver",
  "serverNames",
  "privateKey",
  "minClientVer",
  "maxClientVer",
  "maxTimeDiff",
  "shortIds",
  "mldsa65Seed",
  "limitFallbackUpload",
  "limitFallbackDownload",
  "fingerprint",
  "serverName",
  "password",
  "publicKey",
  "shortId",
  "mldsa65Verify",
  "spiderX",
]);

const XHTTP_KEYS = new Set([
  "host",
  "path",
  "mode",
  "headers",
  "xPaddingBytes",
  "xPaddingObfsMode",
  "xPaddingKey",
  "xPaddingHeader",
  "xPaddingPlacement",
  "xPaddingMethod",
  "uplinkHTTPMethod",
  "sessionIDPlacement",
  "sessionIDKey",
  "sessionIDTable",
  "sessionIDLength",
  "sessionPlacement",
  "sessionKey",
  "sessionLength",
  "seqPlacement",
  "seqKey",
  "uplinkDataPlacement",
  "uplinkDataKey",
  "uplinkChunkSize",
  "noGRPCHeader",
  "noSSEHeader",
  "scMaxEachPostBytes",
  "scMinPostsIntervalMs",
  "scMaxBufferedPosts",
  "scStreamUpServerSecs",
  "serverMaxHeaderBytes",
  "xmux",
  "downloadSettings",
  "extra",
]);

const XMUX_KEYS = new Set([
  "maxConcurrency",
  "maxConnections",
  "cMaxReuseTimes",
  "hMaxRequestTimes",
  "hMaxReusableSecs",
  "hKeepAlivePeriod",
]);

const VLESS_SETTINGS_KEYS = new Set(["clients", "decryption", "fallbacks"]);
const VLESS_CLIENT_KEYS = new Set(["id", "flow", "encryption", "level", "email", "reverse"]);

const input = (over: Partial<XrayInput> = {}): XrayInput => ({
  ...xrayEngine.createDefaults(),
  address: "198.51.100.10",
  ...over,
});

const keysOf = (v: unknown): string[] =>
  v && typeof v === "object" && !Array.isArray(v) ? Object.keys(v) : [];

function expectKnown(obj: unknown, known: Set<string>, where: string) {
  for (const key of keysOf(obj)) {
    expect(known.has(key), `${where}: the core has no "${key}"`).toBe(true);
  }
}

describe("every key we emit is one the core parses", () => {
  const cases: [string, XrayInput][] = [
    ["REALITY over RAW", input()],
    ["REALITY over XHTTP", input({ transport: "xhttp" })],
    ["REALITY over gRPC", input({ transport: "grpc" })],
    ["TLS without REALITY", input({ security: "tls", flow: "" })],
    ["with ML-DSA-65", input({ useMldsa65: true })],
    ["with VLESS Encryption", input({ useVlessEncryption: true })],
    ["older core", input({ version: "24.11.11" })],
    ["older core with XHTTP", input({ version: "26.1.13", transport: "xhttp" })],
  ];

  for (const [name, cfgInput] of cases) {
    it(name, () => {
      const inbound = buildServerInbound(xrayEngine.generate(cfgInput)) as Record<
        string,
        unknown
      >;

      expectKnown(inbound, INBOUND_KEYS, "inbound");

      const settings = inbound.settings as Record<string, unknown>;
      expectKnown(settings, VLESS_SETTINGS_KEYS, "settings");
      for (const client of settings.clients as unknown[]) {
        expectKnown(client, VLESS_CLIENT_KEYS, "client");
      }

      const stream = inbound.streamSettings as Record<string, unknown>;
      expectKnown(stream, STREAM_KEYS, "streamSettings");
      expectKnown(stream.realitySettings, REALITY_KEYS, "realitySettings");
      expectKnown(stream.xhttpSettings, XHTTP_KEYS, "xhttpSettings");

      const xhttp = stream.xhttpSettings as Record<string, unknown> | undefined;
      if (xhttp?.xmux) expectKnown(xhttp.xmux, XMUX_KEYS, "xmux");
    });
  }
});

describe("the transport key follows the version", () => {
  it("uses method from v26.7.11", () => {
    const stream = (
      buildServerInbound(xrayEngine.generate(input({ version: "26.7.11" }))) as {
        streamSettings: Record<string, unknown>;
      }
    ).streamSettings;
    expect(stream.method).toBe("raw");
    expect(stream.network).toBeUndefined();
  });

  it("uses network before it", () => {
    for (const version of ["26.6.22", "26.1.13", "24.11.11"] as const) {
      const stream = (
        buildServerInbound(xrayEngine.generate(input({ version }))) as {
          streamSettings: Record<string, unknown>;
        }
      ).streamSettings;
      expect(stream.network, version).toBe("raw");
      expect(stream.method, version).toBeUndefined();
    }
  });
});

describe("the session keys follow the version", () => {
  it("uses sessionID* from v26.6.22", () => {
    const stream = (
      buildServerInbound(
        xrayEngine.generate(input({ version: "26.6.22", transport: "xhttp" })),
      ) as { streamSettings: Record<string, unknown> }
    ).streamSettings;
    const xhttp = stream.xhttpSettings as Record<string, unknown>;
    expect(xhttp.sessionIDLength).toBeDefined();
    expect(xhttp.sessionLength).toBeUndefined();
  });

  it("writes neither spelling before it", () => {
    // This used to assert `session*` on older cores, on the assumption that
    // v26.6.22 renamed the keys. Probing every released core with a
    // deliberately invalid value settled it: `sessionPlacement` is read by no
    // version at all. The knobs did not exist before v26.6.22, so writing
    // either spelling produces a config that loads and ignores them — which
    // looks like it worked, and is the worst way to be wrong.
    for (const version of ["26.1.13", "25.8.29", "25.7.23", "24.11.11"]) {
      const stream = (
        buildServerInbound(
          xrayEngine.generate(
            input({ version: version as never, transport: "xhttp" }),
          ),
        ) as { streamSettings: Record<string, unknown> }
      ).streamSettings;
      const xhttp = stream.xhttpSettings as Record<string, unknown>;

      expect(xhttp.sessionLength, version).toBeUndefined();
      expect(xhttp.sessionIDLength, version).toBeUndefined();
      expect(xhttp.sessionIDPlacement, version).toBeUndefined();
      expect(xhttp.seqPlacement, version).toBeUndefined();
      expect(xhttp.xPaddingKey, version).toBeUndefined();
      expect(xhttp.uplinkDataPlacement, version).toBeUndefined();
    }
  });

  it("writes the whole advanced set from v26.6.22", () => {
    for (const version of ["26.6.22", "26.7.11"]) {
      const stream = (
        buildServerInbound(
          xrayEngine.generate(
            input({ version: version as never, transport: "xhttp" }),
          ),
        ) as { streamSettings: Record<string, unknown> }
      ).streamSettings;
      const xhttp = stream.xhttpSettings as Record<string, unknown>;

      // The padding names are the point: the core's own defaults are the
      // same for every deployment, which is what makes them a fingerprint.
      expect(xhttp.xPaddingKey, version).toBeDefined();
      expect(xhttp.xPaddingHeader, version).toBeDefined();
      expect(xhttp.xPaddingMethod, version).toBeDefined();
      expect(xhttp.sessionIDLength, version).toBeDefined();
    }
  });
});

describe("values the core validates", () => {
  it("sets decryption on every inbound, since the core demands it", () => {
    // "please add/set \"decryption\":\"none\" to every settings"
    const settings = (
      buildServerInbound(xrayEngine.generate(input())) as {
        settings: Record<string, unknown>;
      }
    ).settings;
    expect(settings.decryption).toBeDefined();
  });

  it("never emits both fallbacks and a decryption string", () => {
    // The core rejects the combination outright.
    const settings = (
      buildServerInbound(
        xrayEngine.generate(input({ useVlessEncryption: true })),
      ) as { settings: Record<string, unknown> }
    ).settings;
    expect(settings.decryption).not.toBe("none");
    expect(settings.fallbacks).toBeUndefined();
  });

  it("omits flow from a client that has none, rather than sending empty", () => {
    const settings = (
      buildServerInbound(
        xrayEngine.generate(input({ security: "tls", flow: "" })),
      ) as { settings: Record<string, unknown> }
    ).settings;
    for (const client of settings.clients as Record<string, unknown>[]) {
      expect("flow" in client).toBe(false);
    }
  });
});
