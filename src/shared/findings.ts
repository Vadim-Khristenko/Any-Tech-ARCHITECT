/**
 * Building findings, and turning them into text.
 *
 * A finding is data — a code plus the values that go in the sentence — and the
 * sentence is produced here, from the i18n catalogue, in whatever language the
 * reader is using. Findings used to carry a hardcoded Russian string instead,
 * so an English reader saw Russian and the `code` field the UI could have
 * translated went unused.
 *
 * Messages live in the ordinary catalogue under `find.*` rather than in a
 * registry of their own. That is deliberate: a second translation mechanism
 * would sit outside the compile-time key checking, the placeholder tests and
 * the plural handling that the catalogue already gets. One mechanism, not two.
 */

import { translate, type MessageKey } from "@/i18n";
import {
  sortFindings,
  type Finding,
  type FindingLevel,
  type FindingValues,
} from "@/types/findings";

export { sortFindings, hasErrors } from "@/types/findings";
export type { Finding, FindingLevel, FindingValues } from "@/types/findings";

/** Catalogue key for a finding code. */
function keyFor(code: string): string {
  return `find.${code}`;
}

/**
 * Make a finding.
 *
 * Curried by level so a validator reads as a list of rules rather than a list
 * of object literals: `error("S4", "awg.s4_too_big", { max: 32 })`.
 */
function make(level: FindingLevel) {
  return (
    field: string,
    code: string,
    values?: FindingValues,
    line?: number,
  ): Finding => ({ field, level, code, values, line });
}

/** The config will not work. */
export const error = make("error");
/** It works, but something about it is a bad idea. */
export const warn = make("warn");
/** Worth knowing, nothing to fix. */
export const info = make("info");

/**
 * The finding as a sentence.
 *
 * Falls back to the bare code when a message is missing. That is on purpose:
 * a visible `find.awg.s4_too_big` in the UI is a bug report, whereas an empty
 * string or a swallowed finding is a rule that silently stopped being
 * reported.
 */
export function resolveFinding(finding: Finding): string {
  const key = keyFor(finding.code);
  const text = translate(key as MessageKey, finding.values);
  if (text !== key) return text;
  // No catalogue entry: fall back to the sentence a not-yet-ported validator
  // supplied, and only then to the bare code.
  return finding.msg ?? finding.code;
}

/** Every finding as text, worst first. */
export function describeFindings(findings: readonly Finding[]): string[] {
  return sortFindings(findings).map(resolveFinding);
}

/**
 * Split by level, for a UI that shows errors and warnings differently.
 * Levels with nothing in them are absent rather than empty, so a caller can
 * ask `if (grouped.error)` without checking a length.
 */
export function groupFindings(
  findings: readonly Finding[],
): Partial<Record<FindingLevel, Finding[]>> {
  const out: Partial<Record<FindingLevel, Finding[]>> = {};
  for (const f of sortFindings(findings)) {
    (out[f.level] ??= []).push(f);
  }
  return out;
}

/**
 * Findings for one parameter, for a form that badges a field.
 * Matching is case-insensitive because config keys are written both ways in
 * the wild — `shortId` and `shortid` name the same thing.
 */
export function findingsForField(
  findings: readonly Finding[],
  field: string,
): Finding[] {
  const want = field.toLowerCase();
  return sortFindings(findings.filter((f) => f.field.toLowerCase() === want));
}
