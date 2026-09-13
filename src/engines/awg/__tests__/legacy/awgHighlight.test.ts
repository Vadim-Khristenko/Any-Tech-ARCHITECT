import { describe, it, expect } from "bun:test";
import { highlight } from "@/engines/awg/awgHighlight";

describe("highlight", () => {
  it("wraps conf section headers, keys and numbers in spans", () => {
    const html = highlight("[Interface]\nJc = 8\n", "conf");
    expect(html).toContain('class="tok-section"');
    expect(html).toContain('class="tok-key"');
    expect(html).toContain('class="tok-num"');
  });

  it("highlights numeric ranges (H1–H4) distinctly", () => {
    expect(highlight("H1 = 100000-200000\n", "conf")).toContain(
      'class="tok-range"',
    );
  });

  it("highlights IPv4 / CIDR / ip:port as tok-ip", () => {
    expect(highlight("Endpoint = 1.2.3.4:51820\n", "conf")).toContain(
      'class="tok-ip"',
    );
    expect(highlight("Address = 10.0.0.2/32\n", "conf")).toContain(
      'class="tok-ip"',
    );
  });

  it("highlights IPv6 / shorthand as tok-ip", () => {
    expect(highlight("AllowedIPs = ::/0\n", "conf")).toContain('class="tok-ip"');
    expect(highlight("Address = fd00::1/64\n", "conf")).toContain(
      'class="tok-ip"',
    );
  });

  it("highlights CPS tags as tok-cps", () => {
    const html = highlight("I1 = <b 0xC0><rc 24><t>\n", "conf");
    expect(html).toContain('class="tok-cps"');
  });

  it("does NOT highlight stray digits inside a base64 key", () => {
    expect(
      highlight("PrivateKey = aB3cd9EFxy0zKQ8=\n", "conf"),
    ).not.toContain('class="tok-num"');
  });

  it("escapes HTML so < > in values can't inject markup", () => {
    const html = highlight("I1 = <b 0xC0>\n", "conf");
    expect(html).toContain("&lt;b 0xC0&gt;");
    expect(html).not.toContain("<b 0xC0>");
  });

  it("highlights conf comments", () => {
    expect(highlight("# hello\nJc = 1\n", "conf")).toContain(
      'class="tok-comment"',
    );
  });

  it("highlights JSON keys and string values distinctly", () => {
    const html = highlight('{"a": "b"}', "json");
    expect(html).toContain('class="tok-key"');
    expect(html).toContain('class="tok-str"');
  });

  it("highlights JSON numbers and literals", () => {
    const html = highlight('{"n": 42, "ok": true}', "json");
    expect(html).toContain('class="tok-num"');
    expect(html).toContain('class="tok-kw"');
  });

  it("classifies stringified JSON values (num/range/ip/cps)", () => {
    expect(highlight('{"Jc": "5"}', "json")).toContain('class="tok-num"');
    expect(highlight('{"H1": "100-200"}', "json")).toContain(
      'class="tok-range"',
    );
    expect(highlight('{"Endpoint": "1.2.3.4:51820"}', "json")).toContain(
      'class="tok-ip"',
    );
    expect(highlight('{"AllowedIPs": "::/0"}', "json")).toContain(
      'class="tok-ip"',
    );
    expect(highlight('{"I1": "<b 0xC0>"}', "json")).toContain(
      'class="tok-cps"',
    );
  });

  it("preserves newlines (conf)", () => {
    expect(highlight("a = 1\nb = 2\n", "conf").split("\n")).toHaveLength(3);
  });

  it("escapes-only for unknown format", () => {
    expect(highlight("<x>", "unknown")).toBe("&lt;x&gt;");
  });
});
