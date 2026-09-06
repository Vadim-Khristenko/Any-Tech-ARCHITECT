/**
 * Two claims worth checking rather than asserting.
 *
 * The 3.0 padding floor is a protocol rule — the ChaCha20 nonce is read from
 * the first twelve bytes of the S-padding, so anything shorter puts the nonce
 * over the message body. And a browser in the registry has to actually reach
 * the generator, or completing the registry changed nothing.
 */
import { describe, it, expect } from "vitest";
import { genCfg } from "@/engines/awg/generator";
import { awgEngine } from "@/engines/awg";
import { getFpRange } from "@/engines/awg/generator/utils";
import { SIZED_FINGERPRINTS, BROWSER_FINGERPRINTS } from "@/shared/fingerprints";

const base = () => ({ ...awgEngine.createDefaults() });

describe("AWG 3.0 padding floor", () => {
  it("never emits an S below the nonce size when header protection is on", () => {
    for (let i = 0; i < 400; i++) {
      // Amnezia VPN takes no emitted key: pin a client that does.
      const cfg = genCfg({
        ...base(),
        version: "3.0",
        clientId: "amneziawg-windows",
        useHeaderProtection: true,
      });
      for (const [name, v] of [["S1", cfg.s1], ["S2", cfg.s2], ["S3", cfg.s3], ["S4", cfg.s4]] as const) {
        expect(v, `${name} on draw ${i}`).toBeGreaterThanOrEqual(12);
      }
    }
  });

  it("agrees with its own validator", () => {
    for (let i = 0; i < 200; i++) {
      const cfg = genCfg({
        ...base(),
        version: "3.0",
        clientId: "amneziawg-windows",
        useHeaderProtection: true,
      });
      const errors = awgEngine.validate(cfg).filter((f) => f.level === "error");
      expect(errors, `draw ${i}`).toEqual([]);
    }
  });
});

describe("the fingerprint registry reaches the generator", () => {
  it("has a size table for every browser it offers", () => {
    for (const b of SIZED_FINGERPRINTS) {
      const range = getFpRange(
        { ...base(), useBrowserFp: true, browserProfile: b.id },
        "qi",
      );
      expect(range, b.id).not.toBeNull();
      expect(range![0], b.id).toBeGreaterThan(0);
      expect(range![1], b.id).toBeGreaterThanOrEqual(range![0]);
    }
  });

  it("offers the ones that were previously unreachable", () => {
    const ids = SIZED_FINGERPRINTS.map((b) => b.id);
    expect(ids).toContain("360");
    expect(ids).toContain("qq");
    expect(ids).toContain("ios");
  });

  it("keeps derived tables labelled as derived", () => {
    for (const b of BROWSER_FINGERPRINTS) {
      if (b.sizesFrom) expect(b.sizes, b.id).toBeDefined();
    }
    // Android is not a browser with a QUIC profile; it must stay out.
    expect(SIZED_FINGERPRINTS.map((b) => b.id)).not.toContain("android");
  });
});
