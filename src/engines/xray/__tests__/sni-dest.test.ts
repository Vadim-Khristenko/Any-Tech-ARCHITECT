import { describe, it, expect } from "bun:test";
import { createDefaults, generateXray } from "../generate";
import { validateXray } from "../validate";

/**
 * The donor and the SNI have to name the same site.
 *
 * REALITY dials `dest` and forwards that site's real TLS handshake; the client
 * sends an SNI from `serverNames`. When they disagree the certificate is for
 * one host and the name asked for is another — visible passively and confirmed
 * by one active probe. Nothing warned about it, and the two are separate
 * fields, so changing one and not the other produced a config that starts,
 * works, and is trivially detectable.
 */
describe("donor and SNI", () => {
  const base = { ...createDefaults(), address: "203.0.113.10" };
  const codes = (over: Partial<typeof base>) =>
    validateXray(generateXray({ ...base, ...over })).map((f) => f.code);

  it("says nothing when they agree", () => {
    expect(codes({})).not.toContain("xray.sni_dest_mismatch");
  });

  it("warns when the donor is a different site", () => {
    expect(
      codes({ dest: "www.microsoft.com:443", serverNames: ["www.bing.com"] }),
    ).toContain("xray.sni_dest_mismatch");
  });

  it("accepts a wildcard that really covers the donor", () => {
    expect(
      codes({ dest: "www.example.com:443", serverNames: ["*.example.com"] }),
    ).not.toContain("xray.sni_dest_mismatch");
  });

  it("rejects a wildcard two labels deep, as a certificate does", () => {
    expect(
      codes({ dest: "a.b.example.com:443", serverNames: ["*.example.com"] }),
    ).toContain("xray.sni_dest_mismatch");
  });
});
