<script setup lang="ts">
/**
 * A config, coloured by what the values mean rather than by syntax alone.
 *
 * The point is not decoration. A key is a wall of similar-looking strings —
 * base64 keys, byte counts, ranges, addresses — and telling them apart by eye
 * is most of the work of reading one. So an address is coloured as an address
 * and a range as a range, in both formats, using one set of rules.
 *
 * Nothing is built with innerHTML. Every token becomes a real element, so a
 * config carrying `<script>` in a description is text and stays text.
 */

import { computed } from "vue";
import { tokeniseLine, type Token } from "@/utils/codeTokens";

const props = defineProps<{
    text: string;
    lang: "json" | "conf";
    /** Soft-wrap long lines instead of scrolling sideways. */
    wrap?: boolean;
    /** Show a nested JSON string as structure rather than as one long line. */
    expand?: boolean;
    /** Indent JSON. Off gives the compact form, which some clients want. */
    indent?: boolean;
}>();

/**
 * JSON is re-indented on the way in.
 *
 * The text arrives from several places — an export, an edit, a paste — and one
 * of them being flat is enough to make the view unreadable. Re-printing it
 * here means the view is always indented, whatever handed it over. Anything
 * that does not parse is shown exactly as given.
 */
/**
 * A container stores its whole configuration again inside `last_config`, as a
 * JSON string. Printed as one it is a single unreadable line with \n in it,
 * which is exactly where the interesting values live — so for display it is
 * parsed and shown as structure.
 *
 * Display only. What gets edited and saved is the real text, string and all,
 * because the format wants a string there.
 */
function expandNested(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(expandNested);
    if (value && typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) out[k] = expandNested(v);
        return out;
    }
    if (typeof value === "string") {
        const t = value.trim();
        if (t.startsWith("{") && t.endsWith("}")) {
            try {
                return expandNested(JSON.parse(t));
            } catch {
                return value;
            }
        }
    }
    return value;
}

/** Leading and trailing blank lines, which add a row and say nothing. */
const TRIM_BLANKS = /^\n+|\n+$/g;

const source = computed(() => {
    if (props.lang !== "json") return props.text;
    try {
        const parsed = JSON.parse(props.text);
        const value = props.expand ? expandNested(parsed) : parsed;
        return JSON.stringify(value, null, props.indent === false ? 0 : 2);
    } catch {
        return props.text;
    }
});

/*
 * Deliberately not memoised by hand. `computed` holds the result until the
 * text changes, and a hand-rolled cache would have to hold it after the view
 * has gone too — pinning every token of a container export in memory for the
 * sake of a recompute that costs a few milliseconds on remount.
 */
const lines = computed<Token[][]>(() =>
    source.value
        .replace(TRIM_BLANKS, "")
        .split("\n")
        .map((line) => tokeniseLine(line, props.lang)),
);
</script>

<template>
    <pre class="cv" :class="{ 'cv--wrap': wrap }"><code><span v-for="(line, i) in lines" :key="i" class="cv-line"><span v-for="(tok, j) in line" :key="j" :class="`cv-${tok.k}`">{{ tok.v }}</span></span></code></pre>
</template>

<style scoped>
.cv {
    margin: 0;
    padding: var(--sp-4);
    max-height: 460px;
    overflow: auto;
    background: var(--ground-2);
    border: var(--rule) solid var(--line);
    border-radius: var(--r-1);
}

.cv code {
    font-family: var(--fm);
    font-size: var(--t-2xs);
    line-height: 1.75;
}

/* Stated on both sides: whichever rule wins, it is one of these two. */
.cv:not(.cv--wrap) code {
    white-space: pre;
    word-break: normal;
}

/*
 * Wrapping keeps a long base64 key on screen instead of pushing the panel
 * sideways; the indent is preserved so structure survives the wrap.
 */
.cv--wrap code {
    white-space: pre-wrap;
    word-break: break-all;
}

.cv-line {
    display: block;
    /* A blank line still occupies one, rather than collapsing the rhythm. */
    min-height: 1.75em;
}

/*
 * Colours come from the kit rather than from a syntax palette, so the view
 * belongs to this site in either scheme. Meaning, not token type: an address
 * reads the same in a .conf and in JSON.
 */
.cv-plain,
.cv-punct {
    color: var(--ink-3);
}

.cv-key {
    color: var(--accent-ink);
}

.cv-string {
    color: var(--ink-2);
}

.cv-number {
    color: var(--green);
}

.cv-range {
    color: var(--green);
    font-weight: 700;
}

.cv-ip {
    color: light-dark(#0b6bcb, #7fb3ff);
}

.cv-bool {
    color: light-dark(#8a5a00, #e0b062);
}

.cv-comment {
    color: var(--ink-4);
    font-style: italic;
}

.cv-section {
    color: var(--text);
    font-weight: 700;
}

/* The CPS chain — the densest thing in a config, so the most worth marking. */
.cv-cps {
    color: light-dark(#7a3fa8, #c9a2ff);
}

/* A placeholder the client substitutes, not a value anyone typed. */
.cv-var {
    color: light-dark(#8a5a00, #e0b062);
    font-weight: 700;
}

/* A transport, and a name that resolves — both worth picking out of a wall. */
.cv-proto {
    color: light-dark(#0a7d6b, #5fd4bd);
    font-weight: 700;
}

.cv-domain {
    color: light-dark(#0b6bcb, #7fb3ff);
    text-decoration: underline;
    text-decoration-style: dotted;
    text-underline-offset: 2px;
}
</style>
