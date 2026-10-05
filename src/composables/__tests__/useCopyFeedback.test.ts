import { describe, it, expect, vi, jest, beforeEach, afterEach } from "bun:test";
import {
  stubGlobal,
  unstubAllGlobals,
} from "@/shared/__tests__/stub-global";

import { useCopyFeedback } from "../useCopyFeedback";

/**
 * The composable exists because seven call sites had their own version of this
 * and disagreed about the details. What it must get right: never confirm a
 * copy the browser refused, and never leave the confirmation up forever.
 *
 * Called outside a component, `onBeforeUnmount` has no instance to attach to
 * and Vue warns; the composable still works, and the warning is silenced so it
 * does not read as a failure.
 */

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  jest.useFakeTimers();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  unstubAllGlobals();
  warn.mockRestore();
});

/** Clipboard that accepts everything. */
function acceptingClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  stubGlobal("navigator", { clipboard: { writeText } });
  return writeText;
}

/** Clipboard that refuses, with no selection fallback available either. */
function refusingClipboard() {
  stubGlobal("navigator", {
    clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
  });
  stubGlobal("document", undefined);
}

describe("useCopyFeedback", () => {
  it("flags the copied key and clears it after the window", async () => {
    acceptingClipboard();
    const { copy, isCopied, copied } = useCopyFeedback(1000);

    expect(await copy("wallet", "bc1q…")).toBe(true);
    expect(isCopied("wallet")).toBe(true);
    expect(copied.value).toBe("wallet");

    jest.advanceTimersByTime(999);
    expect(isCopied("wallet")).toBe(true);
    jest.advanceTimersByTime(1);
    expect(copied.value).toBeNull();
  });

  it("never flags a copy the browser refused", async () => {
    refusingClipboard();
    const { copy, copied } = useCopyFeedback();

    expect(await copy("wallet", "bc1q…")).toBe(false);
    // Saying "copied" with nothing on the clipboard is the failure that
    // matters here: the address gets pasted from a stale buffer.
    expect(copied.value).toBeNull();
  });

  it("only ever shows one confirmation, and restarts the clock", async () => {
    acceptingClipboard();
    const { copy, isCopied } = useCopyFeedback(1000);

    await copy("first", "a");
    jest.advanceTimersByTime(600);
    await copy("second", "b");

    expect(isCopied("first")).toBe(false);
    expect(isCopied("second")).toBe(true);

    // The second copy's window is a full one, not the 400ms left of the first.
    jest.advanceTimersByTime(600);
    expect(isCopied("second")).toBe(true);
    jest.advanceTimersByTime(400);
    expect(isCopied("second")).toBe(false);
  });

  it("passes the text through untouched", async () => {
    const writeText = acceptingClipboard();
    const { copy } = useCopyFeedback();

    await copy("param", "S1 = 12");
    expect(writeText).toHaveBeenCalledWith("S1 = 12");
  });

  it("marks without copying, for confirmations that are not copies", () => {
    const writeText = acceptingClipboard();
    const { mark, isCopied } = useCopyFeedback(1000);

    mark("restore:7");
    expect(isCopied("restore:7")).toBe(true);
    expect(writeText).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    expect(isCopied("restore:7")).toBe(false);
  });

  it("drops the confirmation on clear", async () => {
    acceptingClipboard();
    const { copy, clear, copied } = useCopyFeedback();

    await copy("k", "v");
    clear();
    expect(copied.value).toBeNull();
  });
});
