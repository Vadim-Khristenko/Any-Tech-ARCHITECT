import { describe, it, expect, jest, afterEach, beforeEach } from "bun:test";
import {
  stubGlobal,
  unstubAllGlobals,
} from "@/shared/__tests__/stub-global";

import { downloadText, timestampedName } from "../download";

/**
 * The four copies this replaced all revoked the object URL on the line after
 * the click, and none of them put the anchor in the document. Both are why a
 * save button can look wired up and do nothing, so both are asserted here.
 */

interface FakeAnchor {
  href: string;
  download: string;
  style: { display: string };
  click: () => void;
  remove: () => void;
}

function stubDom() {
  const state = {
    anchors: [] as FakeAnchor[],
    inDocumentAtClick: [] as boolean[],
    attached: new Set<FakeAnchor>(),
    revoked: [] as string[],
    created: [] as unknown[],
  };

  stubGlobal("URL", {
    createObjectURL: (blob: unknown) => {
      state.created.push(blob);
      return `blob:${state.created.length}`;
    },
    revokeObjectURL: (url: string) => state.revoked.push(url),
  });

  stubGlobal("Blob", class {
    parts: unknown[];
    type: string;
    constructor(parts: unknown[], opts?: { type?: string }) {
      this.parts = parts;
      this.type = opts?.type ?? "";
    }
  });

  stubGlobal("document", {
    createElement: (): FakeAnchor => {
      const anchor: FakeAnchor = {
        href: "",
        download: "",
        style: { display: "" },
        click: () => state.inDocumentAtClick.push(state.attached.has(anchor)),
        remove: () => state.attached.delete(anchor),
      };
      state.anchors.push(anchor);
      return anchor;
    },
    body: {
      appendChild: (el: FakeAnchor) => state.attached.add(el),
    },
  });

  return state;
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  unstubAllGlobals();
});

describe("downloadText", () => {
  it("clicks an anchor that is actually in the document", () => {
    const dom = stubDom();

    expect(downloadText("Jc = 4", "awg.conf")).toBe(true);
    // Firefox ignores click() on a detached anchor — this is the whole reason
    // the shared helper exists.
    expect(dom.inDocumentAtClick).toEqual([true]);
    expect(dom.anchors[0]?.download).toBe("awg.conf");
  });

  it("keeps the object URL alive past the click", () => {
    const dom = stubDom();

    downloadText("payload", "file.txt");
    // Revoking inline cancels the save before the browser has read the blob.
    expect(dom.revoked).toEqual([]);

    jest.advanceTimersByTime(60_000);
    expect(dom.revoked).toEqual(["blob:1"]);
  });

  it("takes the anchor back out of the document", () => {
    const dom = stubDom();

    downloadText("payload", "file.txt");
    expect(dom.attached.size).toBe(0);
  });

  it("carries the MIME type onto the blob", () => {
    const dom = stubDom();

    downloadText("{}", "merged.json", "application/json");
    expect((dom.created[0] as { type: string }).type).toBe("application/json");
  });

  it("defaults to plain text", () => {
    const dom = stubDom();

    downloadText("hello", "note.txt");
    expect((dom.created[0] as { type: string }).type).toBe("text/plain");
  });

  it("reports failure where there is nothing to download into", () => {
    stubGlobal("document", undefined);
    // A caller that logs "saved" must not do so when nothing was saved.
    expect(downloadText("x", "y.txt")).toBe(false);
  });
});

describe("timestampedName", () => {
  it("joins prefix, timestamp and extension", () => {
    jest.setSystemTime(new Date("2026-07-31T00:00:00Z"));
    expect(timestampedName("amnezia-merged", "json")).toBe(
      `amnezia-merged-${Date.now()}.json`,
    );
  });
});
