/**
 * The arithmetic behind every protocol's simulation.
 *
 * The type vocabulary lives in `types/simulation`, where the engine contract
 * can carry it; what is here is the part that would otherwise be written once
 * per engine — summing packets against a kind table, estimating a transfer,
 * indexing kinds for lookup. No engine sums its own bytes.
 */

import type {
  PacketKind,
  PacketKindTable,
  SimPacket,
  SimResult,
  SimTotals,
} from "@/types/simulation";

export type {
  Endpoint,
  ExtraField,
  PacketKind,
  PacketKindTable,
  PacketWeight,
  SimPacket,
  SimResult,
  SimTotals,
  Simulator,
} from "@/types/simulation";

/* ── Deriving the summary ─────────────────────────────────────────────────── */

/** Upstream used for the duration estimate. */
const REFERENCE_MBPS = 10;

/**
 * Add up a run of packets against a kind table.
 *
 * A packet whose kind is not in the table counts toward the total and toward
 * overhead: an unknown kind is a bug in the engine, and quietly dropping its
 * bytes would make the numbers look better than the traffic is.
 */
export function summarise(
  packets: readonly SimPacket<unknown>[],
  kinds: PacketKindTable,
): SimTotals {
  const byKind: Record<string, number> = {};
  let totalBytes = 0;
  let payloadBytes = 0;

  for (const packet of packets) {
    totalBytes += packet.size;
    byKind[packet.kind] = (byKind[packet.kind] ?? 0) + packet.size;
    if (kinds[packet.kind]?.weight === "payload") payloadBytes += packet.size;
  }

  const overheadBytes = totalBytes - payloadBytes;
  return {
    totalBytes,
    payloadBytes,
    overheadBytes,
    byKind,
    overheadShare: totalBytes === 0 ? 0 : overheadBytes / totalBytes,
  };
}

/** Seconds to send `bytes` at the reference upstream, to the millisecond. */
export function estimateSeconds(
  bytes: number,
  mbps: number = REFERENCE_MBPS,
): number {
  return Number(((bytes * 8) / (mbps * 1_000_000)).toFixed(3));
}

/** Build a result from packets alone, so no engine sums its own bytes. */
export function toResult<Extra>(
  packets: SimPacket<Extra>[],
  kinds: PacketKindTable,
): SimResult<Extra> {
  const totals = summarise(packets, kinds);
  return {
    packets,
    totals,
    estSeconds10mbps: estimateSeconds(totals.totalBytes),
  };
}

/** Index a list of kinds by id, preserving the list as the legend order. */
export function kindTable(kinds: readonly PacketKind[]): {
  table: PacketKindTable;
  legend: readonly string[];
} {
  const table: Record<string, PacketKind> = {};
  for (const kind of kinds) table[kind.id] = kind;
  return { table, legend: kinds.map((k) => k.id) };
}
