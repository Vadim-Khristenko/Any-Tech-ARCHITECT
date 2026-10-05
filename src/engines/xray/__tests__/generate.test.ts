import { describe, it, expect } from "bun:test";

import { xrayEngine } from "../index";
import {
  uuidV4,
  makeShortId,
  resolveXhttpMode,
  makeVlessEncryption,
} from "../generate";
import { XRAY_VERSIONS, xrayCaps, XRAY_FLOOR } from "../versions";
import { fromBase64Url, publicKeyFor } from "@/shared/x25519";
import type { XrayInput } from "../types";

/**
 * Every assertion here is a rule Xray-core enforces in its own parser. If the
 * generator breaks one, the core refuses the config — or worse, loads it and
 * nobody can connect. The file names the source next to each group.
 */

const input = (over: Partial<XrayInput> = {}): XrayInput => ({
  ...xrayEngine.createDefaults(),
  address: "198.51.100.10",
  ...over,
});

describe("versions", () => {
  it("start at the agreed floor and go no lower", () => {
    expect(XRAY_FLOOR.id).toBe("24.11.11");
    expect(XRAY_VERSIONS[XRAY_VERSIONS.length - 1].id).toBe("24.11.11");
  });

  it("have exactly one newest", () => {
    expect(XRAY_VERSIONS.filter((v) => v.isNewest)).toHaveLength(1);
    expect(XRAY_VERSIONS[0].isNewest).toBe(true);
  });

  it("gain capabilities monotonically as they get newer", () => {
    // Newest first, so each flag may only turn off as we walk down the list.
    const flags = ["mldsa65", "vlessEncryption", "hysteria"] as const;
    for (const flag of flags) {
      const seq = XRAY_VERSIONS.map((v) => v[flag]);
      const firstFalse = seq.indexOf(false);
      if (firstFalse >= 0) {
        expect(seq.slice(firstFalse).every((x) => !x), flag).toBe(true);
      }
    }
  });

  it("fall back to the newest for an unknown version", () => {
    expect(xrayCaps("99.9.9").id).toBe(XRAY_VERSIONS[0].id);
  });
});

describe("identifiers", () => {
  it("issues RFC 4122 version 4 UUIDs", () => {
    for (let i = 0; i < 20; i++) {
      expect(uuidV4()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
  });

  it("issues unique UUIDs", () => {
    const seen = new Set(Array.from({ length: 50 }, uuidV4));
    expect(seen.size).toBe(50);
  });
});

describe("shortId", () => {
  it("stays within the 16-character cap the core enforces", () => {
    expect(makeShortId(64).length).toBeLessThanOrEqual(16);
  });

  it("always has an even length, or hex.Decode fails", () => {
    for (const requested of [1, 3, 7, 9, 15, 16]) {
      expect(makeShortId(requested).length % 2, `${requested}`).toBe(0);
    }
  });

  it("never comes out empty", () => {
    expect(makeShortId(0).length).toBeGreaterThan(0);
  });

  it("is hex", () => {
    for (let i = 0; i < 10; i++) {
      expect(makeShortId(8)).toMatch(/^[0-9a-f]+$/);
    }
  });
});

describe("XHTTP mode resolution", () => {
  // splithttp/dialer.go: packet-up, stream-one under REALITY, stream-up when
  // a separate download transport is configured.
  it("defaults to packet-up", () => {
    expect(resolveXhttpMode("auto", false, false)).toBe("packet-up");
  });

  it("becomes stream-one under REALITY", () => {
    expect(resolveXhttpMode("auto", true, false)).toBe("stream-one");
  });

  it("becomes stream-up when the download is split", () => {
    expect(resolveXhttpMode("auto", true, true)).toBe("stream-up");
  });

  it("leaves an explicit choice alone", () => {
    expect(resolveXhttpMode("packet-up", true, true)).toBe("packet-up");
  });
});

describe("REALITY keys", () => {
  it("produces a 32-byte pair in unpadded base64 RawURL", () => {
    const cfg = xrayEngine.generate(input());
    const keys = cfg.reality!.keys;
    expect(fromBase64Url(keys.privateKey)!.length).toBe(32);
    expect(fromBase64Url(keys.publicKey)!.length).toBe(32);
    expect(keys.privateKey).not.toContain("=");
    expect(keys.publicKey).not.toContain("=");
  });

  it("produces a pair that actually corresponds", () => {
    // The half a client is given has to be derivable from the half the server
    // keeps, or nothing authenticates.
    const cfg = xrayEngine.generate(input());
    expect(publicKeyFor(cfg.reality!.keys.privateKey)).toBe(
      cfg.reality!.keys.publicKey,
    );
  });

  it("never repeats a key across configs", () => {
    const keys = new Set(
      Array.from(
        { length: 10 },
        () => xrayEngine.generate(input()).reality!.keys.privateKey,
      ),
    );
    expect(keys.size).toBe(10);
  });
});

describe("choices the core would refuse are not emitted", () => {
  it("drops REALITY onto TLS when the transport cannot carry it", () => {
    // "REALITY only supports RAW, XHTTP and gRPC for now."
    const cfg = xrayEngine.generate(input({ transport: "ws" }));
    expect(cfg.security).toBe("tls");
    expect(cfg.reality).toBeUndefined();
  });

  it("keeps REALITY on the transports that do support it", () => {
    for (const transport of ["raw", "xhttp", "grpc"] as const) {
      const cfg = xrayEngine.generate(input({ transport }));
      expect(cfg.security, transport).toBe("reality");
    }
  });

  it("drops Vision when there is no TLS layer under it", () => {
    const cfg = xrayEngine.generate(
      input({ security: "none", transport: "raw", flow: "xtls-rprx-vision" }),
    );
    expect(cfg.flow).toBe("");
    expect(cfg.clients.every((c) => c.flow === "")).toBe(true);
  });

  it("gives every client the same flow as the config", () => {
    const cfg = xrayEngine.generate(input({ clientCount: 4 }));
    expect(cfg.clients).toHaveLength(4);
    for (const c of cfg.clients) expect(c.flow).toBe(cfg.flow);
  });

  it("omits ML-DSA on a version that predates it", () => {
    const cfg = xrayEngine.generate(
      input({ version: "24.11.11", useMldsa65: true }),
    );
    expect(cfg.reality!.mldsa65).toBeUndefined();
  });

  it("omits VLESS Encryption on a version that predates it", () => {
    const cfg = xrayEngine.generate(
      input({ version: "25.7.23", useVlessEncryption: true }),
    );
    expect(cfg.vlessEncryption).toBeUndefined();
  });

  it("supplies minClientVer only where the core has no default", () => {
    // The default arrived in v26.7.11; before that, omitting it changes
    // behaviour, so the generator fills it in.
    expect(
      xrayEngine.generate(input({ version: "26.7.11" })).reality!.minClientVer,
    ).toBeUndefined();
    expect(
      xrayEngine.generate(input({ version: "26.1.13" })).reality!.minClientVer,
    ).toBeTruthy();
  });
});

describe("VLESS Encryption string", () => {
  it("follows the shape infra/conf/vless.go parses", () => {
    const { decryption } = makeVlessEncryption("native", "0-600");
    const parts = decryption.split(".");
    expect(parts[0]).toBe("mlkem768x25519plus");
    expect(parts[1]).toBe("native");
    expect(parts[2]).toBe("0-600");
    expect(parts.length).toBeGreaterThanOrEqual(4);
  });

  it("carries key material of a length the core accepts", () => {
    const { decryption } = makeVlessEncryption("xorpub", "600");
    const key = decryption.split(".").slice(3).join(".");
    const bytes = fromBase64Url(key);
    expect([32, 64]).toContain(bytes!.length);
  });
});

describe("fingerprints", () => {
  it("names the rolling alias by default", () => {
    const cfg = xrayEngine.generate(input({ fingerprint: "chrome" }));
    expect(cfg.reality!.fingerprint).toBe("chrome");
  });

  it("pins a concrete profile when asked", () => {
    const cfg = xrayEngine.generate(
      input({ fingerprint: "chrome", pinFingerprint: true }),
    );
    expect(cfg.reality!.fingerprint).toMatch(/^hellochrome_\d+$/);
  });

  it("never emits one REALITY refuses", () => {
    for (const fp of ["chrome", "firefox", "safari", "ios", "android"]) {
      const cfg = xrayEngine.generate(input({ fingerprint: fp }));
      expect(cfg.reality!.fingerprint).not.toBe("unsafe");
      expect(cfg.reality!.fingerprint).not.toBe("hellogolang");
    }
  });
});
