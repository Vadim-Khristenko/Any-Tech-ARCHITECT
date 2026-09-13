/**
 * Building a key, and taking one apart.
 *
 * The invariant that matters: anything this builds must survive its own
 * validator. The format keeps three copies of a container's configuration, so
 * a builder that filled one of them would produce exactly the
 * self-contradicting key `validate` exists to catch — from the tool that is
 * supposed to know better.
 */

import { describe, it, expect } from "bun:test";
import {
  buildKey,
  exportAll,
  exportJson,
  extractVless,
  extractWgQuick,
  identifyKey,
  makeAwgContainer,
  makeXrayContainer,
  parseVless,
  renderWgQuick,
  toContainer,
  validateVpnConfig,
  vpnDecode,
  vpnEncode,
  type VpnConfig,
} from "@/engines/keys";
import { wireguardKey, xrayKey } from "./fixtures/vpnKeys";

const HOST = "198.51.100.7";
const PRIV = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const PUB = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=";
const SERVER = "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=";

const input = (obfuscation?: Record<string, string>) => ({
  hostName: HOST,
  port: 44200,
  clientPrivKey: PRIV,
  clientPubKey: PUB,
  serverPubKey: SERVER,
  clientIp: "10.8.1.6",
  dns: ["1.1.1.1", "1.0.0.1"] as [string, string],
  obfuscation,
});

/* S3 and S4 are what make this 2.0 rather than 1.0 — there is no version
   field, so the newest field present names the generation. */
const AWG_2 = {
  Jc: "4",
  Jmin: "40",
  Jmax: "70",
  S1: "60",
  S2: "80",
  S3: "30",
  S4: "20",
  H1: "1234567890",
  H2: "1234567891",
  H3: "1234567892",
  H4: "1234567893",
};

/* ── Writing wg-quick ─────────────────────────────────────────────────────── */

describe("the wg-quick text", () => {
  it("puts the obfuscation in [Interface], where AmneziaWG reads it", () => {
    const text = renderWgQuick(input(AWG_2));
    const iface = text.slice(0, text.indexOf("[Peer]"));
    expect(iface).toContain("Jc = 4");
    expect(iface).toContain("H1 = 1234567890");
    expect(text).toContain(`Endpoint = ${HOST}:44200`);
  });

  it("writes the same text twice for the same parameters", () => {
    // Field order comes from the format's own list, not from object key order.
    const a = renderWgQuick(input({ S1: "60", Jc: "4" }));
    const b = renderWgQuick(input({ Jc: "4", S1: "60" }));
    expect(a).toBe(b);
  });

  it("leaves out what it was not given", () => {
    const text = renderWgQuick({ hostName: HOST, port: 443 });
    expect(text).not.toContain("PrivateKey");
    expect(text).not.toContain("DNS");
    expect(text).toContain("[Peer]");
  });
});

/* ── The three copies ─────────────────────────────────────────────────────── */

describe("a container it builds", () => {
  it("agrees with itself across all three copies", () => {
    const cfg = buildKey([makeAwgContainer(input(AWG_2))], { hostName: HOST });
    // The validator's whole job is finding disagreement between them.
    expect(validateVpnConfig(cfg)).toEqual([]);
  });

  it("keeps agreeing after a round trip through the envelope", () => {
    const cfg = buildKey([makeAwgContainer(input(AWG_2))], { hostName: HOST });
    const again = vpnDecode(vpnEncode(cfg)) as VpnConfig;
    expect(validateVpnConfig(again)).toEqual([]);
    expect(again).toEqual(cfg);
  });

  it("is read back as the version its fields describe", () => {
    const cfg = buildKey([makeAwgContainer(input(AWG_2))]);
    expect(identifyKey(cfg).containers[0].awgVersion).toBe("2.0");

    const three = buildKey([
      makeAwgContainer(
        input({ ...AWG_2, HeaderProtectionKey: "DDDDDDDD=", S3: "30", S4: "20" }),
      ),
    ]);
    expect(identifyKey(three).containers[0].awgVersion).toBe("3.0");
  });

  it("does not put obfuscation into a plain WireGuard container", () => {
    // Asked for WireGuard, given AWG fields: the container is what was asked
    // for, and a WireGuard container carrying Jc is the mismatch `validate`
    // reports.
    const cfg = buildKey([makeAwgContainer(input(AWG_2), "amnezia-wireguard")]);
    expect(validateVpnConfig(cfg)).toEqual([]);
    expect(identifyKey(cfg).containers[0].protocol).toBe("wireguard");
  });
});

describe("a key it builds", () => {
  it("defaults to its first container rather than to nothing", () => {
    const cfg = buildKey([
      makeAwgContainer(input(AWG_2)),
      makeXrayContainer({ xray_security: "reality" }),
    ]);
    expect(cfg.defaultContainer).toBe("amnezia-awg");
    expect(validateVpnConfig(cfg)).toEqual([]);
  });

  it("marks a given name as the user's, or the client replaces it", () => {
    const cfg = buildKey([makeAwgContainer(input())], { name: "Home" });
    expect(cfg.nameOverriddenByUser).toBe(true);
  });
});

/* ── Taking one apart ─────────────────────────────────────────────────────── */

describe("exporting", () => {
  it("returns the stored wg-quick text rather than rebuilding it", () => {
    // The stored text may carry lines this tool has no opinion about, and
    // rebuilding would drop them.
    const cfg = vpnDecode(wireguardKey()) as VpnConfig;
    const conf = extractWgQuick(cfg.containers![0])!;
    expect(conf).toContain("[Interface]");
    expect(conf).toContain("[Peer]");
    expect(conf).toContain("Endpoint =");
  });

  it("forms a vless:// link from an XRay container", () => {
    const cfg = vpnDecode(xrayKey()) as VpnConfig;
    const link = extractVless(cfg.containers![0]);
    expect(link).not.toBeNull();
    const { link: parsed, findings } = parseVless(link!);
    expect(parsed!.host).toBe(HOST);
    expect(parsed!.params.security).toBe("reality");
    // The fixture has no pbk, so the link is honestly reported as incomplete
    // rather than silently produced as if it would connect.
    expect(findings.map((f) => f.code)).toContain("vless.reality_no_pbk");
  });

  it("offers no link for a container that cannot form one", () => {
    const cfg = vpnDecode(wireguardKey()) as VpnConfig;
    expect(extractVless(cfg.containers![0])).toBeNull();
  });

  it("lists only the formats a key actually has", () => {
    const cfg = vpnDecode(wireguardKey()) as VpnConfig;
    const out = exportAll(cfg);
    expect(Object.keys(out.conf)).toEqual(["amnezia-wireguard"]);
    expect(out.vless).toEqual({});
    expect(JSON.parse(out.json)).toEqual(cfg);
  });

  it("writes JSON a person can read", () => {
    const cfg = buildKey([makeAwgContainer(input(AWG_2))]);
    expect(exportJson(cfg)).toContain("\n  ");
  });
});

/* ── A link straight into a key ───────────────────────────────────────────── */

describe("a vless:// link becomes a container", () => {
  it("survives being built into a key and read back as a link", () => {
    const ID = "b831381d-6324-4d53-ad4f-8cda48b30811";
    const original = `vless://${ID}@${HOST}:443?type=tcp&security=reality&sni=www.example.com&pbk=EXAMPLEPUB&sid=ab12&fp=chrome`;

    const cfg = buildKey([makeXrayContainer(toContainer(parseVless(original).link!))]);
    expect(validateVpnConfig(cfg)).toEqual([]);

    const back = parseVless(extractVless(cfg.containers![0])!).link!;
    expect(back.id).toBe(ID);
    expect(back.port).toBe(443);
    expect(back.params.pbk).toBe("EXAMPLEPUB");
    expect(back.params.sni).toBe("www.example.com");
  });
});
