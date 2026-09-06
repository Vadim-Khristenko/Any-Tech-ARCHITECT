/**
 * What each piece of a config *is*, rather than what it looks like.
 *
 * A key is a wall of similar-looking strings — base64 keys, byte counts,
 * ranges, addresses — and telling them apart by eye is most of the work of
 * reading one. So an address is classed as an address and a range as a range,
 * in both formats, by one set of rules.
 *
 * This is the whole of the classification: no DOM, no Vue, no formatting.
 * `CodeView` turns the tokens into elements; anything that wants to know what
 * a value means can ask the same question and get the same answer.
 *
 * PERFORMANCE
 *
 * A config view re-tokenises every time the text changes, and a JSON export
 * of a container is a few thousand lines. Two things matter at that size and
 * both were wrong before this file existed:
 *
 *   Every pattern is compiled once, at module scope. A regex literal inside a
 *   loop is a new object per iteration — and the JSON scanner tested one per
 *   *character*, so a 40 kB export allocated a RegExp for every byte of it.
 *
 *   A value is classified once. `classify()` was called twice for the same
 *   string to decide between two branches that were identical, so every
 *   quoted value in the file paid for two walks over seven patterns.
 */

export type TokenKind =
    | "plain"
    | "key"
    | "string"
    | "number"
    | "range"
    | "ip"
    | "bool"
    | "punct"
    | "comment"
    | "section"
    | "cps"
    | "var"
    | "proto"
    | "domain";

export interface Token {
    k: TokenKind;
    v: string;
}

/* ── What a bare value looks like ─────────────────────────────────────────── */

const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?$/;
const IPV6 = /^[0-9a-f:]+:[0-9a-f:]*(?:\/\d{1,3})?$/i;
const RANGE = /^\d+\s*-\s*\d+$/;
const NUMBER = /^-?\d+(?:\.\d+)?$/;
const HOSTPORT = /^[a-z0-9.-]+:\d{1,5}$/i;

/**
 * A CPS chain: `<b 0x…>`, `<r 7>`, `<t>` and the rest, run together.
 *
 * It is the least readable thing in a config and the most distinctive, so it
 * gets its own colour rather than being lumped in with every other string.
 */
const CPS = /^<[a-z]+[^>]*>(?:<[a-z]+[^>]*>)*$/i;

/** A placeholder the client fills in, e.g. `$PRIMARY_DNS`. */
const VARIABLE = /^\$[A-Z_][A-Z0-9_]*$/;

/** A whole transport value, not the letters wherever they appear. */
const PROTO = /^(?:tcp|udp)$/i;

/**
 * A hostname. Checked after the address patterns, so `1.1.1.1` stays an
 * address rather than becoming a domain with numeric labels.
 */
const DOMAIN = /^(?!-)[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

/** Classify a value that arrived without quotes. */
export function classify(value: string): TokenKind {
    const v = value.trim();
    if (v === "") return "plain";
    if (VARIABLE.test(v)) return "var";
    if (CPS.test(v)) return "cps";
    if (RANGE.test(v)) return "range";
    if (NUMBER.test(v)) return "number";
    if (IPV4.test(v) || HOSTPORT.test(v)) return "ip";
    if (v.includes(":") && IPV6.test(v)) return "ip";
    if (v === "true" || v === "false" || v === "null") return "bool";
    if (PROTO.test(v)) return "proto";
    if (DOMAIN.test(v)) return "domain";
    return "string";
}

/* ── wg-quick ─────────────────────────────────────────────────────────────── */

/** `;` and `#` both open a comment, and a section is the whole line. */
const CONF_SECTION = /^\[.+\]\s*$/;

export function tokeniseConf(line: string): Token[] {
    const trimmed = line.trimStart();

    if (trimmed.startsWith("#") || trimmed.startsWith(";")) {
        return [{ k: "comment", v: line }];
    }
    if (CONF_SECTION.test(trimmed)) {
        return [{ k: "section", v: line }];
    }

    const eq = line.indexOf("=");
    if (eq < 0) return [{ k: "plain", v: line }];

    const name = line.slice(0, eq);
    const value = line.slice(eq + 1);

    /*
     * A comma-separated value is several values, and colouring the whole run
     * as one loses the point: `AllowedIPs = 0.0.0.0/0, ::/0` is two addresses.
     */
    const parts: Token[] = [];
    const pieces = value.split(",");
    for (let i = 0; i < pieces.length; i += 1) {
        if (i > 0) parts.push({ k: "punct", v: "," });
        const piece = pieces[i]!;
        parts.push({ k: classify(piece), v: piece });
    }

    return [{ k: "key", v: name }, { k: "punct", v: "=" }, ...parts];
}

/* ── JSON ─────────────────────────────────────────────────────────────────── */

/** The characters that end a bare run: anything structural or a quote. */
const JSON_BREAK = /["{}[\]:,]/;

/**
 * Walk the line rather than matching it whole.
 *
 * A regex over the whole string cannot tell a key from a value — both are
 * quoted — and the difference is the one a reader most wants coloured.
 */
export function tokeniseJson(line: string): Token[] {
    const out: Token[] = [];
    let i = 0;

    while (i < line.length) {
        const ch = line[i];

        if (ch === '"') {
            let j = i + 1;
            while (j < line.length) {
                if (line[j] === "\\") j += 2;
                else if (line[j] === '"') break;
                else j++;
            }
            const raw = line.slice(i, Math.min(j + 1, line.length));
            const after = line.slice(j + 1).trimStart();
            const inner = raw.slice(1, -1);

            // A quoted run followed by a colon is a key; otherwise a value,
            // and a value gets classified by what it holds.
            out.push(
                after.startsWith(":")
                    ? { k: "key", v: raw }
                    : { k: classify(inner), v: raw },
            );
            i = j + 1;
            continue;
        }

        if (JSON_BREAK.test(ch)) {
            out.push({ k: "punct", v: ch });
            i++;
            continue;
        }

        // A bare run: number, true, false, null, or whitespace.
        let j = i;
        while (j < line.length && !JSON_BREAK.test(line[j]!)) j++;
        const run = line.slice(i, j);
        out.push(
            run.trim() ? { k: classify(run), v: run } : { k: "plain", v: run },
        );
        i = j;
    }

    return out;
}

/** Tokenise one line of either format. */
export function tokeniseLine(line: string, lang: "json" | "conf"): Token[] {
    return lang === "json" ? tokeniseJson(line) : tokeniseConf(line);
}
