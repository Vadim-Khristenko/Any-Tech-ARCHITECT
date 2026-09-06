/**
 * The version shape, asked once.
 *
 * Two places used to work this out for themselves — the parameter card and the
 * history entry — with their own copies of the same branching on
 * `extraSizes` / `rangedHeaders` / `cps` / `headerProtection`. Both had to be
 * edited whenever a version gained a parameter, and neither was tested,
 * because both lived inside a 3700-line view.
 *
 * They read the catalogue now. These are the tests that were impossible then.
 */

import { describe, it, expect } from "vitest";

import { awgParamBlocks, awgParamRecord, awgParamValues } from "../generator/summary";
import { awgEngine } from "../index";
import type { AWGConfig } from "../generator/types";
import type { AWGVersion } from "../generator/types";

function configFor(version: AWGVersion): AWGConfig {
  return awgEngine.generate({
    ...awgEngine.createDefaults(),
    // Amnezia VPN takes no emitted key: the version-shape assertions need
    // a client that does.
    clientId: "amneziawg-windows",
    version,
    // The 3.0 block only exists when it was asked for, and a summary that
    // showed it regardless would claim the config carries what it does not.
    useHeaderProtection: version === "3.0",
    useRandomTimings: version === "3.0",
  });
}

const keysOf = (version: AWGVersion) => Object.keys(awgParamRecord(configFor(version)));

describe("what each version carries", () => {
  it("gives 1.0 single-value headers and no S3, S4 or chain", () => {
    const keys = keysOf("1.0");
    expect(keys).toEqual(
      expect.arrayContaining(["H1", "H2", "H3", "H4", "S1", "S2", "Jc", "Jmin", "Jmax"]),
    );
    expect(keys).not.toContain("S3");
    expect(keys).not.toContain("I1");
    expect(keys).not.toContain("HeaderProtectionKey");
  });

  it("adds the CPS chain at 1.5 and nothing else", () => {
    const keys = keysOf("1.5");
    expect(keys).toContain("I1");
    expect(keys).toContain("I5");
    expect(keys).not.toContain("S3");
  });

  it("adds S3, S4 and header ranges at 2.0", () => {
    const keys = keysOf("2.0");
    expect(keys).toContain("S3");
    expect(keys).toContain("S4");

    // The header switches from a single value to a range at 2.0, and the key
    // stays `H1` either way — which is exactly the substitution the two
    // hand-written copies had to remember to make.
    const ranged = awgParamRecord(configFor("2.0")).H1;
    expect(String(ranged)).toMatch(/-/);
    expect(String(awgParamRecord(configFor("1.0")).H1)).not.toMatch(/-/);
  });

  it("adds the 3.0 block only when it was asked for", () => {
    expect(keysOf("3.0")).toContain("HeaderProtectionKey");

    const without = awgEngine.generate({
      ...awgEngine.createDefaults(),
      version: "3.0",
      useHeaderProtection: false,
      useRandomTimings: false,
    });
    const keys = Object.keys(awgParamRecord(without));
    expect(keys).not.toContain("HeaderProtectionKey");
    expect(keys).not.toContain("RekeyAfterTime");
  });
});

describe("blocks", () => {
  it("groups in the order a config is written, skipping empty ones", () => {
    expect(awgParamBlocks(configFor("1.0")).map((b) => b.group)).toEqual([
      "headers",
      "sizes",
      "junk",
    ]);
    expect(awgParamBlocks(configFor("3.0")).map((b) => b.group)).toEqual([
      "headers",
      "sizes",
      "junk",
      "cps",
      "awg3",
    ]);
  });

  it("puts every value in exactly one block", () => {
    const cfg = configFor("3.0");
    const flat = awgParamValues(cfg).map((v) => v.key);
    const grouped = awgParamBlocks(cfg).flatMap((b) => b.items.map((i) => i.key));
    expect(grouped.sort()).toEqual([...flat].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });
});

describe("what counts as present", () => {
  it("keeps a zero and drops a blank", () => {
    const cfg = configFor("2.0");
    // Jc can legitimately be zero — the junk train switched off — and a
    // summary that dropped it would say the config has no Jc at all.
    const withZero = { ...cfg, jc: 0, i1: "" } as AWGConfig;
    const record = awgParamRecord(withZero);
    expect(record.Jc).toBe(0);
    expect(record).not.toHaveProperty("I1");
  });

  it("reads the version off the config, not off anything else", () => {
    // The selected version and the rendered one disagree for a tick while a
    // regeneration is in flight, and that tick was enough to render a 3.0
    // config with 1.x headers.
    const cfg = { ...configFor("1.0"), version: "1.0" as const };
    expect(Object.keys(awgParamRecord(cfg))).not.toContain("S3");
  });
});
