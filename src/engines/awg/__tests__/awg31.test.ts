import { describe, it, expect } from "vitest";

import { awgEngine } from "../index";
import { linesToText } from "@/types/engine";
import { renderMihomoProxy } from "../mihomoFormat";
import type { GeneratorInput } from "@/engines/awg/generator";

/**
 * The 3.1 switches: RandomTrailers and DisableCookies.
 *
 * Both keys are new vocabulary — a 3.0 device refuses them at config parse.
 * That is what shapes every rule here: the renderer writes them only where
 * the version reads them, the parser treats their presence as proof of 3.1,
 * and a config with both off stays wire-identical to a 3.0 one.
 */

const inputFor = (over: Partial<GeneratorInput>): GeneratorInput => ({
  ...awgEngine.createDefaults(),
  version: "3.1",
  ...over,
});

const confOf = (input: GeneratorInput): string =>
  linesToText(awgEngine.render(awgEngine.generate(input)));

describe("the AWG 3.1 switches", () => {
  it("renders both keys when they are on", () => {
    const text = confOf(
      inputFor({ useRandomTrailers: true, useDisableCookies: true }),
    );
    expect(text).toMatch(/^RandomTrailers = true$/m);
    expect(text).toMatch(/^DisableCookies = true$/m);
  });

  it("writes neither key when both are off", () => {
    const text = confOf(inputFor({}));
    expect(text).not.toMatch(/^RandomTrailers = /m);
    expect(text).not.toMatch(/^DisableCookies = /m);
  });

  it("never writes them into a 3.0 config, even if asked", () => {
    // The capability gate sits in genAwg3, so flipping the input flags on a
    // 3.0 generation must not smuggle the keys into the file.
    const text = confOf({
      ...inputFor({ useRandomTrailers: true, useDisableCookies: true }),
      version: "3.0",
    });
    expect(text).not.toMatch(/^RandomTrailers = /m);
    expect(text).not.toMatch(/^DisableCookies = /m);
  });

  it("parses back and infers 3.1 from the keys alone", () => {
    const result = awgEngine.parse(
      confOf(inputFor({ useRandomTrailers: true, useDisableCookies: true })),
    );
    expect(result.ok).toBe(true);
    expect(result.config?.version).toBe("3.1");
    expect(result.config?.awg3?.randomTrailers).toBe(true);
    expect(result.config?.awg3?.disableCookies).toBe(true);
  });

  it("reads a 3.1 config with both switches off as 3.0 — honestly", () => {
    const result = awgEngine.parse(confOf(inputFor({})));
    expect(result.ok).toBe(true);
    expect(result.config?.version).toBe("3.0");
  });

  it("accepts the truthy spellings parse_bool takes", () => {
    const base = confOf(inputFor({ useRandomTrailers: true }))
      .replace("RandomTrailers = true", "RandomTrailers = 1");
    const result = awgEngine.parse(base);
    expect(result.config?.awg3?.randomTrailers).toBe(true);
  });

  it("carries the switches into the mihomo export, and only there", () => {
    const on = renderMihomoProxy(
      awgEngine.generate(inputFor({ useRandomTrailers: true, useDisableCookies: true })),
    );
    expect(on).toContain("random-trailers: true");
    expect(on).toContain("disable-cookies: true");

    const off = renderMihomoProxy(awgEngine.generate(inputFor({})));
    expect(off).not.toContain("random-trailers");
    expect(off).not.toContain("disable-cookies");

    const v30 = renderMihomoProxy({
      ...awgEngine.generate(inputFor({ useRandomTrailers: true })),
      version: "3.0",
    });
    expect(v30).not.toContain("random-trailers");
  });
});
