/**
 * Run any package script with the mirror flag set.
 *
 * `bun run dev:mirror` and `bun run build:mirror` both land here. The flag
 * has to be in the environment before Vite starts — Vite bakes
 * `import.meta.env.VITE_SITE_MIRROR` into the bundle at build time, and the
 * banner plus the noindex tags key off that constant. Setting it here rather
 * than inline in the package.json script keeps the commands cross-platform:
 * `VITE_SITE_MIRROR=1 vite build` is POSIX shell syntax and dies on cmd.exe.
 *
 * Usage: bun scripts/run-mirror.ts [dev|build]
 */

process.env.VITE_SITE_MIRROR = "1";

const [, , command = "dev"] = process.argv;
const script = command === "build" ? "build" : "dev";

const { spawnSync } = await import("node:child_process");

console.log(`[mirror] VITE_SITE_MIRROR=1 → bun run ${script}`);

const result = spawnSync("bun", ["run", script], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
