/**
 * Regression for the 4.0 bug: `vpn://` and `json` updated but `.conf` stayed stale.
 *
 * A container stores the same config three times — `awg.Jc` / `awg.last_config`
 * fields / `awg.config` wg-quick — and the third copy appears twice:
 * `awg.config` and `JSON.parse(awg.last_config).config`. Missing any one leaves
 * a self-contradicting key whose `.conf` export is the stale copy.
 *
 * The fix is in `applyObfPatchToAwg`: it now patches the inner `config` inside
 * `last_config` as well. These tests lock that behaviour and also prove the
 * pseudo-random 3.0/3.1 generator stays valid.
 */

import { describe, it, expect } from "vitest";
import { makeAwgContainer, buildKey, extractWgQuick, exportAll } from "@/engines/keys/build";
import { applyPatchToVpnConfig } from "@/engines/keys/patch";
import { validateVpnConfig } from "@/engines/keys/validate";
import { vpnDecode, vpnEncode } from "@/engines/keys/codec";
import {
  awgKey,
  randomAwgKey,
  randomAwgKeys,
  encodeCompressed,
} from "./fixtures/vpnKeys";
import { buildVpnConfig } from "@/engines/awg/awgFormat";
import type { VpnConfig } from "@/engines/keys";

const patch = { Jc: "9", Jmin: "100", Jmax: "200", I1: "NEW_I1", I3: "NEW_I3" };

function hasInConf(cfg: VpnConfig, needle: string): boolean {
  const all = exportAll(cfg);
  const first = Object.values(all.conf)[0] ?? "";
  return first.includes(needle);
}

describe("patch keeps .conf in sync — the 4.0 regression", () => {
  it("syncs a key that only has last_config (makeAwgContainer path)", () => {
    const c = makeAwgContainer({
      hostName: "198.51.100.7",
      port: 44200,
      clientPrivKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      clientPubKey: "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",
      serverPubKey: "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=",
      pskKey: "DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=",
      clientIp: "10.8.1.6",
      obfuscation: { Jc: "4", Jmin: "40", Jmax: "70", I1: "old1", I2: "old2" },
    });
    const cfg = buildKey([c], { hostName: "198.51.100.7" });

    // Sanity: only last_config holds a .conf here
    expect((cfg.containers![0].awg as Record<string, unknown>).config).toBeUndefined();
    expect(extractWgQuick(cfg.containers![0])!).toContain("Jc = 4");

    applyPatchToVpnConfig(cfg, patch);

    const awg = cfg.containers![0].awg as Record<string, unknown>;
    expect(awg.Jc).toBe("9");
    expect((JSON.parse(awg.last_config as string) as Record<string, unknown>).Jc).toBe("9");
    expect((JSON.parse(awg.last_config as string) as Record<string, unknown>).config as string).toContain("Jc = 9");
    expect(extractWgQuick(cfg.containers![0])!).toContain("Jc = 9");
    expect(hasInConf(cfg, "Jc = 9")).toBe(true);
    expect(hasInConf(cfg, "I3 = NEW_I3")).toBe(true); // added field appears in .conf

    const findings = validateVpnConfig(cfg).filter((f) => f.code === "vpn.self_contradiction");
    expect(findings).toEqual([]);
  });

  it("syncs a key that has both awg.config and inner config (buildVpnConfig path)", () => {
    const conf = `[Interface]
PrivateKey = AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
Jc = 4
Jmin = 40
Jmax = 70
I1 = old1
I2 = old2
[Peer]
PublicKey = CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=
PresharedKey = DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = 198.51.100.7:44200
`;
    const cfg = buildVpnConfig(conf);
    const awg = cfg.containers![0].awg as Record<string, unknown>;
    expect(awg.config).toBeTruthy();
    expect((JSON.parse(awg.last_config as string) as Record<string, unknown>).config).toBeTruthy();

    applyPatchToVpnConfig(cfg, { Jc: "77", Jmin: "88", Jmax: "99", I2: "NEW_I2" });

    expect((awg.config as string)).toContain("Jc = 77");
    const inner = JSON.parse(awg.last_config as string) as Record<string, unknown>;
    expect(inner.Jc).toBe("77");
    expect(inner.config as string).toContain("Jc = 77");
    expect(inner.config as string).toContain("I2 = NEW_I2");
    expect(extractWgQuick(cfg.containers![0])!).toContain("Jc = 77");
    // Prefers top-level config, but both must be in sync
    expect(validateVpnConfig(cfg).filter((f) => f.code === "vpn.self_contradiction")).toEqual([]);
  });

  it("syncs fixture avawg keys 1.0 / 2.0 / 3.0 / 3.1", () => {
    for (const v of ["1.0", "2.0", "3.0", "3.1"] as const) {
      const cfg = vpnDecode(awgKey(v)) as VpnConfig;
      const p: Record<string, string> = v === "1.0"
        ? { Jc: "11", Jmin: "22", Jmax: "33" }
        : { Jc: "11", Jmin: "22", Jmax: "33", I1: "patched1", I5: "patched5" };
      applyPatchToVpnConfig(cfg, p as never);
      expect(hasInConf(cfg, "Jc = 11"), `v ${v} Jc`).toBe(true);
      if (v !== "1.0") {
        expect(hasInConf(cfg, "I1 = patched1"), `v ${v} I1`).toBe(true);
      }
      const bad = validateVpnConfig(cfg).filter((f) => f.code === "vpn.self_contradiction");
      expect(bad, `v ${v} self_contra`).toEqual([]);
    }
  });

  it("adds a missing CPS field to both JSON and inner .conf", () => {
    // Fixture 2.0 carries only I1/I2; patch brings I3-I5.
    const cfg = vpnDecode(awgKey("2.0")) as VpnConfig;
    const awg = cfg.containers![0].awg as Record<string, unknown>;
    expect(awg.I3).toBeUndefined();

    applyPatchToVpnConfig(cfg, { Jc: "5", Jmin: "10", Jmax: "20", I3: "NEW3", I4: "NEW4", I5: "NEW5" });

    expect(awg.I3).toBe("NEW3");
    const inner = JSON.parse(awg.last_config as string) as Record<string, unknown>;
    expect(inner.I3).toBe("NEW3");
    expect(inner.config as string).toContain("I3 = NEW3");
    expect(extractWgQuick(cfg.containers![0])!).toContain("I3 = NEW3");
  });

  it("keeps vpn://, json and .conf consistent after patch", () => {
    const cfg = vpnDecode(awgKey("2.0")) as VpnConfig;
    applyPatchToVpnConfig(cfg, { Jc: "42", Jmin: "42", Jmax: "42", I1: "42" });
    const encoded = vpnEncode(cfg);
    const round = vpnDecode(encoded) as VpnConfig;
    expect((round.containers![0].awg as Record<string, unknown>).Jc).toBe("42");
    expect(exportAll(round).conf[Object.keys(exportAll(round).conf)[0]]).toContain("Jc = 42");
    const json = JSON.stringify(cfg, null, 2);
    expect(json).toContain(`"Jc": "42"`);
  });

  it("tolerates an unparseable last_config (fallback to line patch)", () => {
    const cfg = vpnDecode(awgKey("2.0")) as VpnConfig;
    const awg = cfg.containers![0].awg as Record<string, unknown>;
    awg.last_config = "[Interface]\nJc = 4\n"; // not JSON
    applyPatchToVpnConfig(cfg, { Jc: "99", Jmin: "99", Jmax: "99" });
    expect(awg.last_config as string).toContain("Jc = 99");
  });
});

describe("pseudo-random but valid 3.0 / 3.1 generation (via genCfg)", () => {
  it("awgKey fixture 3.1 carries the 3.1 switches", () => {
    const cfg = vpnDecode(awgKey("3.1")) as VpnConfig;
    const awg = cfg.containers![0].awg as Record<string, unknown>;
    expect(awg.RandomTrailers).toBe("1");
    expect(awg.DisableCookies).toBe("1");
    expect(awg.HeaderProtectionKey).toBeTruthy();
    const inner = JSON.parse(awg.last_config as string) as Record<string, unknown>;
    expect(inner.config as string).toContain("RandomTrailers = 1");
    expect(inner.config as string).toContain("DisableCookies = 1");
    expect(validateVpnConfig(cfg).filter((f) => f.level === "error")).toEqual([]);
  });

  it("3.1 conf writes both switches with 1/0 when only one is on", () => {
    // Fixture helper via randomAwgKey with mixed flags must emit both lines
    const key = randomAwgKey("3.1", { useRandomTrailers: true, useDisableCookies: false });
    const cfg = vpnDecode(key) as VpnConfig;
    const inner = JSON.parse((cfg.containers![0].awg as Record<string, unknown>).last_config as string) as Record<string, unknown>;
    const conf = inner.config as string;
    expect(conf).toMatch(/^RandomTrailers = 1$/m);
    expect(conf).toMatch(/^DisableCookies = 0$/m);
    const key2 = randomAwgKey("3.1", { useRandomTrailers: false, useDisableCookies: true });
    const cfg2 = vpnDecode(key2) as VpnConfig;
    const inner2 = JSON.parse((cfg2.containers![0].awg as Record<string, unknown>).last_config as string) as Record<string, unknown>;
    const conf2 = inner2.config as string;
    expect(conf2).toMatch(/^RandomTrailers = 0$/m);
    expect(conf2).toMatch(/^DisableCookies = 1$/m);
    // Both off -> neither line
    const keyOff = randomAwgKey("3.1", { useRandomTrailers: false, useDisableCookies: false });
    const cfgOff = vpnDecode(keyOff) as VpnConfig;
    const innerOff = JSON.parse((cfgOff.containers![0].awg as Record<string, unknown>).last_config as string) as Record<string, unknown>;
    expect(innerOff.config as string).not.toMatch(/^RandomTrailers = /m);
    expect(innerOff.config as string).not.toMatch(/^DisableCookies = /m);
  });

  it("randomAwgKey 3.0 is valid and patchable", () => {
    const key = randomAwgKey("3.0");
    const cfg = vpnDecode(key) as VpnConfig;
    expect(validateVpnConfig(cfg).filter((f) => f.level === "error")).toEqual([]);
    expect(extractWgQuick(cfg.containers![0])!).toContain("[Interface]");
    // Patch must still sync .conf
    const before = extractWgQuick(cfg.containers![0])!;
    applyPatchToVpnConfig(cfg, { Jc: "777", Jmin: "778", Jmax: "779" });
    expect(extractWgQuick(cfg.containers![0])!).not.toBe(before);
    expect(extractWgQuick(cfg.containers![0])!).toContain("Jc = 777");
    expect(validateVpnConfig(cfg).filter((f) => f.code === "vpn.self_contradiction")).toEqual([]);
  });

  it("randomAwgKey 3.1 is valid (header floor, timers, flags)", () => {
    const keys = randomAwgKeys(5, "3.1");
    for (const k of keys) {
      const cfg = vpnDecode(k) as VpnConfig;
      const errors = validateVpnConfig(cfg).filter((f) => f.level === "error");
      expect(errors, k.slice(0, 60)).toEqual([]);
      // S floor must hold when protection is on
      const awg = cfg.containers![0].awg as Record<string, unknown>;
      if (awg.HeaderProtectionKey) {
        for (const field of ["S1", "S2", "S3", "S4"] as const) {
          const v = Number(awg[field] ?? 99);
          if (Number.isFinite(v)) expect(v).toBeGreaterThanOrEqual(12);
        }
      }
    }
  });

  it("random batch of 10 keys has no self-contradiction after successive patches", () => {
    const keys = randomAwgKeys(10, "3.0");
    for (const k of keys) {
      const cfg = vpnDecode(k) as VpnConfig;
      applyPatchToVpnConfig(cfg, { Jc: "1", Jmin: "2", Jmax: "3", I1: "a", I2: "b", I3: "c", I4: "d", I5: "e" });
      const bad = validateVpnConfig(cfg).filter((f) => f.code === "vpn.self_contradiction");
      expect(bad).toEqual([]);
      expect(hasInConf(cfg, "Jc = 1")).toBe(true);
    }
  });
});
