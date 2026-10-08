import { describe, it, expect } from "bun:test";

import { awgEngine } from "../index";
import { checkAwgParams } from "../rules";
import { healthCheckConf } from "../healthCheck";
import {
  DISABLED_HEADERS,
  genCfg,
  linkedSwitchesOn,
  renderConf,
  validateGeneratedConfig,
  versionPreset,
  type AWGVersion,
  type GeneratorInput,
} from "@/engines/awg/generator";

/**
 * The 3.x switches as a group: what each version starts from, and the two
 * switches that hang off header protection and random trailers, "Disable
 * H1-H4" and "Unite S1-S4".
 */

const at = (version: AWGVersion, over: Partial<GeneratorInput> = {}): GeneratorInput => ({
  ...awgEngine.createDefaults(),
  version,
  ...versionPreset(version),
  ...over,
});

const headers = (cfg: ReturnType<typeof genCfg>) => [cfg.h1, cfg.h2, cfg.h3, cfg.h4];

describe("version presets", () => {
  it("3.1 starts at MTU 1280 with trailers and disabled headers", () => {
    const p = versionPreset("3.1");
    expect(p.mtu).toBe(1280);
    expect(p.useHeaderProtection).toBe(true);
    expect(p.useRandomTrailers).toBe(true);
    expect(p.useDisableH).toBe(true);
    expect(p.useDisableCookies).toBe(false);
    expect(p.useSameS).toBe(false);
  });

  it("3.0 has the 3.0 block on, nothing from 3.1, and the usual MTU", () => {
    const p = versionPreset("3.0");
    expect(p.mtu).toBe(1500);
    expect([p.useHeaderProtection, p.useContentPadding, p.useRandomTimings]).toEqual([true, true, true]);
    expect([p.useRandomTrailers, p.useDisableH, p.useSameS]).toEqual([false, false, false]);
  });

  it("versions without the 3.x block switch everything off", () => {
    for (const v of ["1.0", "1.5", "2.0"] as const) {
      const p = versionPreset(v);
      expect(p.mtu).toBe(1500);
      expect(Object.entries(p).filter(([k, val]) => k !== "mtu" && val)).toEqual([]);
    }
  });

  it("hands out copies, so a page editing one cannot change the next", () => {
    const a = versionPreset("3.1");
    a.mtu = 9000;
    expect(versionPreset("3.1").mtu).toBe(1280);
  });
});

describe("linkedSwitchesOn", () => {
  it("needs 3.1, header protection and trailers together", () => {
    const base = { useHeaderProtection: true, useRandomTrailers: true };
    expect(linkedSwitchesOn({ version: "3.1", ...base })).toBe(true);
    expect(linkedSwitchesOn({ version: "3.0", ...base })).toBe(false);
    expect(linkedSwitchesOn({ version: "3.1", ...base, useHeaderProtection: false })).toBe(false);
    expect(linkedSwitchesOn({ version: "3.1", ...base, useRandomTrailers: false })).toBe(false);
  });
});

describe("Disable H1-H4", () => {
  it("writes the standard 1-4 on the 3.1 preset", () => {
    for (let k = 0; k < 30; k++) {
      const cfg = genCfg(at("3.1"));
      expect(headers(cfg)).toEqual([...DISABLED_HEADERS]);
    }
  });

  it("puts H1 = 1 .. H4 = 4 in the .conf", () => {
    const conf = renderConf(genCfg(at("3.1")));
    for (let i = 1; i <= 4; i++) expect(conf).toMatch(new RegExp(`^H${i} = ${i}$`, "m"));
  });

  it("does nothing without trailers, without protection, or below 3.1", () => {
    const cases: GeneratorInput[] = [
      at("3.1", { useRandomTrailers: false }),
      at("3.1", { useHeaderProtection: false }),
      at("3.0", { useDisableH: true, useRandomTrailers: true }),
    ];
    for (const input of cases) {
      for (let k = 0; k < 10; k++) {
        const cfg = genCfg(input);
        expect(headers(cfg)).not.toEqual([...DISABLED_HEADERS]);
        expect(cfg.h1).toContain("-");
      }
    }
  });

  it("is not called reserved by the generator's own validators", () => {
    const cfg = genCfg(at("3.1", { clientId: "awg-kmod" }));
    const codes = validateGeneratedConfig(cfg, "awg-kmod").map((f) => f.code);
    expect(codes).not.toContain("awg.h_reserved");
  });

  it("works for Amnezia VPN, which keeps the key in the app", () => {
    const cfg = genCfg(at("3.1", { clientId: "amneziavpn" }));
    expect(headers(cfg)).toEqual([...DISABLED_HEADERS]);
    expect(cfg.awg3?.headerProtectionKey).toBe("");
    const codes = validateGeneratedConfig(cfg, "amneziavpn").map((f) => f.code);
    expect(codes).not.toContain("awg.h_reserved");
  });

  it("costs no packets under trailers", () => {
    const conf = renderConf(genCfg(at("3.1", { clientId: "awg-kmod" })));
    const codes = healthCheckConf(conf, "awg-kmod").map((f) => f.code);
    expect(codes).not.toContain("awg.h_width_loss");
    expect(codes).not.toContain("awg.h_reserved");
  });

  it("combines with Unite S1-S4", () => {
    for (let k = 0; k < 20; k++) {
      const cfg = genCfg(at("3.1", { useSameS: true }));
      expect(headers(cfg)).toEqual([...DISABLED_HEADERS]);
      expect(new Set([cfg.s1, cfg.s2, cfg.s3, cfg.s4]).size).toBe(1);
      expect(cfg.s1).toBeGreaterThanOrEqual(12);
    }
  });
});

describe("the reserved-zone warning on a pasted config", () => {
  const ones = { H1: "1", H2: "2", H3: "3", H4: "4" };
  const client = (managesHeaderProtection: boolean) => ({
    name: "x",
    maxS4: 32,
    maxJc: 128,
    maxHValue: 4_294_967_295,
    supportsCpsTagC: false,
    supportsCpsTagRC: true,
    supportsCpsTagRD: true,
    managesHeaderProtection,
  });

  it("stays quiet for a client that keeps the key itself", () => {
    const codes = checkAwgParams(ones, { client: client(true) }).map((f) => f.code);
    expect(codes).not.toContain("awg.h_reserved");
  });

  it("still fires where the headers travel in the clear", () => {
    const codes = checkAwgParams(ones, { client: client(false) }).map((f) => f.code);
    expect(codes).toContain("awg.h_reserved");
  });
});
