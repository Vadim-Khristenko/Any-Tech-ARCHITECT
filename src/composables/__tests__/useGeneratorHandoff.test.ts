import { describe, it, expect, beforeEach, afterEach } from "bun:test";

import { useGenerator } from "../useGenerator";
import { pendingSimulation } from "@/shared/simHandoff";
import {
  stubGlobal,
  unstubAllGlobals,
} from "@/shared/__tests__/stub-global";

/**
 * The generator parks every fresh config where the FAQ client-fields form
 * reads it. Without this the form only ever saw simulator hand-offs, and a
 * config generated on the main page never reached the transcription form.
 */

function memStore() {
  const m = new Map<string, string>();
  return {
    getItem: (key: string) => (m.has(key) ? m.get(key)! : null),
    setItem: (key: string, value: string) => {
      m.set(key, String(value));
    },
    removeItem: (key: string) => {
      m.delete(key);
    },
    clear: () => m.clear(),
  };
}

beforeEach(() => {
  stubGlobal("localStorage", memStore());
  stubGlobal("sessionStorage", memStore());
});

afterEach(() => {
  unstubAllGlobals();
});

describe("generator to FAQ handoff", () => {
  it("parks the generated config where the client-fields form reads it", () => {
    const { generate, currentAwg } = useGenerator();
    generate();
    expect(currentAwg.value).not.toBeNull();

    const pending = pendingSimulation();
    expect(pending?.engine).toBe("awg");
    expect(pending?.config).toEqual(currentAwg.value);
  });

  it("the parked copy is the latest generation, not the first", () => {
    const { generate, currentAwg } = useGenerator();
    generate();
    generate();

    const pending = pendingSimulation();
    expect(pending?.config).toEqual(currentAwg.value);
  });
});
