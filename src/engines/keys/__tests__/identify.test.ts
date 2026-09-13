/**
 * Saying what a key is before offering to do something with it.
 *
 * The case that motivates the whole module: an Amnezia subscription key
 * decodes perfectly and holds no tunnel. Every operation that walks
 * `containers[]` then produces nothing and reports success, so a page built on
 * decoding alone tells the reader it merged zero containers instead of telling
 * them they pasted a subscription.
 */

import { describe, it, expect } from "bun:test";
import {
  hasObfuscation,
  identifyKey,
  setKeyLabels,
  vpnDecode,
  type VpnConfig,
} from "@/engines/keys";
import {
  apiKeyV1,
  apiKeyV2,
  awgKey,
  multiContainerKey,
  wireguardKey,
  xrayKey,
} from "./fixtures/vpnKeys";

const identify = (key: string) => identifyKey(vpnDecode(key) as VpnConfig);

/* ── Subscription keys ────────────────────────────────────────────────────── */

describe("a subscription key", () => {
  it("is named as the service it belongs to", () => {
    expect(identify(apiKeyV2("amnezia-premium")).service).toBe("amnezia-premium");
    expect(identify(apiKeyV2("amnezia-free")).service).toBe("amnezia-free");
  });

  it("is recognised in the older shape too, by its name", () => {
    // The older shape carries no service_type at all — the endpoint is a bare
    // IP that changes, so the name is the only stable thing to read.
    const id = identify(apiKeyV1());
    expect(id.shape).toBe("api");
    expect(id.service).toBe("amnezia-free");
  });

  it("is read-only, because there is no tunnel in it to edit", () => {
    const id = identify(apiKeyV2());
    expect(id.readOnly).toBe(true);
    expect(id.containers).toEqual([]);
    expect(hasObfuscation(id)).toBe(false);
  });
});

/* ── Tunnel keys ──────────────────────────────────────────────────────────── */

describe("a tunnel key", () => {
  it("lists its containers with the label a reader knows them by", () => {
    const id = identify(wireguardKey());
    expect(id.shape).toBe("config");
    expect(id.readOnly).toBe(false);
    expect(id.containers).toHaveLength(1);
    expect(id.containers[0].label).toBe("WireGuard");
    expect(id.containers[0].protocol).toBe("wireguard");
  });

  it("says plain WireGuard has no obfuscation to rewrite", () => {
    expect(hasObfuscation(identify(wireguardKey()))).toBe(false);
    expect(hasObfuscation(identify(awgKey()))).toBe(true);
  });

  it("reads the address and port off the container", () => {
    const c = identify(wireguardKey()).containers[0];
    expect(c.hostName).toBe("198.51.100.7");
    expect(c.port).toBe("44200");
  });

  it("keeps every container of a merged key", () => {
    const id = identify(multiContainerKey());
    expect(id.containers.map((c) => c.label)).toEqual(["AmneziaWG", "XRay"]);
  });

  it("recognises an XRay container", () => {
    const c = identify(xrayKey()).containers[0];
    expect(c.protocol).toBe("xray");
    expect(c.obfuscated).toBe(false);
  });
});

/* ── Which AmneziaWG generation ───────────────────────────────────────────── */

describe("the AmneziaWG generation", () => {
  it("is read off the fields, because a key carries no version field", () => {
    expect(identify(awgKey("1.0")).containers[0].awgVersion).toBe("1.0");
    expect(identify(awgKey("2.0")).containers[0].awgVersion).toBe("2.0");
    expect(identify(awgKey("3.0")).containers[0].awgVersion).toBe("3.0");
  });

  it("is absent on a container that is not AmneziaWG at all", () => {
    expect(identify(wireguardKey()).containers[0].awgVersion).toBeUndefined();
  });
});

/* ── Naming ───────────────────────────────────────────────────────────────── */

describe("renaming a key", () => {
  it("marks the name as the user's, or the client will replace it", () => {
    const cfg = vpnDecode(wireguardKey()) as VpnConfig;
    const renamed = setKeyLabels(cfg, { name: "Home server" });

    expect((renamed as unknown as Record<string, unknown>).name).toBe("Home server");
    expect(renamed.nameOverriddenByUser).toBe(true);
  });

  it("changes a description without claiming the name was overridden", () => {
    const cfg = vpnDecode(wireguardKey()) as VpnConfig;
    const described = setKeyLabels(cfg, { description: "Backup route" });

    expect(described.description).toBe("Backup route");
    expect(described.nameOverriddenByUser).toBeUndefined();
  });

  it("leaves the original alone", () => {
    const cfg = vpnDecode(wireguardKey()) as VpnConfig;
    const before = cfg.description;
    setKeyLabels(cfg, { description: "Something else" });
    expect(cfg.description).toBe(before);
  });
});
