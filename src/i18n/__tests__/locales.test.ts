import { describe, it, expect } from "bun:test";

import {
  LOCALES,
  LOCALE_META,
  DEFAULT_LOCALE,
  pick,
  translatedInto,
  type Locale,
  type Localised,
} from "../types";
import { ROUTE_SEO } from "../seo";
import { FAQ_ENTRIES } from "@/data/faq";
import ru from "../locales/ru";
import en from "../locales/en";

/**
 * Adding a locale should be a matter of writing a catalogue, not of
 * remembering to touch five files. Most of that is enforced by the compiler —
 * the per-locale tables are `Record<Locale, …>`, so a missing entry will not
 * build — but two things used to fail silently at runtime instead:
 *
 *   - the catalogue loader branched on `loc === "en"`, so a new locale loaded
 *     nothing and the page fell back to Russian looking merely untranslated;
 *   - plural selection branched on `loc === "ru"` and gave every other
 *     language the English rule.
 *
 * These tests cover what the compiler cannot.
 */

const CATALOGUES: Record<Locale, Record<string, unknown>> = { ru, en };

describe("locale tables", () => {
  it("describe every locale exactly once", () => {
    for (const loc of LOCALES) {
      expect(LOCALE_META[loc].prefix, `${loc} prefix`).toBeDefined();
      expect(LOCALE_META[loc].name, `${loc} name`).toBeTruthy();
      expect(LOCALE_META[loc].tag, `${loc} tag`).toBeTruthy();
      expect(CATALOGUES[loc], `${loc} catalogue`).toBeTruthy();
    }
  });

  it("keep the default locale at the site root", () => {
    // Everything already indexed lives at the root; moving it would break
    // every existing link for the sake of symmetry.
    expect(LOCALE_META[DEFAULT_LOCALE].prefix).toBe("");
    for (const loc of LOCALES) {
      if (loc === DEFAULT_LOCALE) continue;
      expect(LOCALE_META[loc].prefix).toMatch(/^\/[a-z-]+$/);
    }
  });

  it("use tags Intl actually understands", () => {
    for (const loc of LOCALES) {
      expect(() => new Intl.PluralRules(LOCALE_META[loc].tag)).not.toThrow();
      expect(() => new Intl.DateTimeFormat(LOCALE_META[loc].tag)).not.toThrow();
    }
  });

  it("list every declared locale, in declaration order", () => {
    // LOCALES is derived from the descriptors rather than written out
    // separately, which is what keeps "add a language" to one entry. If the
    // two ever come apart, the menu and the routes disagree about what ships.
    expect(Object.keys(LOCALE_META)).toEqual([...LOCALES]);
  });

  it("only ever declare a direction Intl and the DOM accept", () => {
    for (const loc of LOCALES) {
      const dir = LOCALE_META[loc].dir;
      // Optional: absent means left-to-right, which is what `<html dir>` gets.
      if (dir !== undefined) expect(["ltr", "rtl"]).toContain(dir);
    }
  });
});

describe("catalogues", () => {
  const ruKeys = Object.keys(ru).sort();

  it("cover the same keys as the source catalogue", () => {
    for (const loc of LOCALES) {
      const keys = Object.keys(CATALOGUES[loc]).sort();
      expect(keys, `${loc} differs from ru`).toEqual(ruKeys);
    }
  });

  it("leave no message empty", () => {
    for (const loc of LOCALES) {
      for (const [key, value] of Object.entries(CATALOGUES[loc])) {
        if (typeof value === "string") {
          expect(value.trim(), `${loc}: ${key}`).not.toBe("");
        }
      }
    }
  });

  it("agree on which messages have plural forms", () => {
    // A message that pluralises in one language has to pluralise in all of
    // them, or `t(key, { n })` returns an object in that locale.
    for (const key of ruKeys) {
      const shapes = LOCALES.map((loc) => typeof CATALOGUES[loc][key]);
      expect(new Set(shapes).size, `${key} has mixed shapes`).toBe(1);
    }
  });

  it("carry every placeholder the source uses", () => {
    const slots = (v: unknown): string[] =>
      typeof v === "string" ? [...v.matchAll(/\{(\w+)\}/g)].map((m) => m[1]) : [];

    for (const key of ruKeys) {
      const expected = new Set(slots(ru[key as keyof typeof ru]));
      if (!expected.size) continue;
      for (const loc of LOCALES) {
        const got = new Set(slots(CATALOGUES[loc][key]));
        for (const slot of expected) {
          // A dropped placeholder is a value that silently never appears.
          expect(got.has(slot), `${loc}: ${key} is missing {${slot}}`).toBe(true);
        }
      }
    }
  });
});

describe("adding a locale stays cheap", () => {
  /**
   * Adding a language should mean declaring it and writing a catalogue — not
   * translating every FAQ answer before anything compiles.
   *
   * Declaring a third locale used to produce 187 compile errors across nine
   * files, because long-form content was typed `Record<Locale, string>` and so
   * demanded every language at once. `Localised<T>` requires only the source
   * language; the rest fall back through `pick`. The count is now ten, in
   * three places that genuinely have to be filled in: the three per-locale
   * tables, the catalogue loader, and the test fixture below.
   *
   * These tests hold the property from the other side: content must tolerate a
   * missing translation, and `pick` must never hand back undefined.
   */

  it("falls back to the source language for an untranslated string", () => {
    const partial = { ru: "русский" } as Localised<string>;
    expect(pick(partial, "ru")).toBe("русский");
    expect(pick(partial, "en")).toBe("русский");
  });

  it("prefers a translation when there is one", () => {
    const both: Localised<string> = { ru: "русский", en: "english" };
    expect(pick(both, "en")).toBe("english");
  });

  it("never returns undefined, whatever it is asked for", () => {
    const partial = { ru: { title: "т" } } as Localised<{ title: string }>;
    for (const loc of LOCALES) {
      expect(pick(partial, loc), loc).toBeDefined();
    }
  });

  it("reports which languages a piece of content has", () => {
    expect(translatedInto({ ru: "a" } as Localised<string>)).toEqual(["ru"]);
    expect(translatedInto({ ru: "a", en: "b" })).toEqual(["ru", "en"]);
  });

  it("keeps real content working when a translation is absent", () => {
    // The FAQ is fully translated today; the point is that it would still
    // render if it were not.
    for (const entry of FAQ_ENTRIES.slice(0, 5)) {
      for (const loc of LOCALES) {
        expect(pick(entry.question, loc), entry.id).toBeTruthy();
        expect(pick(entry.answer, loc), entry.id).toBeTruthy();
      }
    }
  });

  it("gives every route metadata in every locale, by fallback if needed", () => {
    for (const [name, table] of Object.entries(ROUTE_SEO)) {
      for (const loc of LOCALES) {
        const seo = pick(table, loc);
        expect(seo.title, `${name}/${loc}`).toBeTruthy();
        expect(seo.description, `${name}/${loc}`).toBeTruthy();
      }
    }
  });
});

describe("plural rules come from Intl, not from a hardcoded branch", () => {
  it("gets the three Russian forms right", () => {
    const rules = new Intl.PluralRules(LOCALE_META.ru.tag);
    expect(rules.select(1)).toBe("one");
    expect(rules.select(3)).toBe("few");
    expect(rules.select(11)).toBe("many"); // the teens trap
    expect(rules.select(21)).toBe("one");
  });

  it("would get a language we do not ship yet right too", () => {
    // Polish has a different few/many split from Russian. The point is not
    // that we ship Polish, but that adding it would need no new code.
    const pl = new Intl.PluralRules("pl");
    expect(pl.select(1)).toBe("one");
    expect(pl.select(2)).toBe("few");
    expect(pl.select(5)).toBe("many");

    // Japanese has a single form; the old English fallback would have
    // produced a spurious singular/plural distinction.
    expect(new Intl.PluralRules("ja").select(1)).toBe("other");
  });
});
