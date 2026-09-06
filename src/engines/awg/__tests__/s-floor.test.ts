import { describe, it, expect } from "vitest";

import { awgEngine } from "../index";
import { genCfg, type GeneratorInput } from "@/engines/awg/generator";
import { MIN_S_WITH_HEADER_PROTECTION } from "@/engines/awg/generator/awg3";

/**
 * AWG 3.0 header protection reads its ChaCha20 nonce from the first 12 bytes
 * of the S-padding, so every S has to carry at least that much.
 *
 * Enforcing that with `Math.max(s, 12)` produced configs whose S values were
 * all exactly 12 — S3 draws from 1–64 and S4 from 1–32, so most draws were
 * under the floor and every one of them landed on the same number. Padding
 * whose sizes are constant across every user is a signature, which is the
 * problem the padding exists to avoid. The floor is a floor now, not a magnet.
 */

const seeded = (over: Partial<GeneratorInput> = {}): GeneratorInput => ({
  ...awgEngine.createDefaults(),
  ...over,
});

const SAMPLES = 400;

function sample(over: Partial<GeneratorInput> = {}) {
  const rows: number[][] = [];
  for (let i = 0; i < SAMPLES; i++) {
    // Amnezia VPN takes no emitted key, so the floor mechanics is pinned to
    // a client that does.
    const cfg = genCfg(
      seeded({ version: "3.0", clientId: "amneziawg-windows", ...over }),
    );
    rows.push([cfg.s1, cfg.s2, cfg.s3, cfg.s4]);
  }
  return rows;
}

describe("AWG 3.0 S-padding floor", () => {
  it("never emits an S below the nonce length", () => {
    for (const row of sample()) {
      for (const s of row) {
        expect(s).toBeGreaterThanOrEqual(MIN_S_WITH_HEADER_PROTECTION);
      }
    }
  });

  it("does not pile every raised value onto the floor", () => {
    const rows = sample();
    const values = rows.flat();
    const onFloor = values.filter(
      (s) => s === MIN_S_WITH_HEADER_PROTECTION,
    ).length;

    // With a clamp this was most of them; with a redraw it is roughly the
    // share of one value in each range. Generous bound — the point is that it
    // is not the dominant outcome.
    expect(onFloor / values.length).toBeLessThan(0.15);
  });

  it("rarely stacks three or more S values on the floor", () => {
    const rows = sample();
    const stacked = rows.filter(
      (row) => row.filter((s) => s === MIN_S_WITH_HEADER_PROTECTION).length >= 3,
    ).length;

    // This is the reported symptom: S1, S3 and S4 drawn low, all three
    // clamped, and the config ships with three identical twelves.
    expect(stacked / rows.length).toBeLessThan(0.02);
  });

  it("keeps S4 inside the protocol cap while respecting the floor", () => {
    for (const row of sample()) {
      const s4 = row[3]!;
      expect(s4).toBeGreaterThanOrEqual(MIN_S_WITH_HEADER_PROTECTION);
      // 32 bytes is the protocol limit for S4 regardless of the floor.
      expect(s4).toBeLessThanOrEqual(32);
    }
  });

  it("still honours the router-mode ceiling on S1 and S2", () => {
    for (const row of sample({ routerMode: true })) {
      const [s1, s2] = row;
      for (const s of [s1!, s2!]) {
        expect(s).toBeGreaterThanOrEqual(MIN_S_WITH_HEADER_PROTECTION);
        // Router mode caps these at 20; the floor narrows the range to
        // 12–20 rather than overriding either bound.
        expect(s).toBeLessThanOrEqual(20);
      }
    }
  });

  it("keeps the sizes that must not collide apart", () => {
    for (const [s1, s2, s3] of sample()) {
      // Handshake sizes that coincide make the padding visible in the packet
      // length distribution; the generator avoids them before and after the
      // floor is applied. Compared as padded lengths rather than as offsets,
      // because two of the three offsets were wrong here.
      expect(148 + s1!).not.toBe(92 + s2!);
      expect(148 + s1!).not.toBe(64 + s3!);
      expect(92 + s2!).not.toBe(64 + s3!);
    }
  });
});
