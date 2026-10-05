import { describe, it, expect } from "bun:test";

import { awgEngine } from "../index";
import { healthCheckConf } from "../healthCheck";
import {
  CLIENTS,
  clientCaps,
  genCfg,
  parseRange,
  renderConf,
  type AWGVersion,
  type GeneratorInput,
} from "@/engines/awg/generator";
import {
  ENGINE_AWG_QUICK,
  ENGINE_GO,
  ENGINE_KMOD,
} from "@/engines/awg/generator/engines";

/**
 * Issue #18: wg-easy 15.x validates H1-H4 against 5..2^31-1 and refused every
 * config this tool produced for it, since the default layout puts H2-H4 above
 * two billion.
 */

const H_MIN = 5;
const H_MAX = 2 ** 31 - 1;

const seeded = (over: Partial<GeneratorInput> = {}): GeneratorInput => ({
  ...awgEngine.createDefaults(),
  clientId: "wg-easy",
  ...over,
});

describe("wg-easy in the client matrix", () => {
  it("is offered, with the panel's own limits", () => {
    const caps = clientCaps("wg-easy");
    expect(caps.id).toBe("wg-easy");
    expect(caps.limits.maxHValue).toBe(H_MAX);
    expect(caps.limits.maxJc).toBe(128);
    expect(CLIENTS["wg-easy"]?.knownIssues).toContain("client.note.wgEasyHCap");
  });

  it("runs on awg-quick, whose tags are what both engines share", () => {
    expect(caps().engine).toBe(ENGINE_AWG_QUICK);
    const shared = ENGINE_GO.tags.filter((tag) => ENGINE_KMOD.tags.includes(tag));
    expect([...ENGINE_AWG_QUICK.tags].sort()).toEqual([...shared].sort());
    expect(ENGINE_AWG_QUICK.verified).toBe(true);
  });

  function caps() {
    return clientCaps("wg-easy").limits;
  }
});

describe("configs generated for wg-easy", () => {
  const versions: AWGVersion[] = ["1.5", "2.0", "3.0", "3.1"];

  for (const version of versions) {
    it(`keep every H inside 5..2^31-1 on ${version}`, () => {
      for (const useExtremeMax of [false, true]) {
        for (let k = 0; k < 150; k++) {
          const cfg = genCfg(seeded({ version, useExtremeMax, iterCount: k }));
          const ranged = [cfg.h1, cfg.h2, cfg.h3, cfg.h4]
            .map((h) => parseRange(h))
            .filter((r): r is [number, number] => r !== null);
          const singles = [cfg.h1s, cfg.h2s, cfg.h3s, cfg.h4s].filter((n) => n > 0);
          for (const [lo, hi] of ranged) {
            expect(lo).toBeGreaterThanOrEqual(H_MIN);
            expect(hi).toBeLessThanOrEqual(H_MAX);
          }
          for (const h of singles) {
            expect(h).toBeGreaterThanOrEqual(H_MIN);
            expect(h).toBeLessThanOrEqual(H_MAX);
          }
        }
      }
    });
  }

  it("never carry <c> or the data tags", () => {
    for (let k = 0; k < 100; k++) {
      const cfg = genCfg(
        seeded({ version: "2.0", useTagC: true, useTagRD: true, mimicAll: true }),
      );
      const chains = [cfg.i1, cfg.i2, cfg.i3, cfg.i4, cfg.i5].join("");
      expect(chains).not.toContain("<c>");
      expect(chains).not.toMatch(/<d>|<ds>|<dz>/);
    }
  });

  it("pass the health check against wg-easy", () => {
    for (let k = 0; k < 30; k++) {
      const conf = renderConf(genCfg(seeded({ version: "2.0" })));
      const errors = healthCheckConf(conf, "wg-easy").filter(
        (f) => f.level === "error" && f.code.startsWith("awg.h_"),
      );
      expect(errors).toEqual([]);
    }
  });

  it("are refused by the health check when they came from the default layout", () => {
    // What the issue reported: a range above 2^31-1, fine for the protocol,
    // refused by the panel.
    const found = healthCheckConf(
      "[Interface]\nPrivateKey = x\nH1 = 100000000-100040000\nH4 = 3600000000-3600040000\n",
      "wg-easy",
    );
    expect(found.some((f) => f.code === "awg.h_over_client" && f.field === "H4")).toBe(
      true,
    );
  });
});
