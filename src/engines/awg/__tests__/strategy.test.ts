import { describe, it, expect } from "bun:test";

import { awgEngine } from "../index";
import {
  drawParams,
  headerZones,
  strategyFor,
  type DrawContext,
} from "@/engines/awg/generator/strategy";
import { paramsFor, AWG_PARAM_SETS } from "@/engines/awg/generator/params";
import { clientCaps } from "@/engines/awg/generator/clients";
import { genCfg, type GeneratorInput } from "@/engines/awg/generator";
import { AWG_VERSIONS } from "@/engines/awg/generator/versions";
import type { ParamDescriptor } from "@/types/protocol";

/**
 * The generator draws from the version's parameter set now, rather than from
 * a list of names it carried itself. What that buys is checkable: a parameter
 * a version does not have cannot be produced for it, and a parameter added to
 * the catalogue produces a value without the generator being edited.
 */

const context = (over: Partial<DrawContext> = {}): DrawContext => ({
  version: "3.0",
  client: clientCaps("amneziavpn").limits,
  intensity: "medium",
  routerMode: false,
  extreme: false,
  junkLevel: 5,
  ...over,
});

const seeded = (over: Partial<GeneratorInput> = {}): GeneratorInput => ({
  ...awgEngine.createDefaults(),
  ...over,
});

describe("drawing follows the parameter set", () => {
  it("draws every parameter the set has a strategy for", () => {
    for (const version of AWG_VERSIONS) {
      const set = paramsFor(version.id);
      const drawn = drawParams(set, context({ version: version.id }));

      for (const param of set) {
        if (!strategyFor(param)) continue;
        expect(
          drawn[param.field],
          `${version.id}: ${param.key} → ${param.field}`,
        ).toBeDefined();
      }
    }
  });

  it("draws nothing a version does not have", () => {
    // 1.0 has no S3, S4 or CPS chain. Drawing them and letting the renderer
    // hide them is what made the config object and the .conf disagree.
    const drawn = drawParams(paramsFor("1.0"), context({ version: "1.0" }));
    expect(drawn.s3).toBeUndefined();
    expect(drawn.s4).toBeUndefined();

    const withExtras = drawParams(paramsFor("2.0"), context({ version: "2.0" }));
    expect(withExtras.s3).toBeDefined();
    expect(withExtras.s4).toBeDefined();
  });

  it("puts a header in the field its kind implies", () => {
    // H1 is a single value on 1.x and a range on 2.0+, stored in different
    // fields. The set decides which, so the generator does not have to.
    const single = drawParams(paramsFor("1.5"), context({ version: "1.5" }));
    expect(single.h1s).toBeTypeOf("number");
    expect(single.h1).toBeUndefined();

    const ranged = drawParams(paramsFor("3.0"), context({ version: "3.0" }));
    expect(ranged.h1).toBeTypeOf("string");
    expect(String(ranged.h1)).toMatch(/^\d+-\d+$/);
  });

  it("generates a value for a parameter it has never seen, from its kind", () => {
    // The point of the kind fallback: a parameter added to the catalogue
    // produces a plausible value straight away instead of coming out empty.
    const invented: ParamDescriptor = {
      key: "SomethingNew",
      kind: "int",
      scope: "sender",
      since: "3.0",
      field: "somethingNew",
      bounds: { min: 5, max: 9 },
    };

    expect(strategyFor(invented)).not.toBeNull();
    const value = drawParams([invented], context()).somethingNew;
    expect(value).toBeGreaterThanOrEqual(5);
    expect(value).toBeLessThanOrEqual(9);
  });

  it("has no strategy for the parameters that are not drawn", () => {
    // The CPS chain is mimicry and the 3.0 block is a protocol block; both are
    // produced by code that knows what they mean. Guessing at them here would
    // be worse than leaving them alone.
    for (const param of AWG_PARAM_SETS["3.0"]) {
      if (param.kind === "chain" || param.field.startsWith("awg3.")) {
        expect(strategyFor(param), param.key).toBeNull();
      }
    }
  });
});

describe("header zones", () => {
  it("lays out four zones that do not overlap", () => {
    for (const client of ["amneziavpn", "amneziawg-windows"] as const) {
      for (const release of [null, "<2.0.2"]) {
        const zones = headerZones(clientCaps(client, release).limits, false);
        const ordered = [zones.H1, zones.H2, zones.H3, zones.H4];
        for (let i = 1; i < ordered.length; i++) {
          expect(
            ordered[i]!.min,
            `${client} ${release ?? "current"} zone ${i}`,
          ).toBeGreaterThan(ordered[i - 1]!.max);
        }
      }
    }
  });

  it("scales the whole layout down for a capped client", () => {
    const capped = headerZones(
      clientCaps("amneziawg-windows", "<2.0.2").limits,
      false,
    );
    // Clamping put every upper bound on the cap itself; scaling keeps them
    // apart, which is what stops the headers being identical for everyone.
    expect(capped.H4.max).toBeLessThanOrEqual(2_147_483_647);
    expect(capped.H1.max).toBeLessThan(capped.H4.min);
  });
});

describe("the generator still produces valid configs", () => {
  it("validates clean on every version", () => {
    for (const version of AWG_VERSIONS) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const errors = awgEngine
          .validate(genCfg(seeded({ version: version.id })))
          .filter((f) => f.level === "error");
        expect(errors, `${version.id} attempt ${attempt}`).toEqual([]);
      }
    }
  });

  it("keeps the junk train ordered", () => {
    for (const version of AWG_VERSIONS) {
      const cfg = genCfg(seeded({ version: version.id }));
      expect(cfg.jmax, version.id).toBeGreaterThan(cfg.jmin);
    }
  });

  it("still fills the CPS chain, which is not drawn from the set", () => {
    // The mimicry profiles are the reason the chain exists; a rewrite that
    // quietly stopped producing them would still pass every bounds check.
    const cfg = genCfg(seeded({ version: "3.0", profile: "quic_initial" }));
    expect(cfg.i1.length).toBeGreaterThan(0);
  });
});
