import { describe, it, expect } from "bun:test";

import { xrayEngine } from "../index";
import { buildServerInbound } from "../render";
import {
  XRAY_CATALOGUE,
  XRAY_GENERATED,
  XRAY_MANUAL,
  XRAY_MISSING,
  XRAY_PARAMETERS,
  xrayCoverage,
  xrayHasParam,
  xrayParamsFor,
  xraySharedParams,
} from "../params";
import { XRAY_VERSIONS } from "../versions";
import { readParam } from "@/shared/params";

/**
 * The catalogue is deliberately larger than what the generator emits, and the
 * gap is the roadmap. These tests hold the two together: a parameter marked
 * `generated` has to actually appear in a config, and one marked missing has
 * to actually be missing — otherwise the coverage number is a story rather
 * than a measurement.
 */

const cfg = (version = "26.7.11", security: "reality" | "none" = "reality") =>
  xrayEngine.generate({
    ...xrayEngine.createDefaults(),
    address: "203.0.113.10",
    transport: "xhttp",
    security,
    useMldsa65: true,
    useVlessEncryption: true,
    version: version as ReturnType<typeof xrayEngine.createDefaults>["version"],
    // Host defaults to empty, meaning "use the address". Set here so the
    // parameter is exercised rather than skipped as blank.
    xhttp: { ...xrayEngine.createDefaults().xhttp, host: "cdn.example.com" },
    // Likewise the mask: no mask is the default, and the block is only
    // written when one is chosen.
    finalMask: {
      ...xrayEngine.createDefaults().finalMask,
      kind: "noise" as const,
      quicCongestion: "bbr" as const,
    },
  });

/**
 * A field written but left blank is a placeholder, not a generated value.
 *
 * An empty object or array counts as blank too: `headers: {}` means the
 * generator has the field and produces no headers, which is not the same as
 * generating them.
 */
const filled = (value: unknown): boolean => {
  if (value === undefined || value === null || value === "") return false;
  // "auto" and "AsIs" are how the settings object spells "leave it to the
  // core", the same as an empty string elsewhere — the renderer writes none
  // of the three.
  if (value === "auto" || value === "AsIs") return false;
  // A switch left off is not a generated value: the renderer writes nothing
  // for it, and calling it generated would count a default as a feature. The
  // same goes for zero in the socket options, where it is how "leave the
  // kernel's own" is spelled and the renderer skips the key entirely.
  if (value === false || value === 0) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

/**
 * The same question asked of the generator rather than of the output.
 *
 * The two tests below want different things from the same value. "Did a config
 * acquire this without being asked?" is about what gets written, where a
 * switch left off and a zero both write nothing — that is `filled`. "Does the
 * generator decide this?" is not: `grpcMultiMode` is drawn per config and a
 * draw that comes up false is a decision, not an omission. Treating it as one
 * made this test fail roughly half the time.
 *
 * Booleans and numbers are therefore always decisions here. `xver` is the
 * clearest case: zero is its ordinary value and the renderer does write it.
 */
const decided = (value: unknown): boolean =>
  typeof value === "boolean" || typeof value === "number" ? true : filled(value);

describe("the catalogue itself", () => {
  it("has no duplicate key within one group", () => {
    const seen = new Set<string>();
    for (const param of XRAY_PARAMETERS) {
      const id = `${param.group}.${param.key}`;
      expect(seen.has(id), id).toBe(false);
      seen.add(id);
    }
  });

  it("orders versions oldest first, matching the version list", () => {
    // paramSetFor takes a prefix of this, so a reversed order would hand
    // v24.11.11 every parameter that exists.
    expect(XRAY_CATALOGUE.order[0]).toBe("24.11.11");
    expect(XRAY_CATALOGUE.order).toEqual(
      [...XRAY_VERSIONS].map((v) => v.id).reverse(),
    );
  });

  it("only names versions the product actually offers", () => {
    const known = new Set(XRAY_VERSIONS.map((v) => v.id));
    for (const param of XRAY_PARAMETERS) {
      expect(known.has(param.since), `${param.key} since ${param.since}`).toBe(
        true,
      );
    }
  });

  it("cites a source for everything both ends must agree on", () => {
    // A `shared` claim that is wrong costs a silent failure, so it has to be
    // checkable against the core rather than trusted.
    for (const param of XRAY_PARAMETERS.filter((p) => p.scope === "shared")) {
      const documented = param.source || param.note;
      expect(documented, `${param.group}.${param.key}`).toBeTruthy();
    }
  });

  it("gives every enum its allowed values", () => {
    for (const param of XRAY_PARAMETERS.filter((p) => p.kind === "enum")) {
      expect(param.bounds?.oneOf, param.key).toBeTruthy();
    }
  });
});

describe("per-version sets", () => {
  it("hides a parameter from versions older than it", () => {
    // VLESS Encryption arrived in v26.1.13; v25.8.29 has no such field.
    expect(xrayHasParam("26.1.13", "decryption")).toBe(true);
    expect(xrayHasParam("25.8.29", "decryption")).toBe(false);
    expect(xrayHasParam("24.11.11", "mldsa65Seed")).toBe(false);
    expect(xrayHasParam("25.7.23", "mldsa65Seed")).toBe(true);
  });

  it("grows monotonically with the version", () => {
    const sizes = [...XRAY_VERSIONS]
      .reverse()
      .map((v) => xrayParamsFor(v.id).length);
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i]!, XRAY_VERSIONS[i]!.id).toBeGreaterThanOrEqual(
        sizes[i - 1]!,
      );
    }
  });

  it("names the parameters a mismatch would break silently", () => {
    const shared = xraySharedParams("26.7.11").map((p) => p.key);
    // These are the ones where the two ends disagreeing produces no error at
    // all, just a connection that does not work.
    for (const key of ["privateKey", "shortIds", "serverNames", "flow"]) {
      expect(shared, key).toContain(key);
    }
  });
});

describe("coverage is measured, not claimed", () => {
  it("emits every parameter it says it emits", () => {
    // Across versions and across layers, not on one config: `minClientVer` is
    // written only where the core has no default of its own, `mldsa65Seed`
    // only where the core knows about it, and `uplinkHTTPMethod` only in
    // packet-up — which REALITY never resolves to. A parameter counts as
    // generated if some supported configuration produces it, so the set has
    // to contain every configuration a parameter could belong to.
    const configs = [
      cfg("26.7.11"),
      cfg("25.7.23"),
      // Without REALITY the mode resolves to packet-up.
      cfg("26.7.11", "none"),
    ];

    for (const param of XRAY_GENERATED) {
      const present = configs.some(
        (config) => decided(readParam(config, param.field)),
      );
      expect(present, `${param.group}.${param.key} → ${param.field}`).toBe(
        true,
      );
    }

    // And the config really did come out with something in it.
    expect(Object.keys(buildServerInbound(configs[0]!)).length).toBeGreaterThan(
      0,
    );
  });

  it("does not quietly emit something it lists as unsupported", () => {
    for (const version of ["26.7.11", "25.7.23"]) {
      const config = cfg(version);
      // Both categories: a parameter Architect cannot express at all, and one
      // it can be told but never decides on its own. Neither may appear in a
      // config the user did not ask for it in.
      for (const param of [...XRAY_MISSING, ...XRAY_MANUAL]) {
        // A field present but blank is a placeholder, not support:
        // mldsa65Verify is written empty on purpose because deriving the
        // 1952 bytes needs an algorithm this page does not carry.
        expect(
          filled(readParam(config, param.field)),
          `${param.group}.${param.key} has a value on ${version}`,
        ).toBe(false);
      }
    }
  });

  it("reports coverage per block", () => {
    const coverage = xrayCoverage();
    for (const [group, { done, manual, total }] of Object.entries(coverage)) {
      expect(total, group).toBeGreaterThan(0);
      expect(done + manual, group).toBeLessThanOrEqual(total);
    }
    // The whole point of the flags: every parameter is in exactly one of the
    // three states, and the gap that remains is real and known.
    expect(XRAY_MISSING.length).toBeGreaterThan(0);
    expect(
      XRAY_GENERATED.length + XRAY_MANUAL.length + XRAY_MISSING.length,
    ).toBe(XRAY_PARAMETERS.length);
  });
});
