import { describe, it, expect } from "bun:test";
import {
    vpnDecode,
    vpnEncode,
    buildObfuscationPatch,
    mergeVpnConfigs,
    patchWgQuickString,
    patchJsonString,
    type VpnConfig,
    type GeneratedParams,
} from "@/engines/keys";

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeSampleConfig(desc = "Test key"): VpnConfig {
    return {
        containers: [
            {
                container: "amneziawg",
                awg: {
                    Jc: "5",
                    Jmin: "64",
                    Jmax: "256",
                    last_config: JSON.stringify({ Jc: "5", Jmin: "64", Jmax: "256" }),
                    config: "[Interface]\nJc = 5\nJmin = 64\nJmax = 256\n",
                },
            },
        ],
        defaultContainer: "amneziawg",
        description: desc,
        dns1: "1.1.1.1",
        dns2: "8.8.8.8",
        hostName: "test.example.com",
    };
}

function makeSecondConfig(): VpnConfig {
    return {
        containers: [
            {
                container: "xray",
                awg: {
                    Jc: "3",
                    Jmin: "40",
                    Jmax: "128",
                },
            },
        ],
        defaultContainer: "xray",
        description: "XRay key",
        dns1: "8.8.8.8",
        dns2: "8.8.4.4",
        hostName: "xray.example.com",
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Codec round-trip
// ─────────────────────────────────────────────────────────────────────────────

describe("codec round-trip", () => {
    it("vpnDecode(vpnEncode(config)) deep-equals config", () => {
        const original = makeSampleConfig();
        const encoded = vpnEncode(original);
        const decoded = vpnDecode(encoded);
        expect(decoded).toEqual(original);
    });

    it("works with multiple containers", () => {
        const config: VpnConfig = {
            containers: [
                { container: "amneziawg", awg: { Jc: "5" } },
                { container: "xray" },
                { container: "openvpn" },
            ],
            defaultContainer: "amneziawg",
            description: "Multi-container",
        };
        const decoded = vpnDecode(vpnEncode(config));
        expect(decoded).toEqual(config);
    });

    it("preserves special characters in values", () => {
        const config: VpnConfig = {
            containers: [],
            description: "Тест < кавычки > & спецсимволы \"двойные\"",
        };
        const decoded = vpnDecode(vpnEncode(config));
        expect(decoded.description).toBe(config.description);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// vpnDecode
// ─────────────────────────────────────────────────────────────────────────────

describe("vpnDecode", () => {
    it("throws on empty string", () => {
        expect(() => vpnDecode("")).toThrow();
    });

    it("throws on garbage input", () => {
        expect(() => vpnDecode("not-a-valid-key")).toThrow();
    });

    it("handles vpn:// prefix", () => {
        const config = makeSampleConfig();
        const encoded = vpnEncode(config);
        expect(encoded.startsWith("vpn://")).toBe(true);

        // Should work with prefix
        const decoded1 = vpnDecode(encoded);
        expect(decoded1).toEqual(config);

        // Should work without prefix
        const decoded2 = vpnDecode(encoded.replace("vpn://", ""));
        expect(decoded2).toEqual(config);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildObfuscationPatch
// ─────────────────────────────────────────────────────────────────────────────

describe("buildObfuscationPatch", () => {
    const params: GeneratedParams = {
        jc: 5,
        jmin: 64,
        jmax: 256,
        i1: 100,
        i2: 200,
        i3: 300,
        i4: 400,
        i5: 500,
    };

    it("version 1.0 excludes I1-I5", () => {
        const patch = buildObfuscationPatch(params, "1.0");
        expect(patch.Jc).toBe("5");
        expect(patch.Jmin).toBe("64");
        expect(patch.Jmax).toBe("256");
        expect(patch.I1).toBeUndefined();
        expect(patch.I2).toBeUndefined();
        expect(patch.I3).toBeUndefined();
        expect(patch.I4).toBeUndefined();
        expect(patch.I5).toBeUndefined();
    });

    it("version 2.0 includes I1-I5", () => {
        const patch = buildObfuscationPatch(params, "2.0");
        expect(patch.Jc).toBe("5");
        expect(patch.I1).toBe("100");
        expect(patch.I2).toBe("200");
        expect(patch.I3).toBe("300");
        expect(patch.I4).toBe("400");
        expect(patch.I5).toBe("500");
    });

    it("version 1.5 includes I1-I5", () => {
        const patch = buildObfuscationPatch(params, "1.5");
        expect(patch.I1).toBeDefined();
        expect(patch.I5).toBeDefined();
    });

    it("throws on null params", () => {
        expect(() => buildObfuscationPatch(null as unknown as GeneratedParams, "2.0")).toThrow();
    });

    it("always includes Jc, Jmin, Jmax", () => {
        const patch = buildObfuscationPatch(params, "1.0");
        expect(patch.Jc).toBeDefined();
        expect(patch.Jmin).toBeDefined();
        expect(patch.Jmax).toBeDefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// mergeVpnConfigs
// ─────────────────────────────────────────────────────────────────────────────

describe("mergeVpnConfigs", () => {
    it("merges 2 configs successfully", () => {
        const result = mergeVpnConfigs([makeSampleConfig(), makeSecondConfig()]);
        expect(result.merged.containers).toHaveLength(2);
        expect(result.stats.total).toBe(2);
        expect(result.stats.unique).toBe(2);
        expect(result.stats.dupes).toBe(0);
        expect(result.warnings).toHaveLength(0);
    });

    it("deduplicates by container name", () => {
        const cfg1 = makeSampleConfig("Key 1");
        const cfg2 = makeSampleConfig("Key 2"); // same container name "amneziawg"
        const result = mergeVpnConfigs([cfg1, cfg2]);
        expect(result.stats.dupes).toBe(1);
        expect(result.stats.unique).toBe(1);
        expect(result.warnings).toHaveLength(1);
    });

    it("returns correct stats", () => {
        const cfg1: VpnConfig = {
            containers: [
                { container: "awg" },
                { container: "xray" },
            ],
            description: "A",
        };
        const cfg2: VpnConfig = {
            containers: [
                { container: "xray" }, // dupe
                { container: "openvpn" },
            ],
            description: "B",
        };
        const result = mergeVpnConfigs([cfg1, cfg2]);
        expect(result.stats.total).toBe(4);
        expect(result.stats.unique).toBe(3);
        expect(result.stats.dupes).toBe(1);
    });

    it("throws for < 2 inputs", () => {
        expect(() => mergeVpnConfigs([])).toThrow();
        expect(() => mergeVpnConfigs([makeSampleConfig()])).toThrow();
    });

    it("joins descriptions with ' + '", () => {
        const result = mergeVpnConfigs([
            makeSampleConfig("AWG"),
            makeSecondConfig(), // description: "XRay key"
        ]);
        expect(result.merged.description).toBe("AWG + XRay key");
    });

    it("deduplicates identical descriptions", () => {
        const result = mergeVpnConfigs([
            makeSampleConfig("Same"),
            { ...makeSecondConfig(), description: "Same" },
        ]);
        expect(result.merged.description).toBe("Same");
    });

    it("sets nameOverriddenByUser to true", () => {
        const result = mergeVpnConfigs([makeSampleConfig(), makeSecondConfig()]);
        expect(result.merged.nameOverriddenByUser).toBe(true);
    });

    it("takes dns1/dns2 from first key", () => {
        const result = mergeVpnConfigs([makeSampleConfig(), makeSecondConfig()]);
        expect(result.merged.dns1).toBe("1.1.1.1");
        expect(result.merged.dns2).toBe("8.8.8.8");
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// patchWgQuickString
// ─────────────────────────────────────────────────────────────────────────────

describe("patchWgQuickString", () => {
    it("replaces existing field", () => {
        const input = "[Interface]\nJc = 5\nJmin = 64\n";
        const result = patchWgQuickString(input, "Jc", "10");
        expect(result).toContain("Jc = 10");
        expect(result).not.toContain("Jc = 5");
    });

    it("adds missing field to [Interface] section", () => {
        const input = "[Interface]\nJc = 5\n";
        const result = patchWgQuickString(input, "I1", "some-value");
        expect(result).toContain("I1 = some-value");
    });

    it("appends to end if no [Interface]", () => {
        const input = "Jc = 5";
        const result = patchWgQuickString(input, "I1", "test");
        expect(result).toContain("I1 = test");
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// patchJsonString
// ─────────────────────────────────────────────────────────────────────────────

describe("patchJsonString", () => {
    it("replaces existing field in JSON", () => {
        const json = JSON.stringify({ Jc: "5", Jmin: "64" });
        const result = patchJsonString(json, "Jc", "10");
        const parsed = JSON.parse(result);
        expect(parsed.Jc).toBe("10");
        expect(parsed.Jmin).toBe("64");
    });

    it("does not add missing field", () => {
        const json = JSON.stringify({ Jc: "5" });
        const result = patchJsonString(json, "I1", "test");
        // Should return original since field is not in object
        const parsed = JSON.parse(result);
        expect(parsed.I1).toBeUndefined();
    });

    it("falls back to wg-quick style for invalid JSON", () => {
        const invalid = "not-json Jc = 5";
        const result = patchJsonString(invalid, "Jc", "10");
        expect(result).toContain("Jc = 10");
    });
});
