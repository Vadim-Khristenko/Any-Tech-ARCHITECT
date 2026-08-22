/**
 * The hand-off from a generator to the simulator page.
 *
 * A config carries a private key, so it travels through sessionStorage rather
 * than the URL: a key in an address bar is a key in history, in a referrer,
 * and in whatever syncs the two. The payload names its engine, because the
 * simulator page is generic — it resolves the engine from the registry and
 * asks it to simulate, never learning what AmneziaWG or XRay look like.
 *
 * The sender also composes the caption and any client-level notes, because
 * those are facts about the pairing the sender chose; protocol-level notes
 * come from the engine's own simulator at read time.
 */

const KEY = "architect:pending-sim";

export interface PendingSimulation {
  /** Which engine owns this config — resolved through the registry. */
  engine: string;
  /** One line under the page title, already composed by the sender. */
  caption?: string;
  /**
   * Client-level notes worth showing beside the engine's own — why this
   * particular client's traffic looks the way it does.
   */
  notes?: readonly string[];
  config: unknown;
}

/** Park a config for the simulator page to pick up on arrival. */
export function handOffToSimulator(pending: PendingSimulation): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // Storage blocked (private mode, quota): the simulator shows its empty
    // state rather than half a config.
  }
}

/**
 * Read back what was parked.
 *
 * The entry survives revisits on purpose: restarting the simulation must not
 * depend on how the visitor got here. Malformed content reads as absent —
 * there is nothing useful to say about a payload that does not parse.
 */
export function pendingSimulation(): PendingSimulation | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingSimulation> | null;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.engine === "string" &&
      "config" in parsed
    ) {
      return parsed as PendingSimulation;
    }
    return null;
  } catch {
    return null;
  }
}
