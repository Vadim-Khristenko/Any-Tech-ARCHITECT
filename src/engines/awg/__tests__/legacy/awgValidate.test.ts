import { describe, it, expect } from "bun:test";
import { validateAwgParams } from "@/engines/awg/awgValidate";

const findings = (p: Record<string, string | number>, mtu?: number) =>
  validateAwgParams(p, { mtu });

describe("validateAwgParams", () => {
  it("flags Jc above 128 as error", () => {
    const f = findings({ Jc: 200 });
    expect(f.some((x) => x.field === "Jc" && x.level === "error")).toBe(true);
  });
  it("accepts Jc in range with no finding", () => {
    expect(findings({ Jc: 8 }).some((x) => x.field === "Jc")).toBe(false);
  });
  it("warns on a very high (but valid) Jc", () => {
    expect(
      findings({ Jc: 120 }).some((x) => x.field === "Jc" && x.level === "warn"),
    ).toBe(true);
  });
  it("flags Jmin >= Jmax as error", () => {
    expect(
      findings({ Jmin: 100, Jmax: 80 }).some(
        (x) => x.level === "error" && x.field === "Jmin",
      ),
    ).toBe(true);
  });
  it("warns when Jmax >= MTU (fragmentation)", () => {
    expect(
      findings({ Jmin: 40, Jmax: 1500 }, 1280).some(
        (x) => x.field === "Jmax" && x.level === "warn",
      ),
    ).toBe(true);
  });
  it("warns when S1 + 56 === S2", () => {
    expect(
      findings({ S1: 50, S2: 106 }).some(
        (x) => x.level === "warn" && /S1|S2/.test(x.field),
      ),
    ).toBe(true);
  });
  it("errors on overlapping H ranges", () => {
    expect(
      findings({ H1: "100-200", H2: "150-300" }).some(
        (x) => x.level === "error" && /H/.test(x.field),
      ),
    ).toBe(true);
  });
  it("accepts non-overlapping H ranges", () => {
    expect(
      findings({ H1: "100-200", H2: "300-400" }).some((x) => x.level === "error"),
    ).toBe(false);
  });
  it("errors on malformed I-tag", () => {
    expect(
      findings({ I1: "<x 0xZZ>" }).some(
        (x) => x.field === "I1" && x.level === "error",
      ),
    ).toBe(true);
  });
  it("errors when S4 exceeds the 32-byte protocol limit", () => {
    expect(
      findings({ S4: 33 }).some(
        (x) => x.field === "S4" && x.level === "error",
      ),
    ).toBe(true);
  });
  it("accepts S4 within the protocol limit", () => {
    expect(findings({ S4: 32 }).some((x) => x.field === "S4")).toBe(false);
  });
  it("warns when S4 is zero", () => {
    expect(
      findings({ S4: 0 }).some(
        (x) => x.field === "S4" && x.level === "warn",
      ),
    ).toBe(true);
  });
  it("errors when S3 exceeds the protocol limit", () => {
    expect(
      findings({ S3: 1133 }).some(
        (x) => x.field === "S3" && x.level === "error",
      ),
    ).toBe(true);
  });
  it("skips disabled I-tags ('0' / empty)", () => {
    expect(findings({ I1: "0", I2: "" }).some((x) => /I[12]/.test(x.field))).toBe(
      false,
    );
  });
});

describe("validateAwgParams S-padding floor with HeaderProtectionKey", () => {
  // A 44-char base64 key: presence is what the rule reads, not validity.
  const HPK = "HeaderProtectionKey";
  const KEY = "c2VjcmV0c2VjcmV0c2VjcmV0c2VjcmV0c2VjcmV0c2U=";
  const withKey = (p: Record<string, string | number>) => ({
    ...p,
    [HPK]: KEY,
  });

  it("flags the reported config: S3 = 3 with the key set", () => {
    const f = findings(withKey({ S1: 121, S2: 98, S3: 3, S4: 30 }));
    const hit = f.filter((x) => x.code === "awg3.s_below_nonce");
    expect(hit.map((x) => x.field)).toEqual(["S3"]);
    expect(hit[0]!.level).toBe("error");
  });

  it("flags each of S1-S4 below 12 when the key is set", () => {
    for (const key of ["S1", "S2", "S3", "S4"] as const) {
      const f = findings(withKey({ [key]: 5 }));
      expect(
        f.some(
          (x) =>
            x.field === key &&
            x.level === "error" &&
            x.code === "awg3.s_below_nonce",
        ),
      ).toBe(true);
    }
  });

  it("rejects 11 and accepts 12: the bound is at least, not more than", () => {
    expect(
      findings(withKey({ S3: 11 })).some(
        (x) => x.code === "awg3.s_below_nonce",
      ),
    ).toBe(true);
    expect(
      findings(withKey({ S1: 12, S2: 12, S3: 12, S4: 12 })).some(
        (x) => x.code === "awg3.s_below_nonce",
      ),
    ).toBe(false);
  });

  it("reads a small S as clean without the key: no minimum pre-3.0 or keyless", () => {
    expect(
      findings({ S1: 121, S2: 98, S3: 3, S4: 30 }).some(
        (x) => x.code === "awg3.s_below_nonce",
      ),
    ).toBe(false);
  });

  it("treats an empty key as absent", () => {
    expect(
      findings({ S3: 3, [HPK]: "" }).some(
        (x) => x.code === "awg3.s_below_nonce",
      ),
    ).toBe(false);
  });

  it("reports S4 = 0 with the key as the nonce error, not the zero warning", () => {
    const f = findings(withKey({ S4: 0 }));
    expect(
      f.some(
        (x) =>
          x.field === "S4" &&
          x.level === "error" &&
          x.code === "awg3.s_below_nonce",
      ),
    ).toBe(true);
    expect(f.some((x) => x.code === "awg.s4_zero")).toBe(false);
  });

  it("keeps the zero warning without the key", () => {
    expect(
      findings({ S4: 0 }).some(
        (x) => x.field === "S4" && x.code === "awg.s4_zero",
      ),
    ).toBe(true);
  });

  it("skips missing S fields even with the key set", () => {
    expect(
      findings(withKey({ S1: 50 })).some(
        (x) => x.code === "awg3.s_below_nonce",
      ),
    ).toBe(false);
  });

  it("leaves pre-3.0 shapes untouched: small S without the key is fully clean", () => {
    // 1.0 has S1/S2 only, 2.0 adds S3/S4 — neither version knows the key,
    // so the floor must not even look at them. Empty means no error, no
    // warning, nothing: the fix does not exist for these configs.
    expect(findings({ S1: 5, S2: 70 })).toEqual([]);
    expect(findings({ S1: 5, S2: 70, S3: 3, S4: 30 })).toEqual([]);
  });
});

describe("validateAwgParams for a client that manages the key itself", () => {
  const managed = {
    name: "Amnezia VPN",
    maxS4: 32,
    maxJc: 10,
    maxHValue: 4_294_967_295,
    supportsCpsTagC: false,
    supportsCpsTagRC: true,
    supportsCpsTagRD: true,
    managesHeaderProtection: true,
  };
  const check = (p: Record<string, string | number>) =>
    validateAwgParams(p, { client: managed });

  it("warns, not errors, on the reported sizes without a key line", () => {
    const f = check({ S1: 121, S2: 98, S3: 3, S4: 30 });
    const hit = f.filter((x) => x.code === "awg.s_small_managed");
    expect(hit.map((x) => x.field)).toEqual(["S3"]);
    expect(hit[0]!.level).toBe("warn");
    // And the keyed error stays silent: there is no key to gate on.
    expect(f.some((x) => x.code === "awg3.s_below_nonce")).toBe(false);
  });

  it("warns on each of S1-S4 below 12", () => {
    for (const key of ["S1", "S2", "S3", "S4"] as const) {
      const f = check({ [key]: 5 });
      expect(
        f.some(
          (x) =>
            x.field === key &&
            x.level === "warn" &&
            x.code === "awg.s_small_managed",
        ),
      ).toBe(true);
    }
  });

  it("prefers the keyed error once a key line is present", () => {
    const f = check({
      S3: 3,
      HeaderProtectionKey: "c2VjcmV0c2VjcmV0c2VjcmV0c2VjcmV0c2VjcmV0c2U=",
    });
    expect(
      f.some(
        (x) => x.field === "S3" && x.code === "awg3.s_below_nonce",
      ),
    ).toBe(true);
    expect(f.some((x) => x.code === "awg.s_small_managed")).toBe(false);
  });

  it("reads 12+ as clean: the in-app toggle has room", () => {
    expect(
      check({ S1: 121, S2: 98, S3: 12, S4: 30 }).some((x) =>
        /nonce|managed/.test(x.code),
      ),
    ).toBe(false);
  });

  it("reads a managed S4 = 0 as the nonce warning, not the zero one", () => {
    const f = check({ S4: 0 });
    expect(
      f.some(
        (x) => x.field === "S4" && x.code === "awg.s_small_managed",
      ),
    ).toBe(true);
    expect(f.some((x) => x.code === "awg.s4_zero")).toBe(false);
  });
});
