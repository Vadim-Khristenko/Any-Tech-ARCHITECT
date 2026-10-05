/**
 * The lite build's stand-in for `@/shared/domains`.
 *
 * `vite.lite.config.ts` points the generator's import here. It answers the one
 * question the generator asks, `pickHost({ regions, role, dnsType })`, from
 * pools resolved at build time (scripts/lite/prepare.ts), with the same
 * fallbacks, so the hosts come out with the same distribution as on the full
 * site.
 */

import { cryptoPick } from "@/shared/rng";
import type { DomainQuery } from "@/types/domain";
import { HOSTS, POOLS } from "./generated/pools";

const decoded = new Map<string, readonly string[]>();

/** A resolved pool, or undefined when the build did not prepare that key. */
export function poolFor(key: string): readonly string[] | undefined {
  const known = decoded.get(key);
  if (known) return known;
  const raw = POOLS[key];
  if (raw === undefined) return undefined;
  const list = raw ? raw.split(",").map((i) => HOSTS[Number.parseInt(i, 36)]!) : [];
  decoded.set(key, list);
  return list;
}

/** The pool key for a query; mirrors `poolKey` in scripts/lite/prepare.ts. */
export function keyFor(query: DomainQuery): string {
  const region = query.regions?.[0] ?? "any";
  return `${region}|${query.role ?? "tls"}|${query.dnsType ?? ""}`;
}

export function pickHost(query: DomainQuery = {}): string {
  const pool =
    poolFor(keyFor(query)) ??
    poolFor(keyFor({ role: query.role, dnsType: query.dnsType })) ??
    poolFor(keyFor({ role: query.role })) ??
    poolFor("any|tls|")!;
  return pool.length ? cryptoPick(pool) : HOSTS[0]!;
}
