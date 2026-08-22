/**
 * AmneziaWG Architect — cross-parameter validators for generated configs.
 */

import type {
  AWGConfig,
  AWG3Params,
  ValidationFinding,
  ClientCapability,
} from "./types";
import { clientCaps } from "./clients";
import { capsFor } from "./versions";
import {
  HEADER_PROTECTION_KEY_BYTES,
  MIN_S_WITH_HEADER_PROTECTION,
} from "./awg3";
import {
  INIT_TO_RESPONSE,
  INIT_TO_COOKIE,
  RESPONSE_TO_COOKIE,
} from "../messageSizes";

/**
 * Parse a range — "N-M", or "N" for a single value — into [min, max].
 *
 * Accepts numbers and undefined as well as strings: the validators read
 * hand-written config fields, where a value may be missing or already numeric,
 * and a second near-identical copy of this used to exist for that reason.
 */
export function parseRange(
  rangeStr: string | number | undefined,
): [number, number] | null {
  if (rangeStr === undefined || rangeStr === "") return null;
  const s = String(rangeStr).trim();
  const m = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) return [parseInt(m[1], 10), parseInt(m[2], 10)];
  const single = parseInt(s, 10);
  return Number.isFinite(single) ? [single, single] : null;
}

/** True if two closed intervals overlap. */
export function rangesOverlap(
  a: { min: number; max: number },
  b: { min: number; max: number },
): boolean {
  return a.min <= b.max && b.min <= a.max;
}

/** Validate that H1-H4 ranges do not overlap with each other. */
export function validateHeaderRanges(
  h1: string,
  h2: string,
  h3: string,
  h4: string,
): ValidationFinding[] {
  const out: ValidationFinding[] = [];
  const hs: Array<[string, [number, number] | null]> = [
    ["H1", parseRange(h1)],
    ["H2", parseRange(h2)],
    ["H3", parseRange(h3)],
    ["H4", parseRange(h4)],
  ];

  for (let i = 0; i < hs.length; i++) {
    for (let j = i + 1; j < hs.length; j++) {
      const a = hs[i][1];
      const b = hs[j][1];
      if (a && b && rangesOverlap({ min: a[0], max: a[1] }, { min: b[0], max: b[1] })) {
        out.push({
          field: `${hs[i][0]}/${hs[j][0]}`,
          level: "error",
          code: "awg.h_overlap",
          values: { a: hs[i][0], b: hs[j][0] },
        });
      }
    }
  }

  for (const [name, r] of hs) {
    if (r && r[0] >= 1 && r[0] <= 4) {
      out.push({
        field: name,
        level: "warn",
        code: "awg.h_reserved",
        values: { key: name },
      });
    }
  }

  return out;
}

/** Validate the core S-size constraints (S1 + 56 ≠ S2, S4 ≤ 32, etc.). */
export function validateSizes(cfg: AWGConfig): ValidationFinding[] {
  const out: ValidationFinding[] = [];
  if (cfg.s1 + INIT_TO_RESPONSE === cfg.s2) {
    out.push({
      field: "S2",
      level: "warn",
      code: "awg.size_collision",
      values: { a: "S1", b: "S2" },
    });
  }
  if (cfg.s3 === cfg.s1 + INIT_TO_COOKIE) {
    out.push({
      field: "S3",
      level: "warn",
      code: "awg.size_collision",
      values: { a: "S1", b: "S3" },
    });
  }
  if (cfg.s3 === cfg.s2 + RESPONSE_TO_COOKIE) {
    out.push({
      field: "S3",
      level: "warn",
      code: "awg.size_collision",
      values: { a: "S2", b: "S3" },
    });
  }
  if (cfg.s4 > 32) {
    out.push({
      field: "S4",
      level: "error",
      code: "awg.s4_max",
      values: { s4: cfg.s4, max: 32 },
    });
  }
  if (cfg.s4 === 0) {
    out.push({
      field: "S4",
      level: "warn",
      code: "awg.s4_zero",
    });
  }
  return out;
}

/**
 * Validate a generated config against a specific AWG client.
 *
 * `release` narrows it to one build of that client — the limits a user on an
 * old install actually has, rather than the ones the current version has.
 */
export function validateConfigForClient(
  cfg: AWGConfig,
  clientId: string,
  release?: string | null,
): ValidationFinding[] {
  const resolved = clientCaps(clientId, release);
  const client = { ...resolved.limits, name: resolved.name };

  const out: ValidationFinding[] = [];

  if (cfg.s4 > client.maxS4) {
    out.push({
      field: "S4",
      level: "error",
      code: "awg.s4_over_client",
      values: { s4: cfg.s4, max: client.maxS4, client: client.name },
    });
  }

  const cps = cfg.i1 + cfg.i2 + cfg.i3 + cfg.i4 + cfg.i5;
  if (cps.includes("<c>") && !client.supportsCpsTagC) {
    out.push({
      field: "I1-I5",
      level: "error",
      code: "awg.cps_tag_unsupported",
      values: { tag: "<c>", client: client.name },
    });
  }
  if (/<rc\s+\d+>/.test(cps) && !client.supportsCpsTagRC) {
    out.push({
      field: "I1-I5",
      level: "error",
      code: "awg.cps_tag_unsupported",
      values: { tag: "<rc N>", client: client.name },
    });
  }
  if (/<rd\s+\d+>/.test(cps) && !client.supportsCpsTagRD) {
    out.push({
      field: "I1-I5",
      level: "error",
      code: "awg.cps_tag_unsupported",
      values: { tag: "<rd N>", client: client.name },
    });
  }

  for (const [key, rangeStr] of [
    ["H1", cfg.h1],
    ["H2", cfg.h2],
    ["H3", cfg.h3],
    ["H4", cfg.h4],
  ] as const) {
    const r = parseRange(rangeStr);
    if (r && r[1] > client.maxHValue) {
      out.push({
        field: key,
        level: "error",
        code: "awg.h_over_client",
        values: { key, max: client.maxHValue, client: client.name },
      });
    }
  }

  if (cfg.jc > client.maxJc) {
    out.push({
      field: "Jc",
      level: "warn",
      code: "awg.jc_over_client",
      values: { jc: cfg.jc, max: client.maxJc, client: client.name },
    });
  }

  return out;
}

/* ── AWG 3.0 ─────────────────────────────────────────────────────────────── */

/** Base64 of exactly 32 bytes: 43 payload chars + one '=' of padding. */
const B64_32_BYTES = /^[A-Za-z0-9+/]{43}=$/;

/**
 * Validate the AWG 3.0 block.
 *
 * The interesting rules come from reading amneziawg-go v3.0.1 rather than the
 * docs — see `awg3.ts` for the exact source references.
 */
export function validateAwg3(cfg: AWGConfig): ValidationFinding[] {
  const p = cfg.awg3;
  const out: ValidationFinding[] = [];
  if (!p) return out;

  if (!capsFor(cfg.version).headerProtection) {
    const active = Object.values(p).some((v) => v !== "" && v !== false);
    if (active) {
      out.push({
        field: "AWG3",
        level: "error",
        code: "awg3.version_mismatch",
        values: { version: cfg.version },
      });
    }
    return out;
  }

  /* The 3.1 switches — a 3.0 device refuses both keys at config parse. */
  if (!capsFor(cfg.version).featureFlags && (p.randomTrailers || p.disableCookies)) {
    out.push({
      field: "RandomTrailers",
      level: "warn",
      code: "awg3.flags_version_mismatch",
      values: { version: cfg.version },
    });
  }

  /* HeaderProtectionKey — 32 bytes, base64 (same encoding as PrivateKey). */
  if (p.headerProtectionKey) {
    if (!B64_32_BYTES.test(p.headerProtectionKey)) {
      out.push({
        field: "HeaderProtectionKey",
        level: "error",
        code: "awg3.hpk_format",
        values: { bytes: HEADER_PROTECTION_KEY_BYTES, chars: 44 },
      });
    }

    /*
     * The ChaCha20 nonce is read from the first 12 bytes of the S-padding
     * (send.go: `crypt[:HeaderCipherNonceSize]`). Padding shorter than that
     * makes the nonce overlap the message body instead of random bytes.
     */
    for (const [name, value] of [
      ["S1", cfg.s1],
      ["S2", cfg.s2],
      ["S3", cfg.s3],
      ["S4", cfg.s4],
    ] as const) {
      if (value < MIN_S_WITH_HEADER_PROTECTION) {
        out.push({
          field: name,
          level: "error",
          code: "awg3.s_below_nonce",
          values: { name, value, min: MIN_S_WITH_HEADER_PROTECTION },
        });
      }
    }
  }

  /* ContentPaddingAddition — a zero range means "disabled" in the device. */
  if (p.contentPaddingAddition) {
    const r = parseRange(p.contentPaddingAddition);
    if (!r) {
      out.push({
        field: "ContentPaddingAddition",
        level: "error",
        code: "awg3.cpa_format",
      });
    } else if (r[1] < 1) {
      out.push({
        field: "ContentPaddingAddition",
        level: "warn",
        code: "awg3.cpa_zero",
      });
    }
  }

  out.push(...validateTimings(p));
  return out;
}

/** Timer-range invariants taken from `device/timers.go`. */
function validateTimings(p: AWG3Params): ValidationFinding[] {
  const out: ValidationFinding[] = [];

  const fields: Array<[string, string]> = [
    ["RekeyAfterTime", p.rekeyAfterTime],
    ["RekeyTimeout", p.rekeyTimeout],
    ["RejectAfterTime", p.rejectAfterTime],
    ["KeepaliveTimeout", p.keepaliveTimeout],
    ["MaxHandshakeAttempts", p.maxHandshakeAttempts],
  ];

  const parsed: Record<string, [number, number]> = {};
  for (const [name, raw] of fields) {
    if (!raw) continue;
    const r = parseRange(raw);
    if (!r) {
      out.push({
        field: name,
        level: "error",
        code: "awg3.timing_format",
        values: { name },
      });
      continue;
    }
    if (r[0] > r[1]) {
      out.push({
        field: name,
        level: "error",
        code: "awg3.timing_inverted",
        values: { name },
      });
      continue;
    }
    parsed[name] = r;
  }

  const reject = parsed.RejectAfterTime;
  const keepalive = parsed.KeepaliveTimeout;
  const rekeyTimeout = parsed.RekeyTimeout;
  const rekeyAfter = parsed.RekeyAfterTime;

  /*
   * keyRefreshTimeoutReceiving() = RejectAfterTime − KeepaliveTimeout.Lo
   *                                              − RekeyTimeout.Lo, min 0.
   * At zero the receiving side never refreshes its keys and the tunnel dies
   * once RejectAfterTime elapses.
   */
  if (reject && keepalive && rekeyTimeout) {
    const floor = keepalive[0] + rekeyTimeout[0];
    if (reject[0] <= floor) {
      out.push({
        field: "RejectAfterTime",
        level: "error",
        code: "awg3.reject_too_low",
        values: { reject: reject[0], floor },
      });
    }
  }

  /* A session must rekey before it is rejected. */
  if (reject && rekeyAfter && rekeyAfter[1] >= reject[0]) {
    out.push({
      field: "RekeyAfterTime",
      level: "error",
      code: "awg3.rekey_after_reject",
      values: { rekey: rekeyAfter[1], reject: reject[0] },
    });
  }

  const attempts = parsed.MaxHandshakeAttempts;
  if (attempts && attempts[0] < 1) {
    out.push({
      field: "MaxHandshakeAttempts",
      level: "error",
      code: "awg3.attempts_zero",
    });
  }

  return out;
}

/** Run all built-in validations and return a flat finding list. */
export function validateGeneratedConfig(
  cfg: AWGConfig,
  clientId?: string,
  clientRelease?: string | null,
): ValidationFinding[] {
  const out: ValidationFinding[] = [
    ...validateHeaderRanges(cfg.h1, cfg.h2, cfg.h3, cfg.h4),
    ...validateSizes(cfg),
    ...validateAwg3(cfg),
  ];
  if (clientId) {
    out.push(...validateConfigForClient(cfg, clientId, clientRelease));
  }
  return out;
}
