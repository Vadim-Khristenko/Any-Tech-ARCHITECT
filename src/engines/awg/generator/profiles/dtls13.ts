/**
 * AmneziaWG Architect — DTLS 1.3 Client Hello profile generator.
 */

import type { GeneratorInput } from "../types";
import { rh } from "../utils";
import { dtlsChain } from "./dtlsFrame";

/**
 * Fixed ClientHello tail after the 32-byte random. RFC 9147 §5.3: empty
 * session id, empty cookie (a 1.3-only client sends zero length), three
 * DTLS-OK TLS 1.3 suites, null compression, and a single supported_versions
 * extension announcing 0xfefc. Both version fields on the wire stay 0xfefd —
 * that is what the RFC requires, not an omission. Record framing lives in
 * ./dtlsFrame.
 */
const BODY_TAIL_13 =
  "0000" + // session id + cookie, both empty
  "0006" + // suites length
  "130113021303" + // TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256
  "0100"; // compression: length 1, null

/**
 * supported_versions announcing DTLS 1.3: type 0x002b, length 3, a one-byte
 * list length of 2, then 0xfefc. Seven bytes; the extensions length in front
 * of it is written by dtlsChain, which also counts what the tags add after it.
 * It used to be a fixed "0009", two bytes more than were there.
 */
const EXTENSIONS_13 = "002b000302fefc";

/**
 * A DTLS 1.3 ClientHello: legacy_version, random, and the §5.3 tail.
 */
export function mkDTLS13(input: GeneratorInput, iv: number): string {
  return dtlsChain(input, iv, {
    label: "mkDTLS13",
    poolKey: "dtls_1_3",
    // ClientHello.legacy_version, also {254,253} per RFC 9147 §5.3.
    body: "fefd" + rh(32) + BODY_TAIL_13,
    extensions: EXTENSIONS_13,
  });
}
