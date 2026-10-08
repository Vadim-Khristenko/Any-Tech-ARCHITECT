import { describe, it, expect, beforeEach, afterEach } from "bun:test";

import { useGenerator } from "../useGenerator";
import { stubGlobal, unstubAllGlobals } from "@/shared/__tests__/stub-global";

/**
 * The page's switches follow the protocol version: on a change, at start for
 * the remembered version, and on "recommended" after the user has moved them.
 */

function memStore(initial: Record<string, string> = {}) {
  const m = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key: string) => (m.has(key) ? m.get(key)! : null),
    setItem: (key: string, value: string) => void m.set(key, String(value)),
    removeItem: (key: string) => void m.delete(key),
    clear: () => m.clear(),
  };
}

beforeEach(() => {
  stubGlobal("sessionStorage", memStore());
});

afterEach(() => {
  unstubAllGlobals();
});

describe("switches follow the version", () => {
  it("switching to 3.1 applies its preset and disables the headers", () => {
    stubGlobal("localStorage", memStore());
    const { setVersion, config, currentAwg } = useGenerator();
    setVersion("3.1");
    expect(config.mtu).toBe(1280);
    expect(config.useRandomTrailers).toBe(true);
    expect(config.useDisableH).toBe(true);
    const cfg = currentAwg.value!;
    expect([cfg.h1, cfg.h2, cfg.h3, cfg.h4]).toEqual(["1", "2", "3", "4"]);
  });

  it("switching away puts the MTU and the 3.1 switches back", () => {
    stubGlobal("localStorage", memStore());
    const { setVersion, config } = useGenerator();
    setVersion("3.1");
    setVersion("3.0");
    expect(config.mtu).toBe(1500);
    expect(config.useRandomTrailers).toBe(false);
    expect(config.useDisableH).toBe(false);
    expect(config.useHeaderProtection).toBe(true);
  });

  it("starts from the preset of the remembered version", () => {
    stubGlobal("localStorage", memStore({ "awg-architect:version": "3.1" }));
    const { config, version } = useGenerator();
    expect(version.value).toBe("3.1");
    expect(config.mtu).toBe(1280);
    expect(config.useDisableH).toBe(true);
  });

  it("re-selecting the current version keeps what the user changed", () => {
    stubGlobal("localStorage", memStore());
    const { setVersion, config } = useGenerator();
    setVersion("3.1");
    config.useDisableH = false;
    setVersion("3.1");
    expect(config.useDisableH).toBe(false);
  });

  it("resetPreset brings the recommended position back", () => {
    stubGlobal("localStorage", memStore());
    const { setVersion, config, resetPreset } = useGenerator();
    setVersion("3.1");
    config.useDisableH = false;
    config.mtu = 1420;
    resetPreset();
    expect(config.useDisableH).toBe(true);
    expect(config.mtu).toBe(1280);
  });

  it("a hidden linked switch does not act", () => {
    stubGlobal("localStorage", memStore());
    const { setVersion, config, generate, currentAwg } = useGenerator();
    setVersion("3.1");
    config.useRandomTrailers = false;
    generate();
    expect(currentAwg.value!.h1).toContain("-");
  });
});
