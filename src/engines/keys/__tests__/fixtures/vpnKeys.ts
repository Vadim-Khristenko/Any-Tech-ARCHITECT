/**
 * Synthetic `vpn://` keys, one per shape the decoder has to survive.
 *
 * Built rather than pasted. Real keys carry real credentials — an Amnezia
 * `api_key` is a live token in someone's account — so none belong in a
 * repository, and a fixture that has to be redacted before it can be committed
 * is a fixture nobody can regenerate.
 *
 * Building them is also the stronger test. The property that matters most here
 * is that the four-byte length header cannot be trusted: the API keys the
 * client issues declare 0xFF whatever they actually contain. Observed in the
 * wild that is an accident of whatever writes them; constructed here it is
 * deliberate and named, so a future change that reintroduces the strict check
 * fails against a case that says why it exists.
 *
 * Every address, key and token below is fake: documentation ranges from
 * RFC 5737 and RFC 3849, and obviously-inert base64.
 */

import pako from "pako";
import { genCfg } from "@/engines/awg/generator";
import { capsFor } from "@/engines/awg/generator/versions";
import { makeAwgContainer, buildKey } from "@/engines/keys/build";
import { vpnEncode } from "@/engines/keys/codec";
import type { AWGConfig } from "@/engines/awg/generator/types";

/* ── Envelopes ────────────────────────────────────────────────────────────── */

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * The compressed envelope: four big-endian bytes, then zlib.
 *
 * `declaredLength` exists so a test can build the dishonest header on purpose.
 * Left out, the header tells the truth — which is what server-issued
 * configuration keys do.
 */
export function encodeCompressed(
  value: unknown,
  declaredLength?: number,
): string {
  const json = new TextEncoder().encode(JSON.stringify(value));
  const body = pako.deflate(json);
  const len = declaredLength ?? json.length;

  const out = new Uint8Array(4 + body.length);
  out[0] = (len >>> 24) & 0xff;
  out[1] = (len >>> 16) & 0xff;
  out[2] = (len >>> 8) & 0xff;
  out[3] = len & 0xff;
  out.set(body, 4);
  return `vpn://${toBase64Url(out)}`;
}

/** No envelope at all — base64 of the JSON, which older keys use. */
export function encodePlain(value: unknown): string {
  return `vpn://${toBase64Url(new TextEncoder().encode(JSON.stringify(value)))}`;
}

/** What the API keys put in their header regardless of payload size. */
export const UNTRUE_HEADER = 0xff;

/* ── API service keys ─────────────────────────────────────────────────────── */

/**
 * The current shape: compressed, `config_version` 2, a service rather than a
 * tunnel — `api_config` describes what to ask for and `auth_data` how to
 * authenticate. It has no containers, so there is nothing here to merge.
 */
export function apiKeyV2(
  serviceType: "amnezia-premium" | "amnezia-free" = "amnezia-premium",
): string {
  return encodeCompressed(
    {
      name: serviceType === "amnezia-free" ? "Amnezia Free" : "Amnezia Premium",
      description: "Example service key, not issued by anyone",
      config_version: 2,
      api_config: {
        service_type: serviceType,
        service_protocol: "awg",
        user_country_code: "ru",
      },
      auth_data: { api_key: "EXAMPLEKEY.0000000000000000000000000000000000" },
    },
    UNTRUE_HEADER,
  );
}

/**
 * The older shape: no envelope, and the fields sit flat rather than under
 * `api_config` / `auth_data`.
 */
export function apiKeyV1(): string {
  return encodePlain({
    config_version: 1.0,
    api_endpoint: "https://192.0.2.10/api/v1/request/awg/",
    protocol: "awg",
    name: "Amnezia Free RU",
    description: "Example service key, not issued by anyone",
    api_key: "EXAMPLEKEY.0000000000000000000000000000000000",
  });
}

/* ── Tunnel keys ──────────────────────────────────────────────────────────── */

const CLIENT_PRIV = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const CLIENT_PUB = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=";
const SERVER_PUB = "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=";
const PSK = "DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=";
const HOST = "198.51.100.7";

function wgQuick(extra = ""): string {
  return [
    "[Interface]",
    "Address = 10.8.1.6/32",
    "DNS = 1.1.1.1, 1.0.0.1",
    `PrivateKey = ${CLIENT_PRIV}`,
    extra,
    "",
    "[Peer]",
    `PublicKey = ${SERVER_PUB}`,
    `PresharedKey = ${PSK}`,
    "AllowedIPs = 0.0.0.0/0, ::/0",
    `Endpoint = ${HOST}:44200`,
    "PersistentKeepalive = 25",
    "",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

/** The inner object a container stores under `last_config`, as a JSON string. */
function lastConfig(extra: Record<string, unknown> = {}, quickExtra = "") {
  return JSON.stringify({
    allowed_ips: ["0.0.0.0/0", "::/0"],
    clientId: CLIENT_PUB,
    client_ip: "10.8.1.6",
    client_priv_key: CLIENT_PRIV,
    client_pub_key: CLIENT_PUB,
    config: wgQuick(quickExtra),
    hostName: HOST,
    mtu: "1420",
    persistent_keep_alive: "25",
    port: 44200,
    psk_key: PSK,
    server_pub_key: SERVER_PUB,
    ...extra,
  });
}

function envelope(container: string, body: Record<string, unknown>) {
  return {
    containers: [{ container, [containerProtocol(container)]: body }],
    defaultContainer: container,
    description: "Example server",
    dns1: "1.1.1.1",
    dns2: "1.0.0.1",
    hostName: HOST,
  };
}

/** The protocol key a container nests its settings under. */
function containerProtocol(container: string): string {
  if (container === "amnezia-wireguard") return "wireguard";
  if (container === "amnezia-xray") return "xray";
  if (container === "amnezia-openvpn") return "openvpn";
  return "awg";
}

/** Plain WireGuard: no obfuscation fields anywhere. */
export function wireguardKey(): string {
  return encodeCompressed(
    envelope("amnezia-wireguard", {
      last_config: lastConfig(),
      port: "44200",
      subnet_address: "10.8.1.0",
      transport_proto: "udp",
    }),
  );
}

/**
 * AmneziaWG. `version` picks how much obfuscation the container carries, which
 * is the difference the field editor has to read.
 */
export function awgKey(
  version: "1.0" | "2.0" | "3.0" | "3.1" = "2.0",
): string {
  const base: Record<string, unknown> = {
    Jc: "4",
    Jmin: "40",
    Jmax: "70",
    H1: "1234567890",
    H2: "1234567891",
    H3: "1234567892",
    H4: "1234567893",
    S1: "60",
    S2: "80",
  };

  if (version !== "1.0") {
    Object.assign(base, {
      S3: "30",
      S4: "20",
      I1: "<b 0xf0f0>",
      I2: "<b 0xa1a1>",
    });
  }

  if (version === "3.0" || version === "3.1") {
    Object.assign(base, {
      HeaderProtectionKey: "EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE=",
      ContentPaddingAddition: "16",
      RekeyAfterTime: "110-130",
      RekeyTimeout: "4-6",
      RejectAfterTime: "170-190",
      KeepaliveTimeout: "9-11",
      MaxHandshakeAttempts: "17-20",
    });
  }

  if (version === "3.1") {
    Object.assign(base, {
      RandomTrailers: "1",
      DisableCookies: "1",
    });
  }

  /*
   * The obfuscation fields go into the wg-quick text as well, which is what a
   * real AmneziaWG key does — it is the third copy, and the one an editor is
   * most likely to leave behind.
   */
  const quickExtra = Object.entries(base)
    .map(([k, v]) => `${k} = ${String(v)}`)
    .join("\n");

  return encodeCompressed(
    envelope("amnezia-awg", {
      ...base,
      last_config: lastConfig(base, quickExtra),
      port: "44200",
      subnet_address: "10.8.1.0",
      transport_proto: "udp",
    }),
  );
}

/**
 * XRay inside a `vpn://` key.
 *
 * The field names are the client's own, from
 * `client/core/utils/constants/configKeys.h` — `xray_security`, `xray_flow`
 * and the `xhttp_*` family — rather than the query names a `vless://` link
 * uses. The two describe the same connection in different vocabularies.
 */
export function xrayKey(): string {
  return encodeCompressed(
    envelope("amnezia-xray", {
      last_config: JSON.stringify({
        config: JSON.stringify({ outbounds: [{ protocol: "vless" }] }),
        // The client identifier lives with the address, one level in, which
        // is where a link has to be assembled from.
        clientId: "b831381d-6324-4d53-ad4f-8cda48b30811",
        hostName: HOST,
        port: 443,
      }),
      xray_security: "reality",
      xray_flow: "xtls-rprx-vision",
      xray_fingerprint: "chrome",
      xray_sni: "www.example.com",
      xray_transport: "xhttp",
      xhttp_mode: "Auto",
      xhttp_path: "/example",
      port: "443",
      transport_proto: "tcp",
    }),
  );
}

/** Two containers in one key — what merging produces and has to re-read. */
export function multiContainerKey(): string {
  const awg = JSON.parse(
    JSON.stringify({ container: "amnezia-awg", awg: { Jc: "4", Jmin: "40", Jmax: "70" } }),
  );
  const xray = { container: "amnezia-xray", xray: { xray_security: "reality" } };
  return encodeCompressed({
    containers: [awg, xray],
    defaultContainer: "amnezia-awg",
    description: "Example server",
    hostName: HOST,
  });
}

/* ── Pseudo-random but valid keys via the real generator ─────────────────── */

/**
 * Convert a generated AWGConfig into the flat obfuscation map that
 * `makeAwgContainer` expects. Mirrors `renderConfLines` capability logic so
 * the key and the rendered `.conf` never disagree.
 */
function awgConfigToObfuscation(cfg: AWGConfig): Record<string, string> {
  const caps = capsFor(cfg.version);
  const out: Record<string, string> = {};

  if (caps.rangedHeaders) {
    out.H1 = cfg.h1;
    out.H2 = cfg.h2;
    out.H3 = cfg.h3;
    out.H4 = cfg.h4;
  } else {
    out.H1 = String(cfg.h1s);
    out.H2 = String(cfg.h2s);
    out.H3 = String(cfg.h3s);
    out.H4 = String(cfg.h4s);
  }

  out.S1 = String(cfg.s1);
  out.S2 = String(cfg.s2);
  if (caps.extraSizes) {
    out.S3 = String(cfg.s3);
    out.S4 = String(cfg.s4);
  }

  out.Jc = String(cfg.jc);
  out.Jmin = String(cfg.jmin);
  out.Jmax = String(cfg.jmax);

  if (caps.cps) {
    // Empty string means the generator decided against a chain (router mode
    // or a client that ignores it). Not emitted.
    if (cfg.i1) out.I1 = cfg.i1;
    if (cfg.i2) out.I2 = cfg.i2;
    if (cfg.i3) out.I3 = cfg.i3;
    if (cfg.i4) out.I4 = cfg.i4;
    if (cfg.i5) out.I5 = cfg.i5;
  }

  if (caps.headerProtection && cfg.awg3) {
    if (cfg.awg3.headerProtectionKey) out.HeaderProtectionKey = cfg.awg3.headerProtectionKey;
    if (cfg.awg3.contentPaddingAddition) out.ContentPaddingAddition = cfg.awg3.contentPaddingAddition;
    if (cfg.awg3.rekeyAfterTime) out.RekeyAfterTime = cfg.awg3.rekeyAfterTime;
    if (cfg.awg3.rekeyTimeout) out.RekeyTimeout = cfg.awg3.rekeyTimeout;
    if (cfg.awg3.rejectAfterTime) out.RejectAfterTime = cfg.awg3.rejectAfterTime;
    if (cfg.awg3.keepaliveTimeout) out.KeepaliveTimeout = cfg.awg3.keepaliveTimeout;
    if (cfg.awg3.maxHandshakeAttempts) out.MaxHandshakeAttempts = cfg.awg3.maxHandshakeAttempts;
    if (caps.featureFlags) {
      if (cfg.awg3.randomTrailers || cfg.awg3.disableCookies) {
        out.RandomTrailers = cfg.awg3.randomTrailers ? "1" : "0";
        out.DisableCookies = cfg.awg3.disableCookies ? "1" : "0";
      }
    }
  }

  return out;
}

/**
 * Generate a pseudo-random but **valid** `vpn://` key for the given AWG version.
 *
 * Uses the real `genCfg` so every invariant (S-floor, no H-overlap, timer
 * margins, etc.) holds. The randomness comes from `crypto.getRandomValues`
 * inside the generator — pseudo-random per call, deterministic per `iterCount`.
 *
 * @param version - "2.0" | "3.0" | "3.1" (1.x not meaningful for random 3.x testing)
 * @param opts - overrides for intensity/profile/flags; defaults mirror the UI
 */
export function randomAwgKey(
  version: "2.0" | "3.0" | "3.1" = "3.0",
  opts: Partial<{
    intensity: "low" | "medium" | "high";
    profile: AWGConfig["profile"];
    iterCount: number;
    useHeaderProtection: boolean;
    useContentPadding: boolean;
    useRandomTimings: boolean;
    useRandomTrailers: boolean;
    useDisableCookies: boolean;
  }> = {},
): string {
  const input = {
    version,
    intensity: (opts.intensity ?? "medium") as import("@/engines/awg/generator/types").Intensity,
    profile: (opts.profile ?? "quic_initial") as AWGConfig["profile"],
    customHost: "",
    hostRegion: "any" as const,
    mimicAll: false,
    useTagC: false,
    useTagT: true,
    useTagR: true,
    useTagRC: true,
    useTagRD: true,
    useBrowserFp: false,
    browserProfile: "chrome",
    mtu: 1500,
    junkLevel: 5,
    iterCount: opts.iterCount ?? Math.floor(Math.random() * 1000),
    routerMode: false,
    useExtremeMax: false,
    clientId: "amneziawg-go" as const,
    clientRelease: null,
    useHeaderProtection: opts.useHeaderProtection ?? true,
    useContentPadding: opts.useContentPadding ?? true,
    useRandomTimings: opts.useRandomTimings ?? true,
    useRandomTrailers: opts.useRandomTrailers ?? (version === "3.1" ? Math.random() > 0.5 : false),
    useDisableCookies: opts.useDisableCookies ?? (version === "3.1" ? Math.random() > 0.5 : false),
  } as unknown as Parameters<typeof genCfg>[0];

  const cfg = genCfg(input);
  const obf = awgConfigToObfuscation(cfg);

  // Deterministic dummy credentials — valid base64, not real.
  const container = makeAwgContainer(
    {
      hostName: HOST,
      port: 51820 + (input.iterCount % 1000),
      clientPrivKey: CLIENT_PRIV,
      clientPubKey: CLIENT_PUB,
      serverPubKey: SERVER_PUB,
      pskKey: PSK,
      clientIp: "10.8.1.6",
      obfuscation: obf,
    },
    "amnezia-awg",
  );

  const vpnConfig = buildKey([container], {
    hostName: HOST,
    description: `Random ${version}`,
  });

  return vpnEncode(vpnConfig);
}

/** Batch of pseudo-random valid keys — useful for property tests. */
export function randomAwgKeys(
  count: number,
  version: "2.0" | "3.0" | "3.1" = "3.0",
): string[] {
  if (!Number.isFinite(count) || count < 1) throw new RangeError("count must be >=1");
  if (count > 100) throw new RangeError("count must not exceed 100");
  return Array.from({ length: count }, (_, i) => randomAwgKey(version, { iterCount: i * 997 }));
}
