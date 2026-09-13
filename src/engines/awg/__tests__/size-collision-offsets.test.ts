/**
 * The three ways two handshake messages can come out the same length.
 *
 * A padded message is its base size plus its own S value, so a collision is a
 * fixed difference between two S values:
 *
 *   148 + S1 === 92 + S2   →   S2 === S1 + 56
 *   148 + S1 === 64 + S3   →   S3 === S1 + 84
 *    92 + S2 === 64 + S3   →   S3 === S2 + 28
 *
 * Two of those three were written as `S1 + 56` and `S2 + 92` — the second
 * offset duplicated from the first rule, the third being the response's own
 * size rather than a difference. The tool therefore warned about a pair that
 * can never collide and stayed silent on one that does, in the validator, in
 * the editor rules and in the generator's own avoidance.
 *
 * Both directions are pinned here with the exact values from the report:
 * @bivlked, issue #7, who found it while checking this generator against the
 * bash installer they maintain.
 */

import { describe, it, expect } from "bun:test";
import { validateSizes } from "@/engines/awg/generator/validators";
import { checkAwgParams } from "@/engines/awg/rules";
import type { AWGConfig } from "@/engines/awg/generator";
import {
  WG_MESSAGE_SIZE,
  INIT_TO_RESPONSE,
  INIT_TO_COOKIE,
  RESPONSE_TO_COOKIE,
} from "@/engines/awg/messageSizes";

/** Only the S values matter here; the rest of the config is inert. */
function cfgWith(s1: number, s2: number, s3: number): AWGConfig {
  return { s1, s2, s3, s4: 16 } as AWGConfig;
}

const collisions = <T extends { code: string }>(findings: T[]) =>
  findings.filter((f) => f.code === "awg.size_collision");

describe("the offsets are differences of message sizes", () => {
  it("derives all three from 148 / 92 / 64", () => {
    expect(WG_MESSAGE_SIZE).toEqual({ init: 148, response: 92, cookie: 64 });
    expect(INIT_TO_RESPONSE).toBe(56);
    expect(INIT_TO_COOKIE).toBe(84);
    expect(RESPONSE_TO_COOKIE).toBe(28);
  });
});

describe("collisions that used to pass silently", () => {
  /* Response 92 + 20 = 112, cookie 64 + 48 = 112 — the same length. */
  it("catches S1 30, S2 20, S3 48 in the generated-config validator", () => {
    const found = collisions(validateSizes(cfgWith(30, 20, 48)));
    expect(found).toHaveLength(1);
    expect(found[0].values).toEqual({ a: "S2", b: "S3" });
  });

  it("catches the same values in the editor rules", () => {
    const found = collisions(checkAwgParams({ S1: 30, S2: 20, S3: 48 }));
    expect(found).toHaveLength(1);
  });

  /* Init 148 + 10 = 158, cookie 64 + 94 = 158. */
  it("catches an init/cookie collision at S1 10, S3 94", () => {
    const found = collisions(validateSizes(cfgWith(10, 200, 94)));
    expect(found).toHaveLength(1);
    expect(found[0].values).toEqual({ a: "S1", b: "S3" });
  });
});

describe("warnings that used to fire on nothing", () => {
  /* Init 168, response 132, cookie 140 — all three differ. */
  it("stays quiet on S1 20, S2 40, S3 76", () => {
    expect(collisions(validateSizes(cfgWith(20, 40, 76)))).toEqual([]);
    expect(collisions(checkAwgParams({ S1: 20, S2: 40, S3: 76 }))).toEqual([]);
  });

  /* S3 = S2 + 92 was the old rule; it is 64 bytes short of a collision. */
  it("stays quiet when S3 is S2 + 92", () => {
    expect(collisions(validateSizes(cfgWith(200, 30, 122)))).toEqual([]);
  });
});

describe("every collision, and only a collision", () => {
  it("agrees with comparing the padded lengths directly", () => {
    const { init, response, cookie } = WG_MESSAGE_SIZE;

    for (let s1 = 1; s1 <= 120; s1 += 7) {
      for (let s2 = 1; s2 <= 120; s2 += 5) {
        for (let s3 = 1; s3 <= 120; s3 += 3) {
          const expected =
            (init + s1 === response + s2 ? 1 : 0) +
            (init + s1 === cookie + s3 ? 1 : 0) +
            (response + s2 === cookie + s3 ? 1 : 0);

          expect(collisions(validateSizes(cfgWith(s1, s2, s3)))).toHaveLength(
            expected,
          );
        }
      }
    }
  });
});
