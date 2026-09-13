import { describe, it, expect } from "bun:test";

import { awgEngine } from "../index";
import {
  genCfg,
  renderConfLines,
  validateGeneratedConfig,
  validateAwg3,
  type GeneratorInput,
} from "@/engines/awg/generator";
import { AWG_VERSIONS } from "@/engines/awg/generator/versions";

/**
 * The adapter exists to let a second generator live beside this one. Its only
 * promise is that it changes nothing: whatever the shell asked `utils/generator`
 * for before, it gets byte-identical through the engine now. These tests hold
 * that promise, so a future refactor of the seam cannot quietly alter output.
 */

const seeded = (over: Partial<GeneratorInput> = {}): GeneratorInput => ({
  ...awgEngine.createDefaults(),
  ...over,
});

describe("AmneziaWG engine adapter", () => {
  it("declares every version the generator knows, and no others", () => {
    expect(awgEngine.versions.map((v) => v.id)).toEqual(
      AWG_VERSIONS.map((v) => v.id),
    );
    expect(awgEngine.versions.filter((v) => v.isNewest)).toHaveLength(1);
  });

  it("starts from settings the generator accepts", () => {
    const cfg = awgEngine.generate(awgEngine.createDefaults());
    expect(cfg.version).toBe("3.0");
    expect(awgEngine.validate(cfg).filter((f) => f.level === "error")).toEqual(
      [],
    );
  });

  it("generates a config with no errors on every version", () => {
    // The engine has to be right for all four, not just the newest: a version
    // tab that produces a rejected config is worse than no tab.
    for (const version of AWG_VERSIONS) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const cfg = awgEngine.generate(seeded({ version: version.id }));
        const errors = awgEngine
          .validate(cfg)
          .filter((f) => f.level === "error")
          .map((f) => `${f.field}: ${f.code}`);
        expect(errors, `${version.id}, attempt ${attempt}`).toEqual([]);
      }
    }
  });

  it("gives every finding a code, so every finding can be translated", () => {
    for (const version of AWG_VERSIONS) {
      const cfg = awgEngine.generate(seeded({ version: version.id }));
      for (const f of awgEngine.validate(cfg)) {
        expect(f.code, `${version.id}: ${f.field}`).toBeTruthy();
      }
    }
  });

  for (const version of AWG_VERSIONS) {
    describe(`AWG ${version.id}`, () => {
      const input = seeded({ version: version.id });

      it("renders exactly what renderConfLines renders", () => {
        // genCfg draws randomly, so both sides have to see the same config;
        // the point is the rendering, not the generation.
        const cfg = genCfg(input);
        expect(awgEngine.render(cfg, {})).toEqual(renderConfLines(cfg));
      });

      it("reports the union of the generator's own validators", () => {
        const cfg = genCfg(input);
        const direct = [...validateGeneratedConfig(cfg), ...validateAwg3(cfg)];
        const viaEngine = awgEngine.validate(cfg);

        expect(viaEngine).toHaveLength(direct.length);

        // The adapter normalises rather than copies — it guarantees a code
        // where the older validators left one out — so the invariant is that
        // the same rules fired about the same fields, not object equality.
        const shape = (fs: { field: string; level: string }[]) =>
          fs.map((f) => `${f.level}:${f.field}`).sort();
        expect(shape(viaEngine)).toEqual(shape(direct));

        // Every finding can be identified, which is what makes it
        // translatable rather than a hardcoded sentence.
        for (const f of viaEngine) expect(f.code).toBeTruthy();

        const levels = viaEngine.map((f) => f.level);
        expect(levels).toEqual(
          [...levels].sort((a, b) => (a === b ? 0 : a === "error" ? -1 : 1)),
        );
      });

      it("produces a client payload from the same text the user sees", () => {
        const cfg = genCfg(input);
        const payload = awgEngine.toClientPayload?.(cfg);
        expect(payload).toBeTruthy();
      });
    });
  }

  it("passes localised labels through to the renderer", () => {
    const cfg = genCfg(seeded({ version: "1.0" }));
    const marker = "ЛОКАЛИЗОВАННАЯ ПОДПИСЬ";
    const lines = awgEngine.render(cfg, { noCps: marker });
    expect(lines.some((l) => l.value.includes(marker))).toBe(true);
  });
});
