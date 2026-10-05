/**
 * Every shape a `vpn://` key arrives in, and the one property that broke them.
 *
 * The four-byte length header cannot be trusted. `vpnDecode` used to reject a
 * key whose inflated size disagreed with it, and every Amnezia API key
 * disagrees: both a Premium and a current Free key declare 0xFF whatever they
 * actually hold, while the JSON that comes out of them is complete and valid.
 * Two independently issued keys claiming the same 255 is not chance — the
 * field is simply not computed by whatever writes them. Server-issued
 * configuration keys do carry a true length, and those still round-trip
 * exactly, so a mismatch is worth noticing and not worth refusing a key over.
 *
 * The fixtures are built rather than pasted. Real keys carry live credentials,
 * so none are committed here; building them also lets the dishonest header be
 * constructed on purpose instead of relied on as an accident.
 */

import { describe, it, expect } from "bun:test";
import { vpnDecode, vpnEncode, type VpnConfig } from "@/engines/keys";
import {
  apiKeyV1,
  apiKeyV2,
  awgKey,
  encodeCompressed,
  multiContainerKey,
  wireguardKey,
  xrayKey,
  UNTRUE_HEADER,
} from "./fixtures/vpnKeys";

const asRecord = (v: unknown) => v as Record<string, unknown>;

/* ── The header the decoder used to enforce ───────────────────────────────── */

describe("the length header", () => {
  it("is believed when it is honest", () => {
    const cfg = vpnDecode(wireguardKey()) as VpnConfig;
    expect(cfg.defaultContainer).toBe("amnezia-wireguard");
  });

  it("is ignored when it lies, because API keys always lie about it", () => {
    const cfg = asRecord(vpnDecode(apiKeyV2("amnezia-premium")));
    expect(cfg.config_version).toBe(2);
    expect(asRecord(cfg.api_config).service_type).toBe("amnezia-premium");
  });

  it("does not care how far off the header is", () => {
    // The real ones are short by three and by nine; the amount is incidental.
    const key = encodeCompressed({ hello: "world" }, UNTRUE_HEADER);
    expect(asRecord(vpnDecode(key)).hello).toBe("world");
  });
});

/* ── API service keys ─────────────────────────────────────────────────────── */

describe("API service keys", () => {
  it("reads the current shape, with api_config and auth_data", () => {
    const cfg = asRecord(vpnDecode(apiKeyV2("amnezia-free")));
    expect(cfg.config_version).toBe(2);
    expect(asRecord(cfg.api_config).service_type).toBe("amnezia-free");
    expect(asRecord(cfg.api_config).service_protocol).toBe("awg");
    expect(cfg.auth_data).toHaveProperty("api_key");
  });

  it("reads the older shape, which is not compressed and sits flat", () => {
    const cfg = asRecord(vpnDecode(apiKeyV1()));
    expect(cfg.config_version).toBe(1);
    expect(cfg.protocol).toBe("awg");
    expect(cfg.api_endpoint).toContain("/api/v1/request/awg/");
    // The older shape has no api_config at all — the fields are top level.
    expect(cfg.api_config).toBeUndefined();
  });

  it("has no containers, so there is nothing in it to merge or patch", () => {
    for (const key of [apiKeyV2(), apiKeyV1()]) {
      expect((vpnDecode(key) as VpnConfig).containers).toBeUndefined();
    }
  });
});

/* ── Tunnel keys ──────────────────────────────────────────────────────────── */

describe("a plain WireGuard container", () => {
  const cfg = vpnDecode(wireguardKey()) as VpnConfig;
  const wg = asRecord(cfg.containers?.[0].wireguard);

  it("nests its settings under `wireguard`, not `awg`", () => {
    expect(cfg.containers?.[0].container).toBe("amnezia-wireguard");
    expect(wg).toBeDefined();
    expect(cfg.containers?.[0].awg).toBeUndefined();
  });

  it("carries its config twice, as the format does for AWG too", () => {
    const inner = asRecord(JSON.parse(wg.last_config as string));
    expect(inner.config).toContain("[Interface]");
    expect(inner.config).toContain("[Peer]");
  });

  it("has none of the obfuscation fields, being plain WireGuard", () => {
    for (const field of ["Jc", "Jmin", "Jmax", "H1", "S1"]) {
      expect(wg[field]).toBeUndefined();
    }
  });
});

describe("an AmneziaWG container", () => {
  it("carries only what its version has", () => {
    const v1 = asRecord((vpnDecode(awgKey("1.0")) as VpnConfig).containers?.[0].awg);
    expect(v1.S1).toBeDefined();
    expect(v1.S3).toBeUndefined();
    expect(v1.I1).toBeUndefined();

    const v2 = asRecord((vpnDecode(awgKey("2.0")) as VpnConfig).containers?.[0].awg);
    expect(v2.S3).toBeDefined();
    expect(v2.I1).toBeDefined();
    expect(v2.HeaderProtectionKey).toBeUndefined();
  });

  it("carries the 3.0 fields when it is 3.0", () => {
    const v3 = asRecord((vpnDecode(awgKey("3.0")) as VpnConfig).containers?.[0].awg);
    // Names as the client spells them — configKeys.h, not our own shorthand.
    for (const field of [
      "HeaderProtectionKey",
      "ContentPaddingAddition",
      "RekeyAfterTime",
      "RekeyTimeout",
      "RejectAfterTime",
      "KeepaliveTimeout",
      "MaxHandshakeAttempts",
    ]) {
      expect(v3[field], field).toBeDefined();
    }
  });
});

describe("an XRay container", () => {
  it("uses the client's own field names, not a vless:// link's", () => {
    const xray = asRecord((vpnDecode(xrayKey()) as VpnConfig).containers?.[0].xray);
    expect(xray.xray_security).toBe("reality");
    expect(xray.xray_flow).toBe("xtls-rprx-vision");
    expect(xray.xhttp_mode).toBeDefined();
    // The query names a share link uses are absent here.
    expect(xray.pbk).toBeUndefined();
    expect(xray.sni).toBeUndefined();
  });
});

describe("a key with more than one container", () => {
  it("keeps both, which is what merging produces", () => {
    const cfg = vpnDecode(multiContainerKey()) as VpnConfig;
    expect(cfg.containers).toHaveLength(2);
    expect(cfg.containers?.map((c) => c.container)).toEqual([
      "amnezia-awg",
      "amnezia-xray",
    ]);
  });
});

/* ── Round trip ───────────────────────────────────────────────────────────── */

describe("encode and decode", () => {
  it("returns what it was given", () => {
    const original = vpnDecode(wireguardKey()) as VpnConfig;
    expect(vpnDecode(vpnEncode(original))).toEqual(original);
  });

  it("writes an honest header even though it accepts dishonest ones", () => {
    const encoded = vpnEncode({ containers: [], description: "t" });
    const b64 = encoded
      .replace(/^vpn:\/\//, "")
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const declared =
      (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];

    const json = JSON.stringify({ containers: [], description: "t" }, null, 4);
    expect(declared).toBe(new TextEncoder().encode(json).length);
  });

  it("refuses something that is not a key at all", () => {
    expect(() => vpnDecode("vpn://not-a-key")).toThrow();
  });
});
