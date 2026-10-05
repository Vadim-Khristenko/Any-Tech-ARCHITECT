/**
 * What a config actually contains, read off the catalogue.
 *
 * Two places needed this and each worked it out for itself: the parameter card
 * on the generator page and the entry written into the history. Both branched
 * on `extraSizes` / `rangedHeaders` / `cps` / `headerProtection`, both listed
 * the same fields by hand, and both had to be edited whenever a version gained
 * a parameter. They had already drifted — the card showed the 3.0 timers, the
 * history entry showed them only when set, and neither was wrong so much as
 * separately maintained.
 *
 * The catalogue already knows all of it. `paramsFor(version)` resolves the
 * version shape — H1 switching from a single value to a range at 2.0, S3 and
 * S4 appearing at 2.0, the CPS chain at 1.5, the 3.0 block at 3.0 — and each
 * entry carries the field to read and the block it belongs to. So this walks
 * that, and the two callers stop deciding anything.
 */

import { readParam } from "@/shared/params";
import { paramsFor, type AWGParamGroup } from "./params";
import type { AWGConfig } from "./types";

/** One parameter of a config, with its value. */
export interface AWGParamValue {
  /** As the clients spell it: `Jc`, `S1`, `HeaderProtectionKey`. */
  key: string;
  value: string | number;
  group: AWGParamGroup;
}

/** The parameters of one block, in catalogue order. */
export interface AWGParamBlock {
  group: AWGParamGroup;
  items: readonly AWGParamValue[];
}

/**
 * Is this worth showing?
 *
 * Zero is a value — `xver 0`, `Jc 0` — but an empty string is a parameter the
 * generator declined to produce, and the 3.0 timers are only present when the
 * user asked for randomised ones. Showing them blank would suggest the config
 * carries something it does not.
 */
function present(value: unknown): value is string | number {
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Every parameter a config carries, in the order a config is written.
 *
 * The version comes off the config rather than off whatever the user has
 * selected: the two disagree for one tick while a regeneration is in flight,
 * and that tick was enough to render a 3.0 config with 1.x headers.
 */
export function awgParamValues(cfg: AWGConfig): readonly AWGParamValue[] {
  const out: AWGParamValue[] = [];

  for (const param of paramsFor(cfg.version)) {
    const value = readParam(cfg, param.field);
    if (!present(value)) continue;
    out.push({ key: param.key, value, group: param.group });
  }

  return out;
}

/** The same, gathered into blocks. Empty blocks are left out. */
export function awgParamBlocks(cfg: AWGConfig): readonly AWGParamBlock[] {
  const blocks = new Map<AWGParamGroup, AWGParamValue[]>();

  for (const item of awgParamValues(cfg)) {
    const block = blocks.get(item.group);
    if (block) block.push(item);
    else blocks.set(item.group, [item]);
  }

  return [...blocks].map(([group, items]) => ({ group, items }));
}

/** Flattened to `key → value`, which is what a history entry stores. */
export function awgParamRecord(cfg: AWGConfig): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const { key, value } of awgParamValues(cfg)) out[key] = value;
  return out;
}
