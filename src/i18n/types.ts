/**
 * AmneziaWG Architect — i18n types.
 *
 * Catalogs are *flat*: keys are dotted strings like `home.hero.title` rather
 * than nested objects. That keeps `keyof` exact and instant, so a typo is a
 * compile error and editors autocomplete every key without the recursive type
 * gymnastics a nested catalog needs.
 */

/**
 * Everything the app knows about one language.
 *
 * One descriptor rather than four parallel `Record<Locale, string>` tables:
 * adding a language is a single entry, and forgetting a facet is a compile
 * error instead of a page that renders with the wrong `lang` attribute.
 *
 * This is also where per-language processing belongs when a language needs it
 * — transliteration for anchors, a pronunciation or romanisation scheme, a
 * collator for sorting. Add the field to the interface, make it optional, and
 * the locales that do not need it stay as they are.
 */
export interface LocaleDescriptor {
  /**
   * URL prefix. The source locale stays at the site root so every existing
   * URL — and everything already indexed against it — keeps working.
   */
  prefix: string;
  /** The language's name, written in that language. */
  name: string;
  /** BCP 47 tag, for `<html lang>` and `hreflang`. */
  tag: string;
  /**
   * Writing direction, for `<html dir>`. Only worth setting for a language
   * that is not left-to-right; everything else defaults.
   */
  dir?: "ltr" | "rtl";
}

/**
 * Locales the UI ships, in menu order. `ru` is the source catalogue.
 *
 * `as const satisfies` rather than a plain annotation: the keys have to stay
 * literal for `Locale` to be derived from them, and `satisfies` still checks
 * each entry against the descriptor.
 */
const LOCALE_SOURCE = {
  ru: { prefix: "", name: "Русский", tag: "ru-RU" },
  en: { prefix: "/en", name: "English", tag: "en" },
} as const satisfies Record<string, LocaleDescriptor>;

export type Locale = keyof typeof LOCALE_SOURCE;

/**
 * The same object, typed as descriptors rather than as its own literals.
 *
 * Without this, `as const` narrows each entry to exactly the fields it was
 * written with, and reading an optional one — `dir` on a locale that does not
 * set it — is a compile error instead of `undefined`.
 */
export const LOCALE_META: Record<Locale, LocaleDescriptor> = LOCALE_SOURCE;

/** Menu order, which is the order the descriptors are declared in. */
export const LOCALES = Object.keys(LOCALE_META) as readonly Locale[];

// A literal, not `Locale`: `Localised<T>` requires exactly this key, and a
// union-typed constant would make every `content[DEFAULT_LOCALE]` possibly
// undefined even though the type guarantees it is there.
export const DEFAULT_LOCALE = "ru" satisfies Locale;

/** The descriptor for a locale. */
export function localeMeta(loc: Locale): LocaleDescriptor {
  return LOCALE_META[loc];
}

/**
 * Plural forms. Russian needs three (one/few/many), English two (one/other),
 * so `other` is the only required member and the rest are filled per locale.
 */
export interface PluralForms {
  one: string;
  few?: string;
  many?: string;
  other: string;
}

export type MessageValue = string | PluralForms;

/** Values substituted into `{placeholder}` slots. */
export type TranslateParams = Record<string, string | number> & {
  /** Drives plural selection when the message has forms. */
  n?: number;
};

/* ── Localised content ────────────────────────────────────────────────────── */

/**
 * A piece of content that exists in several languages.
 *
 * Only the source locale is required. Everything else is optional and falls
 * back, which is what makes adding a language cheap: the locale starts working
 * the moment it is declared, and translations land one at a time afterwards.
 *
 * This used to be a plain `Record<Locale, T>`, which meant the opposite —
 * declaring a third locale produced 187 compile errors across the FAQ, the
 * changelog and the support page, and nothing built until every last string
 * had been translated. Interface strings still use the strict catalogue,
 * where completeness is checked and worth enforcing; long-form content does
 * not, because a missing FAQ answer should show the Russian one rather than
 * stop the build.
 */
export type Localised<T> = { [DEFAULT_LOCALE]: T } & Partial<
  Record<Locale, T>
>;

/**
 * The value for a locale, falling back to the source language.
 *
 * Callers get a value, never `undefined`, so a partially translated catalogue
 * degrades to a readable page instead of a blank one.
 */
export function pick<T>(content: Localised<T>, loc: Locale): T {
  return (content[loc] ?? content[DEFAULT_LOCALE]) as T;
}

/** Which locales a piece of content has been translated into. */
export function translatedInto<T>(content: Localised<T>): Locale[] {
  return LOCALES.filter((loc) => content[loc] !== undefined);
}
