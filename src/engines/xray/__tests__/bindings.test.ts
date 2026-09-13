/**
 * Every editable parameter must land on a real property.
 *
 * A binding that points at a path the input does not have renders a control
 * that appears to work and changes nothing — the exact failure the table
 * exists to prevent, and one no type check catches, because the paths are
 * strings.
 */
import { describe, it, expect } from "bun:test";
import { createDefaults } from "../generate";
import { XRAY_PARAMETERS } from "../params";
import {
  EDITABLE_GROUPS,
  EXPLICIT_BINDINGS,
  inputPathFor,
  readPath,
  writePath,
} from "../bindings";

describe("editable parameter bindings", () => {
  const covered = XRAY_PARAMETERS.filter((p) =>
    (EDITABLE_GROUPS as readonly string[]).includes(p.group),
  );

  it("covers every parameter of an editable group", () => {
    const unbound = covered
      .filter((p) => inputPathFor(p.group, p.key) === null)
      .map((p) => `${p.group}.${p.key}`);
    expect(unbound).toEqual([]);
  });

  it("points every one of them at a property that exists", () => {
    const input = createDefaults();
    const missing = covered
      .filter((p) => readPath(input, inputPathFor(p.group, p.key)!) === undefined)
      .map((p) => `${p.group}.${p.key} → ${inputPathFor(p.group, p.key)}`);
    expect(missing).toEqual([]);
  });

  it("writes where it says it writes", () => {
    const input = createDefaults();
    for (const p of covered) {
      const path = inputPathFor(p.group, p.key)!;
      const before = readPath(input, path);
      const probe = typeof before === "number" ? 4242 : typeof before === "boolean" ? !before : "probe";
      expect(writePath(input, path, probe), path).toBe(true);
      expect(readPath(input, path), path).toEqual(probe);
    }
  });

  it("refuses a group it does not cover", () => {
    expect(inputPathFor("xhttp", "path")).toBeNull();
  });

  /*
   * The parameters named one at a time, for groups the input does not gather
   * under one object. A typo here is a control that silently changes nothing.
   */
  it("resolves every explicitly named parameter", () => {
    const input = createDefaults();
    const broken = EXPLICIT_BINDINGS.filter(
      ({ group, key }) => readPath(input, inputPathFor(group, key)!) === undefined,
    ).map(({ group, key }) => `${group}.${key}`);
    expect(broken).toEqual([]);
  });

  /*
   * The guard that matters most here.
   *
   * A parameter the catalogue says the user supplies, with nothing to supply
   * it with, is a promise the page does not keep — and it appears silently,
   * the moment somebody adds an entry and forgets the binding. This fails
   * then, naming the parameter.
   */
  it("offers a control for every parameter left to the user", () => {
    const manual = XRAY_PARAMETERS.filter((p) => p.offered && !p.generated);
    expect(manual.length).toBeGreaterThan(0);

    const unbound = manual
      .filter((p) => inputPathFor(p.group, p.key) === null)
      .map((p) => `${p.group}.${p.key}`);
    expect(unbound).toEqual([]);
  });

  it("resolves each of those on a real input", () => {
    const input = createDefaults();
    const broken = XRAY_PARAMETERS.filter((p) => p.offered && !p.generated)
      .filter((p) => readPath(input, inputPathFor(p.group, p.key)!) === undefined)
      .map((p) => `${p.group}.${p.key} → ${inputPathFor(p.group, p.key)}`);
    expect(broken).toEqual([]);
  });
});
