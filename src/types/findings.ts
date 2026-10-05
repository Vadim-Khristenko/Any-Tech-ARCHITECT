/**
 * What an engine reports about a config.
 *
 * A finding is the product's actual output as much as the config text is:
 * generating parameters is easy, and saying which rule a config breaks is the
 * part that saves someone an evening. So a finding is data, not a sentence —
 * it carries a code and the values that go in the message, and the message is
 * produced later, in whatever language the reader is using.
 *
 * That split is new. Findings used to carry a hardcoded Russian string, which
 * meant an English reader saw Russian, and the `code` field the UI could have
 * translated was never used.
 */

/** How much the reader should care. */
export type FindingLevel =
  /** The config will not work. */
  | "error"
  /** The config works but something about it is a bad idea. */
  | "warn"
  /** Worth knowing, nothing to fix. */
  | "info";

/** Errors first, then warnings, then notes. */
export const LEVEL_ORDER: Record<FindingLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
};

/** Values interpolated into a finding's message. */
export type FindingValues = Record<string, string | number>;

/**
 * One thing worth telling the reader.
 *
 * `msg` is intentionally absent: a finding does not know what language it will
 * be read in. Use `resolveFinding` from `shared/findings` to get text.
 */
export interface Finding {
  /** Parameter the finding is about: "S1", "shortId", "flow". */
  field: string;
  level: FindingLevel;
  /** Identifies the rule that fired, and selects the message. */
  code: string;
  /** Interpolated into the message: bounds, actual values, version numbers. */
  values?: FindingValues;
  /**
   * 1-indexed line in the text a config was parsed from, so the UI can point
   * at the offending line rather than describe where it is. Only set when the
   * finding came from parsing.
   */
  line?: number;
  /**
   * Ready-made text, from a validator not yet moved onto codes.
   *
   * Transitional. `resolveFinding` prefers the catalogue and falls back to
   * this, so the older AmneziaWG validators keep producing exactly what they
   * always did while they are ported one at a time. New findings should carry
   * a code and leave this unset.
   *
   * @deprecated Use `code` and add the text to the catalogue.
   */
  msg?: string;
}

/** Sort in place-safe fashion: worst first, original order kept within a level. */
export function sortFindings<T extends { level: FindingLevel }>(
  findings: readonly T[],
): T[] {
  return [...findings].sort(
    (a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level],
  );
}

/** True when anything here would stop the config from working. */
export function hasErrors(findings: readonly Finding[]): boolean {
  return findings.some((f) => f.level === "error");
}
