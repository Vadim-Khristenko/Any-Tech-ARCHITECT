import { describe, it, expect } from "vitest";

import {
    classify,
    tokeniseConf,
    tokeniseJson,
    tokeniseLine,
    type Token,
} from "../codeTokens";

/**
 * What a config is made of, as the view sees it.
 *
 * The tokeniser moved out of `CodeView` so it could be tested at all, and the
 * move is where two costs came out: a `RegExp` compiled for every character of
 * a JSON export, and a value classified twice to choose between two branches
 * that were identical. Neither was meant to change the answer. These tests pin
 * the answer so that stays true if anybody touches the scanner again.
 */

/** Every token's text, in order: what ends up on screen. */
const text = (tokens: Token[]): string => tokens.map((t) => t.v).join("");

/** The tokens that carry meaning, with the runs of whitespace dropped. */
const meaningful = (tokens: Token[]): Token[] =>
    tokens.filter((t) => t.k !== "plain" || t.v.trim() !== "");

const kinds = (tokens: Token[]): string[] => meaningful(tokens).map((t) => t.k);

describe("classify", () => {
    it("reads an address as an address and a range as a range", () => {
        expect(classify("10.8.0.1")).toBe("ip");
        expect(classify("0.0.0.0/0")).toBe("ip");
        expect(classify("::/0")).toBe("ip");
        expect(classify("example.com:51820")).toBe("ip");
        expect(classify("1000-2000")).toBe("range");
        expect(classify("1420")).toBe("number");
    });

    it("reads the AmneziaWG CPS chain as one thing", () => {
        expect(classify("<b 0x0a><r 7><t>")).toBe("cps");
        expect(classify("<s 64><n 3>")).toBe("cps");
    });

    it("separates a placeholder, a transport, a boolean and a name", () => {
        expect(classify("$PRIMARY_DNS")).toBe("var");
        expect(classify("tcp")).toBe("proto");
        expect(classify("UDP")).toBe("proto");
        expect(classify("true")).toBe("bool");
        expect(classify("null")).toBe("bool");
        expect(classify("ya.ru")).toBe("domain");
    });

    it("calls anything it cannot place a string", () => {
        expect(classify("")).toBe("plain");
        expect(classify("   ")).toBe("plain");
        expect(classify("cGxhaW4=")).toBe("string");
    });

    it("keeps a numeric address an address rather than a domain of digits", () => {
        // The order of the patterns is what does this: the host pattern would
        // happily match four dot-separated labels if it ran first.
        expect(classify("1.1.1.1")).toBe("ip");
    });
});

describe("wg-quick", () => {
    it("takes a comment and a section whole", () => {
        expect(tokeniseConf("# a note")).toEqual([
            { k: "comment", v: "# a note" },
        ]);
        expect(tokeniseConf("; another")).toEqual([
            { k: "comment", v: "; another" },
        ]);
        expect(tokeniseConf("[Interface]")).toEqual([
            { k: "section", v: "[Interface]" },
        ]);
    });

    it("keeps the leading indent a section was written with", () => {
        expect(tokeniseConf("   [Peer]")).toEqual([
            { k: "section", v: "   [Peer]" },
        ]);
    });

    it("splits a value on commas so each part is classed on its own", () => {
        const tokens = tokeniseConf("AllowedIPs = 0.0.0.0/0, ::/0");

        expect(kinds(tokens)).toEqual(["key", "punct", "ip", "punct", "ip"]);
        expect(meaningful(tokens)[2]!.v).toBe(" 0.0.0.0/0");
        expect(meaningful(tokens)[4]!.v).toBe(" ::/0");
    });

    it("leaves a line with no equals alone", () => {
        expect(tokeniseConf("nothing here")).toEqual([
            { k: "plain", v: "nothing here" },
        ]);
    });

    it("splits on the first equals only, so a base64 value survives", () => {
        // `=` is base64 padding. Splitting on the last one, or on all of them,
        // would cut a key in half.
        const tokens = tokeniseConf("PrivateKey = abcDEF== ");
        expect(kinds(tokens)).toEqual(["key", "punct", "string"]);
        expect(meaningful(tokens)[2]!.v).toBe(" abcDEF== ");
    });

    it("reads a junk chain and a header range off a real line", () => {
        expect(kinds(tokeniseConf("Jc = <b 0x0a><r 7>"))).toEqual([
            "key",
            "punct",
            "cps",
        ]);
        expect(kinds(tokeniseConf("H1 = 404731556-404774416"))).toEqual([
            "key",
            "punct",
            "range",
        ]);
    });
});

describe("JSON", () => {
    it("tells a key from a value by the colon that follows it", () => {
        const tokens = tokeniseJson('"address": "10.8.0.1"');

        expect(kinds(tokens)).toEqual(["key", "punct", "ip"]);
        expect(meaningful(tokens)[0]!.v).toBe('"address"');
        expect(meaningful(tokens)[2]!.v).toBe('"10.8.0.1"');
    });

    it("classes a bare run by what it holds", () => {
        expect(kinds(tokeniseJson("1420"))).toEqual(["number"]);
        expect(kinds(tokeniseJson("true"))).toEqual(["bool"]);
        expect(kinds(tokeniseJson("null"))).toEqual(["bool"]);
    });

    it("reads the brackets and separators as punctuation", () => {
        expect(kinds(tokeniseJson("[{},:]"))).toEqual([
            "punct",
            "punct",
            "punct",
            "punct",
            "punct",
            "punct",
        ]);
    });

    it("steps over an escaped quote instead of ending the string at it", () => {
        const line = '"note": "a \\"quoted\\" word"';
        const tokens = tokeniseJson(line);

        expect(kinds(tokens)).toEqual(["key", "punct", "string"]);
        expect(meaningful(tokens)[2]!.v).toBe('"a \\"quoted\\" word"');
    });

    it("treats an unterminated string as the rest of the line", () => {
        const tokens = tokeniseJson('"cut off');
        expect(meaningful(tokens)[0]!.k).toBe("string");
        // Nothing is dropped: the view still prints what it was given.
        expect(text(tokens)).toBe('"cut off');
    });

    it("classes a nested value the same way one level up is classed", () => {
        // Regression: this is the branch that called `classify` twice for one
        // string and picked between two identical results.
        const tokens = tokeniseJson('{"host": "vpn.example.com", "port": 51820}');
        expect(kinds(tokens)).toEqual([
            "punct",
            "key",
            "punct",
            "domain",
            "punct",
            "key",
            "punct",
            "number",
            "punct",
        ]);
    });
});

describe("both formats", () => {
    it("loses nothing: the tokens of a line join back into the line", () => {
        // The strongest property here and the easiest to break. Every branch
        // of both scanners has to slice contiguously or this stops holding.
        const conf = [
            "# AmneziaWG",
            "[Interface]",
            "PrivateKey = abcDEF== ",
            "Address = 10.8.0.2/32, fd00::2/128",
            "Jc = <b 0x0a><r 7><t>",
            "H1 = 404731556-404774416",
            "MTU = 1420",
            "PersistentKeepalive = 25",
            "",
            "[Peer]",
            "Endpoint = vpn.example.com:51820",
            "; trailing comment",
        ];
        for (const line of conf) {
            expect(text(tokeniseLine(line, "conf"))).toBe(line);
        }

        const json = [
            "{",
            '  "id": 1,',
            '  "uuid": "9a1f-2b",',
            '  "hostName": "vpn.example.com",',
            '  "port": 51820,',
            '  "ping": 25,',
            '  "enabled": true,',
            '  "note": "a \\"quoted\\" word",',
            '  "nested": { "deep": [1, 2, 3] }',
            "}",
        ];
        for (const line of json) {
            expect(text(tokeniseLine(line, "json"))).toBe(line);
        }
    });

    it("dispatches on the format", () => {
        expect(tokeniseLine("[Interface]", "conf")[0]!.k).toBe("section");
        // The same text in the other format is a bracket and a bare run.
        expect(kinds(tokeniseLine("[Interface]", "json"))).toEqual([
            "punct",
            "string",
            "punct",
        ]);
    });
});
