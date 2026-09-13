import { describe, it, expect, vi } from "bun:test";
import {
    rnd,
    rh,
    hexPad,
    assertEvenHex,
    rRange,
    splitPad,
    tagOverhead,
    calcPadding,
    alignTo128,
} from "@/engines/awg/generator";

// ─────────────────────────────────────────────────────────────────────────────
// rnd
// ─────────────────────────────────────────────────────────────────────────────

describe("rnd", () => {
    it("returns a when a === b", () => {
        expect(rnd(5, 5)).toBe(5);
    });

    it("always returns a value in [a, b]", () => {
        for (let i = 0; i < 200; i++) {
            const v = rnd(10, 20);
            expect(v).toBeGreaterThanOrEqual(10);
            expect(v).toBeLessThanOrEqual(20);
        }
    });

    it("works with large ranges", () => {
        const v = rnd(0, 1_000_000);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1_000_000);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// rh
// ─────────────────────────────────────────────────────────────────────────────

describe("rh", () => {
    it("returns empty string for n=0", () => {
        expect(rh(0)).toBe("");
    });

    it("returns correct length (n*2 chars)", () => {
        expect(rh(4).length).toBe(8);
        expect(rh(16).length).toBe(32);
        expect(rh(1).length).toBe(2);
    });

    it("only produces valid hex characters", () => {
        for (let i = 0; i < 50; i++) {
            const hex = rh(32);
            expect(hex).toMatch(/^[0-9a-f]*$/);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// hexPad
// ─────────────────────────────────────────────────────────────────────────────

describe("hexPad", () => {
    it("produces correct length", () => {
        expect(hexPad(0, 4).length).toBe(8);
        expect(hexPad(255, 1).length).toBe(2);
        expect(hexPad(0, 1).length).toBe(2);
    });

    it("zero-pads correctly", () => {
        expect(hexPad(0, 4)).toBe("00000000");
        expect(hexPad(1, 4)).toBe("00000001");
        expect(hexPad(255, 2)).toBe("00ff");
    });

    it("truncates overflow to fit byteLen", () => {
        // 0x1FF = 511, but byteLen=1 means max 2 hex chars
        const result = hexPad(0x1ff, 1);
        expect(result.length).toBe(2);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// assertEvenHex
// ─────────────────────────────────────────────────────────────────────────────

describe("assertEvenHex", () => {
    it("passes even-length hex through unchanged", () => {
        expect(assertEvenHex("aabb")).toBe("aabb");
        expect(assertEvenHex("00")).toBe("00");
        expect(assertEvenHex("")).toBe("");
    });

    it("appends '0' to odd-length hex", () => {
        expect(assertEvenHex("abc")).toBe("abc0");
        expect(assertEvenHex("a")).toBe("a0");
    });

    it("warns on odd-length hex", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        assertEvenHex("abc", "test-label");
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain("test-label");
        warnSpy.mockRestore();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// rRange
// ─────────────────────────────────────────────────────────────────────────────

describe("rRange", () => {
    it("produces N-M format", () => {
        for (let i = 0; i < 50; i++) {
            const result = rRange(100_000_000);
            expect(result).toMatch(/^\d+-\d+$/);
        }
    });

    it("N >= base", () => {
        for (let i = 0; i < 50; i++) {
            const result = rRange(100_000_000);
            const [n] = result.split("-").map(Number);
            expect(n).toBeGreaterThanOrEqual(100_000_000);
        }
    });

    it("M > N", () => {
        for (let i = 0; i < 50; i++) {
            const result = rRange(100_000_000);
            const [n, m] = result.split("-").map(Number);
            expect(m).toBeGreaterThan(n);
        }
    });

    it("M - N is in [1000, 50000]", () => {
        for (let i = 0; i < 100; i++) {
            const result = rRange(100_000_000);
            const [n, m] = result.split("-").map(Number);
            const diff = m - n;
            expect(diff).toBeGreaterThanOrEqual(1000);
            expect(diff).toBeLessThanOrEqual(50000);
        }
    });

    it("respects custom spread", () => {
        for (let i = 0; i < 50; i++) {
            const result = rRange(0, 100);
            const [n] = result.split("-").map(Number);
            expect(n).toBeGreaterThanOrEqual(0);
            expect(n).toBeLessThanOrEqual(100);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// splitPad
// ─────────────────────────────────────────────────────────────────────────────

describe("splitPad", () => {
    it("returns empty for n=0", () => {
        expect(splitPad(0)).toBe("");
    });

    it("single tag for n <= 1000", () => {
        expect(splitPad(500)).toBe("<r 500>");
        expect(splitPad(1000)).toBe("<r 1000>");
    });

    it("splits into chunks for n > 1000", () => {
        expect(splitPad(1200)).toBe("<r 1000><r 200>");
        expect(splitPad(2500)).toBe("<r 1000><r 1000><r 500>");
    });

    it("respects custom tag", () => {
        expect(splitPad(500, "rc")).toBe("<rc 500>");
        expect(splitPad(1200, "rd")).toBe("<rd 1000><rd 200>");
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// tagOverhead
// ─────────────────────────────────────────────────────────────────────────────

describe("tagOverhead", () => {
    it("returns 0 when both false", () => {
        expect(tagOverhead(false, false)).toBe(0);
    });

    it("returns 4 when only useC", () => {
        expect(tagOverhead(true, false)).toBe(4);
    });

    it("returns 4 when only useT", () => {
        expect(tagOverhead(false, true)).toBe(4);
    });

    it("returns 8 when both true", () => {
        expect(tagOverhead(true, true)).toBe(8);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcPadding
// ─────────────────────────────────────────────────────────────────────────────

describe("calcPadding", () => {
    it("entropy mode (null range): returns value <= 500", () => {
        for (let i = 0; i < 50; i++) {
            const pad = calcPadding(40, 8, null, 2, 1500);
            expect(pad).toBeGreaterThanOrEqual(0);
            expect(pad).toBeLessThanOrEqual(500);
        }
    });

    it("with range: pads to reach minimum", () => {
        // headerB=40, extraB=8, range=[1250, 1250], mtu=1500
        // occupied=48, needed=1250-48=1202, jitter=0
        const pad = calcPadding(40, 8, [1250, 1250], 2, 1500);
        expect(pad).toBe(1202);
    });

    it("MTU clamping: padding cannot exceed mtu - headerB - extraB", () => {
        // mtu=100, headerB=40, extraB=8 → maxPad=52
        const pad = calcPadding(40, 8, [1250, 1350], 2, 100);
        expect(pad).toBeLessThanOrEqual(52);
    });

    it("returns 0 when occupied >= range max", () => {
        // headerB=1300, extraB=0, range=[1250, 1300], mtu=1500
        // occupied=1300 >= range max → needed=0, jitter=0
        const pad = calcPadding(1300, 0, [1250, 1300], 2, 1500);
        expect(pad).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// alignTo128
// ─────────────────────────────────────────────────────────────────────────────

describe("alignTo128", () => {
    it("aligns 0 to 0", () => {
        expect(alignTo128(0)).toBe(0);
    });

    it("keeps 128 as 128", () => {
        expect(alignTo128(128)).toBe(128);
    });

    it("rounds 129 up to 256", () => {
        expect(alignTo128(129)).toBe(256);
    });

    it("rounds 1 up to 128", () => {
        expect(alignTo128(1)).toBe(128);
    });

    it("rounds 256 to 256", () => {
        expect(alignTo128(256)).toBe(256);
    });
});
