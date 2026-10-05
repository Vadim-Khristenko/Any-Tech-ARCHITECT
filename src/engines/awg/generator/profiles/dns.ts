/**
 * AmneziaWG Architect — DNS query profile generator.
 */

import type { GeneratorInput } from "../types";
import { rnd, rh, assertEvenHex, splitPad, getHost } from "../utils";

/** A DNS label is length-prefixed by one byte, so it cannot exceed 63. */
const MAX_LABEL = 63;

/** The wire limit for an encoded name. */
const MAX_NAME = 255;

/** The fixed header: ID, flags, and the four section counts. */
const DNS_HEADER = 12;

/** OPT pseudo-record, RFC 6891: name, type, class, TTL, RDLENGTH. */
const OPT_FIXED = 1 + 2 + 2 + 4 + 2;

/** The Padding option's own header: option code and option length. RFC 7830. */
const PAD_OPTION_HEADER = 4;

/** UDP payload size advertised in the OPT record's CLASS field. */
const EDNS_UDP_SIZE = 1232;

/** Encode a hostname as DNS labels, ending with the root label. */
function encodeName(host: string): string {
  let hex = "";
  let bytes = 0;

  for (const label of host.split(".")) {
    if (!label) continue;
    // A label longer than 63 cannot be length-prefixed: the top two bits of
    // the length byte are reserved for compression pointers, so 0x40 and
    // above mean something else and the name stops parsing there.
    const clipped = label.slice(0, MAX_LABEL);
    if (bytes + 1 + clipped.length + 1 > MAX_NAME) break;

    hex += clipped.length.toString(16).padStart(2, "0");
    for (const ch of clipped) {
      hex += ch.charCodeAt(0).toString(16).padStart(2, "0");
    }
    bytes += 1 + clipped.length;
  }

  return hex + "00";
}

const u16 = (n: number) => Math.max(0, n).toString(16).padStart(4, "0");

/**
 * A DNS query, per RFC 1035 §4.1, padded the way DNS actually pads.
 *
 * The padding used to be appended after the question section, which makes the
 * message malformed: with QDCOUNT 1 and every other count 0 there is nothing
 * to account for the trailing bytes, so a resolver reading the message runs
 * past what it was told to expect.
 *
 * DNS has a mechanism for exactly this. An OPT pseudo-record in the additional
 * section carries a Padding option (RFC 7830) — what DNS-over-TLS and
 * DNS-over-HTTPS clients send to hide how long a query is. So the message
 * declares ARCOUNT 1, writes the OPT record, and the `<r>` bytes that follow
 * are that option's data: a valid message, rather than a valid message with
 * rubbish stuck to the end.
 */
export function mkDNS(input: GeneratorInput, iv: number): string {
  // A on even iterations, AAAA on odd: a resolver asks for both in practice.
  // The type is settled before the name is drawn, because the name has to be
  // one that answers it — a query for AAAA on a name with only an A record is
  // a question nobody asks twice.
  const wantsIpv6 = iv % 2 !== 0;
  const host = getHost(input, "dns_query", wantsIpv6 ? "AAAA" : "A");

  const txid = rh(2);
  // Standard query, recursion desired.
  const flags = "0100";
  const qdcount = "0001";
  const ancount = "0000";
  const nscount = "0000";

  const qname = encodeName(host);
  const qtype = wantsIpv6 ? "001c" : "0001";
  const qclass = "0001";

  const question = qname + qtype + qclass;
  const questionBytes = question.length / 2;

  // Padding is only claimed when the tag that produces it is on: otherwise the
  // OPT record would advertise bytes that never arrive, which is the same
  // mismatch in the other direction.
  // The MTU comes from a number field, and a browser does not enforce
  // `min` on a typed value. Below about 83 the upper bound fell under the
  // lower one and the draw threw, which killed the Generate button silently.
  const ceiling = Math.min(512, input.mtu - 20);
  const wanted = ceiling <= 64 ? Math.max(0, ceiling) : rnd(64, ceiling);
  const room =
    input.mtu - DNS_HEADER - questionBytes - OPT_FIXED - PAD_OPTION_HEADER;
  const padding = input.useTagR
    ? Math.max(
        0,
        Math.min(wanted - DNS_HEADER - questionBytes, room, 200),
      )
    : 0;

  const padded = padding > 0;
  const arcount = padded ? "0001" : "0000";

  // OPT: root name, type 41, CLASS carries the UDP payload size, TTL is zero
  // (extended rcode and flags), RDLENGTH covers the whole padding option.
  const opt = padded
    ? "00" +
      "0029" +
      u16(EDNS_UDP_SIZE) +
      "00000000" +
      u16(PAD_OPTION_HEADER + padding) +
      // Option code 12 is Padding; its length is the bytes that follow.
      "000c" +
      u16(padding)
    : "";

  const hex = assertEvenHex(
    txid + flags + qdcount + ancount + nscount + arcount + question + opt,
    "mkDNS",
  );

  return (
    `<b 0x${hex}>` +
    (padded ? splitPad(padding) : "") +
    (input.useTagT ? "<t>" : "") +
    (input.useTagC ? "<c>" : "")
  );
}
