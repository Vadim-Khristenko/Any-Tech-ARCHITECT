/**
 * What is wrong with a `vpn://` key.
 *
 * Decoding proves a key is well-formed. It proves nothing about whether the
 * thing inside will connect, and the format makes several of the failures
 * invisible:
 *
 *   - A container stores its configuration three times over — as fields, as a
 *     JSON string in `last_config`, and as wg-quick text in `config`. An edit
 *     that reaches one copy leaves a key that contradicts itself, and which
 *     copy a client reads is a matter of which client.
 *   - AmneziaWG 3.0 refuses to start with any S under twelve when header
 *     protection is on, and says so in a log the reader is not looking at.
 *   - A container name nothing recognises reads as an empty entry rather than
 *     as the tunnel it is.
 *
 * Findings, not exceptions. A key with a problem is still a key worth showing.
 */

import { error, info, warn, type Finding } from "@/shared/findings";
import { containerKind } from "./containers";
import { containerBody, inferProtocol } from "./identify";
import type { ContainerEntry, VpnConfig } from "./types";

/** AmneziaWG 3.0 reads the header-protection nonce from the first S bytes. */
const MIN_S_WITH_HEADER_PROTECTION = 12;

const S_FIELDS = ["S1", "S2", "S3", "S4"] as const;

/** Fields worth cross-checking between a container's three copies of itself. */
const MIRRORED = [
  "Jc",
  "Jmin",
  "Jmax",
  "S1",
  "S2",
  "S3",
  "S4",
  "H1",
  "H2",
  "H3",
  "H4",
  "I1",
  "I2",
  "I3",
  "I4",
  "I5",
] as const;

const str = (v: unknown): string | undefined =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined;

/* ── One container ────────────────────────────────────────────────────────── */

function readWgQuick(text: string, field: string): string | undefined {
  const m = text.match(
    new RegExp(`^${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[ \\t]*=[ \\t]*(.*)$`, "m"),
  );
  return m ? m[1].trim() : undefined;
}

function checkContainer(entry: ContainerEntry, index: number): Finding[] {
  const out: Finding[] = [];
  const name = entry.container ?? "";
  const where = name || `#${index + 1}`;

  const found = containerBody(entry);
  if (!found) {
    out.push(error(where, "vpn.empty_container", { name: where }));
    return out;
  }

  const body = found.body;
  const kind = containerKind(name);

  /*
   * A name we do not know is not an error — the client adds containers, and a
   * key from a newer one should still be readable. It is worth saying what it
   * looks like instead, and worth saying that the answer was inferred.
   */
  if (!kind) {
    const guess = inferProtocol(body);
    out.push(
      guess
        ? info(where, "vpn.container_inferred", { name: where, guess })
        : warn(where, "vpn.container_unknown", { name: where }),
    );
  } else {
    /*
     * A known name whose fields say something else. This is the case the
     * inference above must not be allowed to paper over: the client will read
     * the name and hand the body to the wrong protocol.
     */
    const guess = inferProtocol(body);
    if (guess && guess !== kind.protocol) {
      out.push(
        warn(where, "vpn.container_mismatch", {
          name: where,
          declared: kind.protocol,
          found: guess,
        }),
      );
    }
  }

  const isAwg = (kind?.obfuscated ?? false) || inferProtocol(body) === "awg";
  if (!isAwg) return out;

  /* ── The three copies ─────────────────────────────────────────────────── */

  let inner: Record<string, unknown> | undefined;
  if (typeof body.last_config === "string") {
    try {
      inner = JSON.parse(body.last_config) as Record<string, unknown>;
    } catch {
      out.push(warn(where, "vpn.last_config_unreadable", { name: where }));
    }
  }

  const quick =
    typeof body.config === "string"
      ? body.config
      : typeof inner?.config === "string"
        ? inner.config
        : undefined;

  for (const field of MIRRORED) {
    const top = str(body[field]);
    if (top === undefined) continue;

    const fromInner = inner ? str(inner[field]) : undefined;
    if (fromInner !== undefined && fromInner !== top) {
      out.push(
        error(field, "vpn.self_contradiction", {
          name: where,
          field,
          a: top,
          b: fromInner,
          where: "last_config",
        }),
      );
    }

    const fromQuick = quick ? readWgQuick(quick, field) : undefined;
    if (fromQuick !== undefined && fromQuick !== top) {
      out.push(
        error(field, "vpn.self_contradiction", {
          name: where,
          field,
          a: top,
          b: fromQuick,
          where: "config",
        }),
      );
    }
  }

  /* ── The 3.0 floor ────────────────────────────────────────────────────── */

  if (str(body.HeaderProtectionKey)) {
    for (const field of S_FIELDS) {
      const raw = str(body[field]);
      if (raw === undefined) continue;
      const value = Number(raw);
      if (Number.isFinite(value) && value < MIN_S_WITH_HEADER_PROTECTION) {
        out.push(
          error(field, "vpn.s_below_floor", {
            name: where,
            field,
            value: raw,
            min: MIN_S_WITH_HEADER_PROTECTION,
          }),
        );
      }
    }
  }

  return out;
}

/* ── The whole key ────────────────────────────────────────────────────────── */

/**
 * Check a decoded key.
 *
 * A subscription key produces one finding saying what it is, and no more:
 * everything below this point is about tunnels, and it holds none.
 */
export function validateVpnConfig(cfg: VpnConfig): Finding[] {
  const record = cfg as unknown as Record<string, unknown>;
  const out: Finding[] = [];

  if (!Array.isArray(cfg.containers)) {
    if (record.api_config || record.api_endpoint || record.auth_data) {
      out.push(info("key", "vpn.subscription_key"));
    } else {
      out.push(warn("key", "vpn.no_containers"));
    }
    return out;
  }

  if (cfg.containers.length === 0) {
    out.push(warn("key", "vpn.no_containers"));
    return out;
  }

  const seen = new Map<string, number>();
  cfg.containers.forEach((entry, i) => {
    const name = entry.container ?? `#${i + 1}`;
    const first = seen.get(name);
    if (first !== undefined) {
      out.push(
        warn(name, "vpn.duplicate_container", { name, first: first + 1, at: i + 1 }),
      );
    } else {
      seen.set(name, i);
    }
    out.push(...checkContainer(entry, i));
  });

  const declared = str(record.defaultContainer);
  if (declared && !seen.has(declared)) {
    out.push(warn("defaultContainer", "vpn.default_missing", { name: declared }));
  }

  return out;
}
