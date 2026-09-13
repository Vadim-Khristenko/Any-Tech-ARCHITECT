import { describe, it, expect } from "bun:test";

import { awgEngine } from "../index";
import {
  AWG_CLIENT_PROFILES,
  CLIENTS,
  CLIENT_IDS,
  clientCaps,
  clientReleases,
  genCfg,
  parseRange,
  type GeneratorInput,
} from "@/engines/awg/generator";

/**
 * The client matrix, and the build split that made it necessary.
 *
 * AmneziaWG for Windows underlined H values above 2^31-1 in red and refused
 * to save the config until v2.0.2 (PR #85 → fixed in #87, commit c9740b17).
 * The server was always fine with them. One entry per client could describe
 * only one of those states, so it described the broken one for everybody —
 * including people who installed the client today.
 */

const UINT32_MAX = 4_294_967_295;
const INT32_MAX = 2_147_483_647;

const seeded = (over: Partial<GeneratorInput> = {}): GeneratorInput => ({
  ...awgEngine.createDefaults(),
  ...over,
});

/** Largest bound in any of the four H fields, ranged or single. */
function highestH(cfg: ReturnType<typeof genCfg>): number {
  const ranged = [cfg.h1, cfg.h2, cfg.h3, cfg.h4]
    .map((h) => parseRange(String(h)))
    .filter((r): r is [number, number] => r !== null)
    .map(([, max]) => max);
  const singles = [cfg.h1s, cfg.h2s, cfg.h3s, cfg.h4s].filter(
    (n): n is number => typeof n === "number",
  );
  return Math.max(0, ...ranged, ...singles);
}

describe("the client matrix", () => {
  it("exposes every profile through the flat table too", () => {
    expect(CLIENT_IDS).toEqual(AWG_CLIENT_PROFILES.map((p) => p.id));
    for (const id of CLIENT_IDS) {
      expect(CLIENTS[id]?.name, id).toBeTruthy();
    }
  });

  it("resolves the flat table at the current build", () => {
    // Windows is the case that changed: the flat table used to mean the
    // broken build, and now means the fixed one.
    expect(CLIENTS["amneziawg-windows"]?.maxHValue).toBe(UINT32_MAX);
  });

  it("falls back to the default for an id it does not know", () => {
    expect(clientCaps("not-a-client").id).toBe("amneziavpn");
  });
});

describe("AmneziaWG for Windows before 2.0.2", () => {
  it("is offered as a separate build", () => {
    const releases = clientReleases("amneziawg-windows");
    expect(releases).toHaveLength(2);
    expect(releases[0]?.id).toBeNull();
    expect(releases[1]?.id).toBe("<2.0.2");
  });

  it("caps H at the signed 32-bit bound", () => {
    expect(clientCaps("amneziawg-windows", "<2.0.2").limits.maxHValue).toBe(
      INT32_MAX,
    );
    expect(clientCaps("amneziawg-windows").limits.maxHValue).toBe(UINT32_MAX);
  });

  it("keeps everything else the client does have", () => {
    const old = clientCaps("amneziawg-windows", "<2.0.2").limits;
    const now = clientCaps("amneziawg-windows").limits;
    // The fix was about one bound. A release must not quietly change the rest.
    expect(old.maxJc).toBe(now.maxJc);
    expect(old.maxS4).toBe(now.maxS4);
    expect(old.supportsCpsTagC).toBe(now.supportsCpsTagC);
  });

  it("explains itself, through the catalogue rather than in one language", () => {
    const notes = clientCaps("amneziawg-windows", "<2.0.2").notes;
    expect(notes).toContain("client.note.windowsHCap");
  });
});

describe("generating for a chosen build", () => {
  it("stays inside the old bound when the old build is selected", () => {
    for (let attempt = 0; attempt < 40; attempt++) {
      const cfg = genCfg(
        seeded({ clientId: "amneziawg-windows", clientRelease: "<2.0.2" }),
      );
      expect(highestH(cfg), `attempt ${attempt}`).toBeLessThanOrEqual(
        INT32_MAX,
      );
    }
  });

  it("uses the whole range on a current build", () => {
    // Half the key space was being given up for a client-side check that no
    // longer exists, so at least some draws have to land above the old bound.
    let sawHigh = false;
    for (let attempt = 0; attempt < 40 && !sawHigh; attempt++) {
      const cfg = genCfg(seeded({ clientId: "amneziawg-windows" }));
      if (highestH(cfg) > INT32_MAX) sawHigh = true;
    }
    expect(sawHigh).toBe(true);
  });

  it("never exceeds the resolved bound for any client or build", () => {
    for (const profile of AWG_CLIENT_PROFILES) {
      for (const release of clientReleases(profile.id)) {
        const limits = clientCaps(profile.id, release.id).limits;
        const cfg = genCfg(
          seeded({ clientId: profile.id, clientRelease: release.id }),
        );
        expect(
          highestH(cfg),
          `${profile.id} ${release.label}`,
        ).toBeLessThanOrEqual(limits.maxHValue);
      }
    }
  });

  it("does not collapse a range onto the cap", () => {
    // `Math.min(end, cap)` on both bounds produced `2147483647-2147483647`:
    // a range of one value, identical for everyone on that client. That is a
    // signature, not a random header — the same failure the S floor had, at
    // the other end.
    for (let attempt = 0; attempt < 60; attempt++) {
      const cfg = genCfg(
        seeded({ clientId: "amneziawg-windows", clientRelease: "<2.0.2" }),
      );
      for (const field of [cfg.h1, cfg.h2, cfg.h3, cfg.h4]) {
        const range = parseRange(String(field));
        if (!range) continue;
        const [min, max] = range;
        expect(max, `${field} on attempt ${attempt}`).toBeGreaterThan(min);
      }
    }
  });

  it("keeps the single H values apart on a capped client", () => {
    // 1.0/1.5 use single values. Written as absolute constants and clamped,
    // H2, H3 and H4 all landed on the cap itself.
    for (let attempt = 0; attempt < 20; attempt++) {
      const cfg = genCfg(
        seeded({
          version: "1.5",
          clientId: "amneziawg-windows",
          clientRelease: "<2.0.2",
        }),
      );
      const singles = [cfg.h1s, cfg.h2s, cfg.h3s, cfg.h4s];
      expect(new Set(singles).size, `attempt ${attempt}`).toBe(singles.length);
      for (const value of singles) {
        expect(value).toBeLessThanOrEqual(INT32_MAX);
      }
    }
  });

  it("validates clean on every client and build", () => {
    for (const profile of AWG_CLIENT_PROFILES) {
      for (const release of clientReleases(profile.id)) {
        const input = seeded({
          clientId: profile.id,
          clientRelease: release.id,
        });
        const errors = awgEngine
          .validate(awgEngine.generate(input))
          .filter((f) => f.level === "error");
        expect(errors, `${profile.id} ${release.label}`).toEqual([]);
      }
    }
  });
});
