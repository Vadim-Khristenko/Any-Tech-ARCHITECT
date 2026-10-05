/**
 * Folding several keys into one.
 *
 * Containers collide by name; the first wins and the collision is
 * reported. Fusing two servers into one container would produce a key
 * matching neither.
 */

import { LocalisedError, type LocalisedNote } from "@/shared/errors";
import type { ContainerEntry, MergeResult, VpnConfig } from "./types";


/**
 * Merge an array of decoded VPN objects into one master config.
 *
 * Strategy:
 *   - containers[]: merge all, deduplicate by container name
 *     (if two keys have the same container — take first, warn)
 *   - defaultContainer: from first key
 *   - description: join via " + "
 *   - dns1/dns2: from first key (or first one that has it)
 *   - hostName: from first key
 *   - nameOverriddenByUser: true
 *
 * Returns { merged, warnings, stats: {total, unique, dupes} }
 */
export function mergeVpnConfigs(configs: VpnConfig[]): MergeResult {
  if (!configs || configs.length < 2) {
    throw new LocalisedError(
      "mk.err.needTwo",
      {},
      "merging needs at least two keys",
    );
  }

  const mergedContainers: ContainerEntry[] = [];
  const seenNames: Record<string, number> = {};
  const warnings: LocalisedNote[] = [];
  let dupes = 0;
  let total = 0;

  for (let cfgIdx = 0; cfgIdx < configs.length; cfgIdx++) {
    const cfg = configs[cfgIdx];
    const containers = cfg.containers || [];

    for (const c of containers) {
      total++;
      const name = c.container || `unknown_${cfgIdx}_${total}`;

      if (seenNames[name]) {
        dupes++;
        warnings.push({
          key: "mk.warn.duplicateContainer",
          params: { name, from: cfgIdx + 1, seen: seenNames[name]! },
        });
      } else {
        seenNames[name] = cfgIdx + 1;
        mergedContainers.push(c);
      }
    }
  }

  // Take metadata from first key, combine descriptions
  const first = configs[0];
  const descriptions = configs
    .map((c) => c.description || "")
    .filter((d) => d.length > 0);
  const uniqueDescriptions = descriptions.filter(
    (d, i) => descriptions.indexOf(d) === i,
  );

  const merged: VpnConfig = {
    containers: mergedContainers,
    defaultContainer:
      first.defaultContainer || mergedContainers[0]?.container || "",
    description: uniqueDescriptions.join(" + ") || "Merged",
    dns1: first.dns1 || configs.find((c) => c.dns1)?.dns1 || "",
    dns2: first.dns2 || configs.find((c) => c.dns2)?.dns2 || "",
    hostName: first.hostName || "",
    nameOverriddenByUser: true,
  };

  return {
    merged,
    warnings,
    stats: {
      total,
      unique: mergedContainers.length,
      dupes,
    },
  };
}
