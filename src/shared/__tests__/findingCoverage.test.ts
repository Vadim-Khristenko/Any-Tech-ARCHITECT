import { describe, it, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import ru from "@/i18n/locales/ru";
import en from "@/i18n/locales/en";

/**
 * Every finding a rule can produce has to resolve to a sentence, in every
 * language.
 *
 * A finding carries a code and its values; the sentence comes from the
 * catalogue at read time. That only works if the code is actually in the
 * catalogue — and when it is not, the reader gets the bare code, which looks
 * like a crash and says nothing. Findings used to carry a ready-made Russian
 * string precisely to avoid that, at the cost of being untranslatable.
 *
 * This reads the source rather than the runtime because a rule only fires on
 * the input that triggers it, and the point is to cover the ones nobody
 * thought to write a test for.
 */

const SRC = path.resolve(__dirname, "../..");

/** Files that emit findings. Anything calling error()/warn()/info(). */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "locales") continue;
      sourceFiles(full, out);
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".vue")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Drop comments before scanning.
 *
 * Documentation shows what a call looks like — `error("S4", "awg.s4_too_big",
 * …)` — and a scanner that counts those demands a catalogue entry for an
 * example nobody emits.
 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * Codes written as a literal in an error/warn/info call.
 *
 * A code built at runtime cannot be found this way; the one place that does
 * it is the legacy fallback in the AmneziaWG engine, which is why that one is
 * allowed below.
 */
function literalCodes(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const call = /\b(?:error|warn|info)\(\s*[^,]+,\s*"([a-z][a-zA-Z0-9_.]*)"/g;

  for (const file of sourceFiles(SRC)) {
    const text = stripComments(fs.readFileSync(file, "utf8"));
    for (const match of text.matchAll(call)) {
      const code = match[1]!;
      const where = path.relative(SRC, file).replace(/\\/g, "/");
      found.set(code, [...(found.get(code) ?? []), where]);
    }
  }
  return found;
}

const codes = literalCodes();

describe("finding codes", () => {
  it("finds the rules at all", () => {
    // A regex that matched nothing would make every assertion below vacuous.
    expect(codes.size).toBeGreaterThan(30);
  });

  it("has a Russian sentence for every code", () => {
    const missing: string[] = [];
    for (const [code, where] of codes) {
      if (!(`find.${code}` in ru)) missing.push(`${code} (${where.join(", ")})`);
    }
    expect(missing).toEqual([]);
  });

  it("has an English sentence for every code", () => {
    const missing: string[] = [];
    for (const [code, where] of codes) {
      if (!(`find.${code}` in en)) missing.push(`${code} (${where.join(", ")})`);
    }
    expect(missing).toEqual([]);
  });

  it("fills every placeholder the Russian text asks for from the English one", () => {
    // The two languages must take the same values, or one of them renders a
    // literal {mtu} to somebody.
    const mismatched: string[] = [];
    for (const code of codes.keys()) {
      const key = `find.${code}` as keyof typeof ru;
      const ruText = String(ru[key] ?? "");
      const enText = String((en as Record<string, unknown>)[key] ?? "");
      const slots = (text: string) =>
        [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
      if (slots(ruText) !== slots(enText)) {
        mismatched.push(`${code}: ru(${slots(ruText)}) en(${slots(enText)})`);
      }
    }
    expect(mismatched).toEqual([]);
  });
});
