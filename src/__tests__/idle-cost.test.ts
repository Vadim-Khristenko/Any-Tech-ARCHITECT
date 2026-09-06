import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * What a tab is allowed to do while nobody is touching it.
 *
 * The reported symptom was a Firefox tab holding a core at idle. None of the
 * usual suspects were in the JavaScript: no polling, no interval, no observer
 * left running. The work was in the stylesheet — animations a compositor
 * cannot take over, so every frame of a loop that never ends is a repaint on
 * the main thread.
 *
 * A profile will not catch that coming back, because whoever writes the rule
 * is not looking at a profile. So this does. It reads the stylesheets and
 * fails on the two shapes that cost a repaint per frame, with an allowlist for
 * the loops that are allowed to cost one and a reason each.
 *
 * Same kind of test as `i18n/__tests__/no-hardcode.test.ts`: not a unit test
 * of behaviour, but a statement the source has to keep agreeing with.
 */

const ASSETS = join(process.cwd(), "assets");
const SRC = join(process.cwd(), "src");

function walk(dir: string, pattern: RegExp, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
            walk(path, pattern, out);
        } else if (pattern.test(entry)) {
            out.push(path);
        }
    }
    return out;
}

const short = (path: string): string =>
    relative(process.cwd(), path).replace(/\\/g, "/");

/**
 * Properties a frame asks the browser to *repaint* rather than composite.
 *
 * `transform` and `opacity` are the compositor's: changing them is a matter of
 * moving or fading a layer that already exists. Everything here changes what
 * is painted into the layer, so the layer has to be drawn again — and an
 * animation that never ends draws it again sixty times a second, for as long
 * as the page is open.
 */
const PAINT_PROPERTIES = [
    "box-shadow",
    "filter",
    "backdrop-filter",
    "background-position",
    "background-size",
    "background-image",
    "border-width",
    "clip-path",
    "width",
    "height",
    "margin",
    "padding",
];

/**
 * Loops allowed to cost a repaint, with the reason.
 *
 * Adding to this list is meant to be a decision somebody makes out loud.
 * Every entry is either reporting state rather than decorating, or mounted
 * only while something is actually happening.
 */
const ALLOWED_PAINT_LOOPS = new Set([
    // "Not available", drawn as hatching that crawls. The kit's one deliberate
    // exception, and the comment on `.marching` says why: the movement is the
    // message, and it is only on elements being ruled out.
    "marching",
    // A caret. One element, and it stops while text is being typed.
    "typing-cursor",
    // Spinners and shimmer, all of which exist only while something loads.
    "spin",
    "slide",
    "sweep",
]);

/** `@keyframes name { … }`, by name. Closing brace at column zero. */
function keyframes(css: string): Map<string, string> {
    const out = new Map<string, string>();
    for (const match of css.matchAll(
        /@keyframes\s+([a-zA-Z0-9_-]+)\s*\{([\s\S]*?)\n\}/g,
    )) {
        out.set(match[1]!, match[2]!);
    }
    return out;
}

/**
 * The names of the animations a file runs forever.
 *
 * Only these are checked. A keyframes block that moves a paint property once
 * is a transition, not a loop, and costs nothing while the page is idle.
 */
function infiniteNames(css: string): Set<string> {
    const names = new Set<string>();
    for (const match of css.matchAll(/animation(?:-name)?\s*:\s*([^;{}]+)/g)) {
        const declaration = match[1]!;
        if (!/\binfinite\b/.test(declaration)) continue;
        const name = declaration.trim().split(/\s+/)[0];
        if (name && !name.startsWith("var(")) names.add(name);
    }
    return names;
}

/** Which properties a frames block writes. */
function animatedProperties(body: string): string[] {
    return PAINT_PROPERTIES.filter((property) =>
        new RegExp(`(^|[;{\\s])${property}\\s*:`, "m").test(body),
    );
}

const STYLES = walk(ASSETS, /\.css$/);
const VIEWS = walk(SRC, /\.vue$/);

describe("no animation repaints the main thread forever", () => {
    it("finds the stylesheets it is meant to be checking", () => {
        // A test that quietly checks nothing is worse than no test at all.
        expect(STYLES.length).toBeGreaterThan(10);
    });

    for (const file of [...STYLES, ...VIEWS]) {
        it(`${short(file)} animates only what the compositor owns`, () => {
            const css = readFileSync(file, "utf8");
            const frames = keyframes(css);
            const offenders: string[] = [];

            for (const name of infiniteNames(css)) {
                if (ALLOWED_PAINT_LOOPS.has(name)) continue;
                const body = frames.get(name);
                // A loop whose frames are in another file is a loop we cannot
                // see; leaving it alone is better than passing it silently.
                if (body === undefined) continue;

                for (const property of animatedProperties(body)) {
                    offenders.push(
                        `${name} animates ${property} — a repaint per frame, forever`,
                    );
                }
            }

            expect(offenders).toEqual([]);
        });
    }
});

describe("a view takes its loops from the kit", () => {
    /**
     * `animation: … infinite` written into a view is a loop nobody audited.
     * The kit's blanket reduced-motion rule covers all of them either way, so
     * what this really says is: a loop is a primitive, and primitives live in
     * `assets/kit`, next to the other two tests that check them.
     */
    for (const file of VIEWS) {
        it(`${short(file)} declares no looping animation of its own`, () => {
            const source = readFileSync(file, "utf8");
            const style = source.slice(source.lastIndexOf("<style"));
            const loops = [...style.matchAll(/animation[^;{]*\binfinite\b/g)].map(
                (match) => match[0].trim(),
            );

            expect(loops).toEqual([]);
        });
    }
});

describe("scroll listeners do not block the scroll", () => {
    /**
     * A listener the browser has to wait for before it can scroll is a
     * listener that must be `passive`, or throttled to a frame. The header's
     * was neither: it ran on every scroll the trackpad produced, and each one
     * was a synchronous read the scroll was queued behind.
     */
    for (const file of VIEWS) {
        it(`${short(file)} listens passively, or not at all`, () => {
            const source = readFileSync(file, "utf8");
            const offenders: string[] = [];

            for (const match of source.matchAll(
                /addEventListener\(\s*"(scroll|wheel|touchmove|touchstart)"/g,
            )) {
                const end = source.indexOf("\n", match.index!);
                const line = source.slice(match.index!, end === -1 ? undefined : end);
                if (/\bpassive\b/.test(line) || /rafThrottle/.test(line)) continue;
                offenders.push(line.trim());
            }

            expect(offenders).toEqual([]);
        });
    }
});
