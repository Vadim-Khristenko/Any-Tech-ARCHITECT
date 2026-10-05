/**
 * Does the XRay generator sign its own work?
 *
 * The same sweep that found router mode emitting Jc 3 / Jmin 40 / Jmax 128 to
 * every AmneziaWG user. A value that is identical across two thousand
 * independent generations is not a random value, it is a fingerprint — and a
 * fingerprint shared by every deployment this tool has ever produced is worth
 * more to a censor than any single parameter.
 *
 * Constant-by-design is fine and expected: `protocol: vless` is not a tell.
 * What matters is anything that *could* vary and does not.
 */
import { describe, it, expect } from "bun:test";
import { createDefaults, generateXray } from "@/engines/xray/generate";
import { buildServerInbound, buildClientUris } from "@/engines/xray/render";

/** Every leaf of an object, flattened to dotted paths. */
function leaves(value: unknown, prefix = "", out: Record<string, string> = {}) {
  if (value === null || typeof value !== "object") {
    out[prefix] = JSON.stringify(value);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => leaves(v, `${prefix}[${i}]`, out));
    return out;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    leaves(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

const DRAWS = 600;

describe("the XRay generator does not sign its output", () => {
  const samples = Array.from({ length: DRAWS }, () =>
    leaves(buildServerInbound(generateXray(createDefaults()))),
  );

  it("varies every field that is meant to be secret or unique", () => {
    const first = samples[0]!;
    const constant = Object.keys(first).filter((k) =>
      samples.every((s) => s[k] === first[k]),
    );

    // These carry key material, identities or per-deployment randomness. Any
    // of them repeating across deployments is a defect, not a style choice.
    const mustVary = constant.filter((k) =>
      /id|privateKey|publicKey|shortIds|password|seed|uuid|path/i.test(k),
    );
    expect(mustVary, `constant across ${DRAWS} draws`).toEqual([]);
  });

  it("issues distinct client identities every time", () => {
    // With no address there is no client URI to build, and a sweep over two
    // hundred empty strings finds one unique value and proves nothing. The
    // first version of this test did exactly that.
    const withAddress = { ...createDefaults(), address: "203.0.113.10" };
    const ids = new Set(
      Array.from({ length: 200 }, () => buildClientUris(generateXray(withAddress))[0]),
    );
    expect(ids.size).toBe(200);
  });

  it("issues shortIds of the requested shape, all different", () => {
    for (let i = 0; i < 100; i++) {
      const cfg = generateXray({ ...createDefaults(), shortIdCount: 4, shortIdLength: 8 });
      const inbound = buildServerInbound(cfg) as any;
      const ids: string[] = inbound.streamSettings.realitySettings.shortIds;
      expect(ids).toHaveLength(4);
      expect(new Set(ids).size, `draw ${i}`).toBe(4);
      for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}$/);
    }
  });
});
