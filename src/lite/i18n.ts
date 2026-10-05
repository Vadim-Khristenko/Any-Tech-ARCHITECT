/**
 * The lite build's stand-in for `@/i18n`.
 *
 * The full module is reactive (Vue refs, lazily loaded catalogues) and carries
 * every page's text. The lite page re-renders by hand and shows findings,
 * client notes and `.conf` comments only, so this is a plain lookup over the
 * subset `scripts/lite/prepare.ts` extracts, plus the page's own strings.
 * `findings.ts` imports `translate` from `@/i18n`; `vite.lite.config.ts`
 * sends that import here.
 */

import { STRINGS } from "./generated/strings";
import { UI } from "./strings";

export type LiteLocale = "ru" | "en";
export type MessageKey = string;
type Params = Record<string, string | number>;

let current: LiteLocale = "ru";

export function getLocale(): LiteLocale {
  return current;
}

export function setLocale(loc: LiteLocale): void {
  current = loc;
  if (typeof document !== "undefined") document.documentElement.lang = loc;
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

/** One catalogue value as text; plural forms fall back to `other`. */
function asText(value: unknown, params?: Params): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const forms = value as Record<string, string>;
    const n = Number(params?.n ?? 0);
    const category = new Intl.PluralRules(current).select(n);
    return forms[category] ?? forms.other ?? forms.many ?? forms.one;
  }
  return undefined;
}

/**
 * Translate a key from the extracted catalogue or the page's own strings,
 * Russian as the fallback, the key itself when neither has it.
 */
export function translate(key: MessageKey, params?: Params): string {
  const tables = [
    STRINGS[current] as Record<string, unknown>,
    UI[current] as Record<string, unknown>,
    STRINGS.ru as Record<string, unknown>,
    UI.ru as Record<string, unknown>,
  ];
  for (const table of tables) {
    const text = asText(table[key], params);
    if (text !== undefined) return interpolate(text, params);
  }
  return key;
}
