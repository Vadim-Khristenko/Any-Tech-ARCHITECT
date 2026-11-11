/**
 * S1-S4 bounds and size collisions, as the daemons actually enforce them.
 *
 * amneziawg-go and the kernel module take any uint16 for S1-S4. The old
 * 1132 / 1188 ceilings were the IPv6 minimum MTU (1280 minus the message),
 * so going over them risks fragmentation, not a refused config. Same for S4
 * above 32: a throughput cost, not a protocol limit.
 *
 * Equal padded sizes are refused only by the 1.x daemons: v0.2.12 compares
 * init and response (`device.go:768`), v0.2.14-beta-awg-1.5-1 all four
 * sizes, transport included (`isSameSizeMap`). From 2.0 on the daemon tells
 * messages apart by size and then header, so a collision only weakens the
 * disguise.
 */

import { describe, it, expect } from "bun:test";
import { checkAwgParams, type AwgRuleOptions } from "@/engines/awg/rules";
import { validateSizes } from "@/engines/awg/generator/validators";
import { awgEngine } from "@/engines/awg";
import type { AWGConfig, AWGVersion } from "@/engines/awg/generator";
import type { Finding, FindingLevel } from "@/types/findings";

const byCode = (code: string, findings: Finding[]) =>
  findings.filter((f) => f.code === code);

describe("S1-S3 over the IPv6 minimum MTU", () => {
  it.each([
    ["S1", 1133, 1132],
    ["S2", 1189, 1188],
    ["S3", 1217, 1216],
  ])("%s = %i is a warning against %i, not an error", (key, value, max) => {
    const found = checkAwgParams({ [key]: value });
    const hit = byCode("awg.s_over_min_mtu", found);
    expect(hit).toHaveLength(1);
    expect(hit[0].level).toBe("warn");
    expect(hit[0].values).toMatchObject({ key, value, max });
    expect(found.some((f) => f.level === "error")).toBe(false);
  });

  it("S3 = 1216 fits: the cookie reply is 64 bytes, not 148", () => {
    expect(byCode("awg.s_over_min_mtu", checkAwgParams({ S3: 1216 }))).toEqual([]);
  });

  it("a size past the UDP datagram is still an error", () => {
    const found = byCode("awg.size_max", checkAwgParams({ S1: 65400 }));
    expect(found).toHaveLength(1);
    expect(found[0].level).toBe("error");
  });
});

describe("S4 above 32", () => {
  it("is a throughput warning on its own", () => {
    const found = checkAwgParams({ S4: 40 });
    expect(byCode("awg.s4_large", found)[0]?.level).toBe("warn");
    expect(found.some((f) => f.level === "error")).toBe(false);
  });

  it("stays an error against a client that caps it", () => {
    const client = {
      name: "Test",
      maxS4: 32,
      maxJc: 128,
      maxHValue: 2 ** 32 - 1,
      supportsCpsTagC: true,
      supportsCpsTagRC: true,
      supportsCpsTagRD: true,
    } as AwgRuleOptions["client"];
    const found = checkAwgParams({ S4: 40 }, { client });
    expect(byCode("awg.s4_over_client", found)[0]?.level).toBe("error");
  });
});

describe("collisions over all four sizes", () => {
  /* Cookie 64 + 0 = 64, transport 32 + 32 = 64. Amnezia VPN refuses this. */
  it("catches S3 = 0 with S4 = 32", () => {
    const found = byCode("awg.size_collision", checkAwgParams({ S3: 0, S4: 32 }));
    expect(found).toHaveLength(1);
    expect(found[0].values).toEqual({ a: "S3", b: "S4" });
  });

  it.each<[AWGVersion | undefined, FindingLevel]>([
    ["1.0", "error"],
    ["1.5", "error"],
    ["2.0", "warn"],
    ["3.1", "warn"],
    [undefined, "warn"],
  ])("on %s it is a %s", (version, level) => {
    const found = byCode(
      "awg.size_collision",
      checkAwgParams({ S1: 10, S2: 66 }, { version }),
    );
    expect(found).toHaveLength(1);
    expect(found[0].level).toBe(level);
  });

  it("the generated-config validator agrees, version included", () => {
    // 1.5 has no S3/S4 here; init 148 + 10 = response 92 + 66.
    const legacy = { version: "1.5", s1: 10, s2: 66, s3: 0, s4: 32 } as AWGConfig;
    const hit = byCode("awg.size_collision", validateSizes(legacy));
    expect(hit).toHaveLength(1);
    expect(hit[0].level).toBe("error");

    const modern = { version: "2.0", s1: 20, s2: 30, s3: 0, s4: 32 } as AWGConfig;
    const found = byCode("awg.size_collision", validateSizes(modern));
    expect(found).toHaveLength(1);
    expect(found[0].level).toBe("warn");
    expect(found[0].values).toEqual({ a: "S3", b: "S4" });
    expect(byCode("awg.s4_large", validateSizes({ ...modern, s4: 40 }))).toHaveLength(1);
  });

  it("the generator never draws a collision on any version", () => {
    for (const version of ["1.0", "1.5", "2.0", "3.0", "3.1"] as AWGVersion[]) {
      for (let i = 0; i < 300; i++) {
        const cfg = awgEngine.generate({ ...awgEngine.createDefaults(), version });
        expect(byCode("awg.size_collision", validateSizes(cfg))).toEqual([]);
      }
    }
  });
});
