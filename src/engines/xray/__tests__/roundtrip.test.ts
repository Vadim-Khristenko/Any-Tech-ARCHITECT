import { describe, it, expect } from "bun:test";

import { xrayEngine, buildServerInbound, buildClientUris } from "../index";
import { linesToText } from "@/types/engine";
import { hasErrors } from "@/types/findings";
import { resolveFinding } from "@/shared/findings";
import type { XrayInput } from "../types";

/**
 * The round-trip law, and validation.
 *
 * Rendering and parsing are held together the same way as for AmneziaWG: what
 * the engine writes, it has to be able to read back. XRay has two outputs, so
 * the law applies twice — once to the server JSON, once to the client link.
 */

const input = (over: Partial<XrayInput> = {}): XrayInput => ({
  ...xrayEngine.createDefaults(),
  address: "198.51.100.10",
  ...over,
});

describe("a generated config is valid", () => {
  it("reports no errors for the defaults", () => {
    const cfg = xrayEngine.generate(input());
    const findings = xrayEngine.validate(cfg);
    const errors = findings.filter((f) => f.level === "error");
    expect(errors.map(resolveFinding)).toEqual([]);
  });

  for (const transport of ["raw", "xhttp", "grpc"] as const) {
    it(`reports no errors over ${transport}`, () => {
      const cfg = xrayEngine.generate(input({ transport }));
      expect(hasErrors(xrayEngine.validate(cfg))).toBe(false);
    });
  }

  it("reports no errors on any supported version", () => {
    for (const version of xrayEngine.versions) {
      const cfg = xrayEngine.generate(
        input({
          version: version.id as XrayInput["version"],
          useMldsa65: true,
          useVlessEncryption: true,
        }),
      );
      const errors = xrayEngine
        .validate(cfg)
        .filter((f) => f.level === "error");
      expect(errors.map(resolveFinding), version.id).toEqual([]);
    }
  });

  it("every finding resolves to a sentence, not a bare code", () => {
    const cfg = xrayEngine.generate(input({ useMldsa65: true }));
    for (const finding of xrayEngine.validate(cfg)) {
      const text = resolveFinding(finding);
      expect(text, finding.code).not.toBe(finding.code);
      expect(text).not.toContain("{");
    }
  });
});

describe("server JSON round trip", () => {
  it("parses back into the same essentials", () => {
    const original = xrayEngine.generate(input({ clientCount: 2 }));
    const json = JSON.stringify(buildServerInbound(original), null, 2);
    const result = xrayEngine.parse(json);

    expect(result.ok, JSON.stringify(result.findings)).toBe(true);
    const parsed = result.config!;

    expect(parsed.port).toBe(original.port);
    expect(parsed.transport).toBe(original.transport);
    expect(parsed.security).toBe(original.security);
    expect(parsed.clients.map((c) => c.id)).toEqual(
      original.clients.map((c) => c.id),
    );
    expect(parsed.reality!.serverNames).toEqual(original.reality!.serverNames);
    expect(parsed.reality!.shortIds).toEqual(original.reality!.shortIds);
    expect(parsed.reality!.keys.privateKey).toBe(
      original.reality!.keys.privateKey,
    );
  });

  it("renders through the engine to the same text", () => {
    const cfg = xrayEngine.generate(input());
    const text = linesToText(xrayEngine.render(cfg));
    expect(() => JSON.parse(text)).not.toThrow();
    expect(JSON.parse(text)).toEqual(buildServerInbound(cfg));
  });
});

describe("client link round trip", () => {
  it("parses back into the same essentials", () => {
    const original = xrayEngine.generate(input());
    const uri = xrayEngine.toUri!(original)!;
    expect(uri.startsWith("vless://")).toBe(true);

    const result = xrayEngine.parse(uri);
    expect(result.ok, JSON.stringify(result.findings)).toBe(true);
    const parsed = result.config!;

    expect(parsed.clients[0].id).toBe(original.clients[0].id);
    expect(parsed.port).toBe(original.port);
    expect(parsed.transport).toBe(original.transport);
    expect(parsed.security).toBe(original.security);
    expect(parsed.flow).toBe(original.flow);
    // A link carries the public half; the private key never travels in one.
    expect(parsed.reality!.keys.publicKey).toBe(
      original.reality!.keys.publicKey,
    );
    expect(parsed.reality!.serverNames[0]).toBe(
      original.reality!.serverNames[0],
    );
  });

  it("issues one link per client", () => {
    const cfg = xrayEngine.generate(input({ clientCount: 3 }));
    const uris = buildClientUris(cfg);
    expect(uris).toHaveLength(3);
    expect(new Set(uris).size).toBe(3);
  });

  it("says out loud that a link is only the client half", () => {
    const cfg = xrayEngine.generate(input());
    const result = xrayEngine.parse(xrayEngine.toUri!(cfg)!);
    expect(
      result.findings.some((f) => f.code === "xray.parse.client_half_only"),
    ).toBe(true);
  });
});

describe("reading configs that were not ours", () => {
  it("refuses an empty input", () => {
    expect(xrayEngine.parse("   ").ok).toBe(false);
  });

  it("refuses something that is neither form", () => {
    const r = xrayEngine.parse("just some words");
    expect(r.ok).toBe(false);
    expect(r.findings[0].code).toBe("xray.parse.unrecognised");
  });

  it("refuses a link that is not vless", () => {
    const r = xrayEngine.parse("vmess://abc");
    expect(r.ok).toBe(false);
  });

  it("refuses an inbound for another protocol", () => {
    const r = xrayEngine.parse(JSON.stringify({ protocol: "trojan" }));
    expect(r.ok).toBe(false);
    expect(r.findings[0].code).toBe("xray.parse.not_vless_inbound");
  });

  it("accepts a whole config with an inbounds array", () => {
    const cfg = xrayEngine.generate(input());
    const whole = { inbounds: [buildServerInbound(cfg)] };
    expect(xrayEngine.parse(JSON.stringify(whole)).ok).toBe(true);
  });

  it("reads the older network spelling as well as method", () => {
    const cfg = xrayEngine.generate(input({ version: "26.1.13" }));
    const inbound = buildServerInbound(cfg) as Record<string, unknown>;
    const stream = inbound.streamSettings as Record<string, unknown>;
    expect(stream.network).toBe("raw");
    expect(stream.method).toBeUndefined();
    expect(xrayEngine.parse(JSON.stringify(inbound)).ok).toBe(true);
  });

  it("recognises both forms without parsing them", () => {
    const cfg = xrayEngine.generate(input());
    expect(xrayEngine.detect!(xrayEngine.toUri!(cfg)!)).toBe(true);
    expect(
      xrayEngine.detect!(JSON.stringify(buildServerInbound(cfg))),
    ).toBe(true);
    expect(xrayEngine.detect!("[Interface]\nJc = 4")).toBe(false);
  });
});

describe("validation catches what the core would reject", () => {
  const broken = (mutate: (cfg: ReturnType<typeof xrayEngine.generate>) => void) => {
    const cfg = xrayEngine.generate(input());
    mutate(cfg);
    return xrayEngine.validate(cfg);
  };

  it("an odd-length shortId", () => {
    const f = broken((c) => c.reality!.shortIds.push("abc"));
    expect(f.some((x) => x.code === "xray.short_id_odd")).toBe(true);
  });

  it("a shortId over 16 characters", () => {
    const f = broken((c) => c.reality!.shortIds.push("0".repeat(18)));
    expect(f.some((x) => x.code === "xray.short_id_long")).toBe(true);
  });

  it("an xver outside 0..2", () => {
    const f = broken((c) => (c.reality!.xver = 3));
    expect(f.some((x) => x.code === "xray.xver_range")).toBe(true);
  });

  it("empty serverNames", () => {
    const f = broken((c) => (c.reality!.serverNames = []));
    expect(f.some((x) => x.code === "xray.server_names_empty")).toBe(true);
  });

  it("a target the core warns about", () => {
    const f = broken((c) => c.reality!.serverNames.push("www.apple.com"));
    expect(f.some((x) => x.code === "xray.server_name_risky")).toBe(true);
  });

  it("a spiderX without a leading slash", () => {
    const f = broken((c) => (c.reality!.spiderX = "path"));
    expect(f.some((x) => x.code === "xray.spider_x_slash")).toBe(true);
  });

  it("a key of the wrong length", () => {
    const f = broken((c) => (c.reality!.keys.privateKey = "tooshort"));
    expect(f.some((x) => x.code === "xray.key_length")).toBe(true);
  });

  it("an ML-DSA seed equal to the private key", () => {
    const f = broken((c) => {
      c.reality!.mldsa65 = {
        seed: c.reality!.keys.privateKey,
        verify: "",
      };
    });
    expect(f.some((x) => x.code === "xray.mldsa_seed_equals_key")).toBe(true);
  });

  it("a client whose flow disagrees with the config", () => {
    const f = broken((c) => (c.clients[0].flow = ""));
    expect(f.some((x) => x.code === "xray.flow_mismatch")).toBe(true);
  });

  it("a deprecated transport", () => {
    const cfg = xrayEngine.generate(input({ transport: "ws" }));
    expect(
      xrayEngine.validate(cfg).some((x) => x.code === "xray.transport_deprecated"),
    ).toBe(true);
  });
});
