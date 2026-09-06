/**
 * AmneziaWG Architect — DTLS 1.3 Client Hello profile generator.
 */

import type { GeneratorInput } from "../types";
import {
  rnd,
  rh,
  hexPad,
  assertEvenHex,
  calcPadding,
  splitPad,
  getHost,
  getFpRange,
} from "../utils";

/** Record header: type, version, epoch, sequence number, length. RFC 9147 §4. */
const RECORD_HEADER = 1 + 2 + 2 + 6 + 2;

/**
 * Handshake header: type, length, message sequence, fragment offset, fragment
 * length. 1.3 keeps the 1.2 flight framing.
 */
const HANDSHAKE_HEADER = 1 + 3 + 2 + 3 + 3;

/**
 * Fixed ClientHello tail after the 32-byte random. RFC 9147 §5.3: empty
 * session id, empty cookie (a 1.3-only client sends zero length), three
 * DTLS-OK TLS 1.3 suites, null compression, and a single supported_versions
 * extension announcing 0xfefc. Both version fields on the wire stay 0xfefd —
 * that is what the RFC requires, not an omission.
 */
const BODY_TAIL_13 =
  "0000" + // session id + cookie, both empty
  "0006" + // suites length
  "130113021303" + // TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256
  "0100" + // compression: length 1, null
  "0009" + // extensions length
  "002b000302fefc"; // supported_versions -> DTLS 1.3

/** Body this blob writes: client version, random, and the §5.3 tail. */
const BODY_PREFIX = 2 + 32 + BODY_TAIL_13.length / 2;

/** Bytes a `<c>` or `<t>` tag contributes. */
const TAG_BYTES = 4;

/**
 * A DTLS 1.3 ClientHello.
 *
 * Unfragmented first flight: epoch 0, message sequence 0, fragment offset 0
 * with the fragment length equal to the handshake length.
 */
export function mkDTLS13(input: GeneratorInput, iv: number): string {
  const host = getHost(input, "dtls_1_3");
  const sniRc = Math.min(host.length + rnd(2, 8), 60);

  const tagBytes =
    (input.useTagRC ? sniRc : 0) +
    (input.useTagC ? TAG_BYTES : 0) +
    (input.useTagT ? TAG_BYTES : 0);

  const fixed = RECORD_HEADER + HANDSHAKE_HEADER + BODY_PREFIX;
  const padding = input.useTagR
    ? calcPadding(fixed, tagBytes, getFpRange(input, "dtls"), iv, input.mtu)
    : 0;

  const bodyLen = BODY_PREFIX + tagBytes + padding;
  const recordLen = HANDSHAKE_HEADER + bodyLen;

  const hex = assertEvenHex(
    "16" +
      // DTLSPlaintext.legacy_record_version is {254,253} even for 1.3.
      "fefd" +
      // Epoch 0 — nothing has changed cipher yet.
      "0000" +
      // A 48-bit sequence number. Real stacks start at zero and count up, so
      // a low one is what a first flight looks like.
      hexPad(0, 4) +
      hexPad(rnd(0, 4), 2) +
      hexPad(recordLen, 2) +
      "01" +
      hexPad(bodyLen, 3) +
      // First handshake message of the flight.
      "0000" +
      // Unfragmented: offset zero, fragment length equal to the whole body.
      "000000" +
      hexPad(bodyLen, 3) +
      // ClientHello.legacy_version, also {254,253} per RFC 9147 §5.3.
      "fefd" +
      rh(32) +
      BODY_TAIL_13,
    "mkDTLS13",
  );

  return (
    `<b 0x${hex}>` +
    (input.useTagRC ? `<rc ${sniRc}>` : "") +
    (input.useTagC ? "<c>" : "") +
    (input.useTagT ? "<t>" : "") +
    (input.useTagR ? splitPad(padding) : "")
  );
}
