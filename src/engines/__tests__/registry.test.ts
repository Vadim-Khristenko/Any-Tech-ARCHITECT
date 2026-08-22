import { describe, it, expect } from "vitest";

import { ENGINES, engineById, engineFor, awgEngine, xrayEngine } from "../registry";

/**
 * The registry is what makes "one product, two engines" true rather than
 * aspirational. These tests hold both engines to the same contract, so a third
 * one cannot be added while quietly skipping half of it.
 */

describe("the registry", () => {
  it("carries both engines", () => {
    expect(ENGINES.map((e) => e.id)).toEqual(["awg", "xray"]);
  });

  it("finds an engine by id", () => {
    expect(engineById("awg")).toBe(awgEngine);
    expect(engineById("xray")).toBe(xrayEngine);
    expect(engineById("nope")).toBeUndefined();
  });
});

describe("every engine satisfies the contract", () => {
  for (const engine of ENGINES) {
    describe(engine.label, () => {
      it("identifies itself", () => {
        expect(engine.id).toBeTruthy();
        expect(engine.label).toBeTruthy();
        expect(engine.route.startsWith("/")).toBe(true);
        expect(engine.formats.length).toBeGreaterThan(0);
      });

      it("offers versions, newest first, exactly one flagged newest", () => {
        expect(engine.versions.length).toBeGreaterThan(0);
        expect(engine.versions.filter((v) => v.isNewest)).toHaveLength(1);
        expect(engine.versions[0].isNewest).toBe(true);
      });

      it("generates something it considers valid", () => {
        const config = engine.generate(engine.createDefaults() as never);
        const errors = engine
          .validate(config as never)
          .filter((f) => f.level === "error");
        // The AmneziaWG defaults are complete; XRay's need an address, which
        // the user supplies, so an address error is the one allowed here.
        expect(errors.every((e) => e.field === "address")).toBe(true);
      });

      it("renders to lines, and the lines make text", () => {
        const config = engine.generate(engine.createDefaults() as never);
        const lines = engine.render(config as never);
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) {
          expect(["comment", "kv", "section"]).toContain(line.type);
        }
      });

      it("gives every finding a code", () => {
        const config = engine.generate(engine.createDefaults() as never);
        for (const f of engine.validate(config as never)) {
          expect(f.code, `${engine.id}: ${f.field}`).toBeTruthy();
        }
      });

      it("orders findings worst first", () => {
        const config = engine.generate(engine.createDefaults() as never);
        const levels = engine.validate(config as never).map((f) => f.level);
        const rank = { error: 0, warn: 1, info: 2 } as const;
        expect(levels).toEqual(
          [...levels].sort((a, b) => rank[a] - rank[b]),
        );
      });

      it("refuses an empty input rather than inventing a config", () => {
        const result = engine.parse("");
        expect(result.ok).toBe(false);
        expect(result.config).toBeNull();
        expect(result.findings.length).toBeGreaterThan(0);
      });

      it("carries a simulator that can draw its own traffic", () => {
        // The simulator page is generic: it reads kinds, legend and packets
        // off whatever the registry hands it. An engine without a working
        // simulator would leave that page with a legend and nothing else.
        const sim = engine.simulator!;
        expect(Object.keys(sim.kinds).length).toBeGreaterThan(0);
        expect(sim.legend.length).toBeGreaterThan(0);
        for (const id of sim.legend) {
          expect(sim.kinds[id], `${engine.id}: ${id}`).toBeTruthy();
        }
        const config = engine.generate(engine.createDefaults() as never);
        const result = sim.simulate(config as never);
        expect(result.packets.length).toBeGreaterThan(0);
        for (const packet of result.packets) {
          expect(sim.kinds[packet.kind], packet.kind).toBeTruthy();
        }
        // Totals must agree with the packets they summarise.
        const summed = result.packets.reduce((s, p) => s + p.size, 0);
        expect(result.totals.totalBytes).toBe(summed);
      });
    });
  }
});

describe("routing a pasted config to the right engine", () => {
  it("recognises an AmneziaWG config", () => {
    const cfg = awgEngine.generate(awgEngine.createDefaults() as never);
    const text = awgEngine
      .render(cfg as never)
      .map((l) => (l.type === "kv" && l.key ? `${l.key} = ${l.value}` : l.value))
      .join("\n");
    expect(engineFor(text)?.id).toBe("awg");
  });

  it("recognises an XRay link", () => {
    const cfg = xrayEngine.generate({
      ...xrayEngine.createDefaults(),
      address: "198.51.100.10",
    } as never);
    const uri = xrayEngine.toUri!(cfg as never)!;
    expect(engineFor(uri)?.id).toBe("xray");
  });

  it("claims nothing for text that is neither", () => {
    expect(engineFor("good morning")).toBeUndefined();
  });
});
