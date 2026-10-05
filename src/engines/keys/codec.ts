/**
 * The `vpn://` envelope: base64url of a four-byte length header and zlib.
 *
 * The header is read as a hint. Every Amnezia API key gets it wrong — see
 * the note on `vpnDecode` — and refusing those keys was a real bug.
 */

import pako from "pako";
import { LocalisedError } from "@/shared/errors";
import type { VpnConfig } from "./types";


/**
 * Decode a `vpn://...` string into a JS object.
 * Exact port of decode_config() from test_py.py.
 */
export function vpnDecode(str: string): VpnConfig {
  let encoded = str.trim();
  if (encoded.startsWith("vpn://")) encoded = encoded.slice(6);

  // Restore base64url padding
  const pad = (4 - (encoded.length % 4)) % 4;
  encoded += "=".repeat(pad);

  // base64url → standard base64 (-→+, _→/)
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");

  /*
   * `atob` throws on anything outside Latin-1, and its message says so in
   * English regardless of the reader's language. Someone who pasted a
   * paragraph, a Cyrillic label, or half a key gets a browser exception where
   * they should get a sentence about their key, so the check happens here.
   */
  let binary: string;
  try {
    binary = atob(b64);
  } catch {
    throw new LocalisedError(
      "mk.err.notBase64",
      {},
      "the key is not valid base64",
    );
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // A key that is plain base64 JSON never reached the inflate path anyway, and
  // trying it first keeps the error from the compressed branch meaningful.
  const asText = new TextDecoder("utf-8").decode(bytes);
  if (asText.trimStart().startsWith("{")) {
    try {
      return JSON.parse(asText) as VpnConfig;
    } catch {
      // Looked like JSON and was not; fall through to the compressed path.
    }
  }

  try {
    const compressed = bytes.slice(4);
    const decompressed = pako.inflate(compressed);

    /*
     * The four-byte header is a hint, not a contract.
     *
     * It used to be enforced, and that rejected every Amnezia API key outright:
     * an "Amnezia Premium" key declares 255 bytes and inflates to 258, a
     * current "Amnezia Free" key declares the same 255 and inflates to 264.
     * Two independently issued keys both claiming exactly 0xFF is not a
     * coincidence — whatever writes them does not compute the field — while
     * the JSON that comes out of both is complete and valid.
     *
     * Server-issued keys carry a real length and still round-trip exactly, so
     * a mismatch is worth noticing; it is not worth refusing a key over.
     */
    return JSON.parse(
      new TextDecoder("utf-8").decode(decompressed),
    ) as VpnConfig;
  } catch (zlibErr) {
    // Fallback: data is not compressed — just base64-encoded JSON (old format)
    try {
      return JSON.parse(new TextDecoder("utf-8").decode(bytes)) as VpnConfig;
    } catch {
      throw new LocalisedError(
        "mk.err.decode",
        { error: zlibErr instanceof Error ? zlibErr.message : String(zlibErr) },
        "the key could not be decoded",
      );
    }
  }
}

/**
 * Encode a JS object into a `vpn://...` string.
 */
export function vpnEncode(obj: VpnConfig): string {
  const jsonStr = JSON.stringify(obj, null, 4);
  const jsonBytes = new TextEncoder().encode(jsonStr);
  const compressed = pako.deflate(jsonBytes);

  // 4-byte big-endian header with original length
  const originalLen = jsonBytes.length;
  const combined = new Uint8Array(4 + compressed.length);
  combined[0] = (originalLen >>> 24) & 0xff;
  combined[1] = (originalLen >>> 16) & 0xff;
  combined[2] = (originalLen >>> 8) & 0xff;
  combined[3] = originalLen & 0xff;
  combined.set(compressed, 4);

  // binary → base64url (no padding =)
  let binary = "";
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  const b64url = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return "vpn://" + b64url;
}


export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
