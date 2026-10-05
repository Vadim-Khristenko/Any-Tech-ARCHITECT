/**
 * What AmneziaWG remembers about a generation.
 *
 * The shape lived inside the generator view, which was fine while there was
 * one protocol and one page. `useHistory` is deliberately ignorant of it — it
 * fixes only `id` and `timestamp`, so XRay can keep a history of a completely
 * different shape under its own key — and that is exactly why the shape has to
 * be stated somewhere the panel and the page can both read.
 */

import type { GeneratorHistoryEntry } from "@/types/generatorHistory";
import type { AWGConfig } from "./generator";

export interface AwgHistoryEntry extends GeneratorHistoryEntry {
  /** The entropy class, shown in the panel's first label slot. */
  label1: string;
  /** The mimicry profile, shown in the second. */
  label2: string;
  /**
   * The full config, so an entry can be restored rather than only copied.
   *
   * Optional because entries persisted by older builds lack it, and dropping
   * them on upgrade would read as data loss however good the reason.
   */
  cfg?: AWGConfig;
}
