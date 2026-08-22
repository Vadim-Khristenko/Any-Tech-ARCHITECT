import { describe, it, expect, afterEach, vi } from "vitest";

import {
  handOffToSimulator,
  pendingSimulation,
} from "../simHandoff";

/**
 * The hand-off is one sessionStorage entry and a lot of ways to read it
 * wrong. These tests hold the contract: what goes in comes back out, and
 * everything that is not a payload reads as absent rather than as garbage.
 */

const KEY = "architect:pending-sim";

function mapStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    store,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the simulator hand-off", () => {
  it("round-trips a payload", () => {
    vi.stubGlobal("sessionStorage", mapStorage());
    const payload = {
      engine: "awg",
      caption: "AmneziaWG · 3.0 · QUIC Initial",
      notes: ["a client note"],
      config: { version: "3.0", jc: 5 },
    };
    handOffToSimulator(payload);
    expect(pendingSimulation()).toEqual(payload);
  });

  it("reads as absent when nothing was parked", () => {
    vi.stubGlobal("sessionStorage", mapStorage());
    expect(pendingSimulation()).toBeNull();
  });

  it("reads malformed content as absent", () => {
    const storage = mapStorage();
    storage.store.set(KEY, "{not json at all");
    vi.stubGlobal("sessionStorage", storage);
    expect(pendingSimulation()).toBeNull();
  });

  it("refuses an entry without an engine name", () => {
    const storage = mapStorage();
    storage.store.set(KEY, JSON.stringify({ config: {} }));
    vi.stubGlobal("sessionStorage", storage);
    expect(pendingSimulation()).toBeNull();
  });

  it("refuses an entry without a config", () => {
    const storage = mapStorage();
    storage.store.set(KEY, JSON.stringify({ engine: "awg" }));
    vi.stubGlobal("sessionStorage", storage);
    expect(pendingSimulation()).toBeNull();
  });

  it("survives blocked storage on write, and says nothing on read", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(() =>
      handOffToSimulator({ engine: "awg", config: {} }),
    ).not.toThrow();
    expect(pendingSimulation()).toBeNull();
  });
});
