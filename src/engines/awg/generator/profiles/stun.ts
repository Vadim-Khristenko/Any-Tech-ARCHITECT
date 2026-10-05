/**
 * AmneziaWG Architect — STUN / TURN profile generator.
 *
 * What a WebRTC call puts on the wire before any media: a Binding request to
 * a STUN server, a TURN Allocate that the server answers with 401, the same
 * Allocate again with credentials, and then ICE connectivity checks between
 * the peers. All of it is STUN framing (RFC 8489), on UDP, to a port that is
 * often not 3478 at all, which is what makes it a reasonable thing for a
 * tunnel's first packets to be.
 */

import type { GeneratorInput, ProfileOptions } from "../types";
import { rnd, rh, hexPad, getHost, CHROMIUM_PROFILES } from "../utils";

/** The four packets of the flow, in the order a client sends them. */
export type StunVariant = "binding" | "allocate" | "allocate_auth" | "ice_check";

export const STUN_VARIANTS: readonly StunVariant[] = [
  "binding",
  "allocate",
  "allocate_auth",
  "ice_check",
];

/** RFC 8489 §5: every STUN message carries it at bytes 4..7. */
export const MAGIC_COOKIE = "2112a442";

/** Message types: method and class packed together (§5). Both are requests. */
const BINDING_REQUEST = "0001";
const ALLOCATE_REQUEST = "0003";

/** Attribute types, from RFC 8489 §18.3, RFC 8656 §18 and RFC 8445 §16. */
const ATTR = {
  USERNAME: 0x0006,
  MESSAGE_INTEGRITY: 0x0008,
  REALM: 0x0014,
  NONCE: 0x0015,
  REQUESTED_TRANSPORT: 0x0019,
  PRIORITY: 0x0024,
  USE_CANDIDATE: 0x0025,
  FINGERPRINT: 0x8028,
  ICE_CONTROLLING: 0x802a,
} as const;

/** XORed into the CRC-32 of a FINGERPRINT (§14.7): "STUN" in ASCII. */
const FINGERPRINT_XOR = 0x5354554e;

/* ── A chain of static bytes and runtime tags ─────────────────────────────── */

type Item = { hex: string } | { tag: string; bytes: number };

/**
 * Builds a CPS chain while counting the bytes it will put on the wire.
 *
 * STUN declares its own length in the header, so the count has to include
 * what the tags will emit at send time as well as the static bytes. Adjacent
 * static bytes merge into one `<b>`.
 */
class Chain {
  readonly items: Item[] = [];

  get length(): number {
    return this.items.reduce(
      (n, item) => n + ("hex" in item ? item.hex.length / 2 : item.bytes),
      0,
    );
  }

  /** True when every byte is known now, which a FINGERPRINT needs. */
  get isStatic(): boolean {
    return this.items.every((item) => "hex" in item);
  }

  hex(hex: string): this {
    if (hex) this.items.push({ hex });
    return this;
  }

  tag(tag: string, bytes: number): this {
    this.items.push({ tag, bytes });
    return this;
  }

  append(other: Chain): this {
    this.items.push(...other.items);
    return this;
  }

  /** The static bytes only. Meaningful when `isStatic`. */
  bytes(): string {
    return this.items.map((item) => ("hex" in item ? item.hex : "")).join("");
  }

  render(): string {
    let out = "";
    let pending = "";
    for (const item of this.items) {
      if ("hex" in item) {
        pending += item.hex;
        continue;
      }
      if (pending) out += `<b 0x${pending}>`;
      pending = "";
      out += item.tag;
    }
    if (pending) out += `<b 0x${pending}>`;
    return out;
  }
}

/** ASCII as hex. */
function ascii(text: string): string {
  let hex = "";
  for (const ch of text) hex += ch.charCodeAt(0).toString(16).padStart(2, "0");
  return hex;
}

/** Random letters, the alphabet `<rc>` draws from. */
function letters(n: number): string {
  const abc = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < n; i++) out += abc[rnd(0, abc.length - 1)];
  return out;
}

/**
 * One attribute: type, length, value, then zero padding to a 4-byte boundary
 * (§14). The length field counts the value without the padding.
 */
function attribute(type: number, value: Chain): Chain {
  const len = value.length;
  const pad = (4 - (len % 4)) % 4;
  return new Chain()
    .hex(hexPad(type, 2) + hexPad(len, 2))
    .append(value)
    .hex("00".repeat(pad));
}

/** `n` random bytes: a `<r>` when the reader may use it, fixed bytes when not. */
function random(input: GeneratorInput, n: number): Chain {
  return input.useTagR ? new Chain().tag(`<r ${n}>`, n) : new Chain().hex(rh(n));
}

/** `n` random letters, the same way. */
function randomLetters(input: GeneratorInput, n: number): Chain {
  return input.useTagRC
    ? new Chain().tag(`<rc ${n}>`, n)
    : new Chain().hex(ascii(letters(n)));
}

/* ── CRC-32, for FINGERPRINT ──────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (ISO 3309, the one §14.7 names) of a hex string. */
export function crc32(hex: string): number {
  let crc = 0xffffffff;
  for (let i = 0; i < hex.length; i += 2) {
    const byte = Number.parseInt(hex.slice(i, i + 2), 16);
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/* ── The message ──────────────────────────────────────────────────────────── */

/**
 * Header, attributes, and a FINGERPRINT when one can be told the truth.
 *
 * The header length counts the attributes, FINGERPRINT included, so it is
 * written last. A FINGERPRINT is the CRC of every byte before it, and a byte a
 * tag only produces at send time cannot be in a CRC computed now. A wrong
 * FINGERPRINT is a worse tell than none: anything that checks it rejects the
 * message, while plenty of real clients leave it out. So it goes in only when
 * the whole message is static, which is what switching the random tags off
 * buys.
 */
function message(input: GeneratorInput, type: string, attrs: Chain): string {
  // The transaction ID is 96 random bits that a real client draws per
  // request. `<r 12>` draws it per send, which is the same thing.
  const tid = random(input, 12);
  const fingerprint = attrs.isStatic && tid.isStatic;
  const length = attrs.length + (fingerprint ? 8 : 0);

  const msg = new Chain()
    .hex(type + hexPad(length, 2) + MAGIC_COOKIE)
    .append(tid)
    .append(attrs);

  if (fingerprint) {
    const crc = (crc32(msg.bytes()) ^ FINGERPRINT_XOR) >>> 0;
    msg.append(attribute(ATTR.FINGERPRINT, new Chain().hex(hexPad(crc, 4))));
  }
  return msg.render();
}

/**
 * A Binding request to a STUN server, as browsers send it while gathering
 * server-reflexive candidates: the header and nothing else. Twenty bytes.
 */
function binding(input: GeneratorInput): string {
  return message(input, BINDING_REQUEST, new Chain());
}

/** REQUESTED-TRANSPORT: UDP, protocol 17, then three reserved bytes. */
const udpTransport = () =>
  attribute(ATTR.REQUESTED_TRANSPORT, new Chain().hex("11000000"));

/**
 * The first TURN Allocate (RFC 8656 §7.1): only the transport it wants. The
 * server answers 401 with a realm and a nonce, which is what the next one
 * carries back.
 */
function allocate(input: GeneratorInput): string {
  return message(input, ALLOCATE_REQUEST, udpTransport());
}

/**
 * The Allocate retried with long-term credentials (RFC 8489 §9.2).
 *
 * The username is in the shape of the TURN REST API that coturn and most
 * hosted relays use, `<expiry>:<user>`, the expiry a Unix time a day or so
 * ahead. The realm is the host, which is what relays set it to in practice.
 * The nonce and the HMAC are opaque, so random bytes are exactly right.
 */
function allocateAuth(input: GeneratorInput): string {
  const host = getHost(input, "stun");
  const expiry = Math.floor(Date.now() / 1000) + rnd(3_600, 86_400);

  const user = new Chain();
  if (input.useTagRD) user.tag("<rd 10>", 10);
  else user.hex(ascii(String(expiry)));
  user.hex(ascii(":")).append(randomLetters(input, 8));

  const attrs = new Chain()
    .append(udpTransport())
    .append(attribute(ATTR.USERNAME, user))
    .append(attribute(ATTR.REALM, new Chain().hex(ascii(host))))
    .append(attribute(ATTR.NONCE, randomLetters(input, 16)))
    .append(attribute(ATTR.MESSAGE_INTEGRITY, random(input, 20)));

  return message(input, ALLOCATE_REQUEST, attrs);
}

/**
 * An ICE connectivity check (RFC 8445 §7.1.1), in the attribute order
 * libwebrtc uses.
 *
 * USERNAME is the two ufrags, `remote:local`. Chromium draws four characters
 * for each, Firefox eight. PRIORITY is what a peer-reflexive candidate gets
 * (§5.1.2.1): type preference 110 in the top byte, a local preference, and
 * 256 minus the component ID, component 1 being RTP. The tie-breaker is 64
 * random bits, and the controlling side nominates with USE-CANDIDATE.
 */
function iceCheck(input: GeneratorInput): string {
  const chromium = !input.browserProfile || CHROMIUM_PROFILES.has(input.browserProfile);
  const ufrag = chromium ? 4 : 8;

  const username = new Chain()
    .append(randomLetters(input, ufrag))
    .hex(ascii(":"))
    .append(randomLetters(input, ufrag));

  const localPreference = rnd(0x1e00, 0xffff);
  const priority = 110 * 2 ** 24 + localPreference * 2 ** 8 + 255;

  const attrs = new Chain()
    .append(attribute(ATTR.USERNAME, username))
    .append(attribute(ATTR.ICE_CONTROLLING, random(input, 8)));
  if (rnd(0, 1) === 1) attrs.append(attribute(ATTR.USE_CANDIDATE, new Chain()));
  attrs
    .append(attribute(ATTR.PRIORITY, new Chain().hex(hexPad(priority, 4))))
    .append(attribute(ATTR.MESSAGE_INTEGRITY, random(input, 20)));

  return message(input, BINDING_REQUEST, attrs);
}

const BUILD: Record<StunVariant, (input: GeneratorInput) => string> = {
  binding,
  allocate,
  allocate_auth: allocateAuth,
  ice_check: iceCheck,
};

/**
 * One STUN packet.
 *
 * With no variant named it is the authenticated Allocate, the one packet of
 * the flow that names a host, which makes it the right one to stand alone in
 * I1. `iv` changes nothing: STUN messages are as long as their attributes, and
 * padding one to look busier would make it look like nothing a client sends.
 */
export function mkSTUN(
  input: GeneratorInput,
  _iv: number,
  _opts: ProfileOptions = {},
  variant: StunVariant = "allocate_auth",
): string {
  return BUILD[variant](input);
}

/**
 * The flow, one packet per slot: what "apply to I2–I5" means for this profile.
 */
export const STUN_FLOW: readonly StunVariant[] = [
  "binding",
  "allocate",
  "allocate_auth",
  "ice_check",
  "ice_check",
];
