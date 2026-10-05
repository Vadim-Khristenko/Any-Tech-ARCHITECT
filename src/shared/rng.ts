/**
 * AmneziaWG Architect — cryptographically secure randomness utilities.
 *
 * Replaces all `Math.random()` usage in the generator with
 * `crypto.getRandomValues()`.  This module is environment-agnostic
 * (browser / node / bun) via `globalThis.crypto`.
 */

import { bytesToHex } from "./hex";

const CRYPTO = globalThis.crypto;

function getCrypto(): Crypto {
  if (!CRYPTO?.getRandomValues) {
    throw new Error(
      "Web Crypto API is not available. AmneziaWG Architect requires a secure random source.",
    );
  }
  return CRYPTO;
}

/**
 * `n` cryptographically random bytes.
 *
 * The raw form the other helpers build on, and what key generation needs:
 * an X25519 private key is 32 random bytes before clamping, and a REALITY
 * shortId is random bytes rendered as hex.
 */
export function cryptoBytes(n: number): Uint8Array {
  if (!Number.isInteger(n) || n < 0) {
    throw new TypeError("cryptoBytes: n must be a non-negative integer");
  }
  const out = new Uint8Array(n);
  if (n > 0) getCrypto().getRandomValues(out);
  return out;
}

/**
 * Returns a uniformly distributed integer in the inclusive range [min, max].
 *
 * Uses rejection sampling to avoid modulo bias.  Works for any range that
 * fits in a 32-bit unsigned integer (max - min + 1 <= 2^32), which covers
 * every AmneziaWG parameter we generate.
 */
export function cryptoRnd(min: number, max: number): number {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new TypeError("cryptoRnd: min and max must be finite numbers");
  }
  if (min > max) {
    throw new RangeError("cryptoRnd: min must not be greater than max");
  }

  const range = max - min + 1;
  if (range <= 0 || range > 2 ** 32) {
    throw new RangeError(
      "cryptoRnd: supported range is 1..2^32 (got " + range + ")",
    );
  }

  const crypto = getCrypto();
  const bytes = new Uint32Array(1);

  // If the range evenly divides 2^32, every draw is unbiased.
  if ((2 ** 32) % range === 0) {
    crypto.getRandomValues(bytes);
    return min + (bytes[0] % range);
  }

  // Rejection sampling: discard values that would introduce modulo bias.
  const maxValid = Math.floor(2 ** 32 / range) * range - 1;
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0] > maxValid);

  return min + (bytes[0] % range);
}

/**
 * Returns `n` cryptographically secure random bytes as a lowercase hex string.
 * String length is always exactly `n * 2` characters.
 */
export function cryptoRh(n: number): string {
  if (!Number.isFinite(n) || n < 0) {
    throw new RangeError("cryptoRh: n must be a non-negative finite number");
  }
  const bytes = Math.max(0, Math.floor(n));
  if (bytes === 0) return "";

  const crypto = getCrypto();
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);

  return bytesToHex(buf);
}

/**
 * Returns `n` cryptographically secure random bytes as a standard base64
 * string (with padding) — the encoding WireGuard and AmneziaWG use for keys
 * in `.conf` files (PrivateKey, PresharedKey, HeaderProtectionKey).
 */
export function cryptoB64(n: number): string {
  if (!Number.isFinite(n) || n < 0) {
    throw new RangeError("cryptoB64: n must be a non-negative finite number");
  }
  const bytes = Math.max(0, Math.floor(n));
  if (bytes === 0) return "";

  const crypto = getCrypto();
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);

  let bin = "";
  for (let i = 0; i < bytes; i++) bin += String.fromCharCode(buf[i]);

  // btoa exists in browsers, Node 16+ and Bun; fall back to Buffer if not.
  if (typeof btoa === "function") return btoa(bin);
  return Buffer.from(buf).toString("base64");
}

/**
 * Randomly pick an element from an array using a secure draw.
 */
export function cryptoPick<T>(arr: readonly T[]): T {
  if (arr.length === 0) {
    throw new RangeError("cryptoPick: cannot pick from an empty array");
  }
  return arr[cryptoRnd(0, arr.length - 1)];
}

/**
 * Shuffle an array in-place using the Fisher–Yates algorithm with a secure
 * random source.
 */
export function cryptoShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = cryptoRnd(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
