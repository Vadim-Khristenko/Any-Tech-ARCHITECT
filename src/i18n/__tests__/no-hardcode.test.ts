/**
 * No interface text outside the catalogue.
 *
 * The app grew three parallel localisation systems before anyone noticed:
 * inline `{ ru, en }` pairs picked apart with `isRu ?`, Russian sentences
 * thrown from engines two layers below anything that knows the reader's
 * language, and plural helpers that branched on `locale === "ru"` and gave
 * every other language the English rule. Each was individually reasonable and
 * collectively meant the English site showed Russian.
 *
 * They are gone. This is what keeps them gone: a Cyrillic string literal in
 * the source is either interface text that skipped the catalogue, or one of
 * the handful of cases below where Russian *is* the data.
 */

import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Places where Russian text is the subject rather than the message.
 *
 * `data/` and `i18n/` hold the translations themselves. The rest are named
 * one by one, so adding to this list is a decision somebody makes rather than
 * a directory quietly filling up.
 */
const CONTENT = [
  join("src", "data"),
  join("src", "i18n"),
  "__tests__",
];

/**
 * Literals that are Russian on purpose, with the reason.
 *
 * `ё`/`е` fold one Russian letter into another so the FAQ search matches
 * either spelling — that is the language's own rule, and moving it into a
 * catalogue would be moving a fact about Russian into a translation of it.
 */
const ALLOWED = new Set(["ё", "е"]);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (CONTENT.some((skip) => path.includes(skip))) continue;

    if (statSync(path).isDirectory()) {
      out.push(...sourceFiles(path));
    } else if (/\.(ts|vue)$/.test(entry)) {
      out.push(path);
    }
  }
  return out;
}

/** Cyrillic inside a quoted string, ignoring comments. */
function hardcoded(source: string): string[] {
  const withoutComments = source
    // Block comments, including the long explanatory ones this codebase likes.
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  const found: string[] = [];
  const literal = /(["'`])((?:[^\\\n]|\\.)*?)\1/g;
  for (const match of withoutComments.matchAll(literal)) {
    const text = match[2]!;
    if (!/[а-яА-ЯёЁ]/.test(text)) continue;
    if (ALLOWED.has(text)) continue;
    found.push(text);
  }
  return found;
}

/**
 * Cyrillic written straight into the markup, as text rather than as a string.
 *
 * A separate pass because the first one only sees quoted strings, and the
 * commonest way to hard-code a sentence in a Vue file is not to quote it at
 * all — `<div>Профиль нестабилен.</div>`. Four of those survived the sweep
 * that was supposed to have finished this, and the test passed anyway.
 */
function hardcodedInTemplate(source: string): string[] {
  const start = source.indexOf("<template>");
  const end = source.lastIndexOf("</template>");
  if (start < 0 || end < 0) return [];

  const markup = source
    .slice(start + "<template>".length, end)
    // Interpolations are expressions, and their strings are covered above.
    .replace(/\{\{[\s\S]*?\}\}/g, "")
    // Attribute values likewise: `:label="t('…')"` and `placeholder="…"` are
    // both quoted, so the literal pass already reads them.
    .replace(/=\s*"[^"]*"/g, "")
    .replace(/=\s*'[^']*'/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  return markup
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /[а-яА-ЯёЁ]/.test(line));
}

describe("interface text lives in the catalogue", () => {
  it("has no Russian string literals in the source", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles("src")) {
      for (const text of hardcoded(readFileSync(file, "utf8"))) {
        offenders.push(`${file}: ${text.slice(0, 70)}`);
      }
    }

    expect(offenders, "move these into src/i18n/locales").toEqual([]);
  });

  it("has no Russian written straight into the markup", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles("src").filter((f) => f.endsWith(".vue"))) {
      for (const line of hardcodedInTemplate(readFileSync(file, "utf8"))) {
        offenders.push(`${file}: ${line.slice(0, 70)}`);
      }
    }

    expect(offenders, "move these into src/i18n/locales").toEqual([]);
  });

  it("looks in enough places to be worth trusting", () => {
    // A scanner that quietly matched nothing would pass this suite forever.
    const files = sourceFiles("src");
    expect(files.length).toBeGreaterThan(40);
    expect(files.some((f) => f.endsWith(".vue"))).toBe(true);
  });

  it("catches what it is meant to catch", () => {
    expect(hardcoded(`const label = "Мусорные пакеты";`)).toEqual([
      "Мусорные пакеты",
    ]);
    // Prose about the code is not text shown by it.
    expect(hardcoded(`// Мусорные пакеты идут перед рукопожатием.`)).toEqual([]);
    expect(hardcoded(`/** Комментарий. */`)).toEqual([]);
    expect(hardcoded(`const fold = "ё";`)).toEqual([]);
  });
});
