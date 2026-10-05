/**
 * Hex conversions, in one place.
 *
 * `b.toString(16).padStart(2, "0")` had been written out five times across the
 * randomness helper, the AmneziaWG profile builders, the XRay generator and a
 * test. Each copy was correct, and each was a chance for the next one not to
 * be — a missing `padStart` produces hex that is subtly the wrong length and
 * decodes to different bytes.
 */

/** Bytes as lower-case hex, two characters per byte. */
export function bytesToHex(bytes: Uint8Array | readonly number[]): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

/**
 * A single byte value as two hex characters.
 *
 * Values above 255 are masked rather than allowed to widen the output: callers
 * are encoding a byte, and a three-character result would silently shift
 * everything after it.
 */
export function byteToHex(value: number): string {
  return (value & 0xff).toString(16).padStart(2, "0");
}

/** A string's characters as hex, one byte per character code. */
export function textToHex(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) out += byteToHex(text.charCodeAt(i));
  return out;
}

/**
 * Hex back to bytes, or null when the input is not valid hex.
 *
 * Rejects an odd length rather than padding it: a half byte at the end means
 * the caller was handed something truncated, and guessing which half is
 * missing would turn a visible error into a wrong value.
 */
export function hexToBytes(hex: string): Uint8Array | null {
  const s = hex.trim();
  if (s.length % 2 !== 0) return null;
  if (s.length && !/^[0-9a-fA-F]+$/.test(s)) return null;

  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * A number as hex padded to exactly `byteLen` bytes.
 *
 * Truncates from the left when the value does not fit, because the callers
 * are building fixed-width protocol fields where a longer field would shift
 * everything after it.
 */
export function numberToHex(value: number, byteLen: number): string {
  const hex = Math.max(0, Math.floor(value)).toString(16);
  const width = byteLen * 2;
  return hex.length > width
    ? hex.slice(-width)
    : hex.padStart(width, "0");
}
