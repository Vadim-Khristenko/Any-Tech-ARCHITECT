import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useHistory, type HistoryRecord } from "../useHistory";

/**
 * Searching a list that remembers what it searched.
 *
 * The filter runs on every keystroke, and building each entry's haystack
 * joined two strings and lowercased the result — for every entry, every time.
 * The haystack is cached against the entry object now, which is safe only
 * because the two things that change it, a new note and a re-derived text,
 * both produce a new object.
 *
 * These tests are that claim. If a future change ever mutated an entry in
 * place instead of replacing it, the list would keep answering an old query
 * and nothing here would say why.
 */

interface Entry extends HistoryRecord {
    text: string;
}

function stubStorage(): void {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
    });
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T12:00:00Z"));
    stubStorage();
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

function workbench() {
    return useHistory<Entry>({
        engineId: "awg",
        searchText: (entry) => entry.text,
    });
}

describe("filtering a history", () => {
    it("finds an entry by its note and by what the engine offered", () => {
        const h = workbench();
        const a = h.add({ text: "vpn.example.com" });
        h.add({ text: "backup.example.org" });
        h.setNote(a.id, "home server");

        h.query.value = "home";
        expect(h.visible.value.map((e) => e.text)).toEqual(["vpn.example.com"]);

        h.query.value = "backup";
        expect(h.visible.value.map((e) => e.text)).toEqual(["backup.example.org"]);
    });

    it("is case-insensitive in both directions", () => {
        const h = workbench();
        h.add({ text: "VPN.Example.COM" });

        h.query.value = "vpn.example";
        expect(h.visible.value).toHaveLength(1);
    });

    it("answers a note that was edited after the entry was cached", () => {
        const h = workbench();
        const entry = h.add({ text: "vpn.example.com" });

        h.query.value = "home";
        expect(h.visible.value).toHaveLength(0);

        h.setNote(entry.id, "home server");
        // The entry has been read by the query above, so its haystack is in
        // the cache. A cached entry would keep answering "no".
        expect(h.visible.value).toHaveLength(1);
    });

    it("stops answering the note that was replaced", () => {
        const h = workbench();
        const entry = h.add({ text: "vpn.example.com" });
        h.setNote(entry.id, "home server");

        h.query.value = "home";
        expect(h.visible.value).toHaveLength(1);

        h.setNote(entry.id, "office box");
        expect(h.visible.value).toHaveLength(0);

        h.query.value = "office";
        expect(h.visible.value).toHaveLength(1);
    });

    it("keeps other entries' cached answers intact", () => {
        const h = workbench();
        h.add({ text: "alpha.example" });
        const second = h.add({ text: "beta.example" });

        h.query.value = "alpha";
        expect(h.visible.value).toHaveLength(1);

        // Editing one entry must not make the other unfindable.
        h.setNote(second.id, "a note of its own");
        expect(h.visible.value.map((e) => e.text)).toEqual(["alpha.example"]);
    });

    it("shows everything for an empty query, and for whitespace alone", () => {
        const h = workbench();
        h.add({ text: "alpha" });
        h.add({ text: "beta" });

        h.query.value = "";
        expect(h.visible.value).toHaveLength(2);

        h.query.value = "   ";
        expect(h.visible.value).toHaveLength(2);
    });

    it("still puts pinned entries first while filtering", () => {
        const h = workbench();
        const first = h.add({ text: "shared" });
        const second = h.add({ text: "shared" });
        h.setPinned(second.id, true);

        h.query.value = "shared";
        expect(h.visible.value.map((e) => e.id)).toEqual([second.id, first.id]);
    });
});
