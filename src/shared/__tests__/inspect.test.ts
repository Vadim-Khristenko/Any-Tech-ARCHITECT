import { describe, it, expect } from "bun:test";

import { awgEngine } from "@/engines/awg";
import { xrayEngine } from "@/engines/xray";
import { linesToText } from "@/types/engine";

/**
 * One door for "what is wrong with this config".
 *
 * There used to be three, and they disagreed: generated configs went through
 * `validate`, pasted ones through `parse`, and whole `.conf` files through a
 * health checker with a finding type of its own that carried a Russian
 * sentence instead of a code. The same broken config was reported in three
 * shapes and only two of them could be translated.
 */

/**
 * Each entry renders its own engine's own output. Typed per engine rather
 * than over the union: the union's `generate` would want an input satisfying
 * both protocols at once, which nothing does.
 */
const engines = [
  {
    name: "awg",
    engine: awgEngine as { inspect: typeof awgEngine.inspect },
    render: () =>
      linesToText(awgEngine.render(awgEngine.generate(awgEngine.createDefaults()))),
  },
  {
    name: "xray",
    engine: xrayEngine as { inspect: typeof xrayEngine.inspect },
    render: () =>
      linesToText(
        xrayEngine.render(xrayEngine.generate(xrayEngine.createDefaults())),
      ),
  },
];

describe.each(engines)("$name — inspect", ({ engine, render }) => {
  const rendered = render;

  it("accepts what the engine itself produced", () => {
    const result = engine.inspect(rendered());

    expect(result.readable).toBe(true);
    expect(result.config).not.toBeNull();
    expect(
      result.findings.filter((f) => f.level === "error"),
      JSON.stringify(result.findings),
    ).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("reports rather than throws on nonsense", () => {
    const result = engine.inspect("this is not a config at all");

    expect(result.readable).toBe(false);
    expect(result.ok).toBe(false);
    // A checker that returns nothing for unreadable input is indistinguishable
    // from one that was never run.
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it("gives every finding a code, so every finding can be translated", () => {
    for (const finding of engine.inspect("garbage").findings) {
      expect(finding.code, finding.field).toBeTruthy();
    }
  });

  it("orders errors before warnings", () => {
    const findings = engine.inspect("garbage").findings;
    const levels = findings.map((f) => f.level);
    const firstWarn = levels.indexOf("warn");
    const lastError = levels.lastIndexOf("error");
    if (firstWarn !== -1 && lastError !== -1) {
      expect(lastError).toBeLessThan(firstWarn);
    }
  });
});

describe("awg — structural findings", () => {
  it("does not hold a parameter block to wg-quick's requirements", () => {
    // This is what the generator renders, and what people paste out of a
    // support thread. Reporting a missing PrivateKey would be complaining
    // about something the user never claimed to have written.
    const codes = awgEngine
      .inspect("Jc = 4\nS1 = 20")
      .findings.map((f) => f.code);

    expect(codes).not.toContain("awg.conf.missing_field");
    expect(codes).not.toContain("awg.conf.no_peer");
  });

  it("names the missing section when the text does claim to be a tunnel", () => {
    const conf = ["PublicKey = " + "B".repeat(43) + "=", "Jc = 4"].join("\n");
    const codes = awgEngine.inspect(conf).findings.map((f) => f.code);

    // A PublicKey with no [Interface] is a broken tunnel, and saying so beats
    // a parse error about the first stray line.
    expect(codes).toContain("awg.conf.no_interface");
  });

  it("catches a key that is not a WireGuard key", () => {
    const conf = [
      "[Interface]",
      "PrivateKey = definitely-not-base64",
      "Address = 10.0.0.2/32",
      "[Peer]",
      "PublicKey = also-not-a-key",
      "Endpoint = vpn.example.com:51820",
    ].join("\n");

    const codes = awgEngine.inspect(conf).findings.map((f) => f.code);
    expect(codes).toContain("awg.conf.bad_key");
    expect(codes).toContain("awg.conf.peer_bad_key");
  });

  it("flags an endpoint with no port as a warning, not an error", () => {
    const conf = [
      "[Interface]",
      "PrivateKey = " + "A".repeat(43) + "=",
      "Address = 10.0.0.2/32",
      "[Peer]",
      "PublicKey = " + "B".repeat(43) + "=",
      "Endpoint = vpn.example.com",
    ].join("\n");

    const endpoint = awgEngine
      .inspect(conf)
      .findings.find((f) => f.code === "awg.conf.peer_bad_endpoint");
    // An unusual endpoint may still work; a missing key cannot.
    expect(endpoint?.level).toBe("warn");
  });

  it("says a config with no peers is probably a server half", () => {
    const conf = [
      "[Interface]",
      "PrivateKey = " + "A".repeat(43) + "=",
      "Address = 10.0.0.1/24",
    ].join("\n");

    const codes = awgEngine.inspect(conf).findings.map((f) => f.code);
    expect(codes).toContain("awg.conf.no_peer");
  });
});
