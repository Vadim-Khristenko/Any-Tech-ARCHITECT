import { describe, it, expect } from "bun:test";
import { isKnownBlocked, KNOWN_BLOCKED, checkDomain } from "../domainCheck";

describe("isKnownBlocked", () => {
    it("detects direct match", () => {
        expect(isKnownBlocked("discord.com")).toBe(true);
    });

    it("detects subdomain match", () => {
        expect(isKnownBlocked("cdn.discord.com")).toBe(true);
    });

    it("passes unblocked domain", () => {
        expect(isKnownBlocked("yandex.ru")).toBe(false);
    });

    it("is case-insensitive", () => {
        expect(isKnownBlocked("Discord.COM")).toBe(true);
    });

    it("does not false-positive on partial match", () => {
        expect(isKnownBlocked("notdiscord.com")).toBe(false);
    });
});

describe("KNOWN_BLOCKED", () => {
    it("is non-empty", () => {
        expect(KNOWN_BLOCKED.size).toBeGreaterThan(0);
    });

    it("contains known blocked domains", () => {
        expect(KNOWN_BLOCKED.has("youtube.com")).toBe(true);
        expect(KNOWN_BLOCKED.has("discord.com")).toBe(true);
    });
});

describe("checkDomain", () => {
    it("returns blocklist result for known blocked domain", async () => {
        const result = await checkDomain("discord.com");
        expect(result.accessible).toBe(false);
        expect(result.method).toBe("blocklist");
    });

    it("returns blocklist result for blocked subdomain", async () => {
        const result = await checkDomain("cdn.discord.com");
        expect(result.accessible).toBe(false);
        expect(result.method).toBe("blocklist");
    });
});
