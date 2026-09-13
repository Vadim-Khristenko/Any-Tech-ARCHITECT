/**
 * AmneziaWG parameter validation — now a thin adapter.
 *
 * The rules moved to `rules.ts`, where they are shared with the generator's
 * validators instead of being a second copy that drifted: this file used to
 * cap S1 at 1132 and S3 at 1132 while the other capped S3 differently, and
 * both spelled the same finding in different words.
 *
 * What is left here is the entry point the config editor calls, kept because
 * a flat field map is a genuinely different input from a generated config —
 * the editor has whatever the user has typed so far, not a config object.
 */

import { checkAwgParams, type AwgParamInput, type AwgRuleOptions } from "./rules";
import type { Finding } from "@/types/findings";

export type { AwgParamInput } from "./rules";
export type { Finding, FindingLevel } from "@/types/findings";

/**
 * Validate AmneziaWG obfuscation parameters.
 *
 * @param p    field map; missing fields are skipped rather than reported
 * @param opts.mtu  interface MTU for the Jmax fragmentation check
 * @param opts.client  target client, when the editor knows it — carries the
 *   managed-key flag the S floor warning reads
 */
export function validateAwgParams(
  p: AwgParamInput,
  opts: { mtu?: number; client?: AwgRuleOptions["client"] } = {},
): Finding[] {
  return checkAwgParams(p, { mtu: opts.mtu, client: opts.client });
}
