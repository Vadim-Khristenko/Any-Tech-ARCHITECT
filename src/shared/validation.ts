/**
 * Checking a configuration, once, for every protocol.
 *
 * Validation had grown four homes: `generator/validators.ts` for generated
 * AmneziaWG configs, `awgValidate.ts` for a loose field map, `healthCheck.ts`
 * for a whole `.conf` file, and `xray/validate.ts` for XRay — with *two*
 * incompatible `Finding` types between them, one carrying a translation code
 * and one carrying a Russian sentence. The same rule was written more than
 * once and the same mistake was reported differently depending on which door
 * the config came in through.
 *
 * What is actually protocol-specific is the rules. Everything around them —
 * how a rule is expressed, how bounds are checked against a descriptor, how
 * findings are collected and ordered — is not, so it lives here.
 */

import type { Finding, FindingValues } from "@/types/findings";
import { error, warn, info } from "./findings";
import type { ParamDescriptor, ParamSet } from "@/types/protocol";
import { readParam } from "./params";

/* ── Rules ────────────────────────────────────────────────────────────────── */

/**
 * One check.
 *
 * A rule returns findings rather than throwing, and returning none is a
 * result: "nothing to report" and "never ran" must not look the same, which
 * is why a validator is a list of rules rather than a single function that
 * might have exited early.
 */
export interface Rule<T> {
  /** Identifies the rule in tests and in coverage reports. */
  id: string;
  check: (config: T, context: RuleContext) => Finding[] | Finding | null;
}

/** What a rule is allowed to know beyond the config itself. */
export interface RuleContext {
  /** Parameters the config's version understands. */
  params: ParamSet;
  /** Whatever the engine wants to pass down — client limits, MTU. */
  options: Readonly<Record<string, unknown>>;
}

/** Build a rule, purely for the inference. */
export function rule<T>(
  id: string,
  check: Rule<T>["check"],
): Rule<T> {
  return { id, check };
}

/* ── Running them ─────────────────────────────────────────────────────────── */

export interface ValidateOptions {
  params?: ParamSet;
  options?: Record<string, unknown>;
}

/**
 * Run every rule and collect what they found.
 *
 * Every rule runs even after one has reported an error: a config with two
 * problems should say so, rather than making the user fix one and come back.
 * A rule that throws is itself reported, because a validator that crashes
 * silently is worse than one that finds nothing.
 */
export function runRules<T>(
  rules: readonly Rule<T>[],
  config: T,
  options: ValidateOptions = {},
): Finding[] {
  const context: RuleContext = {
    params: options.params ?? [],
    options: options.options ?? {},
  };

  const found: Finding[] = [];
  for (const r of rules) {
    try {
      const result = r.check(config, context);
      if (!result) continue;
      if (Array.isArray(result)) found.push(...result);
      else found.push(result);
    } catch (cause) {
      found.push(
        error("validator", "validator.crashed", {
          rule: r.id,
          reason: cause instanceof Error ? cause.message : String(cause),
        }),
      );
    }
  }
  return found;
}

/* ── Checks driven by a parameter descriptor ──────────────────────────────── */

/** Parse "lo-hi", or a bare number as a range of one. */
export function parseRangeValue(
  value: unknown,
): [number, number] | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? [value, value] : null;
  }
  if (typeof value !== "string") return null;

  const text = value.trim();
  if (!text) return null;

  const match = /^(\d+)\s*-\s*(\d+)$/.exec(text);
  if (match) {
    const lo = Number(match[1]);
    const hi = Number(match[2]);
    return Number.isFinite(lo) && Number.isFinite(hi) ? [lo, hi] : null;
  }

  const single = Number(text);
  return Number.isFinite(single) ? [single, single] : null;
}

/** Decoded byte length of base64url or hex, or null when it does not decode. */
export function decodedLength(
  value: string,
  encoding: "base64url" | "hex",
): number | null {
  if (encoding === "hex") {
    if (value.length % 2 !== 0) return null;
    return /^[0-9a-fA-F]*$/.test(value) ? value.length / 2 : null;
  }
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null;
  // RawURL base64: no padding, so the length follows from the character count.
  const remainder = value.length % 4;
  if (remainder === 1) return null;
  return Math.floor((value.length * 3) / 4);
}

/**
 * Check one value against what its descriptor says about it.
 *
 * This is the part that used to be retyped per parameter — "S4 must be at
 * most 32", "shortId must be at most 16 hex characters" — and therefore the
 * part most likely to disagree with the catalogue it was supposed to follow.
 */
export function checkAgainstDescriptor(
  param: ParamDescriptor,
  value: unknown,
): Finding[] {
  if (value === undefined || value === null || value === "") return [];

  const found: Finding[] = [];
  const bounds = param.bounds;
  const values: FindingValues = { key: param.key };

  switch (param.kind) {
    case "int":
    case "header": {
      const n = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(n)) {
        found.push(error(param.key, "param.not_a_number", values));
        break;
      }
      found.push(...checkBounds(param, n, n));
      break;
    }

    case "range":
    case "duration": {
      const range = parseRangeValue(value);
      if (!range) {
        found.push(error(param.key, "param.not_a_range", values));
        break;
      }
      const [lo, hi] = range;
      if (lo > hi) {
        found.push(
          error(param.key, "param.range_inverted", { ...values, lo, hi }),
        );
      }
      found.push(...checkBounds(param, lo, hi));
      break;
    }

    case "key":
    case "hex": {
      const text = String(value);
      const encoding = param.kind === "hex" ? "hex" : "base64url";
      const length = decodedLength(text, encoding);
      if (length === null) {
        found.push(error(param.key, "param.not_encoded", { ...values, encoding }));
        break;
      }
      if (bounds?.byteLength !== undefined && length !== bounds.byteLength) {
        found.push(
          error(param.key, "param.wrong_length", {
            ...values,
            expected: bounds.byteLength,
            actual: length,
          }),
        );
      }
      if (bounds?.max !== undefined && text.length > bounds.max) {
        found.push(
          error(param.key, "param.too_long", {
            ...values,
            max: bounds.max,
            actual: text.length,
          }),
        );
      }
      break;
    }

    case "enum": {
      const text = String(value);
      if (bounds?.oneOf && !bounds.oneOf.includes(text)) {
        found.push(
          error(param.key, "param.not_allowed", {
            ...values,
            value: text,
            allowed: bounds.oneOf.join(", "),
          }),
        );
      }
      break;
    }

    // `chain`, `text` and `flag` have no shape a descriptor can check on its
    // own — a CPS chain needs the tag grammar, and free text needs context.
    // Their rules stay with the engine that understands them.
    default:
      break;
  }

  return found;
}

function checkBounds(
  param: ParamDescriptor,
  lo: number,
  hi: number,
): Finding[] {
  const bounds = param.bounds;
  if (!bounds) return [];

  const found: Finding[] = [];
  if (bounds.min !== undefined && lo < bounds.min) {
    found.push(
      error(param.key, "param.below_min", {
        key: param.key,
        min: bounds.min,
        actual: lo,
      }),
    );
  }
  if (bounds.max !== undefined && hi > bounds.max) {
    found.push(
      error(param.key, "param.above_max", {
        key: param.key,
        max: bounds.max,
        actual: hi,
      }),
    );
  }
  return found;
}

/**
 * Check every parameter of a set against a config.
 *
 * A parameter with no value is skipped rather than reported: the set says what
 * a version *understands*, not what it requires, and the engine's own rules
 * are where "this one is mandatory" belongs.
 */
export function checkParams<T>(params: ParamSet, config: T): Finding[] {
  const found: Finding[] = [];
  for (const param of params) {
    found.push(...checkAgainstDescriptor(param, readParam(config, param.field)));
  }
  return found;
}

/** A rule that checks the whole parameter set. Every engine wants this one. */
export function descriptorRule<T>(): Rule<T> {
  return rule("params.descriptor", (config, context) =>
    checkParams(context.params, config),
  );
}

export { error, warn, info };
