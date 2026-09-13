import { describe, it, expect } from "vitest";
import { healthCheckConf } from "@/engines/awg/healthCheck";

const makeConf = (extra = "") => `
[Interface]
PrivateKey = aGVsbG8=
Address = 10.0.0.2/32
${extra}

[Peer]
PublicKey = d29ybGQ=
Endpoint = 1.2.3.4:51820
AllowedIPs = 0.0.0.0/0
`;

describe("healthCheckConf", () => {
  it("flags missing PrivateKey", () => {
    const f = healthCheckConf("[Interface]\nAddress = 10.0.0.2/32");
    expect(f.some((x) => x.field === "PrivateKey" && x.level === "error")).toBe(true);
  });

  it("flags missing [Interface]", () => {
    const f = healthCheckConf("[Peer]\nPublicKey = d29ybGQ=");
    expect(f.some((x) => x.field === "[Interface]")).toBe(true);
  });

  it("flags invalid base64 PrivateKey", () => {
    const f = healthCheckConf(makeConf("PrivateKey = !!!bad!!!"));
    expect(
      f.some((x) => x.field === "PrivateKey" && x.level === "error"),
    ).toBe(true);
  });

  it("warns about missing AWG params", () => {
    const f = healthCheckConf(makeConf());
    expect(f.some((x) => x.field === "AWG" && x.level === "warn")).toBe(true);
  });

  it("validates AWG params when present", () => {
    const f = healthCheckConf(
      makeConf("Jc = 5\nJmin = 10\nJmax = 20\nS1 = 10\nS2 = 66\nH1 = 100-200"),
    );
    expect(f.some((x) => x.field === "S2" && x.level === "warn")).toBe(true);
  });

  it("flags unsupported <c> tag for awg-go-legacy", () => {
    const f = healthCheckConf(
      makeConf("I1 = <b 0x00><c>"),
      "awg-go-legacy",
    );
    // Findings carry a code and its values now, rather than a ready-made
    // sentence — the sentence is produced from the catalogue at read time,
    // in whatever language the reader is using.
    expect(
      f.some(
        (x) =>
          x.level === "error" &&
          x.code === "awg.cps_tag_unsupported" &&
          x.values?.tag === "<c>",
      ),
    ).toBe(true);
  });

  it("flags S4 over client limit for amneziawg-windows", () => {
    const f = healthCheckConf(makeConf("S4 = 33"), "amneziawg-windows");
    expect(f.some((x) => x.field === "S4" && x.level === "error")).toBe(true);
  });

  it("flags S3 = 3 as an error when HeaderProtectionKey is present", () => {
    const f = healthCheckConf(
      makeConf(
        "S1 = 121\nS2 = 98\nS3 = 3\nS4 = 30\nHeaderProtectionKey = c2VjcmV0c2VjcmV0c2VjcmV0c2VjcmV0c2VjcmV0c2U=",
      ),
    );
    expect(
      f.some(
        (x) =>
          x.field === "S3" &&
          x.level === "error" &&
          x.code === "awg3.s_below_nonce",
      ),
    ).toBe(true);
  });

  it("reads the same S3 = 3 as clean without the key", () => {
    const f = healthCheckConf(makeConf("S1 = 121\nS2 = 98\nS3 = 3\nS4 = 30"));
    expect(f.some((x) => x.code === "awg3.s_below_nonce")).toBe(false);
  });
});
