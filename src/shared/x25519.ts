/**
 * X25519, implemented here rather than imported.
 *
 * REALITY key pairs are X25519, and so are WireGuard's — so this is shared
 * rather than living in either engine. It is written out because the
 * alternatives were worse: WebCrypto only gained X25519 recently and not
 * everywhere, and a dependency for eighty lines of well-specified arithmetic
 * is a dependency to audit forever in a tool that generates key material.
 *
 * The algorithm is RFC 7748 §5, the Montgomery ladder over Curve25519, and
 * the RFC's own test vectors are in the tests. Field arithmetic uses BigInt:
 * slower than a limb-based implementation, and entirely fast enough for
 * generating a handful of keys in a browser.
 *
 * Not constant-time. That is acceptable here and would not be elsewhere: the
 * only secret is a key this page just generated for the person looking at it,
 * on their own machine, with nothing to time against.
 */

import { cryptoBytes } from "@/shared/rng";

const P = (1n << 255n) - 19n;
const A24 = 121665n;

function mod(a: bigint): bigint {
  const r = a % P;
  return r < 0n ? r + P : r;
}

/** Modular inverse via Fermat: a^(p-2) mod p. */
function invert(a: bigint): bigint {
  let result = 1n;
  let base = mod(a);
  let exp = P - 2n;
  while (exp > 0n) {
    if (exp & 1n) result = mod(result * base);
    base = mod(base * base);
    exp >>= 1n;
  }
  return result;
}

function bytesToField(bytes: Uint8Array): bigint {
  let value = 0n;
  for (let i = 31; i >= 0; i--) value = (value << 8n) | BigInt(bytes[i]);
  // The top bit of the u-coordinate is ignored, per RFC 7748 §5.
  return value & ((1n << 255n) - 1n);
}

function fieldToBytes(value: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = mod(value);
  for (let i = 0; i < 32; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/**
 * Clamp a scalar the way every X25519 implementation does.
 *
 * Xray-core does this explicitly in `main/commands/all/curve25519.go` before
 * printing the private key, so the value it shows is the one actually used —
 * and our output has to match, or a key copied from one tool would not equal
 * the same key from the other.
 */
export function clampScalar(bytes: Uint8Array): Uint8Array {
  const k = new Uint8Array(bytes);
  k[0] &= 248;
  k[31] &= 127;
  k[31] |= 64;
  return k;
}

/** Scalar multiplication: the Montgomery ladder from RFC 7748 §5. */
export function scalarMult(scalar: Uint8Array, uCoord: Uint8Array): Uint8Array {
  const k = clampScalar(scalar);
  const u = bytesToField(uCoord);

  let x1 = u;
  let x2 = 1n;
  let z2 = 0n;
  let x3 = u;
  let z3 = 1n;
  let swap = 0n;

  for (let t = 254; t >= 0; t--) {
    const kt = BigInt((k[t >>> 3] >> (t & 7)) & 1);
    swap ^= kt;
    if (swap) {
      [x2, x3] = [x3, x2];
      [z2, z3] = [z3, z2];
    }
    swap = kt;

    const a = mod(x2 + z2);
    const aa = mod(a * a);
    const b = mod(x2 - z2);
    const bb = mod(b * b);
    const e = mod(aa - bb);
    const c = mod(x3 + z3);
    const d = mod(x3 - z3);
    const da = mod(d * a);
    const cb = mod(c * b);

    const t0 = mod(da + cb);
    x3 = mod(t0 * t0);
    const t1 = mod(da - cb);
    z3 = mod(x1 * mod(t1 * t1));
    x2 = mod(aa * bb);
    z2 = mod(e * mod(aa + mod(A24 * e)));
  }

  if (swap) {
    [x2, x3] = [x3, x2];
    [z2, z3] = [z3, z2];
  }

  return fieldToBytes(mod(x2 * invert(z2)));
}

/** The Curve25519 base point, u = 9. */
const BASE_POINT = (() => {
  const b = new Uint8Array(32);
  b[0] = 9;
  return b;
})();

/** Public key for a private key. */
export function publicFromPrivate(privateKey: Uint8Array): Uint8Array {
  return scalarMult(privateKey, BASE_POINT);
}

/* ── Encoding ─────────────────────────────────────────────────────────────── */

/**
 * base64 with the URL alphabet and no padding — what REALITY expects and what
 * its parser enforces, rejecting anything that does not decode to 32 bytes.
 */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Inverse of `toBase64Url`. Returns null when the input is not valid. */
export function fromBase64Url(text: string): Uint8Array | null {
  const normalised = text.replace(/-/g, "+").replace(/_/g, "/");
  try {
    const binary = atob(normalised);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/* ── Key pairs ────────────────────────────────────────────────────────────── */

export interface X25519Pair {
  /** base64 RawURL, 32 bytes. */
  privateKey: string;
  /** base64 RawURL, 32 bytes. REALITY calls this `password` in newer cores. */
  publicKey: string;
}

/** A fresh pair, from the crypto random source. */
export function generateX25519Pair(): X25519Pair {
  const priv = clampScalar(cryptoBytes(32));
  return {
    privateKey: toBase64Url(priv),
    publicKey: toBase64Url(publicFromPrivate(priv)),
  };
}

/** The public half of a private key given in base64 RawURL, or null. */
export function publicKeyFor(privateKeyBase64: string): string | null {
  const priv = fromBase64Url(privateKeyBase64);
  if (!priv || priv.length !== 32) return null;
  return toBase64Url(publicFromPrivate(clampScalar(priv)));
}
