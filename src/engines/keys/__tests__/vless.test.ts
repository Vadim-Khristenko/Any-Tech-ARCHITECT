/**
 * Reading, checking and rebuilding `vless://` links.
 *
 * The rules worth testing are the ones where a link works and does not do what
 * its owner believes: REALITY without a public key, Vision on a transport that
 * cannot carry it, a misspelt parameter name that leaves a feature quietly off.
 * A parser that only rejected malformed strings would catch none of them.
 */

import { describe, it, expect } from "bun:test";
import {
  buildVless,
  fromContainer,
  parseVless,
  toContainer,
  type VlessLink,
} from "@/engines/keys";
import { translate, type MessageKey } from "@/i18n";

const ID = "b831381d-6324-4d53-ad4f-8cda48b30811";
const REALITY = `vless://${ID}@198.51.100.7:443?type=tcp&security=reality&sni=www.example.com&pbk=EXAMPLEPUBLICKEY&sid=ab12&fp=chrome&flow=xtls-rprx-vision#My%20server`;

const codes = (f: { code: string }[]) => f.map((x) => x.code);

/* ── Reading ──────────────────────────────────────────────────────────────── */

describe("parsing", () => {
  it("reads every part of a REALITY link", () => {
    const { link, findings } = parseVless(REALITY);
    expect(link).not.toBeNull();
    expect(link!.id).toBe(ID);
    expect(link!.host).toBe("198.51.100.7");
    expect(link!.port).toBe(443);
    expect(link!.remark).toBe("My server");
    expect(link!.params.pbk).toBe("EXAMPLEPUBLICKEY");
    expect(link!.params.flow).toBe("xtls-rprx-vision");
    expect(findings).toEqual([]);
  });

  it("keeps an IPv6 host out of the port split", () => {
    const { link } = parseVless(`vless://${ID}@[2001:db8::1]:8443?security=tls`);
    expect(link!.host).toBe("2001:db8::1");
    expect(link!.port).toBe(8443);
  });

  it("takes the remark from the end, so its @ and ? do not confuse it", () => {
    const { link } = parseVless(
      `vless://${ID}@198.51.100.7:443?security=tls#a%40b%3Fc`,
    );
    expect(link!.host).toBe("198.51.100.7");
    expect(link!.params.security).toBe("tls");
    expect(link!.remark).toBe("a@b?c");
  });

  it("survives a stray percent rather than losing the string", () => {
    const { link } = parseVless(`vless://${ID}@198.51.100.7:443#100%`);
    expect(link!.remark).toBe("100%");
  });
});

describe("what it refuses", () => {
  it.each([
    ["not a link at all", "https://example.com", "vless.not_a_link"],
    ["no identifier", "vless://198.51.100.7:443", "vless.no_identifier"],
    ["a port out of range", `vless://${ID}@198.51.100.7:70000`, "vless.bad_port"],
  ])("%s", (_label, input, code) => {
    const { link, findings } = parseVless(input);
    expect(link).toBeNull();
    expect(codes(findings)).toContain(code);
  });
});

/* ── Checking ─────────────────────────────────────────────────────────────── */

describe("links that work and do the wrong thing", () => {
  it("calls REALITY without a public key an error", () => {
    const { findings } = parseVless(
      `vless://${ID}@198.51.100.7:443?security=reality&sni=a.example`,
    );
    expect(codes(findings)).toContain("vless.reality_no_pbk");
    expect(findings.find((f) => f.code === "vless.reality_no_pbk")?.level).toBe(
      "error",
    );
  });

  it("notices REALITY with no fingerprint", () => {
    const { findings } = parseVless(
      `vless://${ID}@198.51.100.7:443?security=reality&pbk=K&sni=a.example`,
    );
    expect(codes(findings)).toContain("vless.reality_no_fp");
  });

  it("notices Vision where there is no TLS to carry it", () => {
    const { findings } = parseVless(
      `vless://${ID}@198.51.100.7:443?flow=xtls-rprx-vision`,
    );
    expect(codes(findings)).toContain("vless.flow_without_tls");
  });

  it("notices a public key with REALITY switched off", () => {
    const { findings } = parseVless(`vless://${ID}@198.51.100.7:443?pbk=K`);
    expect(codes(findings)).toContain("vless.pbk_without_reality");
  });

  it("reports a parameter nobody recognises", () => {
    // A misspelt `security` is a link that silently runs without REALITY.
    const { findings } = parseVless(
      `vless://${ID}@198.51.100.7:443?secutiry=reality`,
    );
    expect(codes(findings)).toContain("vless.unknown_param");
  });

  it("accepts an identifier that is not a UUID, but says so", () => {
    const { link, findings } = parseVless("vless://custom-id@198.51.100.7:443");
    expect(link).not.toBeNull();
    expect(codes(findings)).toContain("vless.id_not_uuid");
  });
});

/* ── Writing ──────────────────────────────────────────────────────────────── */

describe("rebuilding", () => {
  it("round-trips a link without changing what it means", () => {
    const first = parseVless(REALITY).link!;
    const again = parseVless(buildVless(first)).link!;
    expect(again).toEqual(first);
  });

  it("drops empty parameters instead of writing them blank", () => {
    const link: VlessLink = {
      id: ID,
      host: "198.51.100.7",
      port: 443,
      remark: "",
      params: { security: "tls", sni: "" },
    };
    const built = buildVless(link);
    expect(built).toContain("security=tls");
    expect(built).not.toContain("sni=");
    expect(built).not.toContain("#");
  });

  it("brackets an IPv6 host again", () => {
    const link: VlessLink = {
      id: ID,
      host: "2001:db8::1",
      port: 443,
      remark: "",
      params: {},
    };
    expect(buildVless(link)).toContain("@[2001:db8::1]:443");
  });
});

/* ── The two vocabularies ─────────────────────────────────────────────────── */

describe("link and container describe the same thing differently", () => {
  it("translates a link into the container's field names", () => {
    const body = toContainer(parseVless(REALITY).link!);
    expect(body.xray_security).toBe("reality");
    expect(body.xray_flow).toBe("xtls-rprx-vision");
    expect(body.xray_fingerprint).toBe("chrome");
    expect(body.xray_sni).toBe("www.example.com");
    expect(body.xray_transport).toBe("tcp");
  });

  it("carries the REALITY material the client has no field for", () => {
    // Dropping pbk would produce a key that cannot connect, which is worse
    // than carrying a field the client may not read.
    const body = toContainer(parseVless(REALITY).link!);
    expect(body.pbk).toBe("EXAMPLEPUBLICKEY");
    expect(body.sid).toBe("ab12");
  });

  it("capitalises the XHTTP mode the way the container spells it", () => {
    const link = parseVless(
      `vless://${ID}@198.51.100.7:443?type=xhttp&mode=packet-up`,
    ).link!;
    expect(toContainer(link).xhttp_mode).toBe("Packet-up");
  });

  it("comes back out again", () => {
    const body = toContainer(parseVless(REALITY).link!);
    const back = fromContainer(body)!;
    expect(back.id).toBe(ID);
    expect(back.host).toBe("198.51.100.7");
    expect(back.port).toBe(443);
    expect(back.params.security).toBe("reality");
    expect(back.params.pbk).toBe("EXAMPLEPUBLICKEY");
  });

  it("refuses a container with nothing to address", () => {
    expect(fromContainer({ xray_security: "reality" })).toBeNull();
  });
});

/* ── Every finding has a sentence ─────────────────────────────────────────── */

describe("messages", () => {
  it("has catalogue text for every code this module can emit", () => {
    const CODES = [
      "vless.not_a_link",
      "vless.no_identifier",
      "vless.no_host",
      "vless.bad_port",
      "vless.id_not_uuid",
      "vless.unknown_security",
      "vless.unknown_transport",
      "vless.reality_no_pbk",
      "vless.reality_no_sni",
      "vless.reality_no_fp",
      "vless.pbk_without_reality",
      "vless.unknown_flow",
      "vless.flow_without_tls",
      "vless.odd_encryption",
      "vless.unknown_param",
    ];
    for (const code of CODES) {
      const key = `find.${code}`;
      // A missing entry resolves to the key itself, which is the bug this
      // catches: the UI would print `find.vless.reality_no_pbk` at a reader.
      expect(translate(key as MessageKey, { value: "x", name: "x", port: "x" }), key).not.toBe(key);
    }
  });
});
