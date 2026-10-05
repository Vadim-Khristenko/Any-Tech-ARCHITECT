/**
 * The two global helpers Vitest ships and `bun:test` does not.
 *
 * `stubGlobal`/`unstubAllGlobals` is the whole of it: remember the first
 * value a key had, put it back on demand. Kept here rather than copied into
 * every suite that stubs `navigator` or `document`, so the save/restore
 * discipline reads the same everywhere it is used.
 */

const originals = new Map<PropertyKey, unknown>();

export function stubGlobal(key: PropertyKey, value: unknown): void {
  if (!originals.has(key)) {
    originals.set(key, Reflect.get(globalThis, key));
  }
  Reflect.set(globalThis, key, value);
}

export function unstubAllGlobals(): void {
  for (const [key, value] of originals) {
    Reflect.set(globalThis, key, value);
  }
  originals.clear();
}
