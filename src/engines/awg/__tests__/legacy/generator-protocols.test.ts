import { describe, it, expect } from "vitest";
import { genI1, type GeneratorInput, type MimicProfile } from "@/engines/awg/generator";

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

const profiles: MimicProfile[] = [
    "quic_initial",
    "quic_0rtt",
    "tls_client_hello",
    "wireguard_noise",
    "dtls_1_2",
    "dtls_1_3",
    "http3",
    "sip",
];

describe.each(profiles)("genI1 — profile %s", (profile) => {
    const input: GeneratorInput = { ...baseInput, profile };

    it("returns a non-empty string", () => {
        const result = genI1(input, profile, 0);
        expect(result).toBeTruthy();
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
    });

    it("contains a <b 0x...> tag", () => {
        const result = genI1(input, profile, 0);
        expect(result).toMatch(/<b 0x/);
    });

    it("has even-length hex inside <b 0x...> tags", () => {
        const result = genI1(input, profile, 0);
        const hexPattern = /<b 0x([0-9a-fA-F]+)>/g;
        let match: RegExpExecArray | null;
        let found = false;
        while ((match = hexPattern.exec(result)) !== null) {
            found = true;
            expect(match[1].length % 2).toBe(0);
        }
        expect(found).toBe(true);
    });

    it("contains <t> when useTagT is true", () => {
        const inp: GeneratorInput = { ...baseInput, profile, useTagT: true };
        const result = genI1(inp, profile, 0);
        expect(result).toContain("<t>");
    });

    it("does NOT contain <r when useTagR is false", () => {
        const inp: GeneratorInput = { ...baseInput, profile, useTagR: false };
        const result = genI1(inp, profile, 0);
        expect(result).not.toMatch(/<r /);
    });
});

describe("genI1 — profile random", () => {
    it("returns a non-empty string", () => {
        const input: GeneratorInput = { ...baseInput, profile: "random" };
        const result = genI1(input, "random", 0);
        expect(result).toBeTruthy();
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
    });
});

describe("genI1 — tag flag respect", () => {
    it("contains <c> when useTagC is true", () => {
        const input: GeneratorInput = { ...baseInput, useTagC: true };
        const result = genI1(input, input.profile, 0);
        expect(result).toContain("<c>");
    });

    it("contains <rc when useTagRC is true", () => {
        const input: GeneratorInput = { ...baseInput, useTagRC: true };
        const result = genI1(input, input.profile, 0);
        expect(result).toMatch(/<rc /);
    });
});
