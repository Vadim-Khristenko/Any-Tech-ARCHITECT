import { describe, it, expect } from "bun:test";

import {
  BROWSER_FINGERPRINTS,
  SIZED_FINGERPRINTS,
  UTLS_FINGERPRINTS,
  fingerprintById,
  detectBrowser,
} from "../fingerprints";
import { BFP } from "@/engines/awg/generator/constants";

/**
 * One browser, two facets: packet sizes for AmneziaWG, a uTLS profile for
 * XRay. These tests hold the shared registry against the table AmneziaWG has
 * always used, so moving to a shared description cannot quietly change what
 * the generator produces.
 */

describe("the registry", () => {
  it("has unique ids", () => {
    const ids = BROWSER_FINGERPRINTS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every entry at least one usable facet", () => {
    for (const b of BROWSER_FINGERPRINTS) {
      expect(b.sizes ?? b.utls, `${b.id} is useful to neither engine`).toBeTruthy();
    }
  });

  it("reproduces the packet sizes AmneziaWG already used", () => {
    // The sizes are measurements, not preferences: if they changed, configs
    // would stop matching the browser they claim to imitate.
    for (const b of SIZED_FINGERPRINTS) {
      const legacy = BFP[b.id];
      expect(legacy, `${b.id} is missing from BFP`).toBeTruthy();
      for (const slot of Object.keys(legacy) as (keyof typeof legacy)[]) {
        expect(b.sizes![slot], `${b.id}.${slot}`).toEqual(legacy[slot]);
      }
    }
  });

  it("covers every browser BFP knows about", () => {
    for (const id of Object.keys(BFP)) {
      expect(fingerprintById(id), `${id} missing from the registry`).toBeTruthy();
    }
  });

  it("never names a uTLS profile REALITY refuses", () => {
    // `unsafe` and `hellogolang` are rejected outright in
    // infra/conf/transport_security.go, so offering them would produce a
    // config the core will not load.
    for (const b of UTLS_FINGERPRINTS) {
      expect(b.utls!.preset).not.toBe("unsafe");
      expect(b.utls!.preset).not.toBe("hellogolang");
      expect(b.utls!.modern ?? "").not.toBe("hellogolang");
    }
  });

  it("pins modern profiles only in the documented form", () => {
    for (const b of UTLS_FINGERPRINTS) {
      if (!b.utls!.modern) continue;
      expect(b.utls!.modern).toMatch(/^hello[a-z0-9]+_[0-9_]+$/);
    }
  });

  it("pins only what uTLS itself considers current and working", () => {
    /**
     * The ground truth is what each `Hello*_Auto` alias resolves to in
     * refraction-networking/utls — that is the version the maintainers stand
     * behind, and the one a client sends when it is given the plain preset.
     *
     * Two of these do not follow the obvious guess, and both were wrong here
     * before this test existed. uTLS says in a comment beside each alias that
     * `HelloEdge_106` and `Hello360_11_0` "seem to be incompatible with this
     * library", so it points Edge at 85 and 360 at 7.5 — even though Xray
     * lists the newer pair in its Modern pool, which is where `random` draws
     * from. Pinning the newer ones shipped a hello that does not work.
     */
    const AUTO_RESOLVES_TO: Record<string, string> = {
      chrome: "hellochrome_133",
      firefox: "hellofirefox_148",
      safari: "hellosafari_26_3",
      ios: "helloios_14",
      qq: "helloqq_11_1",
      edge: "helloedge_85",
      "360": "hello360_7_5",
    };

    for (const b of UTLS_FINGERPRINTS) {
      const expected = AUTO_RESOLVES_TO[b.utls!.preset];
      if (!expected) continue;
      if (!b.utls!.modern) continue;
      expect(b.utls!.modern, `${b.id} pins the wrong uTLS profile`).toBe(
        expected,
      );
    }
  });

  it("never pins a profile uTLS calls incompatible", () => {
    const INCOMPATIBLE = ["helloedge_106", "hello360_11_0"];
    for (const b of UTLS_FINGERPRINTS) {
      expect(INCOMPATIBLE, b.id).not.toContain(b.utls!.modern);
    }
  });
});

describe("detecting the visitor's browser", () => {
  const withUA = (ua: string, brands?: { brand: string; version: string }[]) =>
    ({ userAgent: ua, ...(brands ? { userAgentData: { brands } } : {}) }) as
      unknown as Navigator;

  it("never claims to be exact", () => {
    // A page cannot read its own TLS ClientHello. Anything else would be a
    // guess presented as a fact, in a tool people use to avoid being detected.
    const result = detectBrowser(withUA("Mozilla/5.0 Chrome/133.0"));
    expect(result.exact).toBe(false);
  });

  it("prefers client hints when they are present", () => {
    const result = detectBrowser(
      withUA("Mozilla/5.0 Chrome/133.0", [
        { brand: "Chromium", version: "133" },
      ]),
    );
    expect(result.reason).toBe("client-hints");
    expect(result.fingerprint.id).toBe("chrome");
    expect(result.version).toBe(133);
  });

  it("reads the user agent when hints are absent", () => {
    const result = detectBrowser(withUA("Mozilla/5.0 Firefox/148.0"));
    expect(result.reason).toBe("user-agent");
    expect(result.fingerprint.id).toBe("firefox");
    expect(result.version).toBe(148);
  });

  it("does not mistake Edge or Yandex for Chrome", () => {
    // Both put "Chrome" in the UA, so order of matching decides the answer.
    expect(
      detectBrowser(withUA("Mozilla/5.0 Chrome/133.0 Edg/133.0")).fingerprint.id,
    ).toBe("edge");
    expect(
      detectBrowser(withUA("Mozilla/5.0 YaBrowser/24.1 Chrome/120.0"))
        .fingerprint.id,
    ).toBe("yandex_desktop");
  });

  it("does not mistake Chrome for Safari", () => {
    // Every WebKit-derived UA also says "Safari", so Safari has to match last.
    const chromeUA =
      "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/133.0 Safari/537.36";
    expect(detectBrowser(withUA(chromeUA)).fingerprint.id).toBe("chrome");

    const safariUA =
      "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15";
    expect(detectBrowser(withUA(safariUA)).fingerprint.id).toBe("safari");
  });

  it("recognises iOS", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Safari/604.1";
    expect(detectBrowser(withUA(ua)).fingerprint.id).toBe("ios");
  });

  it("falls back rather than failing when there is nothing to read", () => {
    const result = detectBrowser(undefined);
    expect(result.reason).toBe("fallback");
    expect(result.fingerprint.id).toBe("chrome");
  });
});
