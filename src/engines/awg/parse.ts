/**
 * Reading an AmneziaWG config that somebody else wrote.
 *
 * The generator has always been able to produce a `.conf`; nothing could read
 * one back. That is the half the product was missing — a config in the wild is
 * exactly where a wrong parameter costs someone a tunnel, and it is the case
 * where naming the broken rule is worth the most.
 *
 * Two things are deliberately not guessed. The mimicry profile leaves no trace
 * in the output, so a parsed config reports `random` rather than inventing a
 * provenance it cannot know. And the version is inferred from the shape of the
 * parameters rather than trusted from a comment, because the comment is the
 * first thing a person edits by hand.
 */

import { parseConf, type ParsedConf } from "@/engines/awg/awgFormat";
import { capsFor, AWG_VERSIONS } from "@/engines/awg/generator/versions";
import type {
  AWGConfig,
  AWGVersion,
  AWG3Params,
} from "@/engines/awg/generator/types";
import type { EngineFinding, ParseResult } from "@/types/engine";
import { parseFailed } from "@/types/engine";
import { error, warn } from "@/shared/findings";

/**
 * Case-insensitive lookup across every section.
 *
 * Line numbers are recovered by scanning the original text rather than added
 * to `ConfEntry`, so `awgFormat` stays exactly as it was — everything that
 * already depends on it keeps working untouched.
 */
function lookup(conf: ParsedConf, raw: string[], key: string) {
  const want = key.toLowerCase();
  for (const section of conf.sections) {
    for (const entry of section.entries) {
      if (entry.key.toLowerCase() !== want) continue;
      const at = raw.findIndex((l) => {
        const eq = l.indexOf("=");
        return eq > 0 && l.slice(0, eq).trim().toLowerCase() === want;
      });
      return { value: entry.value.trim(), line: at >= 0 ? at + 1 : undefined };
    }
  }
  return null;
}

const RANGE = /^\d+\s*-\s*\d+$/;

/**
 * Which version the parameters describe.
 *
 * Ranged headers arrived with 2.0, the 3.x block with 3.0, and the I chain
 * with 1.5. Anything with none of those is 1.0. The 3.1 switches name their
 * own version: a 3.0 device refuses those keys at parse, so their presence
 * is proof of 3.1. A 3.1 config with both switches off reads as 3.0, which
 * is honest — on the wire the two are identical.
 *
 * This intentionally ignores the `# AmneziaWG x.y` comment the generator
 * writes: it is the easiest part of the file to edit and the hardest to
 * notice being wrong.
 */
function inferVersion(conf: ParsedConf, raw: string[]): AWGVersion {
  if (lookup(conf, raw, "RandomTrailers") || lookup(conf, raw, "DisableCookies")) {
    return "3.1";
  }
  if (lookup(conf, raw, "HeaderProtectionKey") || lookup(conf, raw, "ContentPaddingAddition")) {
    return "3.0";
  }
  const h1 = lookup(conf, raw, "H1");
  if (h1 && RANGE.test(h1.value)) return "2.0";
  if (lookup(conf, raw, "I1")) return "1.5";
  return "1.0";
}

function num(
  conf: ParsedConf,
  raw: string[],
  key: string,
  findings: EngineFinding[],
  required: boolean,
): number {
  const hit = lookup(conf, raw, key);
  if (!hit) {
    if (required) {
      findings.push(error(key, "parse.missing", { key }));
    }
    return 0;
  }
  const value = Number(hit.value);
  if (!Number.isFinite(value) || value < 0) {
    findings.push(
      error(key, "parse.not_a_number", { key, value: hit.value }, hit.line),
    );
    return 0;
  }
  return value;
}

function text(conf: ParsedConf, raw: string[], key: string): string {
  return lookup(conf, raw, key)?.value ?? "";
}

/** What `parse_bool` in amneziawg-tools accepts, and then some. */
const TRUTHY = /^(true|yes|on|1)$/i;

function flag(conf: ParsedConf, raw: string[], key: string): boolean {
  const hit = lookup(conf, raw, key);
  return !!hit && TRUTHY.test(hit.value);
}

/** Read the 3.x block. Absent fields mean the feature is off, not broken. */
function readAwg3(conf: ParsedConf, raw: string[]): AWG3Params {
  return {
    headerProtectionKey: text(conf, raw, "HeaderProtectionKey"),
    contentPaddingAddition: text(conf, raw, "ContentPaddingAddition"),
    rekeyAfterTime: text(conf, raw, "RekeyAfterTime"),
    rekeyTimeout: text(conf, raw, "RekeyTimeout"),
    rejectAfterTime: text(conf, raw, "RejectAfterTime"),
    keepaliveTimeout: text(conf, raw, "KeepaliveTimeout"),
    maxHandshakeAttempts: text(conf, raw, "MaxHandshakeAttempts"),
    randomTrailers: flag(conf, raw, "RandomTrailers"),
    disableCookies: flag(conf, raw, "DisableCookies"),
  };
}

/**
 * Turn `.conf` text into a config the validators can check.
 *
 * Structural problems fail the parse; rule violations do not. A config that
 * reads fine and is wrong is the whole reason this exists, so it comes back
 * `ok: true` with findings attached and goes on to `validate`.
 */
export function parseAwgConf(input: string): ParseResult<AWGConfig> {
  const source = input.trim();
  if (!source) {
    return parseFailed("config", "parse.empty");
  }

  // Kept beside the parsed form purely so a finding can name a line number.
  const raw = source.split(/\r?\n/);
  const conf = parseConf(source);
  const hasAny = conf.sections.some((s) => s.entries.length > 0);
  if (!hasAny) {
    return parseFailed("config", "parse.not_awg");
  }

  // Jc is the one parameter every version carries, so its absence is the
  // cheapest way to tell an AmneziaWG config from a plain WireGuard one.
  if (!lookup(conf, raw, "Jc")) {
    return parseFailed("Jc", "parse.plain_wireguard");
  }

  const findings: EngineFinding[] = [];
  const version = inferVersion(conf, raw);
  const caps = capsFor(version);

  const config: AWGConfig = {
    version,
    // The mimicry profile leaves no trace in the rendered file; saying
    // "random" is honest, guessing a profile would not be.
    profile: "random",

    h1: caps.rangedHeaders ? text(conf, raw, "H1") : "",
    h2: caps.rangedHeaders ? text(conf, raw, "H2") : "",
    h3: caps.rangedHeaders ? text(conf, raw, "H3") : "",
    h4: caps.rangedHeaders ? text(conf, raw, "H4") : "",

    h1s: caps.rangedHeaders ? 0 : num(conf, raw, "H1", findings, true),
    h2s: caps.rangedHeaders ? 0 : num(conf, raw, "H2", findings, true),
    h3s: caps.rangedHeaders ? 0 : num(conf, raw, "H3", findings, true),
    h4s: caps.rangedHeaders ? 0 : num(conf, raw, "H4", findings, true),

    s1: num(conf, raw, "S1", findings, true),
    s2: num(conf, raw, "S2", findings, true),
    s3: caps.extraSizes ? num(conf, raw, "S3", findings, true) : 0,
    s4: caps.extraSizes ? num(conf, raw, "S4", findings, true) : 0,

    jc: num(conf, raw, "Jc", findings, true),
    jmin: num(conf, raw, "Jmin", findings, true),
    jmax: num(conf, raw, "Jmax", findings, true),

    i1: caps.cps ? text(conf, raw, "I1") : "",
    i2: caps.cps ? text(conf, raw, "I2") : "",
    i3: caps.cps ? text(conf, raw, "I3") : "",
    i4: caps.cps ? text(conf, raw, "I4") : "",
    i5: caps.cps ? text(conf, raw, "I5") : "",

    ...(caps.headerProtection ? { awg3: readAwg3(conf, raw) } : {}),
  };

  // Ranged headers must actually be ranges; a single number here means the
  // file claims 2.0+ in one place and 1.x in another.
  if (caps.rangedHeaders) {
    for (const key of ["H1", "H2", "H3", "H4"] as const) {
      const hit = lookup(conf, raw, key);
      if (!hit) {
        findings.push(error(key, "parse.missing", { key }));
      } else if (!RANGE.test(hit.value)) {
        findings.push(
          error(key, "parse.not_a_range", { key, version }, hit.line),
        );
      }
    }
  }

  // Parameters the version has no use for are reported rather than dropped:
  // a leftover S3 in a 1.5 config usually means someone downgraded by hand.
  for (const [key, supported] of [
    ["S3", caps.extraSizes],
    ["S4", caps.extraSizes],
    ["I1", caps.cps],
    ["HeaderProtectionKey", caps.headerProtection],
    ["ContentPaddingAddition", caps.headerProtection],
  ] as const) {
    const hit = lookup(conf, raw, key);
    if (hit && !supported) {
      findings.push(
        warn(key, "parse.unsupported_for_version", { key, version }, hit.line),
      );
    }
  }

  const known = AWG_VERSIONS.some((v) => v.id === version);
  if (!known) {
    findings.push(warn("version", "parse.unknown_version", { version }));
  }

  return { ok: true, config, findings };
}
