import { describe, it, expect } from "bun:test";

import { awgEngine } from "../index";
import { checkAwgParams, trailerLoss, TRAILER_LOSS_MAX } from "../rules";
import { healthCheckConf } from "../healthCheck";
import {
  genCfg,
  parseRange,
  renderConf,
  type GeneratorInput,
} from "@/engines/awg/generator";
import { AWG_PARAMETERS } from "@/engines/awg/generator/params";
import { NARROW_WIDTH } from "@/engines/awg/generator/strategy";

/**
 * Issue #14: with RandomTrailers on, amneziawg-go tests every transport packet
 * against H1-H3 and drops those whose bytes land inside. The reporter's
 * ranges lost 16.1% of the traffic in each direction, with every counter
 * reading clean.
 */

const ISSUE = {
  H1: "405138553-456138212",
  H2: "680931238-1038459501",
  H3: "1114423399-1432068193",
  H4: "1500000000-1500050000",
};

const codes = (p: Record<string, string>) => checkAwgParams(p).map((f) => f.code);

describe("trailerLoss", () => {
  it("is null with the trailers off, whatever the width", () => {
    expect(trailerLoss(ISSUE)).toBeNull();
    expect(trailerLoss({ ...ISSUE, RandomTrailers: "0" })).toBeNull();
    expect(trailerLoss({ ...ISSUE, RandomTrailers: "off" })).toBeNull();
  });

  it("reads the flag the way amneziawg-tools does", () => {
    for (const on of ["1", "on", "ON", "2"]) {
      expect(trailerLoss({ ...ISSUE, RandomTrailers: on })).not.toBeNull();
    }
  });

  it("reproduces the 16.1% of the issue", () => {
    const loss = trailerLoss({ ...ISSUE, RandomTrailers: "1" })!;
    expect(loss).toBeCloseTo(0.161, 3);
  });

  it("does not count H4", () => {
    const narrow = { H1: "100-200", H2: "300-400", H3: "500-600", RandomTrailers: "1" };
    const base = trailerLoss(narrow)!;
    expect(trailerLoss({ ...narrow, H4: "1000000000-4000000000" })).toBe(base);
  });

  it("is zero for single values, which is what Amnezia VPN writes with the key", () => {
    const loss = trailerLoss({ H1: "1", H2: "2", H3: "3", H4: "4", RandomTrailers: "1" })!;
    expect(loss).toBeLessThan(1e-9);
  });
});

describe("the width warning", () => {
  it("fires on the issue's ranges, with the share and the one-in-N", () => {
    const found = checkAwgParams({ ...ISSUE, RandomTrailers: "1" }).find(
      (f) => f.code === "awg.h_width_loss",
    );
    expect(found?.level).toBe("warn");
    expect(found?.values?.percent).toBe("16.1");
    expect(found?.values?.oneIn).toBe("6");
  });

  it("stays quiet with the trailers off", () => {
    expect(codes(ISSUE)).not.toContain("awg.h_width_loss");
  });

  it("stays quiet just under the threshold and fires just over it", () => {
    const width = (share: number) => Math.round((share * 4_294_967_296) / 3);
    const at = (share: number) => {
      const w = width(share);
      return {
        H1: `1000-${1000 + w - 1}`,
        H2: `1000000000-${1000000000 + w - 1}`,
        H3: `2000000000-${2000000000 + w - 1}`,
        RandomTrailers: "1",
      };
    };
    expect(codes(at(TRAILER_LOSS_MAX * 0.9))).not.toContain("awg.h_width_loss");
    expect(codes(at(TRAILER_LOSS_MAX * 1.1))).toContain("awg.h_width_loss");
  });

  it("is reached through the health check of a pasted .conf", () => {
    const conf = [
      "[Interface]",
      "PrivateKey = x",
      `H1 = ${ISSUE.H1}`,
      `H2 = ${ISSUE.H2}`,
      `H3 = ${ISSUE.H3}`,
      `H4 = ${ISSUE.H4}`,
      "RandomTrailers = 1",
      "",
    ].join("\n");
    expect(healthCheckConf(conf).map((f) => f.code)).toContain("awg.h_width_loss");
  });
});

describe("the generator under RandomTrailers", () => {
  const seeded = (over: Partial<GeneratorInput> = {}): GeneratorInput => ({
    ...awgEngine.createDefaults(),
    version: "3.1",
    useRandomTrailers: true,
    ...over,
  });

  it("never produces a config the warning would flag", () => {
    for (const useExtremeMax of [false, true]) {
      for (let k = 0; k < 100; k++) {
        const conf = renderConf(genCfg(seeded({ useExtremeMax, iterCount: k })));
        expect(healthCheckConf(conf).map((f) => f.code)).not.toContain(
          "awg.h_width_loss",
        );
      }
    }
  });

  it("keeps every range within the narrow width when asked to", () => {
    for (let k = 0; k < 200; k++) {
      const cfg = genCfg(seeded({ useNarrowH: true }));
      for (const h of [cfg.h1, cfg.h2, cfg.h3, cfg.h4]) {
        const [lo, hi] = parseRange(h)!;
        expect(hi - lo).toBeLessThanOrEqual(NARROW_WIDTH);
      }
    }
  });
});

describe("RandomTrailers in the catalogue", () => {
  it("is shared: the receiver reads its own flag to accept longer handshakes", () => {
    const param = AWG_PARAMETERS.find((p) => p.key === "RandomTrailers");
    expect(param?.scope).toBe("shared");
  });
});

describe("the reserved H zone", () => {
  const ones = { H1: "1", H2: "2", H3: "3", H4: "4" };

  it("is still flagged where headers go out in the clear", () => {
    expect(codes(ones)).toContain("awg.h_reserved");
  });

  it("is not flagged under HeaderProtectionKey, where 1-4 is what Amnezia VPN writes", () => {
    expect(
      codes({ ...ones, HeaderProtectionKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" }),
    ).not.toContain("awg.h_reserved");
  });
});
