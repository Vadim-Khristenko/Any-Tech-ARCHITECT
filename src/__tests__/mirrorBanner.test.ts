import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import ru from "@/i18n/locales/ru";
import en from "@/i18n/locales/en";

/**
 * The mirror strip, and the one measurement it shares with the header.
 *
 * The strip is `position: fixed` and the header sits below it at
 * `top: var(--mirror-h)`, so the banner's height has to be known before
 * anything is measured — which rules out letting it grow to fit its content.
 * The height is therefore stated twice: once as the banner's own height and
 * once as the header's offset. If the two drift, the header covers the strip
 * or floats above it, on the one build where nobody looks.
 *
 * These read the source rather than render it, because what is being asserted
 * is the agreement between two files, and a rendered test would need a DOM
 * this suite does not have.
 */

const read = (...parts: string[]): string =>
    readFileSync(join(process.cwd(), ...parts), "utf8");

const BANNER = read("src", "components", "MirrorBanner.vue");
const APP = read("src", "App.vue");

/** Every `max-width: Npx` breakpoint in a stylesheet, in order. */
function breakpoints(css: string): number[] {
    return [...css.matchAll(/max-width:\s*(\d+)px/g)].map((m) => Number(m[1]));
}

/** The body of one rule, by selector. */
function rule(css: string, selector: string): string | null {
    const index = css.indexOf(`${selector} {`);
    if (index === -1) return null;
    const open = css.indexOf("{", index);
    return css.slice(open + 1, css.indexOf("}", open));
}

describe("the mirror strip keeps its message at every width", () => {
    it("never hides the text, which is the whole reason the strip exists", () => {
        // The previous build answered "this does not fit" with
        // `.mirror-text { display: none }` — leaving a badge saying "mirror"
        // and no address to go to instead.
        expect(BANNER).not.toMatch(/\.mirror-text\s*\{[^}]*display:\s*none/);
    });

    it("swaps the long sentence for the short one instead of dropping it", () => {
        // Two variants, and at any width exactly one of them is on screen.
        expect(BANNER).toMatch(/\.mirror-text-full\s*\{\s*display:\s*inline;?\s*\}/);
        expect(BANNER).toMatch(/\.mirror-text-short\s*\{\s*display:\s*none;?\s*\}/);
        expect(BANNER).toMatch(/\.mirror-text-short\s*\{\s*display:\s*inline;?\s*\}/);
    });

    it("never clips the address, whatever else gives way", () => {
        const host = rule(BANNER, ".mirror-host");
        expect(host).not.toBeNull();
        // The sentence around it is what is allowed to lose words; the one
        // thing a reader would act on is not.
        expect(host).toMatch(/white-space:\s*nowrap/);
    });

    it("is built from the kit rather than from a chip of its own", () => {
        expect(BANNER).toMatch(/class="badge/);
        // The strip is the drawing's, so it uses the drawing's tokens.
        expect(BANNER).toMatch(/var\(--ground-2\)/);
        expect(BANNER).toMatch(/var\(--line-soft\)/);
    });
});

describe("the strip and the header agree on how tall it is", () => {
    const bannerNarrow = breakpoints(BANNER);
    const appNarrow = breakpoints(APP);

    it("changes its layout at one breakpoint", () => {
        expect(bannerNarrow.length).toBeGreaterThan(0);
    });

    it("changes the header's offset at exactly that breakpoint", () => {
        // Two files, one number. This is the assertion that stops the header
        // from being told the strip is 38px while the strip is 56px tall.
        expect(appNarrow).toContain(bannerNarrow[0]);
    });

    it("reserves more room for the wrapped state than for the single row", () => {
        const wide = /--mirror-h:\s*(\d+)px/.exec(APP);
        const narrow = /@media \(max-width: \d+px\) \{\s*\.app-wrapper\.is-mirror \{\s*--mirror-h:\s*(\d+)px/s.exec(
            APP,
        );

        expect(wide).not.toBeNull();
        expect(narrow).not.toBeNull();
        expect(Number(narrow![1])).toBeGreaterThan(Number(wide![1]));
    });

    it("takes its height from the variable the header reads", () => {
        expect(BANNER).toMatch(/height:\s*var\(--mirror-h\)/);
    });
});

describe("the copy exists in every locale", () => {
    const used = [...BANNER.matchAll(/t\("([^"]+)"\)/g)].map((m) => m[1]!);

    it("finds the keys the strip asks for", () => {
        // Guard against the regex quietly matching nothing.
        expect(used.length).toBeGreaterThan(2);
    });

    for (const key of used) {
        it(`has ${key} in both catalogues`, () => {
            expect(Object.keys(ru)).toContain(key);
            expect(Object.keys(en)).toContain(key);
        });
    }
});
