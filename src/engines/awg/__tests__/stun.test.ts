import { describe, it, expect } from "bun:test";

import { awgEngine } from "../index";
import { checkAwgParams } from "../rules";
import {
  chainBytes,
  genCfg,
  genI1,
  KMOD_CHAIN_BUDGET,
  mkSTUN,
  PROFILE_LABELS,
  STUN_FLOW,
  type GeneratorInput,
  type StunVariant,
} from "@/engines/awg/generator";
import { crc32, MAGIC_COOKIE } from "@/engines/awg/generator/profiles/stun";

/**
 * The STUN / TURN profile, read back the way a STUN parser reads it: header
 * length against what follows, every attribute's length against its value and
 * its padding, and the FINGERPRINT against a CRC computed here.
 */

const seeded = (over: Partial<GeneratorInput> = {}): GeneratorInput => ({
  ...awgEngine.createDefaults(),
  version: "2.0",
  profile: "stun",
  customHost: "turn.example.org",
  useTagR: true,
  useTagRC: true,
  useTagRD: true,
  ...over,
});

/** What the tags put on the wire at send time, stood in for by fixed bytes. */
function expand(chain: string): { bytes: Uint8Array; dynamic: boolean } {
  const out: number[] = [];
  let dynamic = false;
  for (const m of chain.matchAll(/<(b 0x([0-9a-f]*)|r (\d+)|rc (\d+)|rd (\d+)|t|c)>/g)) {
    if (m[2] !== undefined) {
      for (let i = 0; i < m[2].length; i += 2) out.push(Number.parseInt(m[2].slice(i, i + 2), 16));
    } else if (m[3] !== undefined) {
      dynamic = true;
      out.push(...Array(Number(m[3])).fill(0x5a));
    } else if (m[4] !== undefined) {
      dynamic = true;
      out.push(...Array(Number(m[4])).fill(0x61));
    } else if (m[5] !== undefined) {
      dynamic = true;
      out.push(...Array(Number(m[5])).fill(0x30));
    } else {
      throw new Error(`unexpected tag ${m[0]} in a STUN chain`);
    }
  }
  return { bytes: Uint8Array.from(out), dynamic };
}

const u16 = (b: Uint8Array, at: number) => (b[at]! << 8) | b[at + 1]!;
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");

interface Parsed {
  type: number;
  attrs: { type: number; value: Uint8Array }[];
  bytes: Uint8Array;
}

/** RFC 8489 §5 and §14, strictly. */
function parse(chain: string): Parsed {
  const { bytes } = expand(chain);
  expect(bytes.length).toBeGreaterThanOrEqual(20);
  // The top two bits of every STUN message are zero.
  expect(bytes[0]! & 0xc0).toBe(0);
  const length = u16(bytes, 2);
  expect(hex(bytes.slice(4, 8))).toBe(MAGIC_COOKIE);
  expect(length % 4).toBe(0);
  expect(bytes.length).toBe(20 + length);

  const attrs: Parsed["attrs"] = [];
  let at = 20;
  while (at < bytes.length) {
    const type = u16(bytes, at);
    const len = u16(bytes, at + 2);
    const padded = Math.ceil(len / 4) * 4;
    expect(at + 4 + padded).toBeLessThanOrEqual(bytes.length);
    attrs.push({ type, value: bytes.slice(at + 4, at + 4 + len) });
    at += 4 + padded;
  }
  expect(at).toBe(bytes.length);
  return { type: u16(bytes, 0), attrs, bytes };
}

const types = (p: Parsed) => p.attrs.map((a) => a.type);
const ascii = (b: Uint8Array) => String.fromCharCode(...b);

describe("crc32", () => {
  it("matches the CRC-32 check value", () => {
    expect(crc32(hex(new TextEncoder().encode("123456789")))).toBe(0xcbf43926);
  });
});

describe("each STUN packet parses as one", () => {
  const variants: StunVariant[] = ["binding", "allocate", "allocate_auth", "ice_check"];

  for (const variant of variants) {
    it(`${variant}, with and without the random tags`, () => {
      for (const tags of [true, false]) {
        for (let k = 0; k < 40; k++) {
          const input = seeded({ useTagR: tags, useTagRC: tags, useTagRD: tags });
          parse(mkSTUN(input, 2, {}, variant));
        }
      }
    });
  }

  it("binding is the bare header, as browsers send it to a STUN server", () => {
    const p = parse(mkSTUN(seeded(), 2, {}, "binding"));
    expect(p.type).toBe(0x0001);
    expect(p.attrs).toEqual([]);
  });

  it("allocate asks for UDP and nothing else", () => {
    const p = parse(mkSTUN(seeded(), 2, {}, "allocate"));
    expect(p.type).toBe(0x0003);
    expect(types(p)).toEqual([0x0019]);
    expect(hex(p.attrs[0]!.value)).toBe("11000000");
  });

  it("allocate_auth carries the TURN REST username, the host as realm, a nonce and an HMAC", () => {
    const p = parse(mkSTUN(seeded(), 2, {}, "allocate_auth"));
    expect(p.type).toBe(0x0003);
    expect(types(p)).toEqual([0x0019, 0x0006, 0x0014, 0x0015, 0x0008]);
    const value = (type: number) => p.attrs.find((a) => a.type === type)!.value;
    expect(ascii(value(0x0014))).toBe("turn.example.org");
    expect(ascii(value(0x0006))).toMatch(/^\d{10}:[a-zA-Z]{8}$/);
    expect(value(0x0015).length).toBe(16);
    expect(value(0x0008).length).toBe(20);
  });

  it("allocate_auth writes a real expiry when <rd> is off", () => {
    const p = parse(mkSTUN(seeded({ useTagRD: false }), 2, {}, "allocate_auth"));
    const user = ascii(p.attrs.find((a) => a.type === 0x0006)!.value);
    const expiry = Number(user.split(":")[0]);
    const now = Date.now() / 1000;
    expect(expiry).toBeGreaterThan(now);
    expect(expiry).toBeLessThan(now + 2 * 86_400);
  });

  it("ice_check is a Binding request with ufrags, a tie-breaker and a peer-reflexive priority", () => {
    for (let k = 0; k < 40; k++) {
      const p = parse(mkSTUN(seeded(), 2, {}, "ice_check"));
      expect(p.type).toBe(0x0001);
      const t = types(p).filter((x) => x !== 0x0025);
      expect(t).toEqual([0x0006, 0x802a, 0x0024, 0x0008]);
      const value = (type: number) => p.attrs.find((a) => a.type === type)!.value;
      expect(ascii(value(0x0006))).toMatch(/^[a-zA-Z]{4}:[a-zA-Z]{4}$/);
      expect(value(0x802a).length).toBe(8);
      const prio = value(0x0024);
      // Type preference 110 in the top byte, 255 for component 1 at the bottom.
      expect(prio[0]).toBe(110);
      expect(prio[3]).toBe(255);
      const useCandidate = p.attrs.find((a) => a.type === 0x0025);
      if (useCandidate) expect(useCandidate.value.length).toBe(0);
    }
  });

  it("uses Firefox's eight-character ufrags for a gecko profile", () => {
    const p = parse(
      mkSTUN(seeded({ useBrowserFp: true, browserProfile: "firefox" }), 2, {}, "ice_check"),
    );
    expect(ascii(p.attrs[0]!.value)).toMatch(/^[a-zA-Z]{8}:[a-zA-Z]{8}$/);
  });
});

describe("FINGERPRINT", () => {
  it("is present and correct when every byte is known at generation time", () => {
    const input = seeded({ useTagR: false, useTagRC: false, useTagRD: false });
    for (const variant of ["binding", "allocate", "allocate_auth", "ice_check"] as const) {
      const p = parse(mkSTUN(input, 2, {}, variant));
      const last = p.attrs[p.attrs.length - 1]!;
      expect(last.type).toBe(0x8028);
      const covered = hex(p.bytes.slice(0, p.bytes.length - 8));
      const expected = (crc32(covered) ^ 0x5354554e) >>> 0;
      expect(hex(last.value)).toBe(expected.toString(16).padStart(8, "0"));
    }
  });

  it("is left out when a tag fills bytes in at send time, rather than lying", () => {
    for (const variant of ["binding", "allocate", "allocate_auth", "ice_check"] as const) {
      const chain = mkSTUN(seeded(), 2, {}, variant);
      expect(expand(chain).dynamic).toBe(true);
      expect(types(parse(chain))).not.toContain(0x8028);
    }
  });
});

describe("the STUN profile in a config", () => {
  it("is registered with a label", () => {
    expect(PROFILE_LABELS.stun).toBe("STUN / TURN");
    parse(genI1(seeded(), "stun", 2));
  });

  it("puts the authenticated Allocate alone in I1, entropy after it", () => {
    const cfg = genCfg(seeded({ mimicAll: false }));
    expect(parse(cfg.i1).type).toBe(0x0003);
    expect(cfg.i1).toContain(Buffer.from("turn.example.org").toString("hex"));
  });

  it("walks the WebRTC flow across I1-I5 with mimic all", () => {
    for (let k = 0; k < 20; k++) {
      const cfg = genCfg(seeded({ mimicAll: true }));
      const chains = [cfg.i1, cfg.i2, cfg.i3, cfg.i4, cfg.i5];
      chains.forEach((chain, slot) => {
        const p = parse(chain);
        const expected = STUN_FLOW[slot]!;
        expect(p.type).toBe(expected.startsWith("allocate") ? 0x0003 : 0x0001);
      });
      expect(parse(cfg.i1).attrs).toEqual([]);
      expect(chainBytes(chains)).toBeLessThanOrEqual(KMOD_CHAIN_BUDGET);
    }
  });

  it("passes the chain syntax check for every client", () => {
    for (const clientId of ["amneziavpn", "awg-kmod", "wg-easy", "keenetic-native"]) {
      const cfg = genCfg(seeded({ mimicAll: true, clientId }));
      const found = checkAwgParams({
        I1: cfg.i1,
        I2: cfg.i2,
        I3: cfg.i3,
        I4: cfg.i4,
        I5: cfg.i5,
      }).filter((f) => f.level === "error");
      expect(found).toEqual([]);
    }
  });

  it("writes letters in place of <rc> when the client cannot parse it, and still parses", () => {
    const cfg = genCfg(seeded({ mimicAll: true, clientId: "awg-kmod", useTagRC: false }));
    const chains = [cfg.i1, cfg.i2, cfg.i3, cfg.i4, cfg.i5].join("");
    expect(chains).not.toContain("<rc");
    for (const chain of [cfg.i1, cfg.i2, cfg.i3, cfg.i4, cfg.i5]) parse(chain);
  });

  it("is picked by the random profile too", () => {
    let seen = false;
    for (let k = 0; k < 400 && !seen; k++) {
      const chain = genI1(seeded({ profile: "random" }), "random", 2);
      seen = chain.startsWith("<b 0x0003") || chain.startsWith("<b 0x0001");
    }
    expect(seen).toBe(true);
  });
});
