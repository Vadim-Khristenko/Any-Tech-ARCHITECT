import { describe, it, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";

/**
 * The tree only means something if the arrows point one way.
 *
 * `types` describes, `shared` serves both engines, `engines` implement, and
 * `utils` holds what is about neither protocol. Each may reach downwards and
 * never up — otherwise "shared" is just another word for "wherever it landed",
 * which is what this reorganisation was undoing.
 *
 * Tests are exempt on purpose. A test that checks the shared fingerprint
 * registry still matches the AmneziaWG table has to see both sides; that is
 * the test doing its job, not a layering violation.
 */

const SRC = path.join(process.cwd(), "src");

/** What each layer is allowed to import from. Order is meaningful. */
const ALLOWED: Record<string, string[]> = {
  // The vocabulary. Depends on nothing of ours.
  types: [],
  // Utilities about neither protocol.
  utils: ["utils", "i18n"],
  // What both engines need.
  shared: ["shared", "types", "utils", "i18n"],
  // Implementations. May use everything below them.
  engines: ["engines", "shared", "types", "utils", "i18n"],
};

// Digits matter: without them `@/i18n` reads as `@/i`.
const IMPORT = /from\s+"@\/([a-z][a-zA-Z0-9]*)/g;

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Tests may look in any direction; they exist to compare layers.
      if (entry.name === "__tests__") continue;
      walk(p, out);
    } else if (/\.(ts|vue)$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

describe("layer dependencies point one way", () => {
  for (const [layer, allowed] of Object.entries(ALLOWED)) {
    it(`${layer} imports only from ${allowed.join(", ") || "nothing"}`, () => {
      const violations: string[] = [];

      for (const file of walk(path.join(SRC, layer))) {
        const source = fs.readFileSync(file, "utf8");
        const rel = path.relative(SRC, file).replace(/\\/g, "/");
        for (const match of source.matchAll(IMPORT)) {
          const target = match[1];
          if (allowed.includes(target)) continue;
          violations.push(`${rel} → @/${target}`);
        }
      }

      expect([...new Set(violations)]).toEqual([]);
    });
  }

  it("keeps the type layer free of runtime dependencies of ours", () => {
    // types/ may import from vue for a component type and nothing else.
    for (const file of walk(path.join(SRC, "types"))) {
      const source = fs.readFileSync(file, "utf8");
      const externals = [...source.matchAll(/from\s+"([^".][^"]*)"/g)].map(
        (m) => m[1],
      );
      for (const dep of externals) {
        expect(["vue"], path.basename(file)).toContain(dep);
      }
    }
  });
});

describe("engines do not reach into each other", () => {
  const ENGINES = ["awg", "xray"];

  for (const engine of ENGINES) {
    it(`${engine} imports no other engine`, () => {
      const others = ENGINES.filter((e) => e !== engine);
      const violations: string[] = [];

      for (const file of walk(path.join(SRC, "engines", engine))) {
        const source = fs.readFileSync(file, "utf8");
        for (const other of others) {
          if (source.includes(`@/engines/${other}`)) {
            violations.push(
              `${path.relative(SRC, file).replace(/\\/g, "/")} → ${other}`,
            );
          }
        }
      }

      // Two protocols with nothing in common should share code through
      // `shared`, never by one importing the other.
      expect(violations).toEqual([]);
    });
  }
});
