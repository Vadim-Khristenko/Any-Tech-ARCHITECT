import { describe, it, expect } from "vitest";

import {
  AWG_PARAMETERS,
  AWG_PARAM_SETS,
  AWGParamSet1,
  AWGParamSet15,
  AWGParamSet2,
  AWGParamSet3,
  hasParam,
  paramFor,
  sharedParams,
  senderParams,
} from "@/engines/awg/generator/params";
import { AWG_VERSIONS, capsFor } from "@/engines/awg/generator/versions";
import { genCfg, renderConfLines, type GeneratorInput } from "@/engines/awg/generator";

/**
 * The parameter catalogue only earns its place if it agrees with the code that
 * already existed. These tests hold it against the capability table and against
 * what the renderer actually writes, so the catalogue can never become a second
 * description that drifts from the first.
 */

describe("parameter sets", () => {
  it("grow with the protocol", () => {
    expect(AWGParamSet1.length).toBeLessThan(AWGParamSet15.length);
    expect(AWGParamSet15.length).toBeLessThan(AWGParamSet2.length);
    expect(AWGParamSet2.length).toBeLessThan(AWGParamSet3.length);
  });

  it("never carry two spellings of the same key", () => {
    for (const [version, set] of Object.entries(AWG_PARAM_SETS)) {
      const keys = set.map((p) => p.key);
      expect(new Set(keys).size, `${version} has duplicates`).toBe(keys.length);
    }
  });

  it("give H1 a single value on 1.x and a range on 2.0+", () => {
    expect(paramFor("1.0", "H1")?.kind).toBe("header");
    expect(paramFor("1.5", "H1")?.kind).toBe("header");
    expect(paramFor("2.0", "H1")?.kind).toBe("range");
    expect(paramFor("3.0", "H1")?.kind).toBe("range");
  });

  it("keep the catalogue's order", () => {
    const catalogue = AWG_PARAMETERS.map((p) => p.key);
    for (const set of Object.values(AWG_PARAM_SETS)) {
      const positions = set.map((p) => catalogue.indexOf(p.key));
      expect([...positions]).toEqual([...positions].sort((a, b) => a - b));
    }
  });
});

describe("the sets agree with the capability table", () => {
  for (const version of AWG_VERSIONS) {
    const caps = capsFor(version.id);

    it(`AWG ${version.id}`, () => {
      expect(hasParam(version.id, "S3")).toBe(caps.extraSizes);
      expect(hasParam(version.id, "S4")).toBe(caps.extraSizes);
      expect(hasParam(version.id, "I1")).toBe(caps.cps);
      expect(hasParam(version.id, "HeaderProtectionKey")).toBe(
        caps.headerProtection,
      );
      expect(paramFor(version.id, "H1")?.kind === "range").toBe(
        caps.rangedHeaders,
      );
    });
  }
});

describe("the sets agree with what gets rendered", () => {
  for (const version of AWG_VERSIONS) {
    it(`AWG ${version.id} writes exactly the keys its set declares`, () => {
      const input: GeneratorInput = {
        version: version.id,
        intensity: "medium",
        profile: "quic_initial",
        customHost: "",
        hostRegion: "any",
        mimicAll: false,
        useTagC: false,
        useTagT: true,
        useTagR: true,
        useTagRC: true,
        useTagRD: true,
        useBrowserFp: false,
        browserProfile: "chrome",
        mtu: 1500,
        junkLevel: 5,
        iterCount: 0,
        routerMode: false,
        useExtremeMax: false,
        clientId: "amneziavpn",
        useHeaderProtection: true,
        useContentPadding: true,
        useRandomTimings: true, useRandomTrailers: false, useDisableCookies: false,
      };

      const written = new Set(
        renderConfLines(genCfg(input))
          .filter((l) => l.type === "kv")
          .map((l) => l.key),
      );
      const declared = new Set(AWG_PARAM_SETS[version.id].map((p) => p.key));

      // Everything written must be declared. The reverse does not hold: the
      // 3.0 timers are optional and only appear when randomisation is on.
      for (const key of written) {
        expect(declared.has(key), `${key} is written but not declared`).toBe(
          true,
        );
      }
    });
  }
});

describe("scopes", () => {
  it("mark S and H as shared on every version", () => {
    for (const version of AWG_VERSIONS) {
      const shared = sharedParams(version.id).map((p) => p.key);
      expect(shared).toContain("S1");
      expect(shared).toContain("H1");
    }
  });

  it("mark the junk train and the I chain as sender-side", () => {
    const sender = senderParams("3.0").map((p) => p.key);
    expect(sender).toContain("Jc");
    expect(sender).toContain("I1");
    // The finding that cost us a wrong FAQ answer: padding is sender-side.
    expect(sender).toContain("ContentPaddingAddition");
  });

  it("keep HeaderProtectionKey shared and the timers local", () => {
    expect(paramFor("3.0", "HeaderProtectionKey")?.scope).toBe("shared");
    expect(paramFor("3.0", "RekeyAfterTime")?.scope).toBe("local");
  });

  it("cite a source for every shared parameter", () => {
    // A "both ends must match" claim is the expensive kind to get wrong, so
    // each one has to say where it came from.
    for (const p of sharedParams("3.0")) {
      expect(p.source, `${p.key} has no source`).toBeTruthy();
    }
  });
});
