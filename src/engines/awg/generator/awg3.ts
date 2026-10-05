/**
 * AmneziaWG Architect — AWG 3.0 parameter generation.
 *
 * Everything here is derived from the protocol implementation, not from the
 * docs (which still describe 2.0 at the time of writing):
 *
 *   amneziawg-go v3.0.1
 *     device/uapi.go        — accepted keys and their parsers
 *     device/noise-types.go — UintRange ("lo" or "lo-hi"), HeaderCipherKey
 *     device/send.go        — where the header cipher nonce comes from
 *     device/timers.go      — how the randomised timers are consumed
 *   amneziawg-tools feat/awg3
 *     src/config.c          — the `.conf` key spelling and value encodings
 *
 * Three things are new in 3.0:
 *
 *   1. HeaderProtectionKey — a 32-byte ChaCha20 key. Handshake init/response
 *      and cookie replies get their *entire* message XOR-encrypted; transport
 *      packets get only their 16-byte header encrypted. The cipher nonce is
 *      not carried separately — it is read from the first 12 bytes of the
 *      S1/S2/S3/S4 random padding, which is why this file clamps those to
 *      MIN_S_WITH_HEADER_PROTECTION.
 *
 *   2. ContentPaddingAddition — a random per-transport-packet padding range,
 *      replacing the fixed pad-to-multiple-of-16 when set.
 *
 *   3. Randomised timers — the fixed WireGuard constants (120/5/180/10 s and
 *      18 attempts) become ranges, so handshake timing stops being a stable
 *      fingerprint.
 *
 * The `<d>`, `<ds>` and `<dz>` obfuscation tags parse in v3.0.1 but are NOT
 * wired into the send path (`device/send.go` only ever calls the I1–I5 chains
 * with a nil payload). They are groundwork for AWG 4.0 — see the `DI/DR/DC/DT`
 * keys on the tools `feature/awg4` branch — so we deliberately never emit them.
 */

import type { AWG3Params, GeneratorInput, Intensity } from "./types";
import type { VersionCapability } from "./versions";
import { rnd } from "./utils";
import { cryptoB64 } from "@/shared/rng";

/* ── Protocol constants (verified against the Go implementation) ─────────── */

/** HeaderCipherKeySize — device/noise-types.go */
export const HEADER_PROTECTION_KEY_BYTES = 32;

/** HeaderCipherNonceSize — device/noise-types.go */
export const HEADER_CIPHER_NONCE_SIZE = 12;

/**
 * Minimum S1–S4 when HeaderProtectionKey is set.
 *
 * Where the number comes from: send.go builds `crypt := buf[:padding]` and
 * then uses `crypt[:HeaderCipherNonceSize]` as the ChaCha20 nonce, so a
 * padding under twelve bytes has no nonce to give it.
 *
 * What happens if you try it: nothing runs. Both implementations check the
 * bound before the interface comes up and refuse the configuration by name —
 * `device/uapi.go` returns `S%d must be more then %d to use headerProtection`,
 * and the kernel module's `src/netlink.c` logs the same sentence and returns
 * -EINVAL. This comment used to say there was no crash and merely a quietly
 * weakened cipher, which is the wrong thing to tell someone: they get an
 * interface that will not start and a log line saying exactly why, and a
 * warning about silent weakening sends them looking anywhere but at it.
 *
 * Corrected against both upstreams by @bivlked, issue #8.
 */
export const MIN_S_WITH_HEADER_PROTECTION = HEADER_CIPHER_NONCE_SIZE;

/** Stock WireGuard timer constants — device/constants.go. Seconds. */
export const WG_DEFAULT_TIMINGS = {
  rekeyAfterTime: 120,
  rekeyTimeout: 5,
  rejectAfterTime: 180,
  keepaliveTimeout: 10,
  /** MaxTimerHandshakes = RekeyAttemptTime / RekeyTimeout = 90 / 5 */
  maxHandshakeAttempts: 18,
} as const;

/* ── Generation ──────────────────────────────────────────────────────────── */

/** Format a UintRange the way `noise-types.go` parses it back. */
function range(lo: number, hi: number): string {
  const a = Math.max(0, Math.floor(lo));
  const b = Math.max(a, Math.floor(hi));
  return a === b ? `${a}` : `${a}-${b}`;
}

/**
 * Generate a fresh 32-byte header-protection key.
 *
 * Returned base64 (with padding) because that is what `.conf` expects —
 * `config.c` runs it through the same `parse_key` as PrivateKey. The UAPI
 * layer wants the same bytes as hex; `headerProtectionKeyHex` converts.
 */
export function genHeaderProtectionKey(): string {
  return cryptoB64(HEADER_PROTECTION_KEY_BYTES);
}

/** Convert a base64 header-protection key to the hex form UAPI expects. */
export function headerProtectionKeyHex(b64: string): string {
  const bin =
    typeof atob === "function"
      ? atob(b64)
      : Buffer.from(b64, "base64").toString("binary");
  let hex = "";
  for (let i = 0; i < bin.length; i++) {
    hex += bin.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Content padding range. Wider ranges cost more bandwidth but flatten the
 * packet-size histogram harder, so it scales with intensity.
 */
function genContentPadding(intensity: Intensity, routerMode: boolean): string {
  if (routerMode) return range(4, 32);
  const spans: Record<Intensity, [number, number]> = {
    low: [8, 64],
    medium: [16, 128],
    high: [24, 200],
  };
  const [lo, hi] = spans[intensity];
  const min = rnd(lo, Math.floor((lo + hi) / 2));
  return range(min, rnd(min + 8, hi));
}

/**
 * Randomised timers.
 *
 * The ranges are chosen so the invariants in `timers.go` always hold:
 *
 *   keyRefreshTimeoutReceiving()
 *     = rejectAfterTime.PickOne() − keepaliveTimeout.Lo() − rekeyTimeout.Lo()
 *
 * clamped at 0. If that hits zero the receiving side stops refreshing keys, so
 * the low end of RejectAfterTime must stay comfortably above the low ends of
 * KeepaliveTimeout + RekeyTimeout. RekeyAfterTime must also finish before
 * RejectAfterTime, otherwise the session is rejected before it ever rekeys.
 */
function genTimings(intensity: Intensity): {
  rekeyAfterTime: string;
  rekeyTimeout: string;
  rejectAfterTime: string;
  keepaliveTimeout: string;
  maxHandshakeAttempts: string;
} {
  // Jitter widens with intensity — more spread, less predictable cadence.
  const spread: Record<Intensity, number> = { low: 10, medium: 25, high: 45 };
  const j = spread[intensity];

  const rekeyTimeoutLo = rnd(4, 6);
  const rekeyTimeoutHi = rekeyTimeoutLo + rnd(1, 4);

  const keepaliveLo = rnd(8, 14);
  const keepaliveHi = keepaliveLo + rnd(2, 8);

  const rekeyAfterLo = rnd(100, 120);
  const rekeyAfterHi = rekeyAfterLo + rnd(10, j);

  // Keep a hard margin over keepaliveLo + rekeyTimeoutLo so the receiving-side
  // refresh window can never collapse to zero.
  const rejectFloor = rekeyAfterHi + keepaliveHi + rekeyTimeoutHi + 15;
  const rejectLo = Math.max(170, rejectFloor);
  const rejectHi = rejectLo + rnd(10, j);

  const attemptsLo = rnd(12, 18);
  const attemptsHi = attemptsLo + rnd(2, 10);

  return {
    rekeyAfterTime: range(rekeyAfterLo, rekeyAfterHi),
    rekeyTimeout: range(rekeyTimeoutLo, rekeyTimeoutHi),
    rejectAfterTime: range(rejectLo, rejectHi),
    keepaliveTimeout: range(keepaliveLo, keepaliveHi),
    maxHandshakeAttempts: range(attemptsLo, attemptsHi),
  };
}

/**
 * Build the 3.x block for a config.
 *
 * `caps` decides which knobs exist: the 3.1 switches are read only where the
 * version understands them, so a 3.0 config never carries a key its device
 * would refuse at parse time.
 */
export function genAwg3(input: GeneratorInput, caps: VersionCapability): AWG3Params {
  const empty: AWG3Params = {
    headerProtectionKey: "",
    contentPaddingAddition: "",
    rekeyAfterTime: "",
    rekeyTimeout: "",
    rejectAfterTime: "",
    keepaliveTimeout: "",
    maxHandshakeAttempts: "",
    randomTrailers: false,
    disableCookies: false,
  };

  if (input.useHeaderProtection) {
    empty.headerProtectionKey = genHeaderProtectionKey();
  }
  if (input.useContentPadding) {
    empty.contentPaddingAddition = genContentPadding(
      input.intensity,
      input.routerMode,
    );
  }
  if (input.useRandomTimings) {
    Object.assign(empty, genTimings(input.intensity));
  }
  if (caps.featureFlags) {
    empty.randomTrailers = input.useRandomTrailers;
    empty.disableCookies = input.useDisableCookies;
  }

  return empty;
}

/** True when the block carries at least one active parameter. */
export function hasAwg3Params(p: AWG3Params | undefined): boolean {
  if (!p) return false;
  // Strings read "" when off; the 3.1 switches read false. Both count as
  // absent — an all-off block is not a parameter set.
  return Object.values(p).some((v) => v !== "" && v !== false);
}
