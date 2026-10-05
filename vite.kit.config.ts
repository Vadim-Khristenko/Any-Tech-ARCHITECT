/**
 * The styleguide's own Vite config.
 *
 * A second config rather than a second input to the main one, because the two
 * must not be able to drift into each other: `vite build` reads
 * `vite.config.ts`, whose single entry is the index.html at the repository
 * root, so nothing under `styleguide/` can reach `dist/` by accident. Run it
 * with `bun run kit`.
 *
 * The `@` alias is kept so a primitive can be demonstrated against real
 * project data — the header ranges and packet layout on the page come from
 * what the generator actually produces, not from invented numbers.
 */

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(here, "styleguide"),
  plugins: [vue()],
  resolve: {
    alias: { "@": path.resolve(here, "src") },
  },
  server: { port: 3100 },
  // There is no `build` target on purpose. The styleguide is a thing you look
  // at while working, not an artefact anyone deploys.
});
