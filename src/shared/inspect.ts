/**
 * One question, one answer: "what is wrong with this config?"
 *
 * Until now there were three ways to ask, depending on where the config came
 * from. A generated one went through `validate`. A pasted one went through
 * `parse`. A whole `.conf` file went through `healthCheck`, which had its own
 * `Finding` type carrying a hardcoded Russian sentence instead of a code — so
 * the same broken S4 was reported in three shapes, and only two of them could
 * be translated.
 *
 * `inspect` is the single door. It takes text, works out whether it can be
 * read at all, and reports everything found: structure, parse, and the
 * protocol's own rules. What comes back is always the same type, always
 * translatable, and always ordered the same way.
 */

import type { Finding } from "@/types/findings";
import { sortFindings } from "@/types/findings";
import type { Inspection } from "@/types/engine";

/**
 * The result type lives with the engine contract that returns it — `types/`
 * may not import from here, and a type declared in two places is two types.
 */
export type { Inspection };

/** What an engine supplies to be inspectable. */
export interface Inspectable<TConfig> {
  parse: (text: string) => {
    ok: boolean;
    config: TConfig | null;
    findings: Finding[];
  };
  validate: (config: TConfig) => Finding[];
  /**
   * Checks on the raw text, before or beside parsing: a missing section, a
   * key that is not base64, an endpoint with no port. Optional because not
   * every format has structure worth checking separately — XRay's JSON either
   * parses or does not.
   */
  audit?: (text: string) => Finding[];
}

/**
 * Read a config and say everything that is wrong with it.
 *
 * Structural findings come first because they explain the parse failures that
 * follow: "no [Interface] section" is the reason for "no PrivateKey", and
 * reporting them in the other order makes the user chase the symptom.
 */
export function inspect<TConfig>(
  engine: Inspectable<TConfig>,
  text: string,
): Inspection<TConfig> {
  const findings: Finding[] = engine.audit ? [...engine.audit(text)] : [];

  const parsed = engine.parse(text);
  findings.push(...parsed.findings);

  if (parsed.ok && parsed.config !== null) {
    findings.push(...engine.validate(parsed.config));
  }

  const sorted = sortFindings(findings);
  return {
    readable: parsed.ok,
    config: parsed.config,
    findings: sorted,
    ok: !sorted.some((f) => f.level === "error"),
  };
}

/**
 * Inspect a config object that is already in hand.
 *
 * The generator path: nothing to parse, but the same findings and the same
 * ordering, so a generated config and a pasted one are judged identically.
 */
export function inspectConfig<TConfig>(
  engine: Inspectable<TConfig>,
  config: TConfig,
): Inspection<TConfig> {
  const findings = sortFindings(engine.validate(config));
  return {
    readable: true,
    config,
    findings,
    ok: !findings.some((f) => f.level === "error"),
  };
}
