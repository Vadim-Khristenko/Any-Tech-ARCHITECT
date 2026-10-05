/**
 * AmneziaWG Architect — QUIC Initial / 0-RTT / HTTP3 profile generators.
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
  quicVarint,
} from "../utils";

/**
 * A QUIC Initial packet, per RFC 9000 §17.2.
 *
 * The header is built in the order the wire has it, and the Length field is
 * computed rather than filled with random bytes: it is a varint covering the
 * packet number plus everything after it, so it depends on how much padding
 * follows. That means the padding is decided first and the header assembled
 * around it.
 *
 * First byte: `1` header form, `1` fixed bit, `00` type Initial, `RR` reserved
 * (encrypted on the wire, so any value is plausible), `PP` packet number
 * length minus one. The client's first Initial must carry a Destination
 * Connection ID of at least 8 bytes (§7.2), and both connection IDs cap at 20.
 */
export function mkQUICi(input: GeneratorInput, iv: number): string {
  const host = getHost(input, "quic_initial");
  const dcid = rnd(8, 20);
  const scid = rnd(0, 20);
  const tokenLen = rnd(0, 1) === 0 ? 0 : rnd(8, 32);
  const sniRc = Math.min(host.length + rnd(0, 6), 64);
  const pnLen = rnd(1, 4);

  const prefix =
    hexPad(0xc0 | (pnLen - 1), 1) +
    "00000001" +
    hexPad(dcid, 1) +
    rh(dcid) +
    hexPad(scid, 1) +
    rh(scid) +
    quicVarint(tokenLen) +
    rh(tokenLen);

  const extraB =
    (input.useTagRC ? sniRc : 0) +
    (input.useTagC ? 4 : 0) +
    (input.useTagT ? 4 : 0);

  // The padding is the packet's payload, so it has to be known before the
  // Length that covers it. Two bytes are reserved for the Length varint —
  // anything past 63 bytes of payload needs them, and a QUIC Initial that
  // short would be strange in itself.
  //
  // `extraB` belongs in that Length as much as the padding does: every tag
  // below puts its bytes on the wire after this header, so a Length of
  // `pnLen + pad` under-declares the packet by exactly the tags' size. It
  // was counted for the MTU budget and left out of the field that describes
  // it — and a Length that does not cover what follows is the first thing a
  // QUIC reader checks.
  const headerB = prefix.length / 2 + 2 + pnLen;
  const pad = calcPadding(headerB, extraB, getFpRange(input, "qi"), iv, input.mtu);
  // Only what the tags actually put on the wire counts towards the
  // Length. With <r> off the padding is never sent.
  const sentPad = input.useTagR ? pad : 0;

  const hex = assertEvenHex(
    prefix + quicVarint(pnLen + sentPad + extraB) + rh(pnLen),
    "mkQUICi",
  );

  return (
    `<b 0x${hex}>` +
    (input.useTagRC ? `<rc ${sniRc}>` : "") +
    (input.useTagC ? "<c>" : "") +
    (input.useTagT ? "<t>" : "") +
    (input.useTagR ? splitPad(pad) : "")
  );
}

/**
 * A QUIC 0-RTT packet, per RFC 9000 §17.2.3.
 *
 * Type `01` in the first byte and — unlike an Initial — no token field: only
 * Initial carries one. What follows the connection IDs is the Length varint
 * and the packet number, so the Length is computed from the padding the same
 * way the Initial's is.
 */
export function mkQUIC0(input: GeneratorInput, iv: number): string {
  const host = getHost(input, "quic_0rtt");
  const dcid = rnd(8, 20);
  const scid = rnd(0, 20);
  const ticketHint = Math.min(host.length + rnd(4, 16), 48);
  const pnLen = rnd(1, 4);

  const prefix =
    hexPad(0xd0 | (pnLen - 1), 1) +
    "00000001" +
    hexPad(dcid, 1) +
    rh(dcid) +
    hexPad(scid, 1) +
    rh(scid);

  const mtu = input.mtu;
  const headerB = prefix.length / 2 + 2 + pnLen;
  const extraB =
    (input.useTagRC ? ticketHint : 0) +
    (input.useTagC ? 4 : 0) +
    (input.useTagT ? 4 : 0);
  const pad = calcPadding(headerB, extraB, getFpRange(input, "q0"), iv, mtu);
  // Only what the tags actually put on the wire counts towards the
  // Length. With <r> off the padding is never sent.
  const sentPad = input.useTagR ? pad : 0;

  const hex = assertEvenHex(
    prefix + quicVarint(pnLen + sentPad + extraB) + rh(pnLen),
    "mkQUIC0",
  );

  return (
    `<b 0x${hex}>` +
    (input.useTagT ? "<t>" : "") +
    (input.useTagR ? splitPad(pad) : "") +
    (input.useTagRC ? `<rc ${ticketHint}>` : "") +
    (input.useTagC ? "<c>" : "")
  );
}

/**
 * A QUIC packet from an HTTP/3 connection: Initial or Handshake.
 *
 * The two differ in more than the type nibble — an Initial carries a token
 * length and a Handshake does not (RFC 9000 §17.2.2 and §17.2.4). The old
 * version picked a first byte from a list spanning both types and then wrote
 * one structure for all of them, so half the packets had a field their own
 * type says should not be there, and every offset after it was wrong.
 */
export function mkHTTP3(input: GeneratorInput, iv: number): string {
  const host = getHost(input, "quic_initial");
  const dcid = rnd(8, 20);
  const scid = rnd(0, 20);
  const sniLen = Math.min(host.length + 9 + rnd(0, 6), 64);
  const pnLen = rnd(1, 4);

  // 0xc0 is Initial and 0xe0 is Handshake: the two long-header packets in a
  // connection's opening exchange.
  const isInitial = rnd(0, 1) === 0;
  const tokenLen = isInitial && rnd(0, 1) === 1 ? rnd(8, 32) : 0;

  const prefix =
    hexPad((isInitial ? 0xc0 : 0xe0) | (pnLen - 1), 1) +
    "00000001" +
    hexPad(dcid, 1) +
    rh(dcid) +
    hexPad(scid, 1) +
    rh(scid) +
    (isInitial ? quicVarint(tokenLen) + rh(tokenLen) : "");

  const mtu = input.mtu;
  const headerB = prefix.length / 2 + 2 + pnLen;
  const extraB =
    (input.useTagRC ? sniLen : 0) +
    (input.useTagC ? 4 : 0) +
    (input.useTagT ? 4 : 0);
  const pad = calcPadding(headerB, extraB, getFpRange(input, "h3"), iv, mtu);
  // Only what the tags actually put on the wire counts towards the
  // Length. With <r> off the padding is never sent.
  const sentPad = input.useTagR ? pad : 0;

  const hex = assertEvenHex(
    prefix + quicVarint(pnLen + sentPad + extraB) + rh(pnLen),
    "mkHTTP3",
  );

  return (
    `<b 0x${hex}>` +
    (input.useTagRC ? `<rc ${sniLen}>` : "") +
    (input.useTagR ? splitPad(pad) : "") +
    (input.useTagC ? "<c>" : "") +
    (input.useTagT ? "<t>" : "")
  );
}
