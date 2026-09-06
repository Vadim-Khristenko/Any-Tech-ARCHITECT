import { describe, it, expect } from "vitest";
import { genCfg, renderConf, type GeneratorInput } from "@/engines/awg/generator";
import { AWG_VERSIONS, capsFor } from "@/engines/awg/generator/versions";

/**
 * The capability table is what the UI renders from. If it disagrees with what
 * genCfg actually produces, the panel shows one protocol while the .conf below
 * it holds another — which is exactly the bug this table replaced: 3.0 rendered
 * with 1.x single-value headers and no S3/S4, while its .conf was correct.
 */

const inputFor = (version: GeneratorInput["version"]): GeneratorInput => ({
  version,
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
  browserProfile: "",
  mtu: 1500,
  junkLevel: 5,
  iterCount: 0,
  routerMode: false,
  useExtremeMax: false,
  // Amnezia VPN takes no emitted key: version-block mechanics is pinned to
  // a client that does.
  clientId: "amneziawg-windows",
  useHeaderProtection: true,
  useContentPadding: true,
  useRandomTimings: true, useRandomTrailers: false, useDisableCookies: false,
});

const RANGE = /^\d+-\d+$/;

describe("version capability table", () => {
  it("covers every version the tab strip offers, newest first", () => {
    expect(AWG_VERSIONS.map((v) => v.id)).toEqual([
      "3.1",
      "3.0",
      "2.0",
      "1.5",
      "1.0",
    ]);
    expect(AWG_VERSIONS.filter((v) => v.isNewest)).toHaveLength(1);
    expect(AWG_VERSIONS[0].isNewest).toBe(true);
  });

  it("falls back to the newest entry for an unknown version", () => {
    // A saved config from a future build must not render as a blank panel.
    expect(capsFor("9.9" as never).id).toBe("3.1");
  });

  for (const caps of AWG_VERSIONS) {
    describe(`AWG ${caps.id}`, () => {
      const cfg = genCfg(inputFor(caps.id));
      const conf = renderConf(cfg);
      const valueOf = (key: string) =>
        conf.match(new RegExp(`^${key} = (.+)$`, "m"))?.[1];

      it("stamps its own version onto the config", () => {
        expect(cfg.version).toBe(caps.id);
      });

      it(`renders H1-H4 as ${caps.rangedHeaders ? "ranges" : "single values"}`, () => {
        for (const key of ["H1", "H2", "H3", "H4"]) {
          const value = valueOf(key);
          expect(value, `${key} missing from the .conf`).toBeDefined();
          if (caps.rangedHeaders) {
            expect(value).toMatch(RANGE);
          } else {
            expect(value).toMatch(/^\d+$/);
          }
        }
      });

      it(`${caps.extraSizes ? "renders" : "omits"} S3/S4`, () => {
        expect(valueOf("S1")).toBeDefined();
        expect(valueOf("S2")).toBeDefined();
        expect(valueOf("S3") !== undefined).toBe(caps.extraSizes);
        expect(valueOf("S4") !== undefined).toBe(caps.extraSizes);
      });

      it("does not carry S3/S4 values the version cannot use", () => {
        // The config object and the .conf have to agree. They did not before:
        // S3/S4 were always drawn, and only the renderer knew to hide them.
        expect(cfg.s3 > 0).toBe(caps.extraSizes);
        expect(cfg.s4 > 0).toBe(caps.extraSizes);
      });

      it(`${caps.cps ? "renders" : "omits"} the I1-I5 chain`, () => {
        expect(valueOf("I1") !== undefined).toBe(caps.cps);
        expect(valueOf("I5") !== undefined).toBe(caps.cps);
      });

      it(`${caps.headerProtection ? "carries" : "omits"} the 3.0 block`, () => {
        expect(Boolean(cfg.awg3)).toBe(caps.headerProtection);
        expect(valueOf("HeaderProtectionKey") !== undefined).toBe(
          caps.headerProtection,
        );
      });
    });
  }
});
