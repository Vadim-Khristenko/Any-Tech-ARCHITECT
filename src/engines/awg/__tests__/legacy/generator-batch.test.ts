import { describe, it, expect } from "vitest";
import { generateBatch, genCfg } from "@/engines/awg/generator";
import type { GeneratorInput } from "@/engines/awg/generator";

const baseInput: GeneratorInput = {
  version: "2.0",
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
  clientId: "amneziavpn",
  useHeaderProtection: true,
  useContentPadding: true,
  useRandomTimings: true, useRandomTrailers: false, useDisableCookies: false,
};

describe("generateBatch", () => {
  it("returns requested count", () => {
    const batch = generateBatch(baseInput, 10);
    expect(batch).toHaveLength(10);
  });

  it("produces different configs", () => {
    const batch = generateBatch(baseInput, 5);
    const h1s = batch.map((c) => c.h1);
    expect(new Set(h1s).size).toBeGreaterThan(1);
  });

  it("caps count at 1000", () => {
    expect(() => generateBatch(baseInput, 1001)).toThrow();
  });

  it("rejects non-positive count", () => {
    expect(() => generateBatch(baseInput, 0)).toThrow();
  });

  it("keeps version/profile across batch", () => {
    const batch = generateBatch(baseInput, 3);
    for (const c of batch) {
      expect(c.version).toBe("2.0");
      expect(c.profile).toBe("quic_initial");
    }
  });

  it("passes client compatibility for each item", () => {
    const batch = generateBatch({ ...baseInput, clientId: "amneziawg-windows" }, 5);
    for (const c of batch) {
      expect(c.i1 + c.i2 + c.i3 + c.i4 + c.i5).not.toContain("<c>");
    }
  });
});
