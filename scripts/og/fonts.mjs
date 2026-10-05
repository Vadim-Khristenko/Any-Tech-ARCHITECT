/**
 * Font acquisition for the OG image generator.
 *
 * resvg reads TTF/OTF, not the woff2 files @fontsource ships, so the upstream
 * TTFs are fetched once and cached in `scripts/og/.fonts` (gitignored). This
 * mirrors what the original Python generator did.
 */

import fs from "node:fs";
import path from "node:path";

const CACHE_DIR = path.join(import.meta.dirname, ".fonts");

const FONTS = {
  "unbounded.ttf":
    "https://github.com/google/fonts/raw/main/ofl/unbounded/Unbounded%5Bwght%5D.ttf",
  "manrope.ttf":
    "https://github.com/google/fonts/raw/main/ofl/manrope/Manrope%5Bwght%5D.ttf",
  "jetbrains-mono.ttf":
    "https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-Bold.ttf",
};

/** Download the fonts if needed and return absolute paths for resvg. */
export async function ensureFonts() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const paths = [];
  for (const [name, url] of Object.entries(FONTS)) {
    const dest = path.join(CACHE_DIR, name);
    if (!fs.existsSync(dest)) {
      process.stdout.write(`  fetching ${name}… `);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`failed to fetch ${name}: HTTP ${res.status}`);
      }
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      console.log("done");
    }
    paths.push(dest);
  }
  return paths;
}

export const FAMILY = {
  display: "Unbounded",
  body: "Manrope",
  mono: "JetBrains Mono",
};
