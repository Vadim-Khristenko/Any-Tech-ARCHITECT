/**
 * A line that types itself, erases and types the next one.
 *
 * The CSS `.typing` class handles one fixed string: its width has to be stated
 * in characters, because a `steps()` animation running to `width: auto` does
 * not interpolate and simply does nothing. That is enough for a label that
 * appears once, and not enough for a line that cycles — each phrase is a
 * different length, and CSS has no way to know the next one.
 *
 * So the cycling version is here. It writes text content directly rather than
 * animating a width, which also means it is exact in a proportional face.
 *
 * The pause after a completed phrase is longer than the one after an erase,
 * because the reader is meant to read the phrase and not the empty line.
 */

export interface TypingOptions {
    /** Milliseconds per character while typing. */
    typeMs?: number;
    /** Milliseconds per character while erasing. Erasing is always faster. */
    eraseMs?: number;
    /** How long a completed phrase stays on screen. */
    holdMs?: number;
    /** How long the empty line stays before the next phrase starts. */
    gapMs?: number;
    /** Stop after the last phrase instead of returning to the first. */
    once?: boolean;
}

export interface TypingHandle {
    /** Stop and leave whatever is on screen. */
    stop(): void;
}

const DEFAULTS: Required<Omit<TypingOptions, "once">> = {
    typeMs: 55,
    eraseMs: 22,
    holdMs: 1600,
    gapMs: 320,
};

/**
 * Drive one element through a list of phrases.
 *
 * The element gets `is-typing` while characters are moving, which the kit uses
 * to hold the cursor solid — a caret that blinks while text is appearing looks
 * like two things happening at once.
 *
 * Returns a handle; call `stop()` when the component goes away, or the timer
 * keeps writing into a detached node.
 */
export function typeLines(
    el: HTMLElement,
    phrases: readonly string[],
    options: TypingOptions = {},
): TypingHandle {
    const { typeMs, eraseMs, holdMs, gapMs } = { ...DEFAULTS, ...options };

    let phrase = 0;
    let chars = 0;
    let erasing = false;
    let timer = 0;
    let stopped = false;

    const reduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // With reduced motion the effect is the first phrase, stated.
    if (reduced || phrases.length === 0) {
        el.textContent = phrases[0] ?? "";
        return { stop() {} };
    }

    const tick = () => {
        if (stopped) return;

        const text = phrases[phrase] ?? "";
        chars += erasing ? -1 : 1;
        el.textContent = text.slice(0, chars);

        let next: number;

        if (!erasing && chars >= text.length) {
            // Finished a phrase.
            if (options.once && phrase === phrases.length - 1) {
                el.classList.remove("is-typing");
                return;
            }
            erasing = true;
            next = holdMs;
            el.classList.remove("is-typing");
        } else if (erasing && chars <= 0) {
            // Finished erasing; move on.
            erasing = false;
            phrase = (phrase + 1) % phrases.length;
            next = gapMs;
        } else {
            el.classList.add("is-typing");
            next = erasing ? eraseMs : typeMs;
        }

        timer = window.setTimeout(tick, next);
    };

    el.classList.add("typing-cursor");
    timer = window.setTimeout(tick, gapMs);

    return {
        stop() {
            stopped = true;
            window.clearTimeout(timer);
            el.classList.remove("is-typing");
        },
    };
}
