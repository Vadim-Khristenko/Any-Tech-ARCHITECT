import { describe, it, expect } from "vitest";
import {
  genCfg,
  renderConf,
  validateAwg3,
  parseRange,
  genHeaderProtectionKey,
  headerProtectionKeyHex,
  MIN_S_WITH_HEADER_PROTECTION,
  HEADER_PROTECTION_KEY_BYTES,
  type AWGConfig,
  type GeneratorInput,
} from "@/engines/awg/generator";

const baseInput: GeneratorInput = {
  version: "3.0",
  intensity: "medium",
  profile: "quic_initial",
  customHost: "",
  hostRegion: "any",
  mimicAll: false,
  useTagC: false,
  useTagT: true,
  useTagR: true,
  useTagRC: true,
  useTagRD: true,
  useBrowserFp: false,
  browserProfile: "",
  mtu: 1500,
  junkLevel: 5,
  iterCount: 0,
  routerMode: false,
  useExtremeMax: false,
  // Amnezia VPN manages HeaderProtectionKey itself, so emission mechanics is
  // pinned to a client that takes the emitted key.
  clientId: "amneziawg-windows",
  useHeaderProtection: true,
  useContentPadding: true,
  useRandomTimings: true, useRandomTrailers: false, useDisableCookies: false,
};

const ITER = 120;

// ─────────────────────────────────────────────────────────────────────────────
// HeaderProtectionKey
// ─────────────────────────────────────────────────────────────────────────────

describe("HeaderProtectionKey", () => {
  it("is base64 of exactly 32 bytes (the .conf key encoding)", () => {
    for (let i = 0; i < 50; i++) {
      const key = genHeaderProtectionKey();
      expect(key).toMatch(/^[A-Za-z0-9+/]{43}=$/);
      expect(headerProtectionKeyHex(key)).toHaveLength(
        HEADER_PROTECTION_KEY_BYTES * 2,
      );
    }
  });

  it("produces a distinct key every call", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(genHeaderProtectionKey());
    expect(seen.size).toBe(100);
  });

  it("hex form round-trips to the same 32 bytes", () => {
    const key = genHeaderProtectionKey();
    const hex = headerProtectionKeyHex(key);
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S-padding floor
//
// send.go reads the ChaCha20 nonce from crypt[:HeaderCipherNonceSize], where
// crypt is the S-padding. Padding under 12 bytes makes the nonce overlap the
// message body instead of random data.
// ─────────────────────────────────────────────────────────────────────────────

describe("S-padding floor under header protection", () => {
  it("keeps S1-S4 >= 12 whenever HeaderProtectionKey is emitted", () => {
    for (let i = 0; i < ITER; i++) {
      const cfg = genCfg({ ...baseInput, iterCount: i });
      expect(cfg.awg3?.headerProtectionKey).toBeTruthy();
      for (const s of [cfg.s1, cfg.s2, cfg.s3, cfg.s4]) {
        expect(s).toBeGreaterThanOrEqual(MIN_S_WITH_HEADER_PROTECTION);
      }
    }
  });

  it("holds the floor even in router mode, which clamps S1/S2 down", () => {
    for (let i = 0; i < ITER; i++) {
      const cfg = genCfg({ ...baseInput, routerMode: true, iterCount: i });
      for (const s of [cfg.s1, cfg.s2, cfg.s3, cfg.s4]) {
        expect(s).toBeGreaterThanOrEqual(MIN_S_WITH_HEADER_PROTECTION);
      }
    }
  });

  it("never pushes S4 past the protocol cap of 32", () => {
    for (let i = 0; i < ITER; i++) {
      const cfg = genCfg({ ...baseInput, iterCount: i });
      expect(cfg.s4).toBeLessThanOrEqual(32);
    }
  });

  it("does not apply the floor when header protection is off", () => {
    // Without the cipher there is no nonce to source, so S may stay small.
    let sawSmall = false;
    for (let i = 0; i < 200; i++) {
      const cfg = genCfg({
        ...baseInput,
        useHeaderProtection: false,
        iterCount: i,
      });
      expect(cfg.awg3?.headerProtectionKey).toBe("");
      if (Math.min(cfg.s1, cfg.s2, cfg.s3, cfg.s4) < 12) sawSmall = true;
    }
    expect(sawSmall).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Timer invariants (device/timers.go)
// ─────────────────────────────────────────────────────────────────────────────

describe("randomised timers", () => {
  it("keeps the receiving-side key refresh window above zero", () => {
    for (let i = 0; i < ITER; i++) {
      const p = genCfg({ ...baseInput, iterCount: i }).awg3!;
      const reject = parseRange(p.rejectAfterTime)!;
      const keepalive = parseRange(p.keepaliveTimeout)!;
      const rekeyTimeout = parseRange(p.rekeyTimeout)!;

      // keyRefreshTimeoutReceiving = RejectAfterTime − Keepalive.Lo − Rekey.Lo
      expect(reject[0] - keepalive[0] - rekeyTimeout[0]).toBeGreaterThan(0);
    }
  });

  it("always rekeys before the session is rejected", () => {
    for (let i = 0; i < ITER; i++) {
      const p = genCfg({ ...baseInput, iterCount: i }).awg3!;
      const rekeyAfter = parseRange(p.rekeyAfterTime)!;
      const reject = parseRange(p.rejectAfterTime)!;
      expect(rekeyAfter[1]).toBeLessThan(reject[0]);
    }
  });

  it("emits well-formed, non-inverted ranges", () => {
    for (let i = 0; i < ITER; i++) {
      const p = genCfg({ ...baseInput, iterCount: i }).awg3!;
      for (const raw of [
        p.rekeyAfterTime,
        p.rekeyTimeout,
        p.rejectAfterTime,
        p.keepaliveTimeout,
        p.maxHandshakeAttempts,
        p.contentPaddingAddition,
      ]) {
        expect(raw).toMatch(/^\d+(-\d+)?$/);
        const r = parseRange(raw)!;
        expect(r[0]).toBeLessThanOrEqual(r[1]);
      }
    }
  });

  it("leaves timers empty when randomisation is disabled", () => {
    const p = genCfg({ ...baseInput, useRandomTimings: false }).awg3!;
    expect(p.rekeyAfterTime).toBe("");
    expect(p.rejectAfterTime).toBe("");
    expect(p.maxHandshakeAttempts).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ContentPaddingAddition
// ─────────────────────────────────────────────────────────────────────────────

describe("ContentPaddingAddition", () => {
  it("stays active (upper bound >= 1) so the device does not treat it as unset", () => {
    for (let i = 0; i < ITER; i++) {
      const p = genCfg({ ...baseInput, iterCount: i }).awg3!;
      expect(parseRange(p.contentPaddingAddition)![1]).toBeGreaterThanOrEqual(1);
    }
  });

  it("is empty when disabled", () => {
    const p = genCfg({ ...baseInput, useContentPadding: false }).awg3!;
    expect(p.contentPaddingAddition).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Validators
// ─────────────────────────────────────────────────────────────────────────────

function cfgWith(over: Partial<AWGConfig>): AWGConfig {
  return { ...genCfg(baseInput), ...over };
}

describe("validateAwg3", () => {
  it("passes a freshly generated 3.0 config", () => {
    for (let i = 0; i < 40; i++) {
      const findings = validateAwg3(genCfg({ ...baseInput, iterCount: i }));
      expect(findings.filter((f) => f.level === "error")).toEqual([]);
    }
  });

  it("flags S below the nonce size when the cipher key is present", () => {
    const findings = validateAwg3(cfgWith({ s1: 4 }));
    expect(findings.some((f) => f.code === "awg3.s_below_nonce")).toBe(true);
  });

  it("flags a malformed header protection key", () => {
    const cfg = genCfg(baseInput);
    const findings = validateAwg3({
      ...cfg,
      awg3: { ...cfg.awg3!, headerProtectionKey: "not-a-key" },
    });
    expect(findings.some((f) => f.code === "awg3.hpk_format")).toBe(true);
  });

  it("flags RejectAfterTime that collapses the refresh window", () => {
    const cfg = genCfg(baseInput);
    const findings = validateAwg3({
      ...cfg,
      awg3: {
        ...cfg.awg3!,
        rejectAfterTime: "12",
        keepaliveTimeout: "10",
        rekeyTimeout: "5",
      },
    });
    expect(findings.some((f) => f.code === "awg3.reject_too_low")).toBe(true);
  });

  it("flags RekeyAfterTime that outlives RejectAfterTime", () => {
    const cfg = genCfg(baseInput);
    const findings = validateAwg3({
      ...cfg,
      awg3: { ...cfg.awg3!, rekeyAfterTime: "300", rejectAfterTime: "180-200" },
    });
    expect(findings.some((f) => f.code === "awg3.rekey_after_reject")).toBe(true);
  });

  it("flags 3.0 parameters attached to a non-3.0 config", () => {
    const cfg = genCfg(baseInput);
    const findings = validateAwg3({ ...cfg, version: "2.0" });
    expect(findings.some((f) => f.code === "awg3.version_mismatch")).toBe(true);
  });

  it("flags inverted timer ranges", () => {
    const cfg = genCfg(baseInput);
    const findings = validateAwg3({
      ...cfg,
      awg3: { ...cfg.awg3!, keepaliveTimeout: "30-10" },
    });
    expect(findings.some((f) => f.code === "awg3.timing_inverted")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

describe("renderConf for AWG 3.0", () => {
  it("emits the 3.0 keys with the tools feat/awg3 spelling", () => {
    const text = renderConf(genCfg(baseInput));
    for (const key of [
      "HeaderProtectionKey",
      "ContentPaddingAddition",
      "RekeyAfterTime",
      "RekeyTimeout",
      "RejectAfterTime",
      "KeepaliveTimeout",
      "MaxHandshakeAttempts",
    ]) {
      expect(text).toContain(`${key} = `);
    }
  });

  it("still emits the 2.x parameter set", () => {
    const text = renderConf(genCfg(baseInput));
    for (const key of ["H1", "H4", "S1", "S4", "Jc", "Jmax", "I1", "I5"]) {
      expect(text).toMatch(new RegExp(`^${key} = `, "m"));
    }
  });

  it("never emits the AWG 4.0 groundwork tags", () => {
    // <d>, <ds> and <dz> parse in v3.0.1 but are not wired into the send path.
    const text = renderConf(genCfg(baseInput));
    expect(text).not.toMatch(/<d>|<ds>|<dz\s/);
  });

  it("omits 3.0 keys entirely for a 2.0 config", () => {
    const text = renderConf(genCfg({ ...baseInput, version: "2.0" }));
    expect(text).not.toContain("HeaderProtectionKey");
    expect(text).not.toContain("RekeyAfterTime");
  });

  it("omits disabled 3.0 features", () => {
    const text = renderConf(
      genCfg({ ...baseInput, useContentPadding: false, useRandomTimings: false }),
    );
    expect(text).toContain("HeaderProtectionKey");
    expect(text).not.toContain("ContentPaddingAddition");
    expect(text).not.toContain("RekeyAfterTime");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rendering parity across versions (guards the de-duplicated renderer)
// ─────────────────────────────────────────────────────────────────────────────

describe("renderConf parity for legacy versions", () => {
  it("AWG 1.0 has no CPS chains and no S3/S4", () => {
    const text = renderConf(genCfg({ ...baseInput, version: "1.0" }));
    expect(text).not.toMatch(/^I1 = /m);
    expect(text).not.toMatch(/^S3 = /m);
    expect(text).not.toMatch(/^S4 = /m);
    // That the absence is explained, not the sentence it is explained in.
    // Asserting the prose made rewording a comment a failing test, which is
    // how a comment ends up frozen for a reason nobody can name.
    expect(text).toMatch(/^# .*CPS/m);
  });

  it("uses caller-supplied comment labels when given", () => {
    // The renderer stays i18n-free; the UI injects translated comments.
    const text = renderConf(genCfg({ ...baseInput, version: "1.0" }), {
      labels: { noCps: "нет CPS", privateKey: "PrivateKey = <ключ>" },
    });
    expect(text).toContain("# нет CPS");
    expect(text).toContain("# PrivateKey = <ключ>");
  });

  it("AWG 1.5 has CPS chains but no S3/S4", () => {
    const text = renderConf(genCfg({ ...baseInput, version: "1.5" }));
    expect(text).toMatch(/^I1 = /m);
    expect(text).not.toMatch(/^S3 = /m);
  });

  it("AWG 2.0 has S3/S4 and CPS chains", () => {
    const text = renderConf(genCfg({ ...baseInput, version: "2.0" }));
    expect(text).toMatch(/^S3 = /m);
    expect(text).toMatch(/^S4 = /m);
    expect(text).toMatch(/^I5 = /m);
  });
});
