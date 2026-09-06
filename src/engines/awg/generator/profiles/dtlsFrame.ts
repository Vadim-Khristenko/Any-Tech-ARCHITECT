/**
 * AmneziaWG Architect — shared DTLS record framing for the 1.2/1.3 profiles.
 */

import type { GeneratorInput } from "../types";
import {
  rnd,
  hexPad,
  assertEvenHex,
  calcPadding,
  splitPad,
  getHost,
  getFpRange,
} from "../utils";

/** Record header: type, version, epoch, sequence number, length. */
const RECORD_HEADER = 1 + 2 + 2 + 6 + 2;

/**
 * Handshake header: type, length, message sequence, fragment offset, fragment
 * length. Both DTLS versions frame the first flight the same way.
 */
const HANDSHAKE_HEADER = 1 + 3 + 2 + 3 + 3;

/** Bytes a `<c>` or `<t>` tag contributes. */
const TAG_BYTES = 4;

export interface DtlsChainOpts {
  /** assertEvenHex label, e.g. "mkDTLS12". */
  label: string;
  /** Host-pool key, e.g. "dtls_1_2". */
  poolKey: string;
  /** ClientHello body: legacy_version + random + version tail. */
  body: string;
}

/**
 * One unfragmented DTLS first flight: epoch 0, message sequence 0, fragment
 * offset 0 with the fragment length equal to the handshake length.
 *
 * A ClientHello is the first message of the first flight, before any cipher
 * change, so its epoch is 0 and nothing else is possible. A random one is a
 * giveaway, not variety. The record length describes the message it precedes.
 */
export function dtlsChain(
  input: GeneratorInput,
  iv: number,
  opts: DtlsChainOpts,
): string {
  const host = getHost(input, opts.poolKey);
  const sniRc = Math.min(host.length + rnd(2, 8), 60);

  const tagBytes =
    (input.useTagRC ? sniRc : 0) +
    (input.useTagC ? TAG_BYTES : 0) +
    (input.useTagT ? TAG_BYTES : 0);

  const fixed = RECORD_HEADER + HANDSHAKE_HEADER + opts.body.length / 2;
  const padding = input.useTagR
    ? calcPadding(fixed, tagBytes, getFpRange(input, "dtls"), iv, input.mtu)
    : 0;

  // The handshake body is everything after the handshake header; the record
  // carries the header and the body together.
  const bodyLen = opts.body.length / 2 + tagBytes + padding;
  const recordLen = HANDSHAKE_HEADER + bodyLen;

  const hex = assertEvenHex(
    "16" +
      // DTLSPlaintext.legacy_record_version is {254,253} in both versions:
      // RFC 6347 §4.1 for 1.2, RFC 9147 §4 for 1.3.
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
      opts.body,
    opts.label,
  );

  return (
    `<b 0x${hex}>` +
    (input.useTagRC ? `<rc ${sniRc}>` : "") +
    (input.useTagC ? "<c>" : "") +
    (input.useTagT ? "<t>" : "") +
    (input.useTagR ? splitPad(padding) : "")
  );
}
