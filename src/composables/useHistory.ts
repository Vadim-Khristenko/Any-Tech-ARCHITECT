/**
 * Recently generated configurations, kept across reloads.
 *
 * The mechanism — a capped list in localStorage, ids that survive a reload,
 * and never letting corrupt or full storage take the page down — has nothing
 * to do with AmneziaWG, but it lived inside the AmneziaWG view under a single
 * global key. A second protocol on that key would have shown its entries in
 * the other one's panel and restored them into a generator that cannot read
 * them.
 *
 * So the storage key is per engine, and what goes in an entry is the engine's
 * own type. Only the fields this file touches are fixed; everything else is
 * whatever the engine put there.
 *
 * WHAT A CAP MEANS ONCE THINGS CAN BE PINNED
 *
 * A plain `slice(0, limit)` throws away the oldest entry, which is right until
 * the oldest entry is the one the user marked as worth keeping. Pinned entries
 * are exempt from the cap and the cap applies to the rest — so pinning twenty
 * things on a limit of twenty does not empty the list, it stops it growing.
 */

import { computed, ref, type Ref } from "vue";

import type { HistoryRecord } from "@/types/history";

export type { HistoryRecord } from "@/types/history";

export interface HistoryOptions<T extends HistoryRecord> {
  /**
   * Engine this history belongs to — "awg", "xray". It becomes part of the
   * storage key, which is what keeps two protocols' entries apart.
   */
  engineId: string;
  /** How many unpinned entries to keep. Older ones fall off the end. */
  limit?: number;
  /**
   * A key written by an earlier build, migrated on first load.
   *
   * Without this the AmneziaWG history would simply vanish the day it moved
   * under a namespaced key, which reads as data loss however good the reason.
   */
  legacyKey?: string;
  /**
   * What makes two entries the same generation.
   *
   * Pressing generate twice on unchanged settings used to leave two entries a
   * second apart, and a list of twenty could be four configs. When this is
   * given, a repeat refreshes the entry already there instead of adding
   * another — and refreshes rather than ignores, because the newer timestamp
   * is the true one.
   */
  fingerprint?: (entry: Omit<T, "id" | "timestamp">) => string;
  /**
   * Text the entry should be findable by.
   *
   * The user's note is always searched; this adds whatever the engine thinks
   * is worth matching on — a version, a profile, a hostname.
   */
  searchText?: (entry: T) => string;
}

export interface History<T extends HistoryRecord> {
  entries: Ref<T[]>;
  /** Entries matching `query`, pinned ones first. */
  visible: Ref<T[]>;
  /** What the list is being filtered by. Empty shows everything. */
  query: Ref<string>;

  /** Read storage. Safe to call more than once. */
  load: () => void;
  /** Store an entry, stamping it with an id and the time. */
  add: (entry: Omit<T, "id" | "timestamp">) => T;
  remove: (id: number) => void;
  /** Forget everything the user has not pinned. */
  clear: () => void;
  /** Forget everything, pinned included. */
  clearAll: () => void;

  setPinned: (id: number, pinned: boolean) => void;
  setNote: (id: number, note: string) => void;

  /** The whole history as JSON, for keeping or moving between browsers. */
  toJson: () => string;
  /**
   * Read entries back in, keeping what is already there.
   *
   * Merged rather than replaced: an import is usually another machine's
   * history, and losing this one's to gain that one's is rarely what was
   * meant. Ids are reassigned, since two exports will both start at 1.
   */
  fromJson: (json: string) => { added: number; skipped: number };

  /** The key this history is stored under, for tests and diagnostics. */
  storageKey: string;
}

const DEFAULT_LIMIT = 20;

/** Namespace shared with the rest of the app's stored state. */
const PREFIX = "awg-architect:history";

export function storageKeyFor(engineId: string): string {
  return `${PREFIX}:${engineId}`;
}

/** The engine a storage key belongs to, or null if it is not one of ours. */
export function engineIdFor(storageKey: string): string | null {
  return storageKey.startsWith(`${PREFIX}:`)
    ? storageKey.slice(PREFIX.length + 1)
    : null;
}

/**
 * Every engine's history at once, without mounting each engine's composable.
 *
 * For a view that wants to show "what have I generated lately" across
 * protocols rather than on one page. Read-only on purpose: writing belongs to
 * the engine that owns the entry.
 */
export function allHistories(): Record<string, HistoryRecord[]> {
  const out: Record<string, HistoryRecord[]> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const engineId = engineIdFor(key);
      if (!engineId) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) out[engineId] = parsed as HistoryRecord[];
    }
  } catch {
    // Storage blocked or a corrupt entry. Whatever was readable is returned.
  }
  return out;
}

export function useHistory<T extends HistoryRecord>(
  options: HistoryOptions<T>,
): History<T> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const storageKey = storageKeyFor(options.engineId);

  const entries = ref<T[]>([]) as Ref<T[]>;
  const query = ref("");
  let idCounter = 0;

  /* ── Storage ──────────────────────────────────────────────────────────── */

  function read(key: string): T[] | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : null;
    } catch {
      // Corrupt JSON, or storage blocked entirely. Either way the page has to
      // keep working; history is a convenience, not the product.
      return null;
    }
  }

  function save(): void {
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries.value));
    } catch {
      // Quota exceeded or storage blocked — the list stays in memory only.
    }
  }

  /**
   * Apply the cap, counting only what the cap is for.
   *
   * Pinned entries keep their place in the list; the unpinned ones past the
   * limit are the ones that go.
   */
  function capped(list: T[]): T[] {
    let unpinned = 0;
    return list.filter((entry) => {
      if (entry.pinned) return true;
      unpinned += 1;
      return unpinned <= limit;
    });
  }

  function load(): void {
    const stored = read(storageKey) ?? readLegacy();
    entries.value = capped(stored ?? []);
    // Continue from the highest id rather than from zero: reusing an id after
    // a reload makes "delete this one" delete a different one.
    idCounter = entries.value.reduce(
      (max, entry) => Math.max(max, Number(entry.id) || 0),
      0,
    );
  }

  function readLegacy(): T[] | null {
    if (!options.legacyKey) return null;
    const stored = read(options.legacyKey);
    if (!stored) return null;

    entries.value = capped(stored);
    save();
    try {
      // Moved, not copied: leaving it behind means the next build has to
      // decide which of the two is current.
      localStorage.removeItem(options.legacyKey);
    } catch {
      // Read-only storage. The entries are already under the new key.
    }
    return stored;
  }

  /* ── Changing the list ────────────────────────────────────────────────── */

  function add(entry: Omit<T, "id" | "timestamp">): T {
    const fingerprint = options.fingerprint?.(entry);

    if (fingerprint) {
      const existing = entries.value.find((e) => e.fingerprint === fingerprint);
      if (existing) {
        // The same config again. Move it to the front and re-date it, keeping
        // the id so anything holding one still points at this entry, and
        // keeping the note and the pin, which are the user's and not the
        // generator's to overwrite.
        const refreshed = { ...existing, timestamp: Date.now() } as T;
        entries.value = [
          refreshed,
          ...entries.value.filter((e) => e.id !== existing.id),
        ];
        save();
        return refreshed;
      }
    }

    const stored = {
      ...entry,
      ...(fingerprint ? { fingerprint } : {}),
      id: ++idCounter,
      timestamp: Date.now(),
    } as T;

    entries.value = capped([stored, ...entries.value]);
    save();
    return stored;
  }

  function update(id: number, patch: Partial<T>): void {
    entries.value = entries.value.map((entry) =>
      entry.id === id ? ({ ...entry, ...patch } as T) : entry,
    );
    save();
  }

  function remove(id: number): void {
    entries.value = entries.value.filter((entry) => entry.id !== id);
    save();
  }

  function clear(): void {
    // Pinned entries survive: "clear" is about the accumulated noise, and a
    // button that also throws away the marked ones is one nobody presses.
    entries.value = entries.value.filter((entry) => entry.pinned);
    save();
  }

  function clearAll(): void {
    entries.value = [];
    save();
  }

  const setPinned = (id: number, pinned: boolean) =>
    update(id, { pinned } as Partial<T>);

  const setNote = (id: number, note: string) =>
    update(id, { note: note.trim() } as Partial<T>);

  /* ── Finding things ───────────────────────────────────────────────────── */

  /**
   * What an entry is searched by, remembered per entry.
   *
   * The filter runs on every keystroke, and building the haystack joins two
   * strings and lowercases the result — for every entry, every time. An entry
   * is only rebuilt when the user edits its note or the engine re-derives its
   * text, and both produce a new object, so the object itself is a safe key:
   * a `WeakMap` holds nothing the list has already let go of.
   */
  const haystacks = new WeakMap<object, string>();

  function haystackFor(entry: T): string {
    const cached = haystacks.get(entry);
    if (cached !== undefined) return cached;
    const built = [entry.note ?? "", options.searchText?.(entry) ?? ""]
      .join(" ")
      .toLowerCase();
    haystacks.set(entry, built);
    return built;
  }

  const visible = computed<T[]>(() => {
    const needle = query.value.trim().toLowerCase();

    const matching = !needle
      ? entries.value
      : entries.value.filter((entry) => haystackFor(entry).includes(needle));

    // Pinned first, then newest. A stable sort keeps the storage order within
    // each group, which is already newest-first.
    return [...matching].sort(
      (a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)),
    );
  }) as Ref<T[]>;

  /* ── Moving it elsewhere ──────────────────────────────────────────────── */

  function toJson(): string {
    return JSON.stringify(
      { engine: options.engineId, version: 1, entries: entries.value },
      null,
      2,
    );
  }

  function fromJson(json: string): { added: number; skipped: number } {
    let incoming: unknown;
    try {
      incoming = JSON.parse(json);
    } catch {
      return { added: 0, skipped: 0 };
    }

    const list = Array.isArray(incoming)
      ? incoming
      : ((incoming as { entries?: unknown })?.entries ?? null);
    if (!Array.isArray(list)) return { added: 0, skipped: 0 };

    const seen = new Set(
      entries.value.map((e) => e.fingerprint).filter(Boolean) as string[],
    );

    let added = 0;
    let skipped = 0;
    const merged = [...entries.value];

    for (const raw of list) {
      if (!raw || typeof raw !== "object") {
        skipped += 1;
        continue;
      }
      const entry = raw as T;
      if (entry.fingerprint && seen.has(entry.fingerprint)) {
        skipped += 1;
        continue;
      }
      if (entry.fingerprint) seen.add(entry.fingerprint);

      merged.push({
        ...entry,
        // Two exports both start at id 1, so an imported id would collide with
        // one already here and "delete this" would delete the wrong entry.
        id: ++idCounter,
        timestamp: Number(entry.timestamp) || Date.now(),
      } as T);
      added += 1;
    }

    merged.sort((a, b) => b.timestamp - a.timestamp);
    entries.value = capped(merged);
    save();
    return { added, skipped };
  }

  return {
    entries,
    visible,
    query,
    load,
    add,
    remove,
    clear,
    clearAll,
    setPinned,
    setNote,
    toJson,
    fromJson,
    storageKey,
  };
}
