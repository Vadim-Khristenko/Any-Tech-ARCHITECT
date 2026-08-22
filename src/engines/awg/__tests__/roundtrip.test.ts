import { describe, it, expect } from "vitest";

import { awgEngine } from "../index";
import { linesToText } from "@/types/engine";
import { AWG_VERSIONS, capsFor } from "@/engines/awg/generator/versions";
import type { GeneratorInput } from "@/engines/awg/generator";

/**
 * The round-trip law: parsing what the engine rendered must give the config
 * back. It is what keeps `render` and `parse` from drifting apart, and it is
 * the reason reading someone else's config can be trusted at all — the reader
 * is exercised against every config the writer can produce.
 */

const inputFor = (version: string): GeneratorInput => ({
  ...awgEngine.createDefaults(),
  version: version as GeneratorInput["version"],
  // The 3.1 switches must be on for the round trip to see them: a config
  // with both off is wire-identical to a 3.0 one and parses back as such.
  ...(version === "3.1"
    ? { useRandomTrailers: true, useDisableCookies: true }
    : {}),
});

describe("AmneziaWG round trip", () => {
  for (const version of AWG_VERSIONS) {
    const caps = capsFor(version.id);

    describe(`AWG ${version.id}`, () => {
      const original = awgEngine.generate(inputFor(version.id));
      const text = linesToText(awgEngine.render(original));
      const result = awgEngine.parse(text);

      it("parses its own output", () => {
        expect(result.ok, JSON.stringify(result.findings)).toBe(true);
        expect(result.findings.filter((f) => f.level === "error")).toEqual([]);
      });

      it("recovers the version from the parameters alone", () => {
        expect(result.config?.version).toBe(version.id);
      });

      it("recovers every parameter the version uses", () => {
        const parsed = result.config!;
        expect(parsed.jc).toBe(original.jc);
        expect(parsed.jmin).toBe(original.jmin);
        expect(parsed.jmax).toBe(original.jmax);
        expect(parsed.s1).toBe(original.s1);
        expect(parsed.s2).toBe(original.s2);

        if (caps.extraSizes) {
          expect(parsed.s3).toBe(original.s3);
          expect(parsed.s4).toBe(original.s4);
        }
        if (caps.rangedHeaders) {
          expect([parsed.h1, parsed.h2, parsed.h3, parsed.h4]).toEqual([
            original.h1,
            original.h2,
            original.h3,
            original.h4,
          ]);
        } else {
          expect([parsed.h1s, parsed.h2s, parsed.h3s, parsed.h4s]).toEqual([
            original.h1s,
            original.h2s,
            original.h3s,
            original.h4s,
          ]);
        }
        if (caps.cps) {
          expect(parsed.i1).toBe(original.i1);
          expect(parsed.i5).toBe(original.i5);
        }
        if (caps.headerProtection) {
          expect(parsed.awg3?.headerProtectionKey).toBe(
            original.awg3?.headerProtectionKey,
          );
        }
      });

      it("still passes validation after the round trip", () => {
        const errors = awgEngine
          .validate(result.config!)
          .filter((f) => f.level === "error");
        expect(errors).toEqual([]);
      });
    });
  }
});

describe("reading configs that were not ours", () => {
  it("refuses an empty input", () => {
    const r = awgEngine.parse("   ");
    expect(r.ok).toBe(false);
    expect(r.findings[0].code).toBe("parse.empty");
  });

  it("refuses something that is not a config at all", () => {
    const r = awgEngine.parse("hello there");
    expect(r.ok).toBe(false);
  });

  it("names plain WireGuard for what it is", () => {
    const r = awgEngine.parse(
      "[Interface]\nPrivateKey = abc\nAddress = 10.0.0.2/32\n",
    );
    expect(r.ok).toBe(false);
    expect(r.findings[0].code).toBe("parse.plain_wireguard");
  });

  it("reports a header that should be a range, with its line", () => {
    const text = [
      "[Interface]",
      "H1 = 12345",
      "H2 = 100-200",
      "H3 = 300-400",
      "H4 = 500-600",
      "S1 = 20",
      "S2 = 30",
      "S3 = 15",
      "S4 = 15",
      "Jc = 4",
      "Jmin = 40",
      "Jmax = 70",
      "I1 = <b 0xff>",
      "HeaderProtectionKey = aGVsbG8",
    ].join("\n");

    const r = awgEngine.parse(text);
    expect(r.ok).toBe(true);
    const finding = r.findings.find((f) => f.code === "parse.not_a_range");
    expect(finding?.field).toBe("H1");
    expect(finding?.line).toBe(2);
  });

  it("warns about a parameter the version cannot use", () => {
    const text = [
      "[Interface]",
      "H1 = 1",
      "H2 = 2",
      "H3 = 3",
      "H4 = 4",
      "S1 = 20",
      "S2 = 30",
      "S3 = 15",
      "Jc = 4",
      "Jmin = 40",
      "Jmax = 70",
    ].join("\n");

    const r = awgEngine.parse(text);
    expect(r.ok).toBe(true);
    expect(r.config?.version).toBe("1.0");
    expect(
      r.findings.some((f) => f.code === "parse.unsupported_for_version"),
    ).toBe(true);
  });

  it("puts errors before warnings", () => {
    const r = awgEngine.parse(
      "[Interface]\nH1 = nonsense\nJc = 4\nJmin = 40\nJmax = 70\nS1 = 1\nS2 = 2\n",
    );
    const levels = r.findings.map((f) => f.level);
    expect(levels).toEqual(
      [...levels].sort((a, b) => (a === b ? 0 : a === "error" ? -1 : 1)),
    );
  });
});
