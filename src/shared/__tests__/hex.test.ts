import { describe, it, expect } from "bun:test";

import {
  bytesToHex,
  byteToHex,
  textToHex,
  hexToBytes,
  numberToHex,
} from "../hex";

/**
 * Hex is where an off-by-one is invisible and expensive: a missing pad turns
 * one byte into one character, and everything after it decodes to something
 * else. These are the edges that used to be re-implemented per call site.
 */

describe("bytesToHex", () => {
  it("pads every byte to two characters", () => {
    expect(bytesToHex(new Uint8Array([0, 1, 15, 16, 255]))).toBe("00010f10ff");
  });

  it("returns lower case", () => {
    expect(bytesToHex(new Uint8Array([0xab, 0xcd]))).toBe("abcd");
  });

  it("handles an empty input", () => {
    expect(bytesToHex(new Uint8Array())).toBe("");
  });

  it("accepts a plain array as well as a typed one", () => {
    expect(bytesToHex([1, 2, 3])).toBe("010203");
  });
});

describe("byteToHex", () => {
  it("pads a single digit", () => {
    expect(byteToHex(7)).toBe("07");
  });

  it("masks anything wider than a byte rather than widening the output", () => {
    // A three-character result would shift every field after it.
    expect(byteToHex(0x1ff)).toBe("ff");
    expect(byteToHex(256)).toBe("00");
  });
});

describe("textToHex", () => {
  it("encodes one byte per character", () => {
    expect(textToHex("AB")).toBe("4142");
  });

  it("is empty for empty input", () => {
    expect(textToHex("")).toBe("");
  });
});

describe("hexToBytes", () => {
  it("round-trips with bytesToHex", () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255]);
    expect(hexToBytes(bytesToHex(bytes))).toEqual(bytes);
  });

  it("refuses an odd length rather than guessing", () => {
    // Half a byte means the caller was handed something truncated.
    expect(hexToBytes("abc")).toBeNull();
  });

  it("refuses characters that are not hex", () => {
    expect(hexToBytes("zz")).toBeNull();
  });

  it("accepts upper case", () => {
    expect(hexToBytes("FF")).toEqual(new Uint8Array([255]));
  });

  it("treats empty as empty, not as invalid", () => {
    expect(hexToBytes("")).toEqual(new Uint8Array());
  });
});

describe("numberToHex", () => {
  it("pads to the requested width", () => {
    expect(numberToHex(1, 4)).toBe("00000001");
  });

  it("truncates from the left when the value does not fit", () => {
    // Fixed-width protocol fields: a longer field shifts what follows.
    expect(numberToHex(0x1234, 1)).toBe("34");
  });

  it("floors a fractional value", () => {
    expect(numberToHex(255.9, 1)).toBe("ff");
  });

  it("never goes negative", () => {
    expect(numberToHex(-5, 2)).toBe("0000");
  });
});
