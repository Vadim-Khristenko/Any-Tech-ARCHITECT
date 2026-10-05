import { describe, it, expect } from "bun:test";
import {
    simulateHandshake,
    kindColor,
    kindLabel,
    kindDescription,
} from "@/engines/awg/packetSim";
import type { AWGConfig } from "@/engines/awg/generator/types";

const cfg: AWGConfig = {
    version: "2.0",
    profile: "quic_initial",
    h1: "100000000-100000100",
    h2: "1200000000-1200000100",
    h3: "2400000000-2400000100",
    h4: "3600000000-3600000100",
    h1s: 100_000_000,
    h2s: 1_200_000_000,
    h3s: 2_400_000_000,
    h4s: 3_600_000_000,
    s1: 10,
    s2: 10,
    s3: 10,
    s4: 10,
    jc: 3,
    jmin: 100,
    jmax: 200,
    i1: "<b 0x00>",
    i2: "",
    i3: "",
    i4: "",
    i5: "",
};

describe("simulateHandshake", () => {
    it("returns packets for a 2.0 config", () => {
        const sim = simulateHandshake(cfg);
        expect(sim.packets.length).toBeGreaterThan(0);
        expect(sim.totalBytes).toBeGreaterThan(0);
        expect(sim.handshakeBytes).toBeGreaterThan(0);
        expect(sim.estSeconds10mbps).toBeGreaterThan(0);
    });

    it("includes all expected packet kinds", () => {
        const sim = simulateHandshake(cfg);
        expect(sim.packets.some((p) => p.kind === "init")).toBe(true);
        expect(sim.packets.some((p) => p.kind === "response")).toBe(true);
        expect(sim.packets.some((p) => p.kind === "cookie")).toBe(true);
        expect(sim.packets.some((p) => p.kind === "data")).toBe(true);
        expect(sim.packets.some((p) => p.kind === "cps")).toBe(true);
        expect(sim.packets.some((p) => p.kind === "junk")).toBe(true);
    });

    it("emits exactly jc junk packets", () => {
        const sim = simulateHandshake(cfg);
        expect(sim.packets.filter((p) => p.kind === "junk").length).toBe(cfg.jc);
    });

    it("marks junk and init/cps from client to server", () => {
        const sim = simulateHandshake(cfg);
        for (const p of sim.packets.filter(
            (x) => x.kind === "junk" || x.kind === "cps" || x.kind === "init",
        )) {
            expect(p.from).toBe("client");
            expect(p.to).toBe("server");
        }
    });

    it("marks response from server to client", () => {
        const sim = simulateHandshake(cfg);
        const resp = sim.packets.find((p) => p.kind === "response");
        expect(resp).toBeDefined();
        expect(resp!.from).toBe("server");
        expect(resp!.to).toBe("client");
    });

    it("assigns increasing steps", () => {
        const sim = simulateHandshake(cfg);
        const steps = sim.packets.map((p) => p.step);
        expect(new Set(steps).size).toBe(steps.length);
    });

    it("computes total equal to sum of packet sizes", () => {
        const sim = simulateHandshake(cfg);
        const sum = sim.packets.reduce((acc, p) => acc + p.size, 0);
        expect(sim.totalBytes).toBe(sum);
    });

    it("computes overhead as total minus data bytes", () => {
        const sim = simulateHandshake(cfg);
        const data = sim.packets
            .filter((p) => p.kind === "data")
            .reduce((acc, p) => acc + p.size, 0);
        expect(sim.overheadBytes).toBe(sim.totalBytes - data);
    });
});

describe("helpers", () => {
    it("kindColor returns a hex color for every kind", () => {
        for (const kind of [
            "init",
            "response",
            "cookie",
            "data",
            "junk",
            "cps",
        ] as const) {
            expect(kindColor(kind)).toMatch(/^#/);
        }
    });

    it("kindLabel returns a non-empty label for every kind", () => {
        for (const kind of [
            "init",
            "response",
            "cookie",
            "data",
            "junk",
            "cps",
        ] as const) {
            expect(kindLabel(kind)).toBeTruthy();
        }
    });

    it("kindDescription returns text for every kind", () => {
        for (const kind of [
            "init",
            "response",
            "cookie",
            "data",
            "junk",
            "cps",
        ] as const) {
            expect(kindDescription(kind).length).toBeGreaterThan(5);
        }
    });
});
