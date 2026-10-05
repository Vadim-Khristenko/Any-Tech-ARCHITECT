/**
 * The lite build: one self-contained HTML file.
 *
 *   bun run build:lite      -> dist-lite/index.html
 *
 * A config of its own, like the styleguide's, so nothing here can reach the
 * main build. It differs from it in three ways:
 *
 *   - `@/shared/domains` and `@/i18n` resolve to `src/lite/`, which answer the
 *     same calls from data prepared at build time (scripts/lite/prepare.ts)
 *     instead of the 818 KB domain database and the reactive catalogues.
 *   - The page is plain TypeScript, so there is no Vue in the bundle.
 *   - The script and the stylesheet are written into the HTML, so the result
 *     is a single file that opens from disk with no network at all.
 */

import { defineConfig, type Plugin } from "vite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "src");
const pkg = JSON.parse(fs.readFileSync(path.resolve(here, "package.json"), "utf8")) as {
  version: string;
};

/** Move every emitted script and stylesheet into the HTML, then drop them. */
function singleFile(): Plugin {
  return {
    name: "lite-single-file",
    enforce: "post",
    generateBundle(_options, bundle) {
      const html = Object.values(bundle).find(
        (f) => f.type === "asset" && f.fileName.endsWith(".html"),
      );
      if (!html || html.type !== "asset") return;
      let page = String(html.source);

      for (const [name, file] of Object.entries(bundle)) {
        if (file.type === "chunk" && file.isEntry) {
          const tag = new RegExp(`<script[^>]*src="[^"]*${escape(file.fileName)}"[^>]*></script>`);
          // `</script` inside the code would end the element early.
          const code = file.code.replace(/<\/script/gi, "<\\/script");
          page = page.replace(tag, () => `<script type="module">${code}</script>`);
          delete bundle[name];
        } else if (file.type === "asset" && file.fileName.endsWith(".css")) {
          const tag = new RegExp(`<link[^>]*href="[^"]*${escape(file.fileName)}"[^>]*>`);
          page = page.replace(tag, () => `<style>${String(file.source)}</style>`);
          delete bundle[name];
        }
      }
      html.source = page;
    },
  };
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default defineConfig({
  root: path.resolve(src, "lite"),
  base: "./",
  plugins: [singleFile()],
  resolve: {
    alias: [
      { find: /^@\/shared\/domains$/, replacement: path.resolve(src, "lite/domains.ts") },
      { find: /^@\/i18n$/, replacement: path.resolve(src, "lite/i18n.ts") },
      { find: "@", replacement: src },
    ],
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: path.resolve(here, "dist-lite"),
    emptyOutDir: true,
    target: "es2020",
    modulePreload: false,
    cssCodeSplit: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    reportCompressedSize: true,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
