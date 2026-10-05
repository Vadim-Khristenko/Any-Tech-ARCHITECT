/**
 * The seam between the shell and a protocol engine.
 *
 * Architect is one product with more than one generator behind it: AmneziaWG
 * today, XRay/REALITY next. Those two share nothing at the parameter level —
 * REALITY has no counterpart to Jc or S1–S4, and AmneziaWG has no transport
 * selection — so this contract deliberately does *not* describe parameters.
 * It describes what the shell does with them.
 *
 * The contract runs in both directions on purpose. Generating a config is only
 * half of what the product is for; the other half is taking a config somebody
 * else wrote and saying what is wrong with it. That means every engine owes a
 * `parse` as well as a `render`, and the two are held together by a round-trip
 * law: parsing what an engine rendered must give the config back.
 *
 * Anything an engine keeps private stays private. `defineEngine` fills in the
 * optional halves so a new engine starts from working defaults instead of a
 * blank checklist.
 */

import type { Component } from "vue";
import { sortFindings } from "./findings";
import type { Finding } from "./findings";
import type { Simulator } from "./simulation";

export type { Finding, FindingLevel } from "./findings";

/* ── Versions ─────────────────────────────────────────────────────────────── */

/** What a protocol version supports. Shape mirrors generator/versions.ts. */
export interface EngineVersion {
  /** Value used in configs and URLs — "3.0", "24.11.11". */
  id: string;
  /** Shown on the version tab. Not translated: protocols spell themselves. */
  label: string;
  /** Marks the newest entry so the tab can flag it. */
  isNewest?: boolean;
  /**
   * The engine still emits and parses this version but does not stand behind
   * it. The tab says so rather than hiding the option — a config in the wild
   * does not stop existing because we stopped recommending it.
   */
  isLegacy?: boolean;
}

/* ── Findings ─────────────────────────────────────────────────────────────── */


/**
 * A finding, defined in `types/findings`.
 *
 * The alias stays because the engine contract has always spelled it this way
 * and plenty of code says `EngineFinding`. There is one type, not two: a
 * finding carries a code and its values, and the sentence is produced from
 * the catalogue at read time.
 */
export type EngineFinding = Finding;

/* ── Rendering ────────────────────────────────────────────────────────────── */

/** A rendered config line, so preview and plain text come from one source. */
export interface EngineLine {
  key: string;
  value: string;
  type: "comment" | "kv" | "section";
}

/**
 * Localised strings the renderer needs. Engines take these as an argument
 * rather than importing the catalogue, which is what lets rendering run in a
 * worker and in tests where no i18n runtime exists.
 */
export type EngineLabels = Record<string, string>;

/* ── Parsing ──────────────────────────────────────────────────────────────── */

/**
 * The result of reading somebody else's config.
 *
 * Findings come back on both paths. A config can be understood and still be
 * wrong, which is the interesting case: that is where the engine earns its
 * keep by naming the rule the author broke.
 */
export type ParseResult<T> =
  | { ok: true; config: T; findings: EngineFinding[] }
  | { ok: false; config: null; findings: EngineFinding[] };

/** Formats an engine can read. Not every engine supports every one. */
export type ConfigFormat = "text" | "uri" | "json";

/**
 * Everything an engine can say about one piece of text.
 *
 * `config` is present whenever the text could be understood, *including* when
 * the findings contain errors — a config that parses and then breaks a rule is
 * the interesting case, and dropping it would leave the caller with complaints
 * about something it cannot show.
 */
export interface Inspection<TConfig> {
  /** Did the text parse into a config at all? */
  readable: boolean;
  config: TConfig | null;
  findings: EngineFinding[];
  /** True when nothing at `error` level was found. */
  ok: boolean;
}

/* ── The contract ─────────────────────────────────────────────────────────── */

/**
 * A protocol generator and validator.
 *
 * `TInput` is the engine's own settings object and `TConfig` its own output.
 * The shell only ever hands them back where it got them, so it never needs to
 * know their shape.
 */
export interface Engine<TInput = unknown, TConfig = unknown> {
  /** Stable key: "awg", "xray". Used in storage keys and route paths. */
  id: string;
  /** Product-facing name, e.g. "AmneziaWG". */
  label: string;
  /** Route this engine lives at, without a locale prefix: "/amnezia". */
  route: string;
  /** Tab icon, resolved by the view. */
  icon?: Component;

  /** Supported versions, newest first. */
  versions: readonly EngineVersion[];

  /** Formats `parse` accepts, in the order detection should try them. */
  formats: readonly ConfigFormat[];

  /* — create — */

  /** Settings a fresh visitor starts from. */
  createDefaults(): TInput;

  /** Produce a config. */
  generate(input: TInput): TConfig;

  /* — encode — */

  /**
   * Render to the protocol's own config format.
   *
   * `options` carries what only some renders want — an endpoint to name in a
   * [Peer] section, a preview flag — as loose string flags rather than a
   * per-engine type, so the shell can hand a form field through without
   * knowing the protocol. An engine that has no use for a flag ignores it;
   * one that silently drops a flag the form did send is how the "whatever I
   * type never shows up in the file" bugs are born.
   */
  render(
    config: TConfig,
    labels?: EngineLabels,
    options?: Readonly<Record<string, string>>,
  ): EngineLine[];

  /** Share link, where the protocol has one: `vpn://`, `vless://`. */
  toUri?(config: TConfig): string | null;

  /** Payload for clients that import structured data rather than text. */
  toClientPayload?(config: TConfig): unknown | null;

  /* — decode — */

  /**
   * Read a config somebody else wrote.
   *
   * Must accept anything `render` produced. Beyond that it should be
   * forgiving about whitespace, comments and key case, because the input is
   * hand-written far more often than it is generated.
   */
  parse(text: string): ParseResult<TConfig>;

  /** True when this engine recognises the text at all. Used to route input. */
  detect?(text: string): boolean;

  /* — check — */

  /**
   * Check a config against rules taken from the protocol implementation.
   * An empty array means nothing to report, not "unchecked".
   */
  validate(config: TConfig): EngineFinding[];

  /**
   * Structural checks on the raw text, beside parsing.
   *
   * A missing section, a key that is not base64, an endpoint with no port —
   * problems with the *file* rather than with the protocol. Optional because
   * not every format has structure worth checking separately: XRay JSON
   * either parses or it does not.
   */
  audit?(text: string): EngineFinding[];

  /**
   * Everything the engine can say about one piece of text, in one call.
   *
   * Filled in by `defineEngine` from `audit`, `parse` and `validate`, so an
   * engine gets it for free and the shell has one door instead of three. It
   * used to be three: generated configs went through `validate`, pasted ones
   * through `parse`, and whole files through a health checker with a finding
   * type of its own.
   */
  inspect(text: string): Inspection<TConfig>;

  /**
   * The protocol's packet simulator, where its wire shape is worth showing.
   *
   * Lives on the engine rather than beside the shell's simulator page because
   * the page is generic — it reads kinds, legend and packets off this object
   * and cannot tell AmneziaWG from XRay. An engine without one simply has no
   * button leading there.
   */
  simulator?: Simulator<TConfig, unknown>;
}

/** Convenience for the registry, where parameter types differ per entry. */
export type AnyEngine = Engine<never, never>;

/* ── Helpers shared by every engine ───────────────────────────────────────── */

/**
 * Rendered lines as the plain text a user copies.
 *
 * A `kv` line joins its key and value with ` = `, which is what a wg-quick
 * config looks like. An engine whose format is not key-value — XRay renders
 * JSON — leaves `key` empty and puts the whole line in `value`, and gets it
 * back untouched. The key is still carried for highlighting either way.
 */
export function linesToText(lines: EngineLine[]): string {
  return lines
    .map((l) => (l.type === "kv" && l.key ? `${l.key} = ${l.value}` : l.value))
    .join("\n");
}

/**
 * A failed parse carrying one explanation.
 *
 * `values` are the ones the message interpolates — "expected vless, got
 * {protocol}". A finding has always carried them; this signature did not, so
 * the XRay parser kept a private copy of this function that did.
 */
export function parseFailed<T>(
  field: string,
  code: string,
  values?: Record<string, string | number>,
  line?: number,
): ParseResult<T> {
  return {
    ok: false,
    config: null,
    findings: [{ field, level: "error", code, values, line }],
  };
}

// Ordering lives with the finding type itself, not beside the contract that
// happens to use it.
export { sortFindings } from "./findings";

/**
 * Build an engine, filling in the parts that have a sensible default.
 *
 * Written as a factory rather than a base class because the engines are plain
 * data with functions attached — there is no state to inherit, and a class
 * would only add a `this` to get wrong inside a worker.
 */
export function defineEngine<TInput, TConfig>(
  spec: Omit<Engine<TInput, TConfig>, "inspect"> &
    Partial<Pick<Engine<TInput, TConfig>, "inspect">>,
): Engine<TInput, TConfig> {
  const built: Engine<TInput, TConfig> = {
    ...spec,

    // One door for "what is wrong with this text", built from the three
    // halves the engine already owes. An engine may still override it.
    inspect: spec.inspect ?? ((text: string) => inspectWith(built, text)),

    // Validation output is sorted for everyone, so no engine has to remember.
    validate: (config) => sortFindings(spec.validate(config)),

    // Parsing usually wants the same ordering, and a parse that reports
    // nothing at all is indistinguishable from one that was never run.
    parse: (text) => {
      const result = spec.parse(text);
      return { ...result, findings: sortFindings(result.findings) };
    },

    // Recognising a config is normally "can I parse it", and an engine only
    // needs its own detect when that is too expensive or too eager.
    detect: spec.detect ?? ((text) => spec.parse(text).ok),
  };

  return built;
}


/**
 * Compose an engine's three halves into one answer.
 *
 * Structural findings come first because they explain the parse failures that
 * follow: "no [Interface] section" is the reason for "no PrivateKey", and the
 * other order makes the reader chase a symptom.
 */
function inspectWith<TInput, TConfig>(
  engine: Engine<TInput, TConfig>,
  text: string,
): Inspection<TConfig> {
  const findings: EngineFinding[] = engine.audit ? [...engine.audit(text)] : [];

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

