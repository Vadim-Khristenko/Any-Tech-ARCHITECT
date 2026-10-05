/**
 * Single source for reading the wg-quick text out of an AWG container.
 *
 * A container stores the same text twice — `awg.config` and
 * `JSON.parse(awg.last_config).config` — and both `keys/build.ts`
 * (`extractWgQuick`) and `awg/awgFormat.ts` (`extractConf`) were pasting
 * the same three-line check. One fix missed the other is how the 4.0
 * regression happened, so this lives once and both call it.
 */

import type { AwgContainer } from "./types";

/** The wg-quick text for an AWG container, or null when it has none. */
export function getAwgWgQuick(
  awg: Pick<AwgContainer, "config" | "last_config">,
): string | null {
  if (typeof awg.config === "string" && awg.config.includes("[Interface]")) {
    return awg.config;
  }
  if (typeof awg.last_config === "string") {
    try {
      const lc = JSON.parse(awg.last_config) as { config?: unknown };
      if (typeof lc.config === "string" && lc.config.includes("[Interface]")) {
        return lc.config;
      }
    } catch {
      // Unreadable inner copy; validation reports it separately.
    }
  }
  return null;
}
