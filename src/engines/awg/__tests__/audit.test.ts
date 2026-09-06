/**
 * The things the audit found, kept found.
 *
 * Each of these passed every existing test while being wrong, because each was
 * wrong in a direction no single generated config reveals. A fingerprint does
 * not show up in one draw — it shows up in the fact that a thousand draws give
 * the same answer.
 */

import { describe, it, expect } from "vitest";

import { awgEngine } from "../index";
import { genCfg, type GeneratorInput } from "../generator";
import { checkAwgParams } from "../rules";

const seeded = (over: Partial<GeneratorInput> = {}): GeneratorInput => ({
  ...awgEngine.createDefaults(),
  ...over,
});

const draws = (n: number, over: Partial<GeneratorInput>) =>
  Array.from({ length: n }, () => genCfg(seeded(over)));

/**
 * Room for the thousands-of-draws cases.
 *
 * A one-in-forty-thousand bug needs thousands of configs to show itself, and
 * generating those takes about twenty seconds — right on vitest's default,
 * so the whole suite failed or passed depending on what else the machine was
 * doing. Lowering the draw count would have made the test quieter by making
 * it worse at its job.
 */
const SLOW = 90_000;

describe("router mode is a ceiling, not a preset", () => {
  it("varies the junk train instead of emitting three constants", () => {
    // It used to produce Jc 3, Jmin 40, Jmax 128 for every user on every
    // version at every intensity: `Math.max(3, Math.min(jc, Math.min(2, …)))`
    // where the inner minimum can never exceed two, so the outer maximum
    // always won. Three numbers that name the tool and the mode.
    const configs = draws(200, { routerMode: true, version: "3.0", junkLevel: 5 });

    expect(new Set(configs.map((c) => c.jmin)).size).toBeGreaterThan(4);
    expect(new Set(configs.map((c) => c.jmax)).size).toBeGreaterThan(4);
  });

  it("keeps the train light, which is what the mode is for", () => {
    for (const c of draws(200, { routerMode: true, version: "3.0", junkLevel: 10 })) {
      expect(c.jc).toBeLessThanOrEqual(3);
      expect(c.jmin).toBeLessThanOrEqual(40);
      // resolveJmax lifts a Jmax that leaves Jmin no room, and it knows
      // nothing about this mode — so the two ranges are chosen to never
      // provoke it.
      expect(c.jmax).toBeLessThanOrEqual(128);
    }
  });

  it("leaves the junk train off when the user turned it off", () => {
    // Router mode used to floor Jc at three, so "Junk: off" still sent three.
    for (const c of draws(40, { routerMode: true, version: "3.0", junkLevel: 0 })) {
      expect(c.jc).toBe(0);
    }
  });
});

describe("header ranges stay inside their own zone", () => {
  /** Every pair, on the client whose zones sit closest together. */
  const overlapping = (cfg: { h1: string; h2: string; h3: string; h4: string }) => {
    const spans = [cfg.h1, cfg.h2, cfg.h3, cfg.h4].map(
      (r) => String(r).split("-").map(Number) as [number, number],
    );
    for (let a = 0; a < spans.length; a++) {
      for (let b = a + 1; b < spans.length; b++) {
        if (spans[a]![0] <= spans[b]![1] && spans[b]![0] <= spans[a]![1]) return true;
      }
    }
    return false;
  };

  it("never overlaps, even on the client with the tightest layout", () => {
    // The base was drawn across the whole zone and `rRange` then added its
    // spread and window on top, carrying the range into the next zone. The
    // validator caught it and threw, in a call nothing catches — so about one
    // click in forty thousand did nothing whatsoever.
    const configs = draws(3000, {
      version: "3.0",
      clientId: "amneziawg-windows",
      clientRelease: "<2.0.2",
      useHeaderProtection: true,
    });
    expect(configs.filter(overlapping)).toEqual([]);
  }, SLOW);

  it("does not end a range on the client's ceiling", () => {
    // One config in six used to end H4 at exactly 2147483647. An upper bound
    // that is precisely the cap is not a random number, it is a signature.
    const ceiling = 2_147_483_647;
    const configs = draws(2000, {
      version: "2.0",
      clientId: "amneziawg-windows",
      clientRelease: "<2.0.2",
    });

    const pinned = configs.filter((c) =>
      [c.h1, c.h2, c.h3, c.h4].some((r) => Number(String(r).split("-")[1]) === ceiling),
    );
    expect(pinned).toEqual([]);
  }, SLOW);

  it("still respects the ceiling it is not allowed to cross", () => {
    for (const c of draws(500, {
      version: "2.0",
      clientId: "amneziawg-windows",
      clientRelease: "<2.0.2",
    })) {
      for (const range of [c.h1, c.h2, c.h3, c.h4]) {
        expect(Number(String(range).split("-")[1])).toBeLessThanOrEqual(2_147_483_647);
      }
    }
  });
});

describe("limits that were being skipped", () => {
  it("applies the client's Jc ceiling on 1.0 as well", () => {
    // Every other version passed through `Math.min(ceiling, …)`; 1.0 took the
    // level as given, and the health check only warns, so it shipped.
    const cfg = genCfg(seeded({ version: "1.0", junkLevel: 200 }));
    expect(cfg.jc).toBeLessThanOrEqual(15);
  });
});

describe("a hand-typed MTU", () => {
  it("does not throw, whatever number reaches the generator", () => {
    // The field says min 576; a browser does not enforce that on a typed
    // value, and below about 83 the DNS profile drew from an empty range and
    // threw — killing the Generate button with no message at all.
    for (const mtu of [576, 300, 128, 83, 50, 20, 1]) {
      for (const profile of [
        "dns_query", "quic_initial", "tls_client_hello", "sip", "dtls_1_2", "dtls_1_3", "random",
      ] as const) {
        expect(
          () => genCfg(seeded({ profile, mtu })),
          `${profile} at mtu ${mtu}`,
        ).not.toThrow();
      }
    }
  });
});

describe("the generator and the health check agree", () => {
  it("does not call a config it just wrote an error", () => {
    // "Junk: off" produces Jc = 0, and the rule set called that a hard error —
    // the tool refusing what it had offered a moment earlier.
    const cfg = genCfg(seeded({ version: "3.0", junkLevel: 0 }));
    expect(cfg.jc).toBe(0);

    const findings = checkAwgParams({
      Jc: String(cfg.jc),
      Jmin: String(cfg.jmin),
      Jmax: String(cfg.jmax),
    });
    expect(findings.filter((f) => f.level === "error")).toEqual([]);
  });
});
