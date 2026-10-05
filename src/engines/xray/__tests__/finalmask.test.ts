import { describe, it, expect } from "bun:test";

import { xrayEngine } from "../index";
import { buildServerInbound } from "../render";
import { renderFinalMask, buildFinalMask, defaultFinalMask } from "../finalmask";
import type { FinalMaskKind } from "../finalmask";
import type { XrayInput } from "../types";

/**
 * FinalMask is the closest thing XRay has to what AmneziaWG does: it changes
 * the shape of the bytes rather than hiding them inside another protocol.
 * `noise` is a junk train, `fragment` splits the ClientHello so SNI never
 * arrives whole.
 *
 * The shapes here were corrected by the core, not by reading: `Int32Range`
 * unmarshals from a string `"lo-hi"` or a plain integer, and emitting the
 * obvious `{ from, to }` object got every released core to refuse the config.
 * So these tests check the shape as well as the presence.
 */

const KINDS: readonly FinalMaskKind[] = [
  "noise",
  "fragment",
  "sudoku",
  "salamander",
  "mkcp-legacy",
];

const input = (over: Partial<XrayInput> = {}): XrayInput => {
  const base = xrayEngine.createDefaults();
  return { ...base, address: "203.0.113.10", ...over };
};

const withMask = (kind: FinalMaskKind, version = "26.7.11") => {
  const base = xrayEngine.createDefaults();
  return input({
    version: version as XrayInput["version"],
    finalMask: { ...base.finalMask, kind },
  });
};

/** The `finalmask` block as it lands in the inbound. */
function maskOf(over: XrayInput): Record<string, unknown> | undefined {
  const stream = buildServerInbound(xrayEngine.generate(over)) as {
    streamSettings: Record<string, unknown>;
  };
  return stream.streamSettings.finalmask as Record<string, unknown> | undefined;
}

describe("version gating", () => {
  it("is emitted only from the version that has it", () => {
    for (const version of ["26.7.11", "26.6.22"]) {
      expect(maskOf(withMask("noise", version)), version).toBeDefined();
    }
    // A core that predates FinalMask does not know the key, and a config
    // carrying it is one that core refuses outright.
    for (const version of ["26.1.13", "25.8.29", "25.7.23", "24.11.11"]) {
      expect(maskOf(withMask("noise", version)), version).toBeUndefined();
    }
  });

  it("writes nothing at all when no mask is chosen", () => {
    expect(maskOf(input())).toBeUndefined();
  });
});

describe("the shape the core actually parses", () => {
  it("writes ranges as strings or plain numbers, never as objects", () => {
    // The mistake this caught: `{ from, to }` reads naturally and is rejected
    // by every core with "expected either string of form 1-2 or plain
    // integer".
    const seen: unknown[] = [];
    const walk = (value: unknown) => {
      if (Array.isArray(value)) return value.forEach(walk);
      if (value && typeof value === "object") {
        for (const [key, inner] of Object.entries(value)) {
          if (key === "from" || key === "to") seen.push(value);
          walk(inner);
        }
      }
    };

    for (const kind of KINDS) walk(maskOf(withMask(kind)));
    expect(seen).toEqual([]);
  });

  it("gives every kind the transport it is registered for", () => {
    // The core registers masks per transport: sudoku on both, salamander and
    // the rest on UDP, fragment on TCP. Offering one on the wrong side is a
    // config that loads and does nothing.
    expect(maskOf(withMask("fragment"))).toHaveProperty("tcp");
    expect(maskOf(withMask("noise"))).toHaveProperty("udp");
    expect(maskOf(withMask("salamander"))).toHaveProperty("udp");
    expect(maskOf(withMask("mkcp-legacy"))).toHaveProperty("udp");

    const sudoku = maskOf(withMask("sudoku"))!;
    expect(sudoku).toHaveProperty("tcp");
    expect(sudoku).toHaveProperty("udp");
  });

  it("names a type the core has a loader for", () => {
    const registered = new Set([
      "noise",
      "fragment",
      "sudoku",
      "salamander",
      "mkcp-legacy",
    ]);

    for (const kind of KINDS) {
      const mask = maskOf(withMask(kind))!;
      for (const side of ["tcp", "udp"] as const) {
        for (const entry of (mask[side] as { type: string }[] | undefined) ?? []) {
          expect(registered.has(entry.type), entry.type).toBe(true);
        }
      }
    }
  });
});

describe("noise, the junk train", () => {
  it("expresses its count as the number of entries", () => {
    // The core sends the list in order and has no count field, so "how many
    // junk packets" is how long the list is.
    for (let attempt = 0; attempt < 20; attempt++) {
      const mask = maskOf(withMask("noise"))!;
      const noise = (mask.udp as { settings: { noise: unknown[] } }[])[0]!
        .settings.noise;

      expect(noise.length).toBeGreaterThanOrEqual(3);
      expect(noise.length).toBeLessThanOrEqual(8);
    }
  });
});

describe("passwords", () => {
  it("generates one when the user did not choose", () => {
    // An empty password would make every user's traffic identical under the
    // mask, which is the opposite of the point.
    const built = buildFinalMask({ ...defaultFinalMask(), kind: "sudoku" });
    expect(built.resolvedPassword.length).toBeGreaterThan(16);
  });

  it("keeps the user's when they did", () => {
    const built = buildFinalMask({
      ...defaultFinalMask(),
      kind: "salamander",
      password: "chosen-by-hand",
    });
    expect(built.resolvedPassword).toBe("chosen-by-hand");
  });

  it("does not repeat itself across configs", () => {
    const seen = new Set(
      Array.from(
        { length: 20 },
        () => buildFinalMask({ ...defaultFinalMask(), kind: "sudoku" }).resolvedPassword,
      ),
    );
    expect(seen.size).toBe(20);
  });
});

describe("QUIC congestion control", () => {
  it("rides alongside a mask", () => {
    const base = xrayEngine.createDefaults();
    const mask = maskOf(
      input({ finalMask: { ...base.finalMask, kind: "noise", quicCongestion: "bbr" } }),
    )!;

    expect(mask.quicParams).toEqual({ congestion: "bbr" });
    expect(mask.udp).toBeDefined();
  });

  it("can be set on its own, with no mask", () => {
    const base = xrayEngine.createDefaults();
    const mask = maskOf(
      input({ finalMask: { ...base.finalMask, kind: "none", quicCongestion: "brutal" } }),
    );

    expect(mask).toEqual({ quicParams: { congestion: "brutal" } });
  });
});

describe("renderFinalMask", () => {
  it("returns nothing for an absent block", () => {
    expect(renderFinalMask(undefined)).toBeUndefined();
  });
});
