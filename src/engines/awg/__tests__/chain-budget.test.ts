import { describe, it, expect } from "bun:test";

import { awgEngine } from "../index";
import { checkAwgParams } from "../rules";
import {
  chainAttrBytes,
  chainBytes,
  fitChainBudget,
  genCfg,
  KMOD_CHAIN_BUDGET,
  mkSIP,
  type AWGConfig,
  type GeneratorInput,
  type MimicProfile,
} from "@/engines/awg/generator";

/**
 * Issue #17: five SIP REGISTER chains came to 4.3 KB, and the kernel module
 * carries I1-I5 in one netlink message of a page. The interface came up and
 * `awg show` answered "Message too long".
 */

const input = (over: Partial<GeneratorInput> = {}): GeneratorInput => ({
  ...awgEngine.createDefaults(),
  version: "2.0",
  clientId: "awg-kmod",
  useTagR: true,
  useTagRC: true,
  useTagC: true,
  useTagT: true,
  ...over,
});

const chainsOf = (cfg: AWGConfig) => [cfg.i1, cfg.i2, cfg.i3, cfg.i4, cfg.i5];

/** The ASCII inside the first `<b 0x…>` of a chain. */
function sipText(chain: string): string {
  const hex = /<b 0x([0-9a-f]+)>/.exec(chain)?.[1] ?? "";
  let text = "";
  for (let i = 0; i < hex.length; i += 2) {
    text += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16));
  }
  return text;
}

describe("chainAttrBytes", () => {
  it("counts the attribute header, the NUL and the 4-byte alignment", () => {
    expect(chainAttrBytes("")).toBe(0);
    // 3 chars + NUL = 4, no padding.
    expect(chainAttrBytes("<t>")).toBe(8);
    // 4 chars + NUL = 5, padded to 8.
    expect(chainAttrBytes("<rc>")).toBe(12);
  });

  it("sums a set", () => {
    expect(chainBytes(["<t>", "", "<t>"])).toBe(16);
  });
});

describe("fitChainBudget", () => {
  const long = "<b 0x" + "ab".repeat(400) + ">";

  it("leaves a set under the budget alone", () => {
    const set = ["<t>", "<r 10>", "", "", ""];
    expect(fitChainBudget(set, () => "<r 5>")).toEqual(set);
  });

  it("swaps trailing slots for the fallback, and never touches I1", () => {
    const set = [long, long, long, long, long];
    const out = fitChainBudget(set, () => "<r 40>", 2000);
    expect(out[0]).toBe(long);
    expect(chainBytes(out)).toBeLessThanOrEqual(2000);
    // I2 survived: replacing I5..I3 was enough.
    expect(out[1]).toBe(long);
    expect(out[4]).toBe("<r 40>");
  });

  it("drops slots when the fallback is no smaller", () => {
    const set = [long, long, long];
    const out = fitChainBudget(set, (slot) => set[slot]!, 1000);
    expect(out).toEqual([long, "", ""]);
  });
});

describe("the generator keeps I1-I5 inside the kernel module's budget", () => {
  const profiles: MimicProfile[] = [
    "sip",
    "random",
    "wireguard_noise",
    "dtls_1_3",
    "quic_initial",
  ];

  for (const profile of profiles) {
    it(`${profile}, mimic all, every intensity`, () => {
      for (const intensity of ["low", "medium", "high"] as const) {
        for (let k = 0; k < 40; k++) {
          const cfg = genCfg(
            input({ profile, mimicAll: true, intensity, iterCount: 5 }),
          );
          expect(chainBytes(chainsOf(cfg))).toBeLessThanOrEqual(KMOD_CHAIN_BUDGET);
        }
      }
    });
  }

  it("holds for a go client too, since the same block goes on the server", () => {
    for (let k = 0; k < 40; k++) {
      const cfg = genCfg(
        input({ profile: "sip", mimicAll: true, clientId: "amneziavpn" }),
      );
      expect(chainBytes(chainsOf(cfg))).toBeLessThanOrEqual(KMOD_CHAIN_BUDGET);
    }
  });

  it("keeps SIP in all five slots with a short host, in compact form", () => {
    const cfg = genCfg(
      input({ profile: "sip", mimicAll: true, customHost: "sip.mtt.ru" }),
    );
    for (const chain of chainsOf(cfg)) {
      expect(sipText(chain)).toStartWith("REGISTER sip:sip.mtt.ru SIP/2.0\r\n");
      expect(sipText(chain)).toContain("\r\nv: SIP/2.0/UDP ");
    }
  });

  it("does not shorten what already fits", () => {
    const cfg = genCfg(input({ profile: "sip", mimicAll: false }));
    expect(sipText(cfg.i1)).toContain("\r\nVia: SIP/2.0/UDP ");
    expect(sipText(cfg.i1)).toContain("\r\nContent-Length: ");
  });
});

describe("the compact SIP REGISTER", () => {
  const sip = (over: Partial<GeneratorInput> = {}) =>
    mkSIP(input({ customHost: "sip.example.org", ...over }), 2, { compact: true });

  it("carries every header RFC 3261 §10.2 requires, in one-letter form", () => {
    const text = sipText(sip());
    const lines = text.split("\r\n");
    expect(lines[0]).toBe("REGISTER sip:sip.example.org SIP/2.0");
    expect(text).toMatch(/\r\nv: SIP\/2\.0\/UDP [^\r]+;branch=z9hG4bK[0-9a-f]+;rport\r\n/);
    expect(text).toContain("\r\nMax-Forwards: 70\r\n");
    expect(text).toMatch(/\r\nf: <sip:user\d{4}@sip\.example\.org>;tag=[0-9a-f]+\r\n/);
    expect(text).toMatch(/\r\nt: <sip:user\d{4}@sip\.example\.org>\r\n/);
    expect(text).toMatch(/\r\ni: [0-9a-f]+@sip\.example\.org\r\n/);
    expect(text).toMatch(/\r\nCSeq: \d+ REGISTER\r\n/);
    expect(text).toEndWith("\r\n\r\n");
  });

  it("declares in `l` exactly the bytes the tags put in the body", () => {
    for (let k = 0; k < 50; k++) {
      const chain = sip();
      const declared = Number(/\r\nl: (\d+)\r\n/.exec(sipText(chain))?.[1]);
      const sum = (re: RegExp) =>
        [...chain.matchAll(re)].reduce((n, m) => n + Number(m[1]), 0);
      const body =
        sum(/<r (\d+)>/g) +
        sum(/<rc (\d+)>/g) +
        (chain.match(/<c>/g)?.length ?? 0) * 4 +
        (chain.match(/<t>/g)?.length ?? 0) * 4;
      expect(declared).toBe(body);
    }
  });

  it("is about two thirds of the full form", () => {
    const full = mkSIP(input({ customHost: "sip.example.org" }), 2);
    // 0.69-0.71 across 20,000 draws with this host; the bound leaves room.
    expect(sipText(sip()).length).toBeLessThan(sipText(full).length * 0.8);
  });
});

describe("the health check on a pasted config", () => {
  // I1 of the issue, verbatim. Five of them come to 3820 bytes.
  const issueI1 =
    "<b 0x5245474953544552207369703a7369702e6d74742e7275205349502f322e300d0a5669613a205349502f322e302f554450207369702e6d74742e72753a353036303b6272616e63683d7a39684734624b61306331316565313135636163363b72706f72740d0a4d61782d466f7277617264733a2037300d0a46726f6d3a203c7369703a7573657234303135407369702e6d74742e72753e3b7461673d303162623334363435650d0a546f3a203c7369703a7573657234303135407369702e6d74742e72753e0d0a43616c6c2d49443a203962346565326530386333303034616635306666407369702e6d74742e72750d0a435365713a20363031362052454749535445520d0a436f6e746163743a203c7369703a7573657234303135407369702e6d74742e72753a353036303e3b657870697265733d333630300d0a557365722d4167656e743a204c696e70686f6e652f352e322e350d0a436f6e74656e742d4c656e6774683a203130360d0a0d0a><rc 42><t><r 60>";

  const codes = (params: Record<string, string>) =>
    checkAwgParams(params).map((f) => f.code);

  it("warns on the five chains from issue #17", () => {
    const params = { I1: issueI1, I2: issueI1, I3: issueI1, I4: issueI1, I5: issueI1 };
    const found = checkAwgParams(params).find(
      (f) => f.code === "awg.cps_chain_too_long",
    );
    expect(found?.level).toBe("warn");
    expect(Number(found?.values?.total)).toBeGreaterThan(KMOD_CHAIN_BUDGET);
  });

  it("stays quiet on three of them", () => {
    expect(codes({ I1: issueI1, I2: issueI1, I3: issueI1 })).not.toContain(
      "awg.cps_chain_too_long",
    );
  });
});
