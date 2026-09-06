import { describe, it, expect, vi } from "vitest";

import { rafThrottle, type FrameScheduler } from "../raf";

/**
 * One call per frame.
 *
 * The listener this was written for is the header's scroll handler, which
 * fires far more often than the browser paints. The property worth testing is
 * not the timing — nobody can assert on a real frame — but the contract: a
 * burst collapses into one call, the newest arguments win, and a cancelled
 * throttle never calls back even if its frame was already pending.
 */

/** A scheduler whose frames only run when the test says so. */
function fakeScheduler() {
    let next = 1;
    const pending = new Map<number, () => void>();

    const scheduler: FrameScheduler = {
        request(callback) {
            const handle = next++;
            pending.set(handle, callback);
            return handle;
        },
        cancel(handle) {
            pending.delete(handle);
        },
    };

    return {
        scheduler,
        /** How many frames are still queued. */
        queued: () => pending.size,
        /** Run every queued frame, as the browser would on the next paint. */
        flush() {
            const due = [...pending.entries()];
            pending.clear();
            for (const [, callback] of due) callback();
        },
    };
}

describe("rafThrottle", () => {
    it("collapses a burst into one call", () => {
        const fake = fakeScheduler();
        const fn = vi.fn();
        const throttled = rafThrottle(fn, fake.scheduler);

        throttled();
        throttled();
        throttled();

        // Asked for a frame, not for three, and has not run yet.
        expect(fake.queued()).toBe(1);
        expect(fn).not.toHaveBeenCalled();

        fake.flush();
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("asks for a new frame only after the last one has run", () => {
        const fake = fakeScheduler();
        const fn = vi.fn();
        const throttled = rafThrottle(fn, fake.scheduler);

        throttled();
        fake.flush();
        throttled();
        fake.flush();

        expect(fn).toHaveBeenCalledTimes(2);
    });

    it("hands over the newest arguments, not the oldest", () => {
        const fake = fakeScheduler();
        const fn = vi.fn();
        const throttled = rafThrottle<[number]>(fn, fake.scheduler);

        throttled(1);
        throttled(2);
        throttled(3);
        fake.flush();

        // A scroll handler reads position at call time, so it needs no
        // arguments; one that is given them needs the last state, not the
        // first, or it reacts to where the page was ten events ago.
        expect(fn).toHaveBeenCalledExactlyOnceWith(3);
    });

    it("drops the pending call on cancel, and stays dropped", () => {
        const fake = fakeScheduler();
        const fn = vi.fn();
        const throttled = rafThrottle(fn, fake.scheduler);

        throttled();
        throttled.cancel();
        fake.flush();

        expect(fn).not.toHaveBeenCalled();
        expect(fake.queued()).toBe(0);

        // A component that has gone away must not be woken by the frame it
        // asked for before it went.
        throttled();
        fake.flush();
        expect(fn).not.toHaveBeenCalled();
    });

    it("cancels the frame it asked for, so nothing is left pending", () => {
        const fake = fakeScheduler();
        const throttled = rafThrottle(() => {}, fake.scheduler);

        throttled();
        expect(fake.queued()).toBe(1);
        throttled.cancel();
        expect(fake.queued()).toBe(0);
    });

    it("runs again on a later burst after an earlier one completed", () => {
        const fake = fakeScheduler();
        const fn = vi.fn();
        const throttled = rafThrottle(fn, fake.scheduler);

        for (let burst = 0; burst < 3; burst += 1) {
            throttled();
            throttled();
            fake.flush();
        }

        expect(fn).toHaveBeenCalledTimes(3);
    });

    it("falls back to a timeout where there is no frame to ask for", () => {
        vi.useFakeTimers();
        try {
            // No `requestAnimationFrame` on `globalThis`: a worker, or SSR.
            const fn = vi.fn();
            const throttled = rafThrottle(fn, {
                request: (cb) => setTimeout(cb, 16) as unknown as number,
                cancel: (h) =>
                    clearTimeout(h as unknown as ReturnType<typeof setTimeout>),
            });

            throttled();
            throttled();
            vi.advanceTimersByTime(20);

            expect(fn).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });
});
