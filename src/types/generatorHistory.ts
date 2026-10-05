/**
 * What the history panel needs from an entry, whichever engine wrote it.
 *
 * The panel was typed against `AwgHistoryEntry` because there was one
 * generator. There are two now, and the choice was between duplicating a
 * six-hundred-line component and naming the small set of fields it actually
 * reads — which is this.
 *
 * Deliberately not the union of both engines' entries. An engine keeps its own
 * type with its own extra fields; this is the part the panel is allowed to
 * know about, and anything it does not name here it cannot depend on.
 */

import type { HistoryRecord } from "./history";

export interface GeneratorHistoryEntry extends HistoryRecord {
  /** Protocol or core version, shown as the entry's headline. */
  version: string;

  /**
   * Two free labels, in the order the panel shows them.
   *
   * AmneziaWG fills them with the entropy class and the mimicry profile; XRay
   * with the security and the transport. They are named for their position
   * rather than for either engine's meaning, because naming them `intensity`
   * and `profile` is how a component ends up knowing about one protocol.
   */
  label1: string;
  label2: string;

  /** The rendered config, which is what a copy puts on the clipboard. */
  text: string;

  /** Every parameter of the entry, for the expanded view. */
  params: Record<string, string | number>;

  /**
   * The config itself, when the entry has one.
   *
   * Optional because entries written by older builds do not, and dropping them
   * on upgrade would read as data loss however good the reason. The panel
   * offers "restore" when it is there and "copy" when it is not.
   */
  cfg?: unknown;
}
