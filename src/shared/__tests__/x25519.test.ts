import { describe, it, expect } from "bun:test";

import {
  scalarMult,
  clampScalar,
  publicFromPrivate,
  generateX25519Pair,
  publicKeyFor,
  toBase64Url,
  fromBase64Url,
} from "../x25519";

/**
 * Key material is the one place where "looks right" is worthless. These tests
 * are the RFC 7748 vectors plus the exact behaviour Xray-core's
 * `curve25519.go` shows, because a key that does not match what the core
 * derives is a key that silently will not authenticate.
 */

const hexToBytes = (hex: string): Uint8Array =>
  new Uint8Array(hex.match(/../g)!.map((b) => parseInt(b, 16)));

const bytesToHex = (bytes: Uint8Array): string =>
  [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

describe("RFC 7748 test vectors", () => {
  it("computes the first scalar multiplication", () => {
    const scalar = hexToBytes(
      "a546e36bf0527c9d3b16154b82465edd62144c0ac1fc5a18506a2244ba449ac4",
    );
    const u = hexToBytes(
      "e6db6867583030db3594c1a424b15f7c726624ec26b3353b10a903a6d0ab1c4c",
    );
    expect(bytesToHex(scalarMult(scalar, u))).toBe(
      "c3da55379de9c6908e94ea4df28d084f32eccf03491c71f754b4075577a28552",
    );
  });

  it("computes the second scalar multiplication", () => {
    const scalar = hexToBytes(
      "4b66e9d4d1b4673c5ad22691957d6af5c11b6421e0ea01d42ca4169e7918ba0d",
    );
    const u = hexToBytes(
      "e5210f12786811d3f4b7959d0538ae2c31dbe7106fc03c3efc4cd549c715a493",
    );
    expect(bytesToHex(scalarMult(scalar, u))).toBe(
      "95cbde9476e8907d7aade45cb4b873f88b595a68799fa152e6f8f7647aac7957",
    );
  });

  it("derives Alice's public key from her private key", () => {
    const priv = hexToBytes(
      "77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a",
    );
    expect(bytesToHex(publicFromPrivate(priv))).toBe(
      "8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a",
    );
  });

  it("derives Bob's public key", () => {
    const priv = hexToBytes(
      "5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb",
    );
    expect(bytesToHex(publicFromPrivate(priv))).toBe(
      "de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f",
    );
  });

  it("agrees on a shared secret from both sides", () => {
    const alicePriv = hexToBytes(
      "77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a",
    );
    const bobPriv = hexToBytes(
      "5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb",
    );
    const shared =
      "4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742";

    expect(
      bytesToHex(scalarMult(alicePriv, publicFromPrivate(bobPriv))),
    ).toBe(shared);
    expect(
      bytesToHex(scalarMult(bobPriv, publicFromPrivate(alicePriv))),
    ).toBe(shared);
  });
});

describe("clamping matches what Xray-core prints", () => {
  it("applies the three fixed bit operations", () => {
    // curve25519.go: privateKey[0] &= 248; [31] &= 127; [31] |= 64
    const raw = new Uint8Array(32).fill(0xff);
    const clamped = clampScalar(raw);
    expect(clamped[0]).toBe(248);
    expect(clamped[31]).toBe(127);
  });

  it("sets the high bit even when the input had it clear", () => {
    const clamped = clampScalar(new Uint8Array(32));
    expect(clamped[31]).toBe(64);
  });

  it("does not modify the caller's array", () => {
    const raw = new Uint8Array(32).fill(0xff);
    clampScalar(raw);
    expect(raw[0]).toBe(0xff);
  });
});

describe("encoding", () => {
  it("uses the URL alphabet without padding", () => {
    const bytes = new Uint8Array([251, 255, 190, 255]);
    const encoded = toBase64Url(bytes);
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");
  });

  it("round-trips", () => {
    const bytes = new Uint8Array(32).map((_, i) => (i * 7 + 3) & 0xff);
    expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes);
  });

  it("returns null rather than throwing on nonsense", () => {
    expect(fromBase64Url("!!!not base64!!!")).toBeNull();
  });
});

describe("generated pairs", () => {
  it("are 32 bytes on both halves", () => {
    for (let i = 0; i < 5; i++) {
      const pair = generateX25519Pair();
      expect(fromBase64Url(pair.privateKey)!.length).toBe(32);
      expect(fromBase64Url(pair.publicKey)!.length).toBe(32);
    }
  });

  it("are clamped, so the printed key is the one in use", () => {
    for (let i = 0; i < 5; i++) {
      const priv = fromBase64Url(generateX25519Pair().privateKey)!;
      expect(priv[0] & 7).toBe(0);
      expect(priv[31] & 128).toBe(0);
      expect(priv[31] & 64).toBe(64);
    }
  });

  it("are different every time", () => {
    const seen = new Set(
      Array.from({ length: 20 }, () => generateX25519Pair().privateKey),
    );
    expect(seen.size).toBe(20);
  });

  it("recompute the same public half from the private one", () => {
    const pair = generateX25519Pair();
    expect(publicKeyFor(pair.privateKey)).toBe(pair.publicKey);
  });

  it("refuse a private key of the wrong length", () => {
    expect(publicKeyFor(toBase64Url(new Uint8Array(16)))).toBeNull();
  });
});
