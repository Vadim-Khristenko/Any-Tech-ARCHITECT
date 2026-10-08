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
  /**
   * The extensions a body that reaches its extensions block carries, as hex,
   * without the length in front. When set, the extensions length is written
   * here and covers what the tags add after them: those bytes go into a
   * GREASE extension (RFC 8701), whose content a receiver must ignore, so the
   * ClientHello parses to its last byte. Padding (RFC 7685) would be the
   * obvious home, but its content has to be zeros and `<r>` is not.
   */
  extensions?: string;
}

/** A GREASE extension type, one of 0x0a0a, 0x1a1a ... 0xfafa. */
function greaseType(): string {
  const n = rnd(0, 15).toString(16);
  return `${n}a${n}a`;
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

  // Two bytes of extensions length, and four of GREASE header when the
  // tags put anything after the declared extensions.
  const extOverhead = opts.extensions === undefined ? 0 : 2 + 4;
  const fixed =
    RECORD_HEADER +
    HANDSHAKE_HEADER +
    opts.body.length / 2 +
    (opts.extensions?.length ?? 0) / 2 +
    extOverhead;
  const padding = input.useTagR
    ? calcPadding(fixed, tagBytes, getFpRange(input, "dtls"), iv, input.mtu)
    : 0;

  const trail = tagBytes + padding;
  let body = opts.body;
  if (opts.extensions !== undefined) {
    const grease = trail > 0 ? greaseType() + hexPad(trail, 2) : "";
    body +=
      hexPad(opts.extensions.length / 2 + grease.length / 2 + trail, 2) +
      opts.extensions +
      grease;
  }

  // The handshake body is everything after the handshake header; the record
  // carries the header and the body together.
  const bodyLen = body.length / 2 + trail;
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
      body,
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
