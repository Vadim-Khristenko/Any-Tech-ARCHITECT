import { describe, it, expect } from "vitest";

import { awgEngine } from "../index";
import { renderMihomoProxy } from "../mihomoFormat";
import { AWG_VERSIONS, capsFor } from "@/engines/awg/generator/versions";
import type { GeneratorInput } from "@/engines/awg/generator";

/**
 * The mihomo export is the same parameter set in somebody else's dialect.
 * These tests hold it to the same law the .conf renderer follows: the shape
 * comes from the version's capability table, so neither export can claim a
 * version carries something it does not.
 */

const inputFor = (version: string): GeneratorInput => ({
  ...awgEngine.createDefaults(),
  version: version as GeneratorInput["version"],
  // Amnezia VPN (the default client) manages HeaderProtectionKey itself;
  // the YAML mapping needs a client that takes the emitted key.
  clientId: "amneziawg-windows",
});

describe("the mihomo export", () => {
  for (const version of AWG_VERSIONS) {
    const caps = capsFor(version.id);

    describe(`AWG ${version.id}`, () => {
      const cfg = awgEngine.generate(inputFor(version.id));
      const yaml = renderMihomoProxy(cfg);

      it("names the version and asks for the visitor's own key material", () => {
        expect(yaml).toContain(`# AmneziaWG ${version.id} for mihomo`);
        expect(yaml).toContain("YOUR_ENDPOINT_HOST");
        expect(yaml).toContain("YOUR_TUNNEL_IPV4");
        expect(yaml).toContain("YOUR_PRIVATE_KEY");
        expect(yaml).toContain("YOUR_SERVER_PUBLIC_KEY");
      });

      it("is a wireguard proxy with the junk train and S1/S2", () => {
        expect(yaml).toContain("proxies:");
        expect(yaml).toContain("type: wireguard");
        expect(yaml).toContain(`jc: ${cfg.jc}`);
        expect(yaml).toContain(`jmin: ${cfg.jmin}`);
        expect(yaml).toContain(`jmax: ${cfg.jmax}`);
        expect(yaml).toContain(`s1: ${cfg.s1}`);
        expect(yaml).toContain(`s2: ${cfg.s2}`);
        expect(yaml).toContain("udp: true");
      });

      it("carries S3/S4 exactly where the version has them", () => {
        if (caps.extraSizes) {
          expect(yaml).toContain(`s3: ${cfg.s3}`);
          expect(yaml).toContain(`s4: ${cfg.s4}`);
        } else {
          expect(yaml).not.toMatch(/^      s[34]: /m);
        }
      });

      it("emits headers in the shape the version speaks", () => {
        if (caps.rangedHeaders) {
          // Ranges are strings, so they travel quoted.
          expect(yaml).toContain(`h1: "${cfg.h1}"`);
          expect(yaml).toContain(`h4: "${cfg.h4}"`);
        } else {
          expect(yaml).toContain(`h1: ${cfg.h1s}`);
          expect(yaml).toContain(`h4: ${cfg.h4s}`);
        }
      });

      it("carries the signature chain only where one exists", () => {
        if (!caps.cps) {
          expect(yaml).not.toMatch(/^      i\d: /m);
        } else {
          for (const field of ["i1", "i2", "i3", "i4", "i5"] as const) {
            const value = cfg[field];
            if (value !== "") {
              expect(yaml).toContain(`${field}: "${value}"`);
            }
          }
        }
      });

      it("flips the v3 switch, and only there", () => {
        if (version.id === "3.0") {
          expect(yaml).toContain("version: 3");
          // The implementation is young upstream; say so where it matters.
          expect(yaml).toContain("nightly");
          if (cfg.awg3?.headerProtectionKey) {
            expect(yaml).toContain(
              `header-protection-key: "${cfg.awg3.headerProtectionKey}"`,
            );
          }
          if (cfg.awg3?.contentPaddingAddition) {
            expect(yaml).toContain(
              `content-padding-addition: "${cfg.awg3.contentPaddingAddition}"`,
            );
          }
        } else {
          expect(yaml).not.toContain("version:");
        }
      });
    });
  }

  it("omits the chain entirely when a chain-capable config has none", () => {
    // A client that drops I1-I5 still gets a valid export — without the
    // fields, not with empty ones.
    const cfg = awgEngine.generate(inputFor("2.0"));
    const bare = renderMihomoProxy({ ...cfg, i1: "", i2: "", i3: "", i4: "", i5: "" });
    expect(bare).not.toMatch(/^      i\d: /m);
    expect(bare).toContain("amnezia-wg-option:");
  });
});
