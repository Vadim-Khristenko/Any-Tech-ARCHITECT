/**
 * What every remembered thing has, whatever produced it.
 *
 * Here rather than beside the composable that stores them. An engine has to
 * describe its own history entry — AmneziaWG's carries a config, XRay's will
 * carry something else — and an engine importing from `composables` is the
 * layering the architecture test exists to prevent: `types` sits below
 * everything, `composables` above the engines.
 */

export interface HistoryRecord {
  id: number;
  /** Unix milliseconds. */
  timestamp: number;
  /**
   * Kept regardless of age.
   *
   * The cap exists to stop the list growing without bound, not to decide what
   * matters — so anything the user says matters is outside it.
   */
  pinned?: boolean;
  /** The user's own words about this entry. */
  note?: string;
  /**
   * What this entry *is*, for spotting a repeat.
   *
   * Supplied by the engine, because only the engine knows which of its fields
   * make one config the same as another.
   */
  fingerprint?: string;
}
