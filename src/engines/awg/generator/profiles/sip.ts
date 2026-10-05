/**
 * AmneziaWG Architect — SIP REGISTER profile generator.
 */

import type { GeneratorInput, ProfileOptions } from "../types";
import { rnd, rh, assertEvenHex, splitPad, getHost } from "../utils";

/** ASCII as hex. SIP is a text protocol, so the blob is text. */
function ascii(text: string): string {
  let hex = "";
  for (const ch of text) hex += ch.charCodeAt(0).toString(16).padStart(2, "0");
  return hex;
}

/** A hex token, for branch, tag and Call-ID values. */
const token = (bytes: number) => rh(bytes);

/** Bytes a `<c>` or `<t>` tag contributes. */
const TAG_BYTES = 4;

/**
 * The same REGISTER in RFC 3261's compact form (§7.3.3), for when the chain
 * has to be short.
 *
 * Every SIP parser accepts the one-letter names (`v` Via, `f` From, `t` To,
 * `i` Call-ID, `l` Content-Length), and phones use them for exactly this
 * reason: to keep a request inside one UDP datagram. Contact and User-Agent
 * are left out because a REGISTER is valid without either, a Contact-less one
 * being a query for the current bindings. What remains is the set §10.2 makes
 * mandatory, at about two thirds of the bytes.
 *
 * Five full requests came to up to 4.3 KB of I1–I5, more than the kernel module
 * can take in one netlink message (see ../chainBudget.ts, issue #17).
 */
function compactHeaders(host: string, user: string): string[] {
  return [
    `REGISTER sip:${host} SIP/2.0`,
    `v: SIP/2.0/UDP ${host}:5060;branch=z9hG4bK${token(5)};rport`,
    `Max-Forwards: 70`,
    `f: <sip:${user}@${host}>;tag=${token(4)}`,
    `t: <sip:${user}@${host}>`,
    `i: ${token(8)}@${host}`,
    `CSeq: ${rnd(1, 9999)} REGISTER`,
  ];
}

/**
 * A SIP REGISTER request, per RFC 3261 §7.1.
 *
 * The request line used to be `REGISTER sip:<host> ` followed by four random
 * bytes, where SIP wants the protocol version. Any parser rejects that on the
 * first line, before it reaches anything else.
 *
 * A REGISTER also carries mandatory headers — Via with a branch that starts
 * with the magic cookie `z9hG4bK`, From and To with the address of record, a
 * Call-ID, a CSeq naming the method, Max-Forwards and Content-Length. They are
 * written here because a request line with nothing after it is not a message
 * either.
 *
 * The padding goes in the body, with Content-Length declaring it. That is how
 * SIP carries arbitrary bytes — a body of SDP being the usual case — so the
 * padded message stays a valid one rather than a valid one with rubbish stuck
 * to the end.
 */
export function mkSIP(
  input: GeneratorInput,
  iv: number,
  opts: ProfileOptions = {},
): string {
  const host = getHost(input, "sip");
  const user = `user${rnd(1000, 9999)}`;

  const rcVal = Math.min(host.length + rnd(8, 24) * iv, 150);
  const tagBytes =
    (input.useTagRC ? rcVal : 0) +
    (input.useTagC ? TAG_BYTES : 0) +
    (input.useTagT ? TAG_BYTES : 0);

  const headers = opts.compact
    ? compactHeaders(host, user)
    : [
        `REGISTER sip:${host} SIP/2.0`,
        // The branch must start with z9hG4bK for anything following RFC 3261
        // to treat the request as one of its own.
        `Via: SIP/2.0/UDP ${host}:5060;branch=z9hG4bK${token(7)};rport`,
        `Max-Forwards: 70`,
        `From: <sip:${user}@${host}>;tag=${token(5)}`,
        `To: <sip:${user}@${host}>`,
        `Call-ID: ${token(10)}@${host}`,
        `CSeq: ${rnd(1, 9999)} REGISTER`,
        `Contact: <sip:${user}@${host}:5060>;expires=3600`,
        `User-Agent: ${input.mimicAll ? "Linphone/5.2.5" : "PJSUA v2.13"}`,
      ];

  const prefix = headers.join("\r\n") + "\r\n";
  // Reserve room for the Content-Length line and the blank line that ends the
  // headers before deciding how much body there is room for.
  const room = Math.max(
    0,
    input.mtu - prefix.length - tagBytes - "Content-Length: 9999\r\n\r\n".length,
  );
  const padding = input.useTagR
    ? Math.min(rnd(5, 30) * iv, 120, room)
    : 0;

  // Content-Length counts the body: the padding plus whatever the remaining
  // tags emit into it.
  const lengthHeader = opts.compact ? "l" : "Content-Length";
  const message = `${prefix}${lengthHeader}: ${padding + tagBytes}\r\n\r\n`;

  const hex = assertEvenHex(ascii(message), "mkSIP");

  return (
    `<b 0x${hex}>` +
    (input.useTagRC ? `<rc ${rcVal}>` : "") +
    (input.useTagC ? "<c>" : "") +
    (input.useTagT ? "<t>" : "") +
    (input.useTagR ? splitPad(padding) : "")
  );
}
