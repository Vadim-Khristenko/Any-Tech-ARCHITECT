import { describe, it, expect, vi, afterEach } from "bun:test";
import {
  stubGlobal,
  unstubAllGlobals,
} from "@/shared/__tests__/stub-global";

import { copyText } from "../clipboard";

/**
 * The point of this helper is that it tells the caller the truth about whether
 * the text reached the clipboard. Five of the call sites it replaced reported
 * success unconditionally, so these are the cases that used to lie.
 *
 * The suite runs under the `node` environment, so `navigator` and `document`
 * are stubbed per test rather than provided by a DOM.
 */

interface FakeField {
  value: string;
  style: { cssText: string };
  setAttribute: (name: string, value: string) => void;
  select: () => void;
  setSelectionRange: (start: number, end: number) => void;
}

/**
 * A document just real enough for the selection fallback: it records what was
 * appended and whether it was cleaned up again.
 */
function stubDocument(execCopy: () => boolean) {
  const state = {
    fields: [] as FakeField[],
    attached: 0,
    execCalls: 0,
  };

  stubGlobal("document", {
    createElement: (): FakeField => {
      const field: FakeField = {
        value: "",
        style: { cssText: "" },
        setAttribute: () => {},
        select: () => {},
        setSelectionRange: () => {},
      };
      state.fields.push(field);
      return field;
    },
    body: {
      appendChild: () => {
        state.attached += 1;
      },
      removeChild: () => {
        state.attached -= 1;
      },
    },
    execCommand: () => {
      state.execCalls += 1;
      return execCopy();
    },
  });

  return state;
}

afterEach(() => {
  unstubAllGlobals();
});

describe("copyText", () => {
  it("uses the Clipboard API when it works", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubGlobal("navigator", { clipboard: { writeText } });
    const doc = stubDocument(() => true);

    expect(await copyText("Jc = 4")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("Jc = 4");
    // No need to touch the DOM when the modern path succeeded.
    expect(doc.execCalls).toBe(0);
  });

  it("falls back to the selection route when the API rejects", async () => {
    // Permissions-Policy denial and non-secure contexts both look like this.
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    stubGlobal("navigator", { clipboard: { writeText } });
    const doc = stubDocument(() => true);

    expect(await copyText("H1 = 1")).toBe(true);
    expect(doc.execCalls).toBe(1);
    expect(doc.fields[0]?.value).toBe("H1 = 1");
  });

  it("falls back when the API is missing entirely", async () => {
    stubGlobal("navigator", {});
    const doc = stubDocument(() => true);

    expect(await copyText("S1 = 12")).toBe(true);
    expect(doc.execCalls).toBe(1);
  });

  it("reports failure rather than claiming a copy that did not happen", async () => {
    stubGlobal("navigator", {});
    stubDocument(() => false);

    expect(await copyText("nope")).toBe(false);
  });

  it("removes the field even when the copy throws", async () => {
    stubGlobal("navigator", {});
    const doc = stubDocument(() => {
      throw new Error("execCommand is gone");
    });

    expect(await copyText("boom")).toBe(false);
    // A leaked textarea per click would pile up on a page full of copy buttons.
    expect(doc.attached).toBe(0);
  });

  it("returns false without a document instead of throwing", async () => {
    stubGlobal("navigator", {});
    stubGlobal("document", undefined);

    expect(await copyText("ssr")).toBe(false);
  });
});

describe("copyText, called faster than it settles", () => {
  /**
   * Three copy buttons clicked in quick succession. `writeText` resolves when
   * the request is accepted rather than when the clipboard is updated, so
   * without serialisation the three land in whatever order the browser gets to
   * them — every click reports success and the clipboard holds one of the
   * earlier ones.
   */
  function orderedClipboard(delays: number[]) {
    const started: string[] = [];
    const landed: string[] = [];
    let call = 0;

    const writeText = vi.fn((text: string) => {
      const wait = delays[call++] ?? 0;
      started.push(text);
      return new Promise<void>((resolve) =>
        setTimeout(() => {
          landed.push(text);
          resolve();
        }, wait),
      );
    });

    stubGlobal("navigator", { clipboard: { writeText } });
    return { started, landed };
  }

  it("lands the writes in the order they were requested", async () => {
    // The first write is the slowest: unchained, it would land last and the
    // clipboard would end up holding "first".
    const { landed } = orderedClipboard([30, 10, 0]);

    const results = await Promise.all([
      copyText("first"),
      copyText("second"),
      copyText("third"),
    ]);

    expect(results).toEqual([true, true, true]);
    expect(landed).toEqual(["first", "second", "third"]);
  });

  it("does not start a write before the previous one settles", async () => {
    const { started, landed } = orderedClipboard([20, 0, 0]);

    const first = copyText("first");
    const second = copyText("second");
    // Still nothing but the first: the second is queued, not racing it.
    await Promise.resolve();
    expect(started).toEqual(["first"]);

    await first;
    expect(landed).toEqual(["first"]);
    // Awaited so the queue is empty before the next test arms its own mock.
    await second;
  });

  it("keeps the queue moving after a write is refused", async () => {
    const writeText = vi
      .fn()
      .mockRejectedValueOnce(new Error("denied"))
      .mockResolvedValue(undefined);
    stubGlobal("navigator", { clipboard: { writeText } });
    stubDocument(() => false);

    const [first, second] = await Promise.all([
      copyText("refused"),
      copyText("accepted"),
    ]);

    // One refusal must not strand every copy behind it.
    expect(first).toBe(false);
    expect(second).toBe(true);
  });
});
