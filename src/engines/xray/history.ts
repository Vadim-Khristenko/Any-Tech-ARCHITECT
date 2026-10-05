/**
 * What XRay remembers about a generation.
 *
 * The same shape the panel reads for AmneziaWG, filled with what means
 * something here: the core version as the headline, the security and the
 * transport as the two labels. Those two are what anyone would say out loud to
 * describe one of these — "reality over raw", "reality over xhttp" — which is
 * exactly what a search over the history should match.
 *
 * Stored under its own key, so the two engines' histories never mix: a config
 * restored into the wrong generator is worse than one that was never saved.
 */

import type { GeneratorHistoryEntry } from "@/types/generatorHistory";
import type { XrayConfig } from "./types";

export interface XrayHistoryEntry extends GeneratorHistoryEntry {
  /** The security in play — `reality`, `tls`, `none`. */
  label1: string;
  /** The transport — `raw`, `xhttp`, `grpc`… */
  label2: string;

  /**
   * The generated config, so an entry can be restored rather than only
   * copied. Optional for the same reason it is on AmneziaWG: entries written
   * before configs were stored still deserve to be listed.
   */
  cfg?: XrayConfig;
}
