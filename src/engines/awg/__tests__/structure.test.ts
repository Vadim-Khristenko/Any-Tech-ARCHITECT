import { describe, it, expect } from "bun:test";

import { awgEngine } from "../index";
import { mkDNS, mkDTLS13, type GeneratorInput } from "@/engines/awg/generator";

/**
 * Two profiles that reach deeper than their outer lengths: the DTLS 1.3
 * ClientHello carries a full extensions block, and the DNS query an OPT
 * record. Both are read here to their last byte, with every tag combination,
 * because a declared length that disagrees with what follows is the first
 * thing a strict parser trips on. Reported against both by the
 * awg-containers-and-tools port.
 */

const input = (over: Partial<GeneratorInput> = {}): GeneratorInput => ({
  ...awgEngine.createDefaults(),
  customHost: "example.org",
  ...over,
});

/** The wire bytes, with each tag stood in for by as many bytes as it sends. */
function expand(chain: string): Uint8Array {
  const out: number[] = [];
  for (const m of chain.matchAll(/<(b 0x([0-9a-f]*)|r (\d+)|rc (\d+)|rd (\d+)|t|c)>/g)) {
    if (m[2] !== undefined) {
      for (let i = 0; i < m[2].length; i += 2) out.push(Number.parseInt(m[2].slice(i, i + 2), 16));
    } else {
      const n = Number(m[3] ?? m[4] ?? m[5] ?? 4);
      out.push(...Array(n).fill(0x41));
    }
  }
  return Uint8Array.from(out);
}

const u16 = (b: Uint8Array, at: number) => (b[at]! << 8) | b[at + 1]!;
const u24 = (b: Uint8Array, at: number) => (b[at]! << 16) | (b[at + 1]! << 8) | b[at + 2]!;

const TAG_SETS: Partial<GeneratorInput>[] = [
  { useTagR: true, useTagRC: true, useTagC: true, useTagT: true },
  { useTagR: false, useTagRC: false, useTagC: false, useTagT: false },
  { useTagR: false, useTagRC: false, useTagC: false, useTagT: true },
  { useTagR: false, useTagRC: true, useTagC: true, useTagT: false },
  { useTagR: true, useTagRC: false, useTagC: false, useTagT: false },
];

describe("the DTLS 1.3 ClientHello, to its last byte", () => {
  /** RFC 9147 §4 record, §5.2 handshake, §5.3 ClientHello. Returns extension types. */
  function parse(b: Uint8Array): number[] {
    expect(b[0]).toBe(0x16);
    const recordLen = u16(b, 11);
    expect(b.length).toBe(13 + recordLen);
    expect(b[13]).toBe(0x01);
    const bodyLen = u24(b, 14);
    expect(u24(b, 22)).toBe(bodyLen);
    let at = 25;
    expect(b.length).toBe(at + bodyLen);

    at += 2 + 32; // legacy_version, random
    at += 1 + b[at]!; // session id
    at += 1 + b[at]!; // cookie
    at += 2 + u16(b, at); // cipher suites
    at += 1 + b[at]!; // compression methods
    const extLen = u16(b, at);
    at += 2;
    expect(at + extLen).toBe(b.length);

    const types: number[] = [];
    const end = at + extLen;
    while (at < end) {
      types.push(u16(b, at));
      at += 4 + u16(b, at + 2);
    }
    expect(at).toBe(end);
    return types;
  }

  for (const tags of TAG_SETS) {
    it(`parses with ${JSON.stringify(tags)}`, () => {
      for (let k = 0; k < 30; k++) {
        const types = parse(expand(mkDTLS13(input(tags), 2)));
        expect(types[0]).toBe(0x002b);
        // Whatever the tags add rides in one GREASE extension after it.
        for (const t of types.slice(1)) expect(t & 0x0f0f).toBe(0x0a0a);
        expect(types.length).toBeLessThanOrEqual(2);
      }
    });
  }

  it("carries supported_versions with DTLS 1.3 and nothing else when no tag is on", () => {
    const off = TAG_SETS[1]!;
    expect(parse(expand(mkDTLS13(input(off), 2)))).toEqual([0x002b]);
  });
});

describe("the DNS query, to its last byte", () => {
  /** RFC 1035 §4.1 with an RFC 6891 OPT record. Returns ARCOUNT. */
  function parse(b: Uint8Array): number {
    const qd = u16(b, 4);
    const an = u16(b, 6);
    const ns = u16(b, 8);
    const ar = u16(b, 10);
    expect([qd, an, ns]).toEqual([1, 0, 0]);
    let at = 12;
    while (b[at] !== 0) at += 1 + b[at]!;
    at += 1 + 4; // root label, QTYPE, QCLASS
    if (ar === 1) {
      expect(b[at]).toBe(0); // root name
      expect(u16(b, at + 1)).toBe(41); // OPT
      const rdlen = u16(b, at + 9);
      at += 11;
      expect(u16(b, at)).toBe(12); // Padding option
      expect(u16(b, at + 2)).toBe(rdlen - 4);
      at += rdlen;
    }
    expect(at).toBe(b.length);
    return ar;
  }

  for (const tags of TAG_SETS) {
    it(`leaves no byte after the message with ${JSON.stringify(tags)}`, () => {
      for (let k = 0; k < 30; k++) parse(expand(mkDNS(input(tags), k)));
    });
  }

  it("declares the OPT record whenever a tag puts bytes after the question", () => {
    expect(parse(expand(mkDNS(input({ ...TAG_SETS[2] }), 0)))).toBe(1);
    expect(parse(expand(mkDNS(input({ ...TAG_SETS[1] }), 0)))).toBe(0);
  });
});
