import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import ru from "../locales/ru";

/**
 * Strings nobody asks for.
 *
 * Missing keys were already covered twice over: the catalogues are typed
 * against `ru`, so an absent translation will not compile, and a test compares
 * the key sets outright. Nothing looked the other way, and rewriting a page
 * leaves its old strings behind in two languages at once. A pass over this
 * found 181 of them, most of a MergeKeys editor and an XRay page that no
 * longer exist.
 *
 * Finding them means knowing how a key is spelled at the call site, and it is
 * spelled four ways here:
 *
 *   t("gen.zone.junk")                    written out
 *   t(`mk.mode.${m.id}.title`)            a template with a hole in it
 *   t("xg.group." + group)                a prefix and a variable
 *   { code: "awg.jc_range" }              a finding code, which the catalogue
 *                                         reads back under `find.`
 *
 * So a key counts as used when it appears whole, when some dotted tail of it
 * appears (the finding codes), when a template pattern matches it, or when a
 * concatenated prefix covers it. That last rule is deliberately generous: a
 * false "used" leaves one dead string behind, while a false "unused" deletes
 * a line someone is reading on the page.
 */

const SRC = resolve(__dirname, "../..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|vue)$/.test(p)) out.push(p);
  }
  return out;
}

/** Dotted tails: `find.awg.jc_range` also answers to `awg.jc_range`. */
function tails(key: string): string[] {
  const parts = key.split(".");
  const out = [key];
  for (let i = 1; i < parts.length - 1; i++) out.push(parts.slice(i).join("."));
  return out;
}

function collectUsage() {
  /*
   * Tests are not call sites.
   *
   * A key that only a test mentions is still a key the product never shows,
   * and scanning them let this file vouch for its own invented example.
   */
  const files = walk(SRC).filter(
    (p) =>
      !/i18n[\\/]locales[\\/](ru|en)\.ts$/.test(p) &&
      !/[\\/]__tests__[\\/]/.test(p),
  );

  let text = "";
  const patterns: RegExp[] = [];
  const prefixes = new Set<string>();

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    text += "\n" + src;

    for (const m of src.matchAll(/["'`]([a-z][\w.]*\.)["'`]\s*\+/gi)) {
      prefixes.add(m[1]!);
    }

    for (const m of src.matchAll(/`([a-z][\w.]*\$\{[^`]*)`/gi)) {
      /*
       * The holes come out before escaping. Escaping first turns `${` into
       * `\$\{` and the hole stops being findable, which is how this reported
       * a hundred keys that were in plain use.
       */
      const source = m[1]!
        .replace(/\$\{[^}]*\}/g, " ")
        .replace(/[.*+?^$()|[\]\\{}]/g, "\\$&")
        .split(" ")
        .join("[\\w.-]+");
      try {
        patterns.push(new RegExp(`^${source}$`));
      } catch {
        // A template we cannot turn into a pattern is one we do not judge on.
      }
    }
  }

  return { text, patterns, prefixes: [...prefixes] };
}

describe("the catalogue carries nothing nobody reads", () => {
  it("has a call site for every key", () => {
    const { text, patterns, prefixes } = collectUsage();

    const unused = Object.keys(ru).filter(
      (key) =>
        !tails(key).some((tail) => text.includes(tail)) &&
        !patterns.some((rx) => rx.test(key)) &&
        !prefixes.some((prefix) => key.startsWith(prefix)),
    );

    expect(unused, `${unused.length} keys nothing asks for`).toEqual([]);
  });

  it("still recognises each of the four spellings", () => {
    // Guards the finder itself. Every one of these was a real bug in it: the
    // template rule matched nothing at all until the escaping order was
    // fixed, and without the tail rule every finding code looked dead.
    const { text, patterns, prefixes } = collectUsage();
    const used = (key: string) =>
      tails(key).some((tail) => text.includes(tail)) ||
      patterns.some((rx) => rx.test(key)) ||
      prefixes.some((prefix) => key.startsWith(prefix));

    expect(used("gen.zone.junk"), "written out").toBe(true);
    expect(used("mk.mode.inspect.title"), "template").toBe(true);
    expect(used("xg.group.reality"), "concatenated prefix").toBe(true);
    expect(used("find.awg.jc_range"), "finding code").toBe(true);

    // And a key that genuinely is not there.
    expect(used("nav.no-such-key-anywhere"), "invented").toBe(false);
  });
});
