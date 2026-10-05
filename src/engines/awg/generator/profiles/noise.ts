/**
 * AmneziaWG Architect — WireGuard Noise_IK profile generator.
 */

import type { GeneratorInput } from "../types";
import { rnd, rh, calcPadding, splitPad, getFpRange } from "../utils";

export function mkNoise(input: GeneratorInput, iv: number): string {
  const rcLen = rnd(4, 12);
  const headerB = 148;

  const mtu = input.mtu;
  const extraB =
    (input.useTagRC ? rcLen : 0) +
    (input.useTagC ? 4 : 0) +
    (input.useTagT ? 4 : 0);
  const range = getFpRange(input, "nx");
  const pad = range
    ? calcPadding(headerB, extraB, range, iv, mtu)
    : Math.min(rnd(10, 40) * iv, 200, Math.max(0, mtu - headerB - extraB));

  return (
    `<b 0x01000000${rh(4)}>` +
    `<b 0x${rh(32)}>` +
    `<b 0x${rh(48)}>` +
    `<b 0x${rh(28)}>` +
    `<b 0x${rh(32)}>` +
    (input.useTagR ? splitPad(pad) : "") +
    (input.useTagT ? "<t>" : "") +
    (input.useTagRC ? `<rc ${rcLen}>` : "")
  );
}
