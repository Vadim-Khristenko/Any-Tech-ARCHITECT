import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * The tooltip that answers every scroll in the document.
 *
 * `installTooltips` registers its dismiss handler with `capture: true`, which
 * is what lets one listener see a scroll inside any scrolling element — the
 * history list, a config view, the page itself. It is also why the handler is
 * handed an event for every one of those scrolls.
 *
 * The bug this guards: `hide()` wrote two attributes into the DOM on each of
 * them, whether or not a tooltip had ever been shown. A page with a long
 * scroll in it did thousands of attribute writes for nothing, which is not
 * the kind of thing a profile of the *visible* interaction ever mentions.
 *
 * There is no DOM in this test suite, so there is a small one here. It is
 * deliberately only as real as `tooltip.ts` needs: enough to register
 * listeners, count writes, and hand back an element with a rectangle.
 */

type Listener = (event: unknown) => void;

class FakeElement {
    tagName: string;
    attributes = new Map<string, string>();
    classes = new Set<string>();
    dataset: Record<string, string> = {};
    style: Record<string, string> = {};
    textContent = "";
    children: FakeElement[] = [];
    /** How many times anything wrote an attribute onto this element. */
    writes = 0;

    constructor(tagName = "div") {
        this.tagName = tagName;
    }

    setAttribute(name: string, value: string): void {
        this.writes += 1;
        this.attributes.set(name, value);
    }

    getAttribute(name: string): string | null {
        return this.attributes.get(name) ?? null;
    }

    appendChild(child: FakeElement): FakeElement {
        this.children.push(child);
        return child;
    }

    getBoundingClientRect() {
        return {
            top: 100,
            left: 100,
            right: 140,
            bottom: 120,
            width: 40,
            height: 20,
        };
    }

    closest(selector: string): FakeElement | null {
        // One selector is used, and the chain is one element deep.
        if (selector === "[data-tooltip]" && this.attributes.has("data-tooltip")) {
            return this;
        }
        return null;
    }

    get classList() {
        const classes = this.classes;
        return {
            add: (name: string) => void classes.add(name),
            remove: (name: string) => void classes.delete(name),
            toggle: (name: string, on?: boolean) => {
                const next = on ?? !classes.has(name);
                if (next) classes.add(name);
                else classes.delete(name);
                return next;
            },
            contains: (name: string) => classes.has(name),
        };
    }
}

interface Registered {
    type: string;
    listener: Listener;
    options?: { passive?: boolean; capture?: boolean };
}

let body: FakeElement;
let created: FakeElement[];
let onWindow: Registered[];
let onDocument: Registered[];

function stubDom(): void {
    body = new FakeElement("body");
    created = [];
    onWindow = [];
    onDocument = [];

    const doc = {
        body,
        createElement: (tag: string) => {
            const el = new FakeElement(tag);
            created.push(el);
            return el;
        },
        addEventListener: (
            type: string,
            listener: Listener,
            options?: { passive?: boolean; capture?: boolean },
        ) => {
            onDocument.push({ type, listener, options });
        },
    };

    const win = {
        innerWidth: 1280,
        addEventListener: (
            type: string,
            listener: Listener,
            options?: { passive?: boolean; capture?: boolean },
        ) => {
            onWindow.push({ type, listener, options });
        },
    };

    // `targetFor` asks `node instanceof Element`, which has to exist for the
    // question to be answerable at all.
    (globalThis as Record<string, unknown>)["Element"] = FakeElement;
    (globalThis as Record<string, unknown>)["document"] = doc;
    (globalThis as Record<string, unknown>)["window"] = win;
}

function clearDom(): void {
    delete (globalThis as Record<string, unknown>)["Element"];
    delete (globalThis as Record<string, unknown>)["document"];
    delete (globalThis as Record<string, unknown>)["window"];
}

/** The element `ensureLayer` made and put on the body. */
function layer(): FakeElement {
    return body.children[0]!;
}

function registered(
    where: "window" | "document",
    type: string,
): Registered | undefined {
    return (where === "window" ? onWindow : onDocument).find(
        (entry) => entry.type === type,
    );
}

beforeEach(() => {
    // The module holds its layer, its current target and whether anything is
    // shown, so each case needs the module as well as the DOM to be new.
    vi.resetModules();
    stubDom();
});
afterEach(clearDom);

describe("installTooltips", () => {
    it("listens to scroll without blocking it, and sees every scroller", async () => {
        const { installTooltips } = await import("../tooltip");
        installTooltips();

        const scroll = registered("window", "scroll");
        expect(scroll).toBeDefined();
        // `passive` so the browser never waits for this handler to scroll,
        // and `capture` so one listener covers every scrolling element rather
        // than needing one each.
        expect(scroll!.options).toEqual({ passive: true, capture: true });
    });

    it("does not touch the DOM for a scroll that has nothing to dismiss", async () => {
        const { installTooltips } = await import("../tooltip");
        installTooltips();

        // Force the layer into existence the way a real hover would, then put
        // it back to the state it has before anything is shown.
        const hint = new FakeElement("button");
        hint.setAttribute("data-tooltip", "Pin it");
        registered("document", "pointerover")!.listener({ target: hint });
        registered("window", "scroll")!.listener({});
        const before = layer().writes;

        for (let i = 0; i < 500; i += 1) {
            registered("window", "scroll")!.listener({});
        }

        expect(layer().writes).toBe(before);
    });

    it("does dismiss on scroll once something is on screen", async () => {
        const { installTooltips } = await import("../tooltip");
        installTooltips();

        const hint = new FakeElement("button");
        hint.setAttribute("data-tooltip", "Pin it");
        registered("document", "pointerover")!.listener({ target: hint });

        expect(layer().classes.has("visible")).toBe(true);

        const before = layer().writes;
        registered("window", "scroll")!.listener({});

        expect(layer().writes).toBeGreaterThan(before);
        expect(layer().classes.has("visible")).toBe(false);
    });

    it("ignores a pointer over something that has no tooltip", async () => {
        const { installTooltips } = await import("../tooltip");
        installTooltips();

        registered("document", "pointerover")!.listener({
            target: new FakeElement("span"),
        });

        // No layer is made for a target that has nothing to say.
        expect(created).toHaveLength(0);
    });

    it("is idempotent, so a hot reload does not stack listeners", async () => {
        const { installTooltips } = await import("../tooltip");
        installTooltips();
        installTooltips();
        installTooltips();

        expect(onWindow.filter((e) => e.type === "scroll")).toHaveLength(1);
        expect(onDocument.filter((e) => e.type === "pointerover")).toHaveLength(1);
    });
});
