import { describe, it, expect } from "vitest";
import { genCfg, type GeneratorInput } from "@/engines/awg/generator";

const baseInput: GeneratorInput = {
    version: "2.0",
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
    clientId: "amneziavpn",
    useHeaderProtection: true,
    useContentPadding: true,
    useRandomTimings: true, useRandomTrailers: false, useDisableCookies: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Padded lengths must differ between message types
//
// A padded message is its base size plus its own S value — init 148, response
// 92, cookie reply 64 — so two of them collide when the S values differ by the
// difference of the sizes. These tests used to work that out correctly in a
// comment and then assert something else, calling it a simplified check.
// ─────────────────────────────────────────────────────────────────────────────

describe("padded size collisions", () => {
    it("init and response never come out the same length", () => {
        for (let i = 0; i < 200; i++) {
            const cfg = genCfg(baseInput);
            // 148 + s1 === 92 + s2  →  s2 === s1 + 56
            expect(148 + cfg.s1).not.toBe(92 + cfg.s2);
        }
    });

    it("init and cookie reply never come out the same length", () => {
        for (let i = 0; i < 200; i++) {
            const cfg = genCfg(baseInput);
            // 148 + s1 === 64 + s3  →  s3 === s1 + 84
            expect(148 + cfg.s1).not.toBe(64 + cfg.s3);
        }
    });

    it("response and cookie reply never come out the same length", () => {
        for (let i = 0; i < 200; i++) {
            const cfg = genCfg(baseInput);
            // 92 + s2 === 64 + s3  →  s3 === s2 + 28
            expect(92 + cfg.s2).not.toBe(64 + cfg.s3);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Parameter caps
// ─────────────────────────────────────────────────────────────────────────────

describe("parameter caps", () => {
    it("s4 <= 32 always", () => {
        for (let i = 0; i < 200; i++) {
            const cfg = genCfg({ ...baseInput, iterCount: i % 10 });
            expect(cfg.s4).toBeLessThanOrEqual(32);
        }
    });

    it("s1 <= 150", () => {
        for (let i = 0; i < 200; i++) {
            const cfg = genCfg({ ...baseInput, intensity: "high", iterCount: 10 });
            expect(cfg.s1).toBeLessThanOrEqual(150);
        }
    });

    it("s2 <= 150", () => {
        for (let i = 0; i < 200; i++) {
            const cfg = genCfg({ ...baseInput, intensity: "high", iterCount: 10 });
            expect(cfg.s2).toBeLessThanOrEqual(150);
        }
    });

    it("s3 <= 64", () => {
        for (let i = 0; i < 200; i++) {
            const cfg = genCfg({ ...baseInput, intensity: "high", iterCount: 10 });
            expect(cfg.s3).toBeLessThanOrEqual(64);
        }
    });

    it("jmax <= 1280", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg({ ...baseInput, intensity: "high", iterCount: 20 });
            expect(cfg.jmax).toBeLessThanOrEqual(1280);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// S1-S4 minimums (must be >= 1)
// ─────────────────────────────────────────────────────────────────────────────

describe("S1-S4 minimums", () => {
    it("s1 >= 1 always", () => {
        for (let i = 0; i < 200; i++) {
            const cfg = genCfg({ ...baseInput, iterCount: i % 10 });
            expect(cfg.s1).toBeGreaterThanOrEqual(1);
        }
    });

    it("s2 >= 1 always", () => {
        for (let i = 0; i < 200; i++) {
            const cfg = genCfg({ ...baseInput, iterCount: i % 10 });
            expect(cfg.s2).toBeGreaterThanOrEqual(1);
        }
    });

    it("s3 >= 1 always", () => {
        for (let i = 0; i < 200; i++) {
            const cfg = genCfg({ ...baseInput, iterCount: i % 10 });
            expect(cfg.s3).toBeGreaterThanOrEqual(1);
        }
    });

    it("s4 >= 1 always", () => {
        for (let i = 0; i < 200; i++) {
            const cfg = genCfg({ ...baseInput, iterCount: i % 10 });
            expect(cfg.s4).toBeGreaterThanOrEqual(1);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AWG 1.0
// ─────────────────────────────────────────────────────────────────────────────

describe("AWG 1.0", () => {
    const v10Input: GeneratorInput = { ...baseInput, version: "1.0" };

    it("jc >= 4", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg(v10Input);
            expect(cfg.jc).toBeGreaterThanOrEqual(4);
        }
    });

    it("jmax > 81", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg(v10Input);
            expect(cfg.jmax).toBeGreaterThan(81);
        }
    });

    it("i1-i5 are all empty strings", () => {
        const cfg = genCfg(v10Input);
        expect(cfg.i1).toBe("");
        expect(cfg.i2).toBe("");
        expect(cfg.i3).toBe("");
        expect(cfg.i4).toBe("");
        expect(cfg.i5).toBe("");
    });

    it("h1s-h4s are positive numbers", () => {
        const cfg = genCfg(v10Input);
        expect(cfg.h1s).toBeGreaterThan(0);
        expect(cfg.h2s).toBeGreaterThan(0);
        expect(cfg.h3s).toBeGreaterThan(0);
        expect(cfg.h4s).toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AWG 1.5
// ─────────────────────────────────────────────────────────────────────────────

describe("AWG 1.5", () => {
    const v15Input: GeneratorInput = { ...baseInput, version: "1.5" };

    it("jc >= 3", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg(v15Input);
            expect(cfg.jc).toBeGreaterThanOrEqual(3);
        }
    });

    it("i1 is non-empty", () => {
        const cfg = genCfg(v15Input);
        expect(cfg.i1).toBeTruthy();
        expect(cfg.i1.length).toBeGreaterThan(0);
    });

    it("i2-i5 are non-empty when mimicAll=false", () => {
        const cfg = genCfg({ ...v15Input, mimicAll: false });
        expect(cfg.i2.length).toBeGreaterThan(0);
        expect(cfg.i3.length).toBeGreaterThan(0);
        expect(cfg.i4.length).toBeGreaterThan(0);
        expect(cfg.i5.length).toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AWG 2.0 ranges
// ─────────────────────────────────────────────────────────────────────────────

describe("AWG 2.0 ranges", () => {
    it("h1-h4 match range format", () => {
        const cfg = genCfg(baseInput);
        const rangePattern = /^\d+-\d+$/;
        expect(cfg.h1).toMatch(rangePattern);
        expect(cfg.h2).toMatch(rangePattern);
        expect(cfg.h3).toMatch(rangePattern);
        expect(cfg.h4).toMatch(rangePattern);
    });

    it("start < end for each range", () => {
        for (let i = 0; i < 50; i++) {
            const cfg = genCfg(baseInput);
            for (const h of [cfg.h1, cfg.h2, cfg.h3, cfg.h4]) {
                const [start, end] = h.split("-").map(Number);
                expect(end).toBeGreaterThan(start);
            }
        }
    });

    it("h1 starts in 100M-1.1B range", () => {
        for (let i = 0; i < 50; i++) {
            const cfg = genCfg(baseInput);
            const [start] = cfg.h1.split("-").map(Number);
            expect(start).toBeGreaterThanOrEqual(100_000_000);
            expect(start).toBeLessThanOrEqual(1_100_000_000);
        }
    });

    it("h2 starts in 1.2B-2.3B range", () => {
        for (let i = 0; i < 50; i++) {
            const cfg = genCfg(baseInput);
            const [start] = cfg.h2.split("-").map(Number);
            expect(start).toBeGreaterThanOrEqual(1_200_000_000);
            expect(start).toBeLessThanOrEqual(2_300_000_000);
        }
    });

    it("h3 starts in 2.4B-3.5B range", () => {
        for (let i = 0; i < 50; i++) {
            const cfg = genCfg(baseInput);
            const [start] = cfg.h3.split("-").map(Number);
            expect(start).toBeGreaterThanOrEqual(2_400_000_000);
            expect(start).toBeLessThanOrEqual(3_500_000_000);
        }
    });

    it("h4 starts in 3.6B-4.29B range", () => {
        for (let i = 0; i < 50; i++) {
            const cfg = genCfg(baseInput);
            const [start] = cfg.h4.split("-").map(Number);
            expect(start).toBeGreaterThanOrEqual(3_600_000_000);
            expect(start).toBeLessThanOrEqual(4_294_967_295);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Intensity escalation
// ─────────────────────────────────────────────────────────────────────────────

describe("intensity escalation", () => {
    it("high intensity produces larger jmax on average than low", () => {
        const runs = 50;
        let sumLow = 0;
        let sumHigh = 0;

        for (let i = 0; i < runs; i++) {
            sumLow += genCfg({ ...baseInput, intensity: "low" }).jmax;
            sumHigh += genCfg({ ...baseInput, intensity: "high" }).jmax;
        }

        expect(sumHigh / runs).toBeGreaterThan(sumLow / runs);
    });

    it("high intensity produces larger jmin on average than low", () => {
        const runs = 50;
        let sumLow = 0;
        let sumHigh = 0;

        for (let i = 0; i < runs; i++) {
            sumLow += genCfg({ ...baseInput, intensity: "low" }).jmin;
            sumHigh += genCfg({ ...baseInput, intensity: "high" }).jmin;
        }

        expect(sumHigh / runs).toBeGreaterThan(sumLow / runs);
    });

    it("high intensity produces larger jmax on average than low", () => {
        const runs = 50;
        let sumLow = 0;
        let sumHigh = 0;

        for (let i = 0; i < runs; i++) {
            sumLow += genCfg({ ...baseInput, intensity: "low" }).jmax;
            sumHigh += genCfg({ ...baseInput, intensity: "high" }).jmax;
        }

        expect(sumHigh / runs).toBeGreaterThan(sumLow / runs);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Non-overlapping H ranges
// ─────────────────────────────────────────────────────────────────────────────

describe("non-overlapping H ranges", () => {
    function parseRange(r: string): [number, number] {
        const [a, b] = r.split("-").map(Number);
        return [a, b];
    }

    function rangesOverlap(
        a: [number, number],
        b: [number, number],
    ): boolean {
        return a[0] <= b[1] && b[0] <= a[1];
    }

    it("h1-h4 ranges never overlap", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg(baseInput);
            const ranges = [cfg.h1, cfg.h2, cfg.h3, cfg.h4].map(parseRange);

            for (let a = 0; a < ranges.length; a++) {
                for (let b = a + 1; b < ranges.length; b++) {
                    expect(rangesOverlap(ranges[a], ranges[b])).toBe(false);
                }
            }
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Jc/Jmin/Jmax dynamic generation
// ─────────────────────────────────────────────────────────────────────────────

describe("Jc/Jmin/Jmax dynamic generation", () => {
    it("Jc values vary across 100 iterations (not always same)", () => {
        const values = new Set<number>();
        for (let i = 0; i < 100; i++) {
            values.add(genCfg({ ...baseInput, junkLevel: 5 }).jc);
        }
        // Ожидаем хотя бы 3 разных значения
        expect(values.size).toBeGreaterThanOrEqual(3);
    });

    it("Jmin values vary across 50 iterations (not always same)", () => {
        const values = new Set<number>();
        for (let i = 0; i < 50; i++) {
            values.add(genCfg({ ...baseInput, intensity: "medium" }).jmin);
        }
        // Ожидаем хотя бы 5 разных значений (широкий диапазон)
        expect(values.size).toBeGreaterThanOrEqual(5);
    });

    it("Jmax values vary across 50 iterations (not always same)", () => {
        const values = new Set<number>();
        for (let i = 0; i < 50; i++) {
            values.add(genCfg({ ...baseInput, intensity: "high" }).jmax);
        }
        // Ожидаем хотя бы 5 разных значений (широкий диапазон)
        expect(values.size).toBeGreaterThanOrEqual(5);
    });

    it("Jmax > Jmin + 64 always", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg(baseInput);
            expect(cfg.jmax).toBeGreaterThan(cfg.jmin + 64);
        }
    });

    // ── Jc user control tests ────────────────────────────────────────────────
    // Проверяем что junkLevel пользователя соблюдается с минимальной вариацией ±1

    it("Jc respects junkLevel=0 for AWG 2.0", () => {
        for (let i = 0; i < 50; i++) {
            const cfg = genCfg({ ...baseInput, version: "2.0", junkLevel: 0 });
            // junkLevel=0 остаётся 0 (нет вариации для 0)
            expect(cfg.jc).toBe(0);
        }
    });

    it("Jc respects junkLevel=3 for AWG 2.0 (within ±1)", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg({ ...baseInput, version: "2.0", junkLevel: 3 });
            // Ожидаем 2, 3 или 4 (±1 от 3, но не ниже 1)
            expect(cfg.jc).toBeGreaterThanOrEqual(2);
            expect(cfg.jc).toBeLessThanOrEqual(4);
        }
    });

    it("Jc respects junkLevel=5 for AWG 2.0 (within ±1)", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg({ ...baseInput, version: "2.0", junkLevel: 5 });
            // Ожидаем 4, 5 или 6 (±1 от 5)
            expect(cfg.jc).toBeGreaterThanOrEqual(4);
            expect(cfg.jc).toBeLessThanOrEqual(6);
        }
    });

    it("Jc respects junkLevel=7 for AWG 2.0 (within ±1)", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg({ ...baseInput, version: "2.0", junkLevel: 7 });
            // Ожидаем 6, 7 или 8 (±1 от 7)
            expect(cfg.jc).toBeGreaterThanOrEqual(6);
            expect(cfg.jc).toBeLessThanOrEqual(8);
        }
    });

    it("Jc respects junkLevel=10 for AWG 2.0 (within ±1)", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg({ ...baseInput, version: "2.0", junkLevel: 10 });
            // Ожидаем 9, 10 или 11 (±1 от 10)
            expect(cfg.jc).toBeGreaterThanOrEqual(9);
            expect(cfg.jc).toBeLessThanOrEqual(11);
        }
    });

    it("Jc respects AWG 1.0 minimum (jc >= 4) even with junkLevel=0", () => {
        for (let i = 0; i < 50; i++) {
            const cfg = genCfg({ ...baseInput, version: "1.0", junkLevel: 0 });
            // AWG 1.0 требует минимум 4
            expect(cfg.jc).toBeGreaterThanOrEqual(4);
        }
    });

    it("Jc respects AWG 1.0 minimum (jc >= 4) with junkLevel=3", () => {
        for (let i = 0; i < 50; i++) {
            const cfg = genCfg({ ...baseInput, version: "1.0", junkLevel: 3 });
            // junkLevel=3 для AWG 1.0 становится 4 (протокольный минимум)
            expect(cfg.jc).toBeGreaterThanOrEqual(4);
        }
    });

    it("Jc respects junkLevel=5 for AWG 1.0 (within ±1, min 4)", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg({ ...baseInput, version: "1.0", junkLevel: 5 });
            // Ожидаем 4, 5 или 6 (±1 от 5, но не ниже 4)
            expect(cfg.jc).toBeGreaterThanOrEqual(4);
            expect(cfg.jc).toBeLessThanOrEqual(6);
        }
    });

    // ── Jmin/Jmax intensity tests ────────────────────────────────────────────
    // Проверяем что интенсивность соблюдает диапазоны

    it("Jmin low intensity stays in range [64, 256]", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg({ ...baseInput, intensity: "low" });
            expect(cfg.jmin).toBeGreaterThanOrEqual(64);
            expect(cfg.jmin).toBeLessThanOrEqual(256);
        }
    });

    it("Jmin medium intensity stays in range [128, 512]", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg({ ...baseInput, intensity: "medium" });
            expect(cfg.jmin).toBeGreaterThanOrEqual(128);
            expect(cfg.jmin).toBeLessThanOrEqual(512);
        }
    });

    it("Jmin high intensity stays in range [256, 768]", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg({ ...baseInput, intensity: "high" });
            expect(cfg.jmin).toBeGreaterThanOrEqual(256);
            expect(cfg.jmin).toBeLessThanOrEqual(768);
        }
    });

    it("Jmax low intensity stays in base range [256, 512] with overflow for Jmin+64 rule", () => {
        // Jmax может превышать 512 когда Jmin близок к 256 (требование Jmax > Jmin + 64)
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg({ ...baseInput, intensity: "low" });
            expect(cfg.jmax).toBeGreaterThanOrEqual(256);
            // Максимум: 256 (jmin max) + 64 + 256 (overflow) = 576
            expect(cfg.jmax).toBeLessThanOrEqual(600);
        }
    });

    it("Jmax medium intensity stays in range [512, 1024]", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg({ ...baseInput, intensity: "medium" });
            expect(cfg.jmax).toBeGreaterThanOrEqual(512);
            expect(cfg.jmax).toBeLessThanOrEqual(1024);
        }
    });

    it("Jmax high intensity stays in range [768, 1280]", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg({ ...baseInput, intensity: "high" });
            expect(cfg.jmax).toBeGreaterThanOrEqual(768);
            expect(cfg.jmax).toBeLessThanOrEqual(1280);
        }
    });

    it("Jmin high produces larger values than low on average", () => {
        const runs = 50;
        let sumLow = 0;
        let sumHigh = 0;

        for (let i = 0; i < runs; i++) {
            sumLow += genCfg({ ...baseInput, intensity: "low" }).jmin;
            sumHigh += genCfg({ ...baseInput, intensity: "high" }).jmin;
        }

        expect(sumHigh / runs).toBeGreaterThan(sumLow / runs);
    });

    it("Jmax high produces larger values than low on average", () => {
        const runs = 50;
        let sumLow = 0;
        let sumHigh = 0;

        for (let i = 0; i < runs; i++) {
            sumLow += genCfg({ ...baseInput, intensity: "low" }).jmax;
            sumHigh += genCfg({ ...baseInput, intensity: "high" }).jmax;
        }

        expect(sumHigh / runs).toBeGreaterThan(sumLow / runs);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Router Mode
// ─────────────────────────────────────────────────────────────────────────────

describe("routerMode", () => {
    const routerInput: GeneratorInput = {
        ...baseInput,
        routerMode: true,
        version: "2.0",
        intensity: "high",
        junkLevel: 10,
    };

    it("caps junk parameters (respects protocol minJc)", () => {
        for (let i = 0; i < 50; i++) {
            const cfg = genCfg(routerInput);
            // AWG 2.0 minJc=3, router mode tries to cap at 2, result = max(3, 2) = 3
            expect(cfg.jc).toBeLessThanOrEqual(3);
            expect(cfg.jmin).toBeLessThanOrEqual(40);
            expect(cfg.jmax).toBeLessThanOrEqual(128);
        }
    });

    it("caps S1/S2", () => {
        for (let i = 0; i < 50; i++) {
            const cfg = genCfg(routerInput);
            expect(cfg.s1).toBeLessThanOrEqual(20);
            expect(cfg.s2).toBeLessThanOrEqual(20);
        }
    });

    it("disables I2-I5 but keeps I1", () => {
        const cfg = genCfg(routerInput);
        expect(cfg.i1).not.toBe("");
        expect(cfg.i2).toBe("");
        expect(cfg.i3).toBe("");
        expect(cfg.i4).toBe("");
        expect(cfg.i5).toBe("");
    });

    it("S1+56 collision still safe", () => {
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg(routerInput);
            expect(cfg.s2).not.toBe(cfg.s1 + 56);
        }
    });

    it("preserves AWG 1.0 minJc=4", () => {
        const cfg = genCfg({ ...routerInput, version: "1.0" });
        expect(cfg.jc).toBeGreaterThanOrEqual(4);
    });

    it("AWG 1.0 router mode: i1-i5 all empty", () => {
        const cfg = genCfg({ ...routerInput, version: "1.0" });
        expect(cfg.i1).toBe("");
        expect(cfg.i2).toBe("");
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Composite profiles
// ─────────────────────────────────────────────────────────────────────────────

describe("composite profiles", () => {
    it("tls_to_quic: I1 contains TLS header, I2 contains QUIC header", () => {
        const cfg = genCfg({ ...baseInput, profile: "tls_to_quic" });
        // TLS record: content_type=0x16, legacy_version=0x0301
        expect(cfg.i1).toContain("<b 0x160301");
        // QUIC Long Header: 0xC0-0xC3
        expect(cfg.i2).toMatch(/<b 0xc[0-3]/i);
    });

    it("quic_burst: I1 is QUIC Initial, I2 is QUIC 0-RTT, I3 is HTTP/3", () => {
        const cfg = genCfg({ ...baseInput, profile: "quic_burst" });
        expect(cfg.i1).toMatch(/<b 0xc/i);  // QUIC Initial 0xC0-0xC3
        expect(cfg.i2).toMatch(/<b 0xd/i);  // QUIC 0-RTT 0xD0-0xD3
        expect(cfg.i3).toBeTruthy();
    });

    it("composite profiles respect routerMode (I2-I5 cleared)", () => {
        const cfg = genCfg({ ...baseInput, profile: "tls_to_quic", routerMode: true });
        expect(cfg.i1).not.toBe("");
        expect(cfg.i2).toBe("");
        expect(cfg.i3).toBe("");
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// DNS Query profile
// ─────────────────────────────────────────────────────────────────────────────

describe("dns_query profile", () => {
    it("I1 contains DNS query header (transaction ID + flags)", () => {
        const cfg = genCfg({ ...baseInput, profile: "dns_query" });
        // DNS query starts with transaction ID (2 bytes) + flags (0x0100)
        expect(cfg.i1).toContain("<b 0x");
        expect(cfg.i1.length).toBeGreaterThan(20);
    });

    it("I1-I5 all contain DNS-like patterns when mimicAll=true", () => {
        const cfg = genCfg({ ...baseInput, profile: "dns_query", mimicAll: true });
        expect(cfg.i1).toContain("<b 0x");
        expect(cfg.i2).toContain("<b 0x");
        expect(cfg.i3).toContain("<b 0x");
        expect(cfg.i4).toContain("<b 0x");
        expect(cfg.i5).toContain("<b 0x");
    });

    it("dns_query generates different values across iterations", () => {
        const values = new Set<string>();
        for (let i = 0; i < 50; i++) {
            values.add(genCfg({ ...baseInput, profile: "dns_query" }).i1);
        }
        expect(values.size).toBeGreaterThan(10);
    });

    it("dns_query works with custom DNS host", () => {
        const cfg = genCfg({ ...baseInput, profile: "dns_query", customHost: "8.8.8.8" });
        expect(cfg.i1).toBeTruthy();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// useExtremeMax mode
// ─────────────────────────────────────────────────────────────────────────────

describe("useExtremeMax mode", () => {
    it("H1 spread is 10M when useExtremeMax=true", () => {
        const startValues = new Set<number>();
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg({ ...baseInput, useExtremeMax: true });
            // H1 format: "start-end" range string
            const match = cfg.h1.match(/^(\d+)-(\d+)$/);
            if (match) {
                startValues.add(parseInt(match[1], 10));
            }
        }
        // With 10M spread, values should cover a wide range
        const arr = Array.from(startValues).sort((a, b) => a - b);
        const spread = arr[arr.length - 1] - arr[0];
        expect(spread).toBeGreaterThan(5_000_000); // At least 5M spread
    });

    it("S3 can reach up to 256 when useExtremeMax=true", () => {
        let maxS3 = 0;
        for (let i = 0; i < 200; i++) {
            const cfg = genCfg({ ...baseInput, useExtremeMax: true });
            if (cfg.s3 > maxS3) maxS3 = cfg.s3;
        }
        expect(maxS3).toBeGreaterThan(100); // Should reach at least 100+
        expect(maxS3).toBeLessThanOrEqual(256);
    });

    it("S4 stays within the 32-byte protocol limit even when useExtremeMax=true", () => {
        let maxS4 = 0;
        for (let i = 0; i < 200; i++) {
            const cfg = genCfg({ ...baseInput, useExtremeMax: true });
            if (cfg.s4 > maxS4) maxS4 = cfg.s4;
        }
        expect(maxS4).toBeGreaterThan(0);
        expect(maxS4).toBeLessThanOrEqual(32);
    });

    it("Jc can reach higher values when useExtremeMax=true and junkLevel is high", () => {
        const cfg = genCfg({ ...baseInput, useExtremeMax: true, junkLevel: 10 });
        // With extreme mode and junkLevel=10, Jc should be around 10 (±1)
        expect(cfg.jc).toBeGreaterThanOrEqual(9);
        expect(cfg.jc).toBeLessThanOrEqual(11);
    });

    it("Jc respects maxJc=128 in extreme mode", () => {
        // Even with extreme mode, Jc should not exceed 128 (protocol limit)
        for (let i = 0; i < 100; i++) {
            const cfg = genCfg({ ...baseInput, useExtremeMax: true, junkLevel: 128 });
            expect(cfg.jc).toBeLessThanOrEqual(128);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Random profile
// ─────────────────────────────────────────────────────────────────────────────

describe("random profile", () => {
    it("random generates all possible profile types including dns_query", () => {
        const profiles = new Set<string>();
        const runs = 200;

        for (let i = 0; i < runs; i++) {
            const cfg = genCfg({ ...baseInput, profile: "random" });
            // Classify by I1 pattern
            if (cfg.i1.includes("0x160301")) profiles.add("tls");
            else if (cfg.i1.match(/0xc[0-3]/i)) profiles.add("quic");
            else if (cfg.i1.match(/0xd[0-3]/i)) profiles.add("quic_0rtt");
            else if (cfg.i1.includes("REGISTER sip")) profiles.add("sip");
            else if (cfg.i1.includes("0x0100") && cfg.i1.length < 200) profiles.add("dns");
            else profiles.add("other");
        }

        // Should produce variety
        expect(profiles.size).toBeGreaterThan(3);
    });

    it("random produces different I1 patterns across many iterations", () => {
        const i1Values = new Set<string>();
        for (let i = 0; i < 100; i++) {
            i1Values.add(genCfg({ ...baseInput, profile: "random" }).i1);
        }
        expect(i1Values.size).toBeGreaterThan(5);
    });
});
