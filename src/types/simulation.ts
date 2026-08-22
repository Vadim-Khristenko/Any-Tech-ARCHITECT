/**
 * What a protocol's traffic looks like on the wire, described once.
 *
 * The packet simulator started as an AmneziaWG feature and its types said so:
 * a `PacketKind` union of AWG's six message types, a totals object with
 * `handshakeBytes` in it, and colours hard-coded in a switch. None of that is
 * about AmneziaWG in particular — every protocol worth simulating has kinds of
 * packet, some of which carry payload and some of which are the cost of
 * hiding it.
 *
 * The vocabulary lives here because the engine contract carries a simulator,
 * and the type layer may not reach into `shared`. The arithmetic that works
 * on these shapes stays in `shared/simulation`; each engine supplies its own
 * kinds and packets. Adding XRay — or anything after it — is a table of kinds
 * and a function that produces packets, not a second copy of the model.
 */

/** Which side sent, or is receiving, a packet. */
export type Endpoint = "client" | "server";

/**
 * Whether a kind of packet is the point of the connection or the price of it.
 *
 * Totals are derived from this rather than from a list of kind names, so an
 * engine that adds a kind gets it counted without touching the summary code.
 */
export type PacketWeight = "payload" | "overhead";

/**
 * One kind of packet a protocol can emit.
 *
 * `id` is free-form because the set differs per protocol: AmneziaWG has
 * `init`/`response`/`cookie`, XRay has a TLS handshake and application data.
 * The engine's kind table is the authority on what ids exist.
 */
export interface PacketKind {
  id: string;
  /** Short name for the legend and the packet list. */
  label: string;
  /** Colour for timelines and badges. A CSS colour, not a token name. */
  accent: string;
  /** Translation key for the one-line legend entry. */
  descriptionKey: string;
  weight: PacketWeight;
}

/** A kind table, indexed for lookup. */
export type PacketKindTable = Readonly<Record<string, PacketKind>>;

/**
 * One simulated packet.
 *
 * `extra` is where a protocol puts what only it has — AmneziaWG's header
 * protection flags, XRay's transport frame type — without every other
 * protocol's packets carrying fields that are always undefined.
 */
export interface SimPacket<Extra = unknown> {
  id: number;
  /** Step order as shown to the user, e.g. "1", "2a", "2b". */
  step: string;
  /** An id from the engine's kind table. */
  kind: string;
  label: string;
  from: Endpoint;
  to: Endpoint;
  /** Bytes on the wire, including whatever the protocol prefixes. */
  size: number;
  /** Bytes of payload inside `size`. */
  payload: number;
  /** Localised one-line description. */
  description: string;
  extra?: Extra;
}

/** What the packets add up to. */
export interface SimTotals {
  totalBytes: number;
  /** Bytes of packets whose kind is `payload`. */
  payloadBytes: number;
  /** Everything else: padding, junk, handshake, framing. */
  overheadBytes: number;
  /** Per-kind byte counts, keyed by kind id. */
  byKind: Readonly<Record<string, number>>;
  /**
   * Overhead as a share of the total, 0–1.
   *
   * Reported rather than left to each caller: "how much of this is not my
   * data" is the question the simulator exists to answer, and a view that
   * computes it itself will eventually compute it differently.
   */
  overheadShare: number;
}

export interface SimResult<Extra = unknown> {
  packets: SimPacket<Extra>[];
  totals: SimTotals;
  /** Seconds to put `totalBytes` on a 10 Mbit/s upstream. */
  estSeconds10mbps: number;
}

/** One engine-specific row in the packet detail panel. */
export interface ExtraField {
  label: string;
  value: string;
}

/**
 * A protocol's simulator, as the shell sees it.
 *
 * The two optional members keep engine-specific presentation out of the shell:
 * `notes` says what this particular config puts on the wire before any packet
 * is drawn, and `describeExtra` turns a packet's private fields into rows the
 * detail panel can print without knowing they exist.
 */
export interface Simulator<Config, Extra = unknown> {
  /** Every kind this simulator can produce. */
  kinds: PacketKindTable;
  /** Kind ids in the order they should appear in a legend. */
  legend: readonly string[];
  simulate(config: Config): SimResult<Extra>;

  /**
   * Localised one-liners about this config's traffic, shown above the run.
   *
   * Protocol facts only — what the version drops, which parts are encrypted.
   * Facts about the client behind the config belong to whoever chose the
   * client, not here.
   */
  notes?(config: Config): readonly string[];

  /** Rows for whatever only this protocol's packets carry. */
  describeExtra?(extra: Extra): readonly ExtraField[];
}
