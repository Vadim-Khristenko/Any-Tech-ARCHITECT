/**
 * The vocabulary every protocol in Architect is described with.
 *
 * AmneziaWG and XRay have nothing in common at the level of individual
 * parameters — there is no REALITY counterpart to Jc, and no AmneziaWG
 * counterpart to a transport. What they do share is the set of *questions*
 * worth asking about a parameter: what shape is its value, which version
 * introduced it, and who needs to know it.
 *
 * That last question is the one this file exists for. It is not a naming
 * convention, it is a property of the protocol, and getting it wrong is what
 * makes a tunnel fail with no error at all:
 *
 *   - AmneziaWG: `device/receive.go` identifies an incoming packet using the
 *     receiver's *own* S and H values, so those must match on both ends.
 *     Junk packets and the I chain are only ever sent, never parsed.
 *   - XRay: `infra/conf/transport_security.go` rejects a client config that
 *     carries `serverNames`, and the REALITY keys must pair up — while the
 *     XHTTP padding knobs are applied by whoever sends.
 *
 * Same three classes, two unrelated protocols. That is why it is here and not
 * in either engine.
 */

/** Engines currently in the product. */
export type ProtocolId = "awg" | "xray";

/* ── Scope ────────────────────────────────────────────────────────────────── */

/**
 * Who has to know a parameter's value.
 *
 * `shared` is the expensive one to get wrong: a mismatch means the receiving
 * side does not recognise the packet and drops it without an error, so the
 * symptom is silence rather than a message. Everything that claims this scope
 * should cite where in the protocol implementation the claim comes from.
 */
export type ParamScope =
  /** Both ends must carry the identical value. */
  | "shared"
  /** Applied by whoever sends; the other end neither knows nor cares. */
  | "sender"
  /** Local policy. No agreement needed, though extremes cause churn. */
  | "local";

/** Human-facing ordering: the ones that break a tunnel come first. */
export const SCOPE_ORDER: readonly ParamScope[] = ["shared", "sender", "local"];

/* ── Value shapes ─────────────────────────────────────────────────────────── */

/**
 * What kind of value a parameter takes.
 *
 * This drives three things at once — the input control, the validator, and the
 * renderer — so it describes the *shape*, never the protocol meaning. A
 * base64 key is a `key` whether it protects AmneziaWG headers or authenticates
 * REALITY.
 */
export type ParamKind =
  /** A plain count or size. */
  | "int"
  /** Two integers written "lo-hi". */
  | "range"
  /** One large integer used as a magic value. */
  | "header"
  /** Base64 or hex key material. */
  | "key"
  /** Hex string of bounded length: REALITY's shortId. */
  | "hex"
  /** A sequence of tags and blobs: AmneziaWG's I chain. */
  | "chain"
  /** A duration or attempt count, possibly a range. */
  | "duration"
  /** A value chosen from a fixed list: flow, fingerprint, transport. */
  | "enum"
  /** Free text: a domain, a path. */
  | "text"
  /** On or off. */
  | "flag";

/* ── Versions ─────────────────────────────────────────────────────────────── */

/**
 * A protocol version the product supports.
 *
 * `id` is whatever the protocol calls itself — "3.0" for AmneziaWG, a CalVer
 * string like "24.11.11" for XRay — and is used in configs, storage and URLs,
 * so it is never reformatted for display.
 */
export interface VersionDescriptor {
  id: string;
  /** Shown on a tab. Not translated: protocols spell themselves the same way. */
  label: string;
  /** The newest entry, flagged in the UI. Exactly one per protocol. */
  isNewest?: boolean;
  /**
   * Still emitted and parsed, but no longer stood behind. Shown with a note
   * rather than hidden — a config in the wild does not stop existing because
   * we stopped recommending its version.
   */
  isLegacy?: boolean;
  /**
   * The floor: versions below this are not supported and the UI says so
   * instead of pretending. Set on the oldest entry a protocol offers.
   */
  isFloor?: boolean;
}

/* ── Parameters ───────────────────────────────────────────────────────────── */

/** Bounds the protocol itself imposes, as opposed to advice. */
export interface ParamBounds {
  min?: number;
  max?: number;
  /** Length in bytes after decoding, for `key` and `hex`. */
  byteLength?: number;
  /** Allowed values, for `enum`. */
  oneOf?: readonly string[];
}

/**
 * One parameter of one protocol, described independently of any config.
 *
 * `field` is kept separate from `key` because the two genuinely differ: an
 * AmneziaWG H1 is stored in `h1` when it is a range and `h1s` when it is a
 * single value, while the wire name stays "H1" either way.
 */
export interface ParamDescriptor {
  /** As written in the config file: "Jc", "shortId", "xPaddingBytes". */
  key: string;
  kind: ParamKind;
  scope: ParamScope;
  /** First protocol version that understands it. */
  since: string;
  /** Path to the value on the engine's config object. */
  field: string;
  bounds?: ParamBounds;
  /**
   * Where the constraint comes from — a file and symbol in the protocol
   * implementation. Required in practice for anything marked `shared`, so a
   * later reader can check the claim instead of trusting it.
   */
  source?: string;
  /**
   * Catalogue key for why the parameter exists, shown in tooltips and the
   * field guide.
   *
   * A key rather than the prose. These held Russian sentences, which is
   * interface text sitting in an engine — and the XRay page being built next
   * would have started life with sixty of them hard-coded in it.
   */
  note?: string;
  /** Set when the protocol accepts an older spelling as well. */
  aliases?: readonly string[];
}

/** A parameter set: what one version of one protocol understands. */
export type ParamSet<P extends ParamDescriptor = ParamDescriptor> = readonly P[];
