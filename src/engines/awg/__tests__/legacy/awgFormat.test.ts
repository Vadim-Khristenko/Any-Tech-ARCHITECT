import { describe, it, expect } from "bun:test";
import {
  detectFormat,
  parseConf,
  stringifyConf,
  getField,
  confToVpn,
  vpnToConf,
} from "@/engines/awg/awgFormat";
import { vpnDecode } from "@/engines/keys";

describe("detectFormat", () => {
  it("detects vpn:// keys by prefix", () => {
    expect(detectFormat("vpn://AAAA")).toBe("vpn");
  });
  it("detects wg-quick .conf by section header", () => {
    expect(detectFormat("[Interface]\nPrivateKey = abc\n")).toBe("conf");
  });
  it("detects JSON objects", () => {
    expect(detectFormat('{\n  "containers": []\n}')).toBe("json");
  });
  it("classifies JSON that embeds a wg-quick string as json, not conf", () => {
    const json = JSON.stringify({
      containers: [{ awg: { config: "[Interface]\nJc = 8\n" } }],
    });
    expect(detectFormat(json)).toBe("json");
  });
  it("returns unknown for garbage", () => {
    expect(detectFormat("hello world")).toBe("unknown");
  });
  it("trims whitespace before detecting", () => {
    expect(detectFormat("   \n[Interface]\n")).toBe("conf");
  });
});

describe("parseConf / stringifyConf / getField", () => {
  const sample =
    "[Interface]\nPrivateKey = KEY\nJc = 8\nAddress = 10.0.0.2/32\n\n[Peer]\nPublicKey = PUB\nEndpoint = 1.2.3.4:51820\n";

  it("parses sections and entries in order", () => {
    const c = parseConf(sample);
    expect(c.sections.map((s) => s.name)).toEqual(["Interface", "Peer"]);
    expect(c.sections[0].entries).toContainEqual({ key: "Jc", value: "8" });
    expect(c.sections[1].entries).toContainEqual({
      key: "Endpoint",
      value: "1.2.3.4:51820",
    });
  });

  it("round-trips: stringify(parse(x)) preserves field values", () => {
    const c = parseConf(sample);
    const out = parseConf(stringifyConf(c));
    expect(out).toEqual(c);
  });

  it("getField reads a flat field across sections", () => {
    const c = parseConf(sample);
    expect(getField(c, "Endpoint")).toBe("1.2.3.4:51820");
    expect(getField(c, "Jc")).toBe("8");
    expect(getField(c, "Missing")).toBeNull();
  });

  it("ignores comments and blank lines", () => {
    const c = parseConf("# comment\n\n[Interface]\n; note\nJc = 3\n");
    expect(c.sections).toHaveLength(1);
    expect(getField(c, "Jc")).toBe("3");
  });
});

describe("conf <-> vpn transform", () => {
  const conf =
    "[Interface]\nPrivateKey = KEY\nJc = 8\nJmin = 40\nJmax = 80\nAddress = 10.0.0.2/32\nDNS = 1.1.1.1\n\n[Peer]\nPublicKey = PUB\nEndpoint = 1.2.3.4:51820\n";

  it("confToVpn produces a decodable key with one AWG container", () => {
    const key = confToVpn(conf);
    expect(key.startsWith("vpn://")).toBe(true);
    const decoded = vpnDecode(key);
    const awg = decoded.containers?.[0]?.awg as Record<string, unknown>;
    expect(String(awg.config)).toContain("[Interface]");
    expect(awg.Jc).toBe("8");
    expect(decoded.hostName).toBe("1.2.3.4");
    expect(decoded.dns1).toBe("1.1.1.1");
  });

  it("round-trips conf -> vpn -> conf preserving fields", () => {
    const key = confToVpn(conf);
    const { conf: back, awgContainers } = vpnToConf(vpnDecode(key));
    expect(awgContainers.length).toBe(1);
    expect(back).toContain("Endpoint = 1.2.3.4:51820");
    expect(back).toContain("Jc = 8");
  });

  it("vpnToConf lists multiple AWG containers and honours the picked name", () => {
    const decoded = vpnDecode(confToVpn(conf));
    decoded.containers!.push({
      container: "amneziawg-2",
      awg: { config: "[Interface]\nJc = 3\n" },
    });
    const all = vpnToConf(decoded);
    expect(all.awgContainers).toEqual(["amneziawg", "amneziawg-2"]);
    const picked = vpnToConf(decoded, "amneziawg-2");
    expect(picked.conf).toContain("Jc = 3");
  });

  it("vpnToConf throws when no AWG container exists", () => {
    expect(() => vpnToConf({ containers: [{ container: "xray" }] })).toThrow();
  });
});
