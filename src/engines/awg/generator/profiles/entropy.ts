/**
 * AmneziaWG Architect — entropy packet generator (I2–I5).
 */

import type { GeneratorInput } from "../types";
import { rnd, rh, splitPad } from "../utils";

export function mkEntropy(input: GeneratorInput, idx: number, iv: number): string {
  const mtu = input.mtu;

  const isBig = rnd(1, 10) > 6;
  const baseLen = isBig ? rnd(200, 500) : rnd(4, 20);
  const rLen = Math.min(
    baseLen * iv,
    isBig ? 500 : 60,
    Math.max(0, mtu - 20 - (input.useTagC ? 4 : 0) - (input.useTagT ? 4 : 0)),
  );

  const rcLen = rnd(4, 12);
  const rdLen = rnd(4, 8);

  const c = input.useTagC ? "<c>" : "";
  const t = input.useTagT ? "<t>" : "";
  const r = input.useTagR ? splitPad(rLen) : "";
  const rc = input.useTagRC ? `<rc ${rcLen}>` : "";
  const rd = input.useTagRD ? `<rd ${rdLen}>` : "";
  const b = iv >= 2 ? `<b 0x${rh(rnd(4, 8 * iv))}>` : "";
  const b2 = iv >= 3 ? `<b 0x${rh(rnd(2, 4))}>` : "";

  const patterns = [
    b + r + t + rc + c + rd,
    c + t + b + r + rc + rd,
    rc + b + r + c + t + rd,
    t + r + c + rc + b + rd,
    r + rc + b + t + c + rd,
    b2 + t + r + b + rc + c + rd,
    rd + b + rc + r + t + c + b2,
    c + b + b2 + t + rc + r + rd,
  ];

  const result = patterns[(idx + rnd(0, patterns.length - 1)) % patterns.length];
  return result || "<r 10>";
}
