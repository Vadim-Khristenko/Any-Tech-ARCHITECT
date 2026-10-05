/**
 * Every engine the product carries.
 *
 * One place to ask "what can Architect generate", so a view never has to
 * import a specific engine to offer a choice between them.
 */

import type { AnyEngine } from "@/types/engine";
import { awgEngine } from "./awg";
import { xrayEngine } from "./xray";

/** Ordered as the UI offers them. */
export const ENGINES = [awgEngine, xrayEngine] as const;

export type EngineId = (typeof ENGINES)[number]["id"];

const BY_ID = new Map<string, AnyEngine>(
  ENGINES.map((e) => [e.id, e as unknown as AnyEngine]),
);

export function engineById(id: string): AnyEngine | undefined {
  return BY_ID.get(id);
}

/**
 * Which engine recognises this text.
 *
 * Used when a config is pasted without saying what it is. Order matters:
 * the first engine that claims it wins, so engines whose `detect` is cheap
 * and specific should come first.
 */
export function engineFor(text: string): AnyEngine | undefined {
  return ENGINES.find((e) => e.detect?.(text)) as AnyEngine | undefined;
}

export { awgEngine, xrayEngine };
