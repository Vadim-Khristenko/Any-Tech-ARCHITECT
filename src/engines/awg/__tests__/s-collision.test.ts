/**
 * Breaking a length collision must not break a ceiling.
 *
 * Two handshake messages that end up the same length defeat the point of the
 * padding, so the generator steps one of them off the other. It used to step
 * only upwards, which is fine everywhere except the top of the range: S1 94
 * with S2 150 came out as S2 151, and S1 8 with S3 64 came out as S3 65 — past
 * caps the draw itself had honoured, and past what some clients accept.
 *
 * These cases are rare — one draw in twenty-two thousand — so the sweep tests
 * over generated configs saw them roughly once a hundred runs and read as
 * flaky. They are pinned directly here instead.
 */

import { describe, it, expect } from "bun:test";
import { avoidCollision } from "@/engines/awg/generator";

const INIT_TO_RESPONSE = 56;
const RESPONSE_TO_COOKIE = 92;
const S_MAX = 150;
const S3_MAX = 64;

describe("avoidCollision", () => {
  it("leaves a value that does not collide alone", () => {
    expect(avoidCollision(100, S_MAX, (v) => v === 42)).toBe(100);
  });

  it("steps up when there is room above", () => {
    expect(avoidCollision(100, S_MAX, (v) => v === 100)).toBe(101);
  });

  it("steps down at the ceiling rather than over it", () => {
    expect(avoidCollision(S_MAX, S_MAX, (v) => v === S_MAX)).toBe(149);
  });

  it("keeps stepping while the new value collides too", () => {
    const bad = new Set([64, 63]);
    expect(avoidCollision(64, S3_MAX, (v) => bad.has(v))).toBe(62);
  });

  it("never leaves the range, whichever way it steps", () => {
    for (let value = 1; value <= S_MAX; value++) {
      const out = avoidCollision(value, S_MAX, (v) => v === value);
      expect(out).toBeGreaterThanOrEqual(1);
      expect(out).toBeLessThanOrEqual(S_MAX);
      expect(out).not.toBe(value);
    }
  });
});

describe("the shapes that used to overshoot", () => {
  it("S2 sitting on 150 against S1 94 stays inside the range", () => {
    const s1 = 94;
    const s2 = avoidCollision(S_MAX, S_MAX, (v) => v === s1 + INIT_TO_RESPONSE);
    expect(s2).toBeLessThanOrEqual(S_MAX);
    expect(s2).not.toBe(s1 + INIT_TO_RESPONSE);
  });

  it("S3 sitting on 64 against S1 8 stays inside the range", () => {
    const s1 = 8;
    const s2 = 200;
    const s3 = avoidCollision(
      S3_MAX,
      S3_MAX,
      (v) => v === s1 + INIT_TO_RESPONSE || v === s2 + RESPONSE_TO_COOKIE,
    );
    expect(s3).toBeLessThanOrEqual(S3_MAX);
    expect(s3).not.toBe(s1 + INIT_TO_RESPONSE);
  });

  /*
   * Every collision the rule can see, at every position in the range. The
   * relation is fixed — S2 collides with S1 + 56 and nothing else — so this is
   * the whole space, not a sample of it.
   */
  it("holds for every S1 that can collide with an S2", () => {
    for (let s1 = 1; s1 + INIT_TO_RESPONSE <= S_MAX; s1++) {
      const s2 = avoidCollision(
        s1 + INIT_TO_RESPONSE,
        S_MAX,
        (v) => v === s1 + INIT_TO_RESPONSE,
      );
      expect(s2).toBeGreaterThanOrEqual(1);
      expect(s2).toBeLessThanOrEqual(S_MAX);
      expect(s2).not.toBe(s1 + INIT_TO_RESPONSE);
    }
  });
});
