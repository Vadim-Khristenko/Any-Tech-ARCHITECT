/**
 * Checking a key that decoded perfectly and still will not work.
 *
 * The three failures the format hides: a container that contradicts itself
 * across its own copies, an AmneziaWG 3.0 container below the header-protection
 * floor, and a container name nothing recognises.
 */

import { describe, it, expect } from "bun:test";
import {
  identifyKey,
  validateVpnConfig,
  vpnDecode,
  type VpnConfig,
} from "@/engines/keys";
import { translate, type MessageKey } from "@/i18n";
import {
  apiKeyV2,
  awgKey,
  encodeCompressed,
  wireguardKey,
} from "./fixtures/vpnKeys";

const check = (key: string) => validateVpnConfig(vpnDecode(key) as VpnConfig);
const codes = (f: { code: string }[]) => f.map((x) => x.code);

/* ── Clean keys stay quiet ────────────────────────────────────────────────── */

describe("a key with nothing wrong", () => {
  it("reports nothing", () => {
    expect(check(wireguardKey())).toEqual([]);
    expect(check(awgKey("2.0"))).toEqual([]);
    expect(check(awgKey("3.0"))).toEqual([]);
  });
});

/* ── Subscription keys ────────────────────────────────────────────────────── */

describe("a subscription key", () => {
  it("is described rather than complained about", () => {
    const findings = check(apiKeyV2());
    expect(codes(findings)).toEqual(["vpn.subscription_key"]);
    expect(findings[0].level).toBe("info");
  });
});

/* ── A container that disagrees with itself ───────────────────────────────── */

describe("the three copies of a configuration", () => {
  it("catches a field changed in the body but not in last_config", () => {
    const cfg = vpnDecode(awgKey("2.0")) as VpnConfig;
    const awg = cfg.containers![0].awg as Record<string, unknown>;
    awg.Jc = "9"; // the body says 9, last_config still says 4

    const findings = validateVpnConfig(cfg);
    const bad = findings.find((f) => f.code === "vpn.self_contradiction");
    expect(bad).toBeDefined();
    expect(bad!.level).toBe("error");
    expect(bad!.field).toBe("Jc");
  });

  it("catches a field changed in the body but not in the wg-quick text", () => {
    const cfg = vpnDecode(awgKey("2.0")) as VpnConfig;
    const awg = cfg.containers![0].awg as Record<string, unknown>;
    const inner = JSON.parse(awg.last_config as string) as Record<string, unknown>;

    // Keep last_config in step so only the wg-quick copy is left behind.
    awg.S1 = "77";
    inner.S1 = "77";
    awg.last_config = JSON.stringify(inner);

    const findings = validateVpnConfig(cfg);
    const bad = findings.filter((f) => f.code === "vpn.self_contradiction");
    expect(bad).toHaveLength(1);
    expect(bad[0].values?.where).toBe("config");
  });

  it("says so when last_config is not JSON at all", () => {
    const cfg = vpnDecode(awgKey("2.0")) as VpnConfig;
    (cfg.containers![0].awg as Record<string, unknown>).last_config = "{not json";
    expect(codes(validateVpnConfig(cfg))).toContain("vpn.last_config_unreadable");
  });
});

/* ── The AmneziaWG 3.0 floor ──────────────────────────────────────────────── */

describe("header protection", () => {
  it("rejects an S below twelve when a key is set", () => {
    const cfg = vpnDecode(awgKey("3.0")) as VpnConfig;
    const awg = cfg.containers![0].awg as Record<string, unknown>;
    const inner = JSON.parse(awg.last_config as string) as Record<string, unknown>;
    awg.S3 = "8";
    inner.S3 = "8";
    awg.last_config = JSON.stringify(inner);

    const findings = validateVpnConfig(cfg);
    const bad = findings.find((f) => f.code === "vpn.s_below_floor");
    expect(bad).toBeDefined();
    expect(bad!.level).toBe("error");
    expect(bad!.field).toBe("S3");
  });

  it("says nothing about a small S when no key is set", () => {
    const cfg = vpnDecode(awgKey("2.0")) as VpnConfig;
    const awg = cfg.containers![0].awg as Record<string, unknown>;
    const inner = JSON.parse(awg.last_config as string) as Record<string, unknown>;
    awg.S3 = "8";
    inner.S3 = "8";
    awg.last_config = JSON.stringify(inner);

    expect(codes(validateVpnConfig(cfg))).not.toContain("vpn.s_below_floor");
  });
});

/* ── Names ────────────────────────────────────────────────────────────────── */

describe("a container name nothing recognises", () => {
  /*
   * `amnezia-awg3` is a known name now, so it would not exercise this at all.
   * The point is a name the client adds after this code was written.
   */
  const unknownName = (body: Record<string, unknown>, name = "amnezia-awg9") =>
    encodeCompressed({
      containers: [{ container: name, awg: body }],
      defaultContainer: name,
      hostName: "198.51.100.7",
    });

  it("is read from its fields, and says the answer was inferred", () => {
    const key = unknownName({ Jc: "4", Jmin: "40", Jmax: "70", S1: "60" });
    const findings = check(key);
    const note = findings.find((f) => f.code === "vpn.container_inferred");
    expect(note).toBeDefined();
    expect(note!.values?.guess).toBe("awg");

    const summary = identifyKey(vpnDecode(key) as VpnConfig).containers[0];
    expect(summary.inferred).toBe("awg");
    expect(summary.obfuscated).toBe(true);
    expect(summary.awgVersion).toBe("1.0");
  });

  it("is reported plainly when the fields say nothing either", () => {
    const key = unknownName({ something: "else" }, "amnezia-mystery");
    expect(codes(check(key))).toContain("vpn.container_unknown");
  });

  it("does not override a name we do know", () => {
    // A WireGuard container stays WireGuard: the client wrote that name and
    // the client reads it back, whatever the fields suggest.
    const summary = identifyKey(vpnDecode(wireguardKey()) as VpnConfig).containers[0];
    expect(summary.inferred).toBeUndefined();
    expect(summary.protocol).toBe("wireguard");
  });

  it("flags a known name whose contents belong to another protocol", () => {
    const key = encodeCompressed({
      containers: [
        { container: "amnezia-wireguard", wireguard: { Jc: "4", S1: "60", H1: "1" } },
      ],
      defaultContainer: "amnezia-wireguard",
    });
    const bad = check(key).find((f) => f.code === "vpn.container_mismatch");
    expect(bad).toBeDefined();
    expect(bad!.values?.declared).toBe("wireguard");
    expect(bad!.values?.found).toBe("awg");
  });
});

/* ── Structure ────────────────────────────────────────────────────────────── */

describe("the shape of the key", () => {
  it("notices two containers with one name", () => {
    const key = encodeCompressed({
      containers: [
        { container: "amnezia-awg", awg: { Jc: "4" } },
        { container: "amnezia-awg", awg: { Jc: "5" } },
      ],
      defaultContainer: "amnezia-awg",
    });
    expect(codes(check(key))).toContain("vpn.duplicate_container");
  });

  it("notices a defaultContainer that is not there", () => {
    const key = encodeCompressed({
      containers: [{ container: "amnezia-awg", awg: { Jc: "4" } }],
      defaultContainer: "amnezia-xray",
    });
    expect(codes(check(key))).toContain("vpn.default_missing");
  });

  it("notices an empty container", () => {
    const key = encodeCompressed({
      containers: [{ container: "amnezia-awg" }],
      defaultContainer: "amnezia-awg",
    });
    expect(codes(check(key))).toContain("vpn.empty_container");
  });

  it("notices a key with no containers", () => {
    const key = encodeCompressed({ containers: [], description: "x" });
    expect(codes(check(key))).toContain("vpn.no_containers");
  });
});

/* ── Every finding has a sentence ─────────────────────────────────────────── */

describe("messages", () => {
  it("has catalogue text for every code this module can emit", () => {
    const CODES = [
      "vpn.subscription_key",
      "vpn.no_containers",
      "vpn.empty_container",
      "vpn.container_inferred",
      "vpn.container_unknown",
      "vpn.container_mismatch",
      "vpn.last_config_unreadable",
      "vpn.self_contradiction",
      "vpn.s_below_floor",
      "vpn.duplicate_container",
      "vpn.default_missing",
    ];
    const values = {
      name: "x",
      guess: "awg",
      declared: "a",
      found: "b",
      field: "S1",
      a: "1",
      b: "2",
      where: "config",
      value: "8",
      min: 12,
      first: 1,
      at: 2,
    };
    for (const code of CODES) {
      const key = `find.${code}`;
      expect(translate(key as MessageKey, values), key).not.toBe(key);
    }
  });
});
