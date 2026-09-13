import { describe, it, expect, vi, jest, beforeEach, afterEach } from "bun:test";
import {
  stubGlobal,
  unstubAllGlobals,
} from "@/shared/__tests__/stub-global";

import {
  allHistories,
  storageKeyFor,
  useHistory,
  type HistoryRecord,
} from "../useHistory";

/**
 * The history used to live in the AmneziaWG view under one global key. A
 * second protocol on that key would have shown its entries in the other one's
 * panel and offered them to a generator that cannot read them, so the key is
 * per engine — and the entries a user already has have to survive the move.
 */

interface Entry extends HistoryRecord {
  text: string;
}

function stubStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const api = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: vi.fn((k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn((k: string) => {
      store.delete(k);
    }),
    store,
  };
  stubGlobal("localStorage", api);
  return api;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-07-31T12:00:00Z"));
});

afterEach(() => {
  jest.useRealTimers();
  unstubAllGlobals();
});

describe("storage keys", () => {
  it("namespaces by engine", () => {
    expect(storageKeyFor("awg")).not.toBe(storageKeyFor("xray"));
  });

  it("keeps two engines' entries apart", () => {
    stubStorage();
    const awg = useHistory<Entry>({ engineId: "awg" });
    const xray = useHistory<Entry>({ engineId: "xray" });

    awg.add({ text: "awg config" });
    xray.load();

    // The whole point: an XRay panel must never offer an AmneziaWG config
    // for restoring into a generator that cannot read it.
    expect(xray.entries.value).toEqual([]);
  });
});

describe("adding and reading", () => {
  it("stamps an id and a time", () => {
    stubStorage();
    const history = useHistory<Entry>({ engineId: "awg" });

    const entry = history.add({ text: "one" });
    expect(entry.id).toBe(1);
    expect(entry.timestamp).toBe(Date.parse("2026-07-31T12:00:00Z"));
  });

  it("puts the newest first", () => {
    stubStorage();
    const history = useHistory<Entry>({ engineId: "awg" });

    history.add({ text: "older" });
    history.add({ text: "newer" });
    expect(history.entries.value.map((e) => e.text)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("drops the oldest past the limit", () => {
    stubStorage();
    const history = useHistory<Entry>({ engineId: "awg", limit: 2 });

    history.add({ text: "a" });
    history.add({ text: "b" });
    history.add({ text: "c" });
    expect(history.entries.value.map((e) => e.text)).toEqual(["c", "b"]);
  });

  it("continues ids from what was stored", () => {
    stubStorage({
      [storageKeyFor("awg")]: JSON.stringify([
        { id: 7, timestamp: 1, text: "old" },
      ]),
    });
    const history = useHistory<Entry>({ engineId: "awg" });
    history.load();

    // Restarting at 1 would make "delete this one" delete a different one.
    expect(history.add({ text: "new" }).id).toBe(8);
  });
});

describe("surviving bad storage", () => {
  it("starts empty on corrupt JSON instead of throwing", () => {
    stubStorage({ [storageKeyFor("awg")]: "{not json" });
    const history = useHistory<Entry>({ engineId: "awg" });

    expect(() => history.load()).not.toThrow();
    expect(history.entries.value).toEqual([]);
  });

  it("ignores stored data that is not a list", () => {
    stubStorage({ [storageKeyFor("awg")]: JSON.stringify({ nope: true }) });
    const history = useHistory<Entry>({ engineId: "awg" });
    history.load();

    expect(history.entries.value).toEqual([]);
  });

  it("keeps working in memory when the quota is full", () => {
    const storage = stubStorage();
    storage.setItem.mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const history = useHistory<Entry>({ engineId: "awg" });

    expect(() => history.add({ text: "one" })).not.toThrow();
    // History is a convenience; a full disk must not cost the user the entry
    // they are looking at.
    expect(history.entries.value).toHaveLength(1);
  });
});

describe("migrating the un-namespaced key", () => {
  const legacyKey = "awg-architect:history";

  it("moves what an earlier build wrote", () => {
    const storage = stubStorage({
      [legacyKey]: JSON.stringify([{ id: 3, timestamp: 1, text: "kept" }]),
    });
    const history = useHistory<Entry>({ engineId: "awg", legacyKey });
    history.load();

    expect(history.entries.value.map((e) => e.text)).toEqual(["kept"]);
    expect(storage.store.get(storageKeyFor("awg"))).toContain("kept");
    // Moved, not copied: two copies would leave the next build guessing which
    // one is current.
    expect(storage.store.has(legacyKey)).toBe(false);
  });

  it("prefers the namespaced key once it exists", () => {
    stubStorage({
      [legacyKey]: JSON.stringify([{ id: 1, timestamp: 1, text: "stale" }]),
      [storageKeyFor("awg")]: JSON.stringify([
        { id: 2, timestamp: 2, text: "current" },
      ]),
    });
    const history = useHistory<Entry>({ engineId: "awg", legacyKey });
    history.load();

    expect(history.entries.value.map((e) => e.text)).toEqual(["current"]);
  });
});

describe("removing", () => {
  it("removes one entry by id", () => {
    stubStorage();
    const history = useHistory<Entry>({ engineId: "awg" });
    const first = history.add({ text: "a" });
    history.add({ text: "b" });

    history.remove(first.id);
    expect(history.entries.value.map((e) => e.text)).toEqual(["b"]);
  });

  it("clears everything, and writes that through", () => {
    const storage = stubStorage();
    const history = useHistory<Entry>({ engineId: "awg" });
    history.add({ text: "a" });

    history.clear();
    expect(history.entries.value).toEqual([]);
    expect(storage.store.get(storageKeyFor("awg"))).toBe("[]");
  });
});

/**
 * What a history is for, beyond remembering.
 *
 * Twenty entries a second apart, all of the same config, is a list nobody
 * reads. Neither is one where the entry worth keeping fell off the end
 * because nineteen throwaways were generated after it.
 */
describe("keeping what matters", () => {
  it("exempts pinned entries from the cap", () => {
    stubStorage();
    const history = useHistory<Entry>({ engineId: "awg", limit: 2 });

    const keep = history.add({ text: "keep" });
    history.setPinned(keep.id, true);

    history.add({ text: "a" });
    history.add({ text: "b" });
    history.add({ text: "c" });

    const texts = history.entries.value.map((e) => e.text);
    // The cap still bounds the throwaways — two of them — and the pinned one
    // is simply not counted.
    expect(texts).toContain("keep");
    expect(texts.filter((t) => t !== "keep")).toEqual(["c", "b"]);
  });

  it("leaves pinned entries alone when clearing, and takes them on clearAll", () => {
    stubStorage();
    const history = useHistory<Entry>({ engineId: "awg" });
    const keep = history.add({ text: "keep" });
    history.add({ text: "noise" });
    history.setPinned(keep.id, true);

    history.clear();
    expect(history.entries.value.map((e) => e.text)).toEqual(["keep"]);

    history.clearAll();
    expect(history.entries.value).toEqual([]);
  });

  it("keeps the user's note across a regeneration of the same config", () => {
    stubStorage();
    const history = useHistory<Entry>({
      engineId: "awg",
      fingerprint: (e) => e.text,
    });

    const first = history.add({ text: "same" });
    history.setNote(first.id, "the one that worked");
    history.setPinned(first.id, true);

    jest.setSystemTime(new Date("2026-07-31T12:05:00Z"));
    const again = history.add({ text: "same" });

    // One entry, not two — and the parts the user supplied survive, while the
    // timestamp moves to when it was last produced.
    expect(history.entries.value).toHaveLength(1);
    expect(again.id).toBe(first.id);
    expect(again.note).toBe("the one that worked");
    expect(again.pinned).toBe(true);
    expect(again.timestamp).toBeGreaterThan(first.timestamp);
  });

  it("still adds an entry when the config really is different", () => {
    stubStorage();
    const history = useHistory<Entry>({
      engineId: "awg",
      fingerprint: (e) => e.text,
    });

    history.add({ text: "one" });
    history.add({ text: "two" });
    expect(history.entries.value).toHaveLength(2);
  });
});

describe("finding an entry again", () => {
  it("searches the note and whatever the engine offers", () => {
    stubStorage();
    const history = useHistory<Entry>({
      engineId: "awg",
      searchText: (e) => e.text,
    });

    const a = history.add({ text: "quic profile" });
    history.add({ text: "sip profile" });
    history.setNote(a.id, "for the router");

    history.query.value = "sip";
    expect(history.visible.value.map((e) => e.text)).toEqual(["sip profile"]);

    // The note is searched even though the engine never mentions it.
    history.query.value = "router";
    expect(history.visible.value.map((e) => e.text)).toEqual(["quic profile"]);

    history.query.value = "";
    expect(history.visible.value).toHaveLength(2);
  });

  it("puts pinned entries first whatever the query", () => {
    stubStorage();
    const history = useHistory<Entry>({
      engineId: "awg",
      searchText: (e) => e.text,
    });

    history.add({ text: "old match" });
    const pinned = history.add({ text: "match" });
    history.add({ text: "new match" });
    history.setPinned(pinned.id, true);

    history.query.value = "match";
    expect(history.visible.value[0]!.text).toBe("match");
  });
});

describe("moving a history between browsers", () => {
  it("merges rather than replaces, and reassigns ids", () => {
    stubStorage();
    const source = useHistory<Entry>({
      engineId: "awg",
      fingerprint: (e) => e.text,
    });
    source.add({ text: "from the laptop" });
    const exported = source.toJson();

    unstubAllGlobals();
    stubStorage();
    const target = useHistory<Entry>({
      engineId: "awg",
      fingerprint: (e) => e.text,
    });
    const mine = target.add({ text: "from the desktop" });

    const result = target.fromJson(exported);
    expect(result).toEqual({ added: 1, skipped: 0 });

    const texts = target.entries.value.map((e) => e.text);
    expect(texts).toContain("from the laptop");
    expect(texts).toContain("from the desktop");

    // Both exports start at id 1, so an imported id would collide and
    // "delete this one" would delete the wrong entry.
    const ids = target.entries.value.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(target.entries.value.find((e) => e.text === "from the desktop")!.id).toBe(
      mine.id,
    );
  });

  it("skips what it already has", () => {
    stubStorage();
    const history = useHistory<Entry>({
      engineId: "awg",
      fingerprint: (e) => e.text,
    });
    history.add({ text: "same" });

    expect(history.fromJson(history.toJson())).toEqual({ added: 0, skipped: 1 });
    expect(history.entries.value).toHaveLength(1);
  });

  it("survives being handed something that is not a history", () => {
    stubStorage();
    const history = useHistory<Entry>({ engineId: "awg" });
    history.add({ text: "mine" });

    expect(history.fromJson("not json at all")).toEqual({ added: 0, skipped: 0 });
    expect(history.fromJson('{"nope":true}')).toEqual({ added: 0, skipped: 0 });
    expect(history.entries.value).toHaveLength(1);
  });
});

describe("every engine at once", () => {
  it("reads each engine's entries without mounting its composable", () => {
    const storage = stubStorage();
    storage.store.set(storageKeyFor("awg"), JSON.stringify([{ id: 1, timestamp: 1 }]));
    storage.store.set(storageKeyFor("xray"), JSON.stringify([{ id: 1, timestamp: 2 }]));
    storage.store.set("something-else", "not ours");
    // localStorage.key() is what the sweep walks; the stub needs it.
    const keys = [...storage.store.keys()];
    stubGlobal("localStorage", {
      ...storage,
      length: keys.length,
      key: (i: number) => keys[i] ?? null,
    });

    const all = allHistories();
    expect(Object.keys(all).sort()).toEqual(["awg", "xray"]);
    expect(all.awg).toHaveLength(1);
  });
});
