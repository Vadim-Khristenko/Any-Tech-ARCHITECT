/**
 * AmneziaWG Architect — TLS 1.3 Client Hello profile generator.
 */

import type { GeneratorInput } from "../types";
import {
  rnd,
  rh,
  hexPad,
  assertEvenHex,
  splitPad,
  getHost,
  getFpRange,
  alignTo128,
  CHROMIUM_PROFILES,
} from "../utils";

/** Record header: content type, legacy version, and the length that follows. */
const RECORD_HEADER = 5;

/**
 * Bytes of the ClientHello this blob actually writes: the handshake type and
 * its three-byte length, the legacy version, and the 32-byte client random.
 */
const HELLO_PREFIX = 1 + 3 + 2 + 32;

/** A handshake body length excludes its own type and length bytes. */
const HANDSHAKE_HEADER = 4;

/** Bytes a `<c>` or `<t>` tag contributes to the packet. */
const TAG_BYTES = 4;

/**
 * A TLS 1.3 ClientHello — record layer per RFC 8446 §5.1, handshake per §4.1.2.
 *
 * The two length fields are computed rather than approximated. A record header
 * declares how many bytes follow it and a handshake message declares its own
 * body length; both used to be drawn at random — `recLen - rnd(4, 9)` for the
 * handshake — so the record claimed one size while the packet carried another.
 * Checking that is the first thing anything parsing TLS does.
 *
 * Everything after the `<b>` blob is part of the record: the SNI-sized `<rc>`
 * filler, the `<r>` padding, and the counter and timestamp tags. So the
 * padding is decided first and the lengths written around it, the same way the
 * QUIC Initial works.
 */
export function mkTLS(input: GeneratorInput, iv: number): string {
  const host = getHost(input, "tls_client_hello");
  // server_name extension: type, length, list length, name type, name length.
  const sniExt = 2 + 2 + 2 + 1 + 2 + host.length;
  const sniRc = Math.min(sniExt, 64);

  const fpRange = getFpRange(input, "tls");
  const baseLen = fpRange ? rnd(fpRange[0], fpRange[1]) : rnd(300, 550);
  // Chromium pads its ClientHello to a multiple of 128 bytes, which is part of
  // what makes a Chrome handshake look like one.
  const target = CHROMIUM_PROFILES.has(input.browserProfile)
    ? alignTo128(baseLen)
    : baseLen;

  const tagBytes =
    (input.useTagRC ? sniRc : 0) +
    (input.useTagC ? TAG_BYTES : 0) +
    (input.useTagT ? TAG_BYTES : 0);

  const fixed = RECORD_HEADER + HELLO_PREFIX + tagBytes;
  const padding = input.useTagR
    ? Math.max(
        0,
        Math.min(target - fixed, input.mtu - fixed, rnd(20, 60) * iv, 300),
      )
    : 0;

  // The record covers everything after its own header; the handshake body
  // covers everything after the handshake type and length.
  const recordLen = HELLO_PREFIX + tagBytes + padding;
  const handshakeLen = recordLen - HANDSHAKE_HEADER;

  const hex = assertEvenHex(
    "160301" +
      hexPad(recordLen, 2) +
      "01" +
      hexPad(handshakeLen, 3) +
      "0303" +
      rh(32),
    "mkTLS",
  );

  return (
    `<b 0x${hex}>` +
    (input.useTagRC ? `<rc ${sniRc}>` : "") +
    (input.useTagR ? splitPad(padding) : "") +
    (input.useTagC ? "<c>" : "") +
    (input.useTagT ? "<t>" : "")
  );
}
