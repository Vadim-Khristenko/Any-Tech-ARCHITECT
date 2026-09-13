import { describe, it, expect } from "bun:test";

import { generateXray, createDefaults, resolveXhttpMode } from "../generate";
import { buildServerInbound } from "../render";
import { validateXray } from "../validate";
import { XRAY_VERSIONS, xrayCaps } from "../versions";
import type { XrayInput } from "../types";

/**
 * Three rules that unit tests could not have found, because they are not in
 * the documentation — each came from handing a generated config to the
 * released core and reading what it said:
 *
 *   - v25.8.29 has no VLESS Encryption at all. The core has no `vlessenc`
 *     command and rejects `mlkem768x25519plus…` outright.
 *   - v25.7.23 *requires* `mldsa65Seed` on a REALITY inbound. Leaving it out
 *     fails with `invalid "mldsa65Seed": ""`.
 *   - v24.11.11 has no XHTTP `stream-one`: `unsupported mode: stream-one`.
 *
 * `scripts/configs.ts` re-derives all three from the cores themselves
 * in CI. These tests are the fast copy, so a regression shows up in a second
 * rather than after six image pulls.
 */

const input = (over: Partial<XrayInput> = {}): XrayInput => ({
  ...createDefaults(),
  address: "203.0.113.10",
  ...over,
});

describe("VLESS Encryption availability", () => {
  it("is refused on every version below v26.1.13", () => {
    for (const id of ["24.11.11", "25.7.23", "25.8.29"] as const) {
      const cfg = generateXray(input({ version: id, useVlessEncryption: true }));
      expect(cfg.vlessEncryption, id).toBeUndefined();

      const inbound = buildServerInbound(cfg) as {
        settings: { decryption: string };
      };
      // The wire form matters as much as the config object: `decryption` is
      // what the core parses, and anything but "none" fails to load here.
      expect(inbound.settings.decryption, id).toBe("none");
    }
  });

  it("is produced from v26.1.13 up", () => {
    for (const id of ["26.1.13", "26.6.22", "26.7.11"] as const) {
      const cfg = generateXray(input({ version: id, useVlessEncryption: true }));
      expect(cfg.vlessEncryption?.decryption, id).toMatch(
        /^mlkem768x25519plus\./,
      );
    }
  });
});

describe("REALITY ML-DSA-65 seed", () => {
  it("is emitted on v25.7.23 even when it was not asked for", () => {
    // Not a preference on that core: without it the inbound does not start.
    const cfg = generateXray(
      input({ version: "25.7.23", security: "reality", useMldsa65: false }),
    );
    expect(cfg.reality?.mldsa65?.seed).toBeTruthy();
    expect(
      (buildServerInbound(cfg) as {
        streamSettings: { realitySettings: { mldsa65Seed?: string } };
      }).streamSettings.realitySettings.mldsa65Seed,
    ).toBeTruthy();
  });

  it("stays optional from v25.8.29 up", () => {
    for (const id of ["25.8.29", "26.1.13", "26.7.11"] as const) {
      const off = generateXray(
        input({ version: id, security: "reality", useMldsa65: false }),
      );
      const on = generateXray(
        input({ version: id, security: "reality", useMldsa65: true }),
      );
      expect(off.reality?.mldsa65, id).toBeUndefined();
      expect(on.reality?.mldsa65?.seed, id).toBeTruthy();
    }
  });

  it("is never emitted on the floor version, which has no ML-DSA-65", () => {
    const cfg = generateXray(
      input({ version: "24.11.11", security: "reality", useMldsa65: true }),
    );
    expect(cfg.reality?.mldsa65).toBeUndefined();
  });

  it("reports a REALITY config that is missing a seed the core demands", () => {
    const cfg = generateXray(
      input({ version: "25.7.23", security: "reality", useMldsa65: true }),
    );
    // Hand-edited configs go through the same validator, so removing the seed
    // has to be reported rather than passed along to a core that refuses it.
    delete cfg.reality!.mldsa65;

    const codes = validateXray(cfg)
      .filter((f) => f.level === "error")
      .map((f) => f.code);
    expect(codes).toContain("xray.mldsa_required");
  });
});

describe("XHTTP modes", () => {
  it("never resolves to a mode the version does not have", () => {
    for (const version of XRAY_VERSIONS) {
      const caps = xrayCaps(version.id);
      const cfg = generateXray(
        input({ version: version.id, transport: "xhttp", security: "reality" }),
      );
      // The `!` is types-only: generateXray with xhttp always resolves a
      // mode, and if it ever did not, `toContain(undefined)` below is what
      // should fail the test rather than the access itself.
      expect(caps.xhttpModes).toContain(cfg.xhttp?.resolvedMode!);
    }
  });

  it("falls back from stream-one to stream-up on the floor version", () => {
    // Both stream the upload; stream-up just puts the download on its own
    // request. Downgrading to packet-up would change the traffic shape more
    // than it needs to.
    expect(
      resolveXhttpMode("auto", true, false, ["packet-up", "stream-up"]),
    ).toBe("stream-up");

    const cfg = generateXray(
      input({ version: "24.11.11", transport: "xhttp", security: "reality" }),
    );
    expect(cfg.xhttp?.resolvedMode).toBe("stream-up");
  });

  it("keeps stream-one where the core has it", () => {
    const cfg = generateXray(
      input({ version: "26.7.11", transport: "xhttp", security: "reality" }),
    );
    expect(cfg.xhttp?.resolvedMode).toBe("stream-one");
  });

  it("honours an explicit mode the core supports", () => {
    expect(resolveXhttpMode("packet-up", true, false)).toBe("packet-up");
  });
});

describe("the version table itself", () => {
  it("gives every version at least one XHTTP mode", () => {
    for (const version of XRAY_VERSIONS) {
      expect(version.xhttpModes.length, version.id).toBeGreaterThan(0);
    }
  });

  it("never claims a feature the version below it also lost", () => {
    // The list is newest first, and every capability here is additive: a
    // release does not take VLESS Encryption away again. An out-of-order
    // entry would silently generate for the wrong core.
    const ranks = { none: 0, required: 1, optional: 1 } as const;
    for (let i = 0; i < XRAY_VERSIONS.length - 1; i++) {
      const newer = XRAY_VERSIONS[i]!;
      const older = XRAY_VERSIONS[i + 1]!;
      expect(
        ranks[newer.mldsa65] >= ranks[older.mldsa65],
        `${newer.id} vs ${older.id}`,
      ).toBe(true);
      expect(
        Number(newer.vlessEncryption) >= Number(older.vlessEncryption),
        `${newer.id} vs ${older.id}`,
      ).toBe(true);
      expect(
        newer.xhttpModes.length >= older.xhttpModes.length,
        `${newer.id} vs ${older.id}`,
      ).toBe(true);
    }
  });
});
