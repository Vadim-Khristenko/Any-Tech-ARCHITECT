/**
 * AmneziaWG Architect — DTLS 1.2 Client Hello profile generator.
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

/** Record header: type, version, epoch, sequence number, length. RFC 6347 §4.1. */
const RECORD_HEADER = 1 + 2 + 2 + 6 + 2;

/**
 * Handshake header: type, length, message sequence, fragment offset, fragment
 * length. RFC 6347 §4.2.2 — DTLS adds the last three to TLS's two.
 */
const HANDSHAKE_HEADER = 1 + 3 + 2 + 3 + 3;

/** Body this blob writes: the client version and the 32-byte random. */
const BODY_PREFIX = 2 + 32;

/** Bytes a `<c>` or `<t>` tag contributes. */
const TAG_BYTES = 4;

/**
 * A DTLS 1.2 ClientHello.
 *
 * Three things were wrong, all of the kind a parser hits before it looks at
 * anything interesting:
 *
 *   - The epoch was drawn from 0–255. A ClientHello is the first message of
 *     the first flight, before any cipher change, so its epoch is 0 and
 *     nothing else is possible. A random one is a giveaway, not variety.
 *   - After the handshake type came six random bytes where DTLS wants eleven
 *     structured ones — a three-byte length, a two-byte message sequence, and
 *     a three-byte fragment offset and length. Everything past that point was
 *     being read at the wrong offset.
 *   - The record length was drawn at random rather than describing the
 *     message it precedes.
 *
 * The message is unfragmented, so the fragment offset is 0 and the fragment
 * length equals the handshake length, which is what an unfragmented DTLS
 * handshake message looks like.
 */
export function mkDTLS12(input: GeneratorInput, iv: number): string {
  const host = getHost(input, "dtls_1_2");
  const sniRc = Math.min(host.length + rnd(2, 8), 60);

  const tagBytes =
    (input.useTagRC ? sniRc : 0) +
    (input.useTagC ? TAG_BYTES : 0) +
    (input.useTagT ? TAG_BYTES : 0);

  const fixed = RECORD_HEADER + HANDSHAKE_HEADER + BODY_PREFIX;
  const padding = input.useTagR
    ? calcPadding(fixed, tagBytes, getFpRange(input, "dtls"), iv, input.mtu)
    : 0;

  // The handshake body is everything after the handshake header; the record
  // carries the header and the body together.
  const bodyLen = BODY_PREFIX + tagBytes + padding;
  const recordLen = HANDSHAKE_HEADER + bodyLen;

  const hex = assertEvenHex(
    "16" +
      // DTLS 1.2 is 0xfefd: the version is ones' complement, so it counts
      // down where TLS counts up.
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
      "fefd" +
      rh(32),
    "mkDTLS12",
  );

  return (
    `<b 0x${hex}>` +
    (input.useTagRC ? `<rc ${sniRc}>` : "") +
    (input.useTagC ? "<c>" : "") +
    (input.useTagT ? "<t>" : "") +
    (input.useTagR ? splitPad(padding) : "")
  );
}
