/**
 * Checking a whole `.conf` — structure and obfuscation together.
 *
 * This used to be 210 lines with a `Finding` type of its own, carrying a
 * hardcoded Russian sentence instead of a code. Every rule in it now lives
 * somewhere it is shared: the structural checks in `audit.ts`, the parameter
 * checks in `rules.ts`, and the client limits in the same rule set the
 * generator uses. Three copies of "S4 is capped at 32" became one.
 *
 * What is left is the composition, kept as a named function because "check
 * this whole file" is a real thing to ask for and reads better than three
 * calls at the call site.
 */

import { parseConf, getField } from "./awgFormat";
import { auditConf } from "./audit";
import { checkAwgParams, type AwgParamInput } from "./rules";
import { clientCaps, DEFAULT_CLIENT_ID } from "./generator/clients";
import { warn } from "@/shared/findings";
import type { Finding } from "@/types/findings";

export type { Finding, FindingLevel } from "@/types/findings";

/** Fields that make a config an AmneziaWG config rather than a WireGuard one. */
const AWG_FIELDS = [
  "Jc",
  "Jmin",
  "Jmax",
  "S1",
  "S2",
  "S3",
  "S4",
  "H1",
  "H2",
  "H3",
  "H4",
  "I1",
  "I2",
  "I3",
  "I4",
  "I5",
  // Not obfuscation itself, but the S-padding floor in `rules.ts` applies
  // only when the key is present — without it a small S reads as clean.
  "HeaderProtectionKey",
] as const;

/**
 * Run a health check on a wg-quick / AmneziaWG `.conf`.
 *
 * @param confText  the raw `.conf` text
 * @param clientId  target client from the compatibility matrix
 * @param release   a specific older build of that client, when the user has one
 */
export function healthCheckConf(
  confText: string,
  clientId?: string,
  release?: string | null,
): Finding[] {
  const found: Finding[] = [...auditConf(confText)];

  let parsed: ReturnType<typeof parseConf>;
  try {
    parsed = parseConf(confText);
  } catch {
    // auditConf has already reported it; there is nothing further to read.
    return found;
  }

  const params: AwgParamInput = {};
  for (const key of AWG_FIELDS) {
    const value = getField(parsed, key);
    if (value !== null) params[key] = value;
  }

  if (Object.keys(params).length === 0) {
    // Worth saying out loud: a plain WireGuard config is not broken, it just
    // is not the thing this page is for.
    found.push(warn("AWG", "awg.conf.not_obfuscated"));
    return found;
  }

  const client = clientCaps(clientId ?? DEFAULT_CLIENT_ID, release);
  found.push(
    ...checkAwgParams(params, {
      client: { name: client.name, ...client.limits },
    }),
  );

  return found;
}
