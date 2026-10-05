/**
 * One call per frame, however often the event fires.
 *
 * A scroll listener is called for every scroll the browser produces, which on
 * a trackpad is comfortably more than once per painted frame. Doing the work
 * each time means doing it several times for a result the reader only ever
 * sees once — and on a listener that is not `passive`, the browser has to
 * wait for it before it can scroll at all.
 *
 * So the handler is wrapped: it remembers the last arguments, asks for one
 * frame, and runs once when the frame arrives. Anything that fired in between
 * collapses into that single call.
 *
 * The scheduler can be replaced, which is the whole reason this is here
 * rather than inline: a test can hand it a fake clock and count frames
 * without owning a browser.
 */

/** The two calls a scheduler has to be able to make. */
export interface FrameScheduler {
    request(callback: () => void): number;
    cancel(handle: number): void;
}

export interface RafThrottled<A extends unknown[]> {
    /** Queue a call. Safe to call as often as the browser likes. */
    (...args: A): void;
    /** Drop the queued call and stop accepting new ones. */
    cancel(): void;
}

/**
 * The real scheduler.
 *
 * `requestAnimationFrame` is missing in a worker, in SSR and in a hidden tab
 * that has never composited, and a module that throws on import because a
 * browser feature is absent is worse than one that degrades. The fallback is
 * a timeout, which is not frame-aligned but is still throttled.
 */
export const defaultScheduler: FrameScheduler = {
    request(callback) {
        const raf = (globalThis as { requestAnimationFrame?: (cb: () => void) => number })
            .requestAnimationFrame;
        if (typeof raf === "function") return raf.call(globalThis, callback);
        return setTimeout(callback, 16) as unknown as number;
    },
    cancel(handle) {
        const caf = (globalThis as { cancelAnimationFrame?: (h: number) => void })
            .cancelAnimationFrame;
        if (typeof caf === "function") {
            caf.call(globalThis, handle);
            return;
        }
        clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
    },
};

/**
 * Wrap `fn` so it runs at most once per frame.
 *
 * The arguments of the *last* call win: a scroll handler that reads
 * `window.scrollY` inside the callback needs no arguments at all, and one
 * that is given the event needs the newest one rather than the oldest.
 */
export function rafThrottle<A extends unknown[]>(
    fn: (...args: A) => void,
    scheduler: FrameScheduler = defaultScheduler,
): RafThrottled<A> {
    let handle: number | null = null;
    let queued: A | null = null;
    let stopped = false;

    function flush(): void {
        handle = null;
        const args = queued;
        queued = null;
        // `cancel()` between the call and the frame leaves nothing to run.
        if (args === null || stopped) return;
        fn(...args);
    }

    const throttled = ((...args: A): void => {
        // After `cancel()` the wrapper is dead, not merely idle: a component
        // that has gone away must not be called by the frame it asked for.
        if (stopped) return;
        queued = args;
        if (handle === null) handle = scheduler.request(flush);
    }) as RafThrottled<A>;

    throttled.cancel = (): void => {
        stopped = true;
        queued = null;
        if (handle !== null) {
            scheduler.cancel(handle);
            handle = null;
        }
    };

    return throttled;
}
