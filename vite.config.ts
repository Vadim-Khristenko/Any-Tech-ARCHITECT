// `vitest/config` re-exports Vite's defineConfig with the `test` key typed, so
// the Vitest options below actually reach the runner instead of being dropped.
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { ROUTE_SEO } from "./src/i18n/seo";
import { DEFAULT_LOCALE } from "./src/i18n/types";
import path from "node:path";
import fs from "node:fs";
import type { Plugin } from "vite";
import { fileURLToPath } from "node:url";

// ESM-compatible __dirname for use in functions
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RouteStub {
  slug: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
}

/**
 * Pre-rendered stubs, derived from the same SEO table the router uses so the
 * two can never drift. One per route per locale: Russian at the bare path,
 * English under /en.
 *
 * Crawlers that do not execute JavaScript read these; the SPA takes over for
 * everyone else.
 */
const STUB_ROUTES = [
  { name: "home", path: "" },
  { name: "amneziawg", path: "amneziawg" },
  { name: "xray", path: "xray" },
  { name: "mergekeys", path: "mergekeys" },
  { name: "simulator", path: "simulator" },
  { name: "about", path: "about" },
  { name: "faq", path: "faq" },
  { name: "vaiexia", path: "vaiexia" },
] as const;

const STUB_LOCALES = ["ru", "en"] as const;

/*
 * Mirror builds (`VITE_SITE_MIRROR=1`, see scripts/run-mirror.ts) are meant
 * for a hosting bucket behind the main site. They carry the mirror banner and
 * ask crawlers to keep the copy out of the index: duplicate content would
 * only split the ranking the main origin earned.
 */
const SITE_MIRROR = process.env.VITE_SITE_MIRROR === "1";

const ROUTE_STUBS: RouteStub[] = STUB_LOCALES.flatMap((loc) =>
  STUB_ROUTES.filter(
    // The site root is index.html itself, not a stub directory.
    (r) => !(loc === "ru" && r.path === ""),
  ).map((r) => {
    // Metadata falls back to the source locale, same as the runtime does:
    // a locale that is only half translated still gets complete <head> tags
    // rather than failing the build.
    const table = ROUTE_SEO[r.name];
    const seo = table[loc] ?? table[DEFAULT_LOCALE];
    const prefix = loc === "ru" ? "" : "en";
    return {
      slug: [prefix, r.path].filter(Boolean).join("/"),
      title: seo.title,
      description: seo.description,
      ogTitle: seo.ogTitle,
      ogDescription: seo.ogDescription,
      ogImage: seo.ogImage,
    };
  }),
);

export type HostPlatform = "github" | "gitlab" | "cloudflare" | "generic";

export function detectHostPlatform(): HostPlatform {
  const platform = (
    process.env.VITE_DEPLOY_PLATFORM ||
    process.env.DEPLOY_PLATFORM ||
    (process.env.GITHUB_ACTIONS && "github") ||
    (process.env.GITLAB_CI && "gitlab") ||
    (process.env.CF_PAGES && "cloudflare") ||
    "generic"
  )
    .toString()
    .toLowerCase();

  if (platform.includes("gitlab")) return "gitlab";
  if (platform.includes("cloudflare") || platform.includes("cf"))
    return "cloudflare";
  if (platform.includes("github")) return "github";
  return "generic";
}

export function normalizeBase(input?: string | null): string {
  if (!input) return "/";
  let base = input.trim();

  if (base === "." || base === "./") return "./";

  if (base === "/") return "/";

  base = base.replace(/\\/g, "/");
  if (!base.startsWith("/")) base = `/${base}`;
  if (!base.endsWith("/")) base += "/";

  return base;
}

export function inferBase(): string {
  const explicit =
    process.env.VITE_BASE ||
    process.env.BASE_URL ||
    process.env.ASSET_BASE ||
    process.env.PUBLIC_URL;

  if (explicit) return normalizeBase(explicit);

  const platform = detectHostPlatform();

  if (platform === "cloudflare") {
    return "/";
  }

  if (platform === "github") {
    // Для кастомных доменов (architect.vai-rice.space) используем корень
    // Проверка через VITE_USE_CUSTOM_DOMAIN или наличие CNAME файла
    const useCustomDomain = process.env.VITE_USE_CUSTOM_DOMAIN === "true";
    const hasCname = fs.existsSync(path.resolve(__dirname, "public", "CNAME"));

    if (useCustomDomain || hasCname) {
      return "/";
    }

    // Для github.io страниц используем /repo-name/
    const repo = process.env.GITHUB_REPOSITORY;
    if (repo) {
      const [, name] = repo.split("/");
      if (name) {
        return `/${name}/`;
      }
    }
    return "/";
  }

  if (platform === "gitlab") {
    const pagesUrl = process.env.CI_PAGES_URL;
    if (pagesUrl) {
      try {
        const urlObj = new URL(pagesUrl);
        return normalizeBase(urlObj.pathname);
      } catch (e) {}
    }
    return "/";
  }

  return "./";
}

export function inferSiteOrigin(): string {
  const explicit =
    process.env.VITE_SITE_ORIGIN ||
    process.env.SITE_ORIGIN ||
    process.env.VITE_PUBLIC_SITE_URL ||
    process.env.PUBLIC_SITE_URL;

  if (explicit) return explicit.replace(/\/+$/, "");

  // Для кастомных доменов GitHub Pages
  const useCustomDomain = process.env.VITE_USE_CUSTOM_DOMAIN === "true";
  const hasCname = fs.existsSync(path.resolve(__dirname, "public", "CNAME"));

  if (useCustomDomain || hasCname) {
    // Читаем домен из CNAME файла если есть
    if (hasCname) {
      try {
        const cname = fs.readFileSync(path.resolve(__dirname, "public", "CNAME"), "utf-8").trim();
        if (cname) return `https://${cname}`;
      } catch (e) {}
    }
    // Fallback на стандартный кастомный домен
    return "https://architect.vai-rice.space";
  }

  const repo = process.env.GITHUB_REPOSITORY;
  if (repo && process.env.GITHUB_ACTIONS) {
    const [owner, name] = repo.split("/");
    if (owner && name) {
      return `https://${owner.toLowerCase()}.github.io/${name}`;
    }
  }

  const gitlabProject = process.env.CI_PROJECT_PATH;
  const gitlabUrl = process.env.CI_PAGES_URL || process.env.PAGES_URL;
  if (gitlabUrl) return gitlabUrl.replace(/\/+$/, "");
  if (gitlabProject && process.env.CI_SERVER_HOST) {
    return `https://${process.env.CI_SERVER_HOST}/${gitlabProject}`;
  }

  const cfUrl =
    process.env.CF_PAGES_URL ||
    process.env.CLOUDFLARE_PAGES_URL ||
    process.env.PAGES_URL;
  if (cfUrl) return cfUrl.replace(/\/+$/, "");

  return "";
}

export function makeAbsoluteUrl(
  siteOrigin: string,
  base: string,
  assetPath: string,
): string {
  const cleanAsset = assetPath.replace(/^\.?\//, "");
  if (!siteOrigin) {
    return `${base}${cleanAsset}`.replace(/\/{2,}/g, "/").replace(":/", "://");
  }
  return new URL(
    cleanAsset,
    siteOrigin.endsWith("/") ? siteOrigin : `${siteOrigin}/`,
  ).toString();
}

export function buildStubHtml(
  template: string,
  route: RouteStub,
  siteOrigin: string,
  base: string,
): string {
  const absImage = makeAbsoluteUrl(siteOrigin, base, `assets/${route.ogImage}`);

  let html = template;

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`);

  html = html.replace(
    /(<meta\s+name="description"\s+content=")[^"]*(")/,
    `$1${route.description}$2`,
  );

  if (html.includes('property="og:title"')) {
    html = html.replace(
      /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
      `$1${route.ogTitle}$2`,
    );
  }

  if (html.includes('property="og:description"')) {
    html = html.replace(
      /(<meta\s+property="og:description"\s+content=")[^"]*(")/,
      `$1${route.ogDescription}$2`,
    );
  }

  if (html.includes('property="og:image"')) {
    html = html.replace(
      /(<meta\s+property="og:image"\s+content=")[^"]*(")/,
      `$1${absImage}$2`,
    );
  }

  if (html.includes('name="robots"')) {
    html = html.replace(
      /(<meta\s+name="robots"\s+content=")[^"]*(")/,
      `$1${SITE_MIRROR ? "noindex,follow" : "index,follow"}$2`,
    );
  } else {
    html = html.replace(
      /<\/title>/,
      `</title>\n    <meta name="robots" content="${
        SITE_MIRROR ? "noindex,follow" : "index,follow"
      }" />`,
    );
  }

  return html;
}

function createSpaFallbackPlugin(): Plugin {
  return {
    name: "amneziawg-architect-spa-fallback",
    enforce: "post",
    closeBundle() {
      const outDir = path.resolve(__dirname, "dist");
      const indexPath = path.join(outDir, "index.html");
      if (!fs.existsSync(indexPath)) return;

      const rawIndex = fs.readFileSync(indexPath, "utf-8");
      const base = inferBase();
      const siteOrigin = inferSiteOrigin();
      const isRelativeBase = base === "./";
      const effectiveBase = isRelativeBase ? "/" : base;

      /*
       * A mirror asks every crawler out of its index, including for the root
       * document itself: the stubs carry their own robots tag from
       * buildStubHtml, but index.html is served as-is and 404.html / 200.html
       * are copies of it.
       */
      let pageIndex = rawIndex;
      if (SITE_MIRROR && !pageIndex.includes('name="robots"')) {
        pageIndex = pageIndex.replace(
          /<\/title>/,
          `</title>\n    <meta name="robots" content="noindex,follow" />`,
        );
        fs.writeFileSync(indexPath, pageIndex, "utf-8");
      }

      for (const route of ROUTE_STUBS) {
        const stubDir = path.join(outDir, route.slug);
        const stubIndex = path.join(stubDir, "index.html");

        fs.mkdirSync(stubDir, { recursive: true });
        fs.writeFileSync(
          stubIndex,
          buildStubHtml(rawIndex, route, siteOrigin, effectiveBase),
          "utf-8",
        );
      }

      const cfPages = path.join(outDir, "_redirects");
      const fallback404 = path.join(outDir, "404.html");
      const gitlabPages = path.join(outDir, "200.html");

      const rewriteRules = [
        // The retired IAA page now lives at /vaiexia; keep old links working.
        "/iaa    /vaiexia/index.html   301",
        "/en/iaa    /en/vaiexia/index.html   301",
        ...ROUTE_STUBS.map(
          (r) => `/${r.slug}    /${r.slug}/index.html   200`,
        ),
        "/*    /index.html   200",
      ].join("\n");

      fs.writeFileSync(cfPages, rewriteRules, "utf-8");
      // pageIndex, not rawIndex: a mirror build patched the robots tag into
      // the root document, and these copies have to carry it too.
      fs.writeFileSync(gitlabPages, pageIndex, "utf-8");

      /*
       * sitemap.xml with hreflang alternates.
       *
       * Each URL lists every locale it exists in, which is what lets a search
       * engine serve the right language instead of picking one and treating
       * the other as duplicate content.
       */
      if (siteOrigin) {
        const origin = siteOrigin.replace(/\/$/, "");
        const urlFor = (loc: string, p: string) =>
          `${origin}/${[loc === "ru" ? "" : "en", p].filter(Boolean).join("/")}`;

        const entries = STUB_LOCALES.flatMap((loc) =>
          STUB_ROUTES.map((r) => {
            const alts = STUB_LOCALES.map(
              (alt) =>
                `    <xhtml:link rel="alternate" hreflang="${alt === "ru" ? "ru" : "en"}" href="${urlFor(alt, r.path)}"/>`,
            ).join("\n");
            return [
              "  <url>",
              `    <loc>${urlFor(loc, r.path)}</loc>`,
              alts,
              `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor("ru", r.path)}"/>`,
              `    <changefreq>${r.path === "" ? "weekly" : "monthly"}</changefreq>`,
              `    <priority>${r.path === "" ? "1.0" : "0.8"}</priority>`,
              "  </url>",
            ].join("\n");
          }),
        ).join("\n");

        const sitemap = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
          '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
          entries,
          "</urlset>",
          "",
        ].join("\n");

        fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemap, "utf-8");

        const robots = [
          "User-agent: *",
          "Allow: /",
          "",
          `Sitemap: ${origin}/sitemap.xml`,
          "",
        ].join("\n");
        fs.writeFileSync(path.join(outDir, "robots.txt"), robots, "utf-8");
      }

      // Cloudflare Pages / Netlify _headers — hashed assets are content-addressed
      // and never mutate, so let clients cache them for a year. Recovers the
      // ~357 kB of re-downloaded bytes the perf trace flagged on repeat visits.
      const headersRules = [
        "/assets/*",
        "  Cache-Control: public, max-age=31536000, immutable",
        "/*.js",
        "  Cache-Control: public, max-age=31536000, immutable",
        "/*.css",
        "  Cache-Control: public, max-age=31536000, immutable",
        "/*.woff2",
        "  Cache-Control: public, max-age=31536000, immutable",
        // HTML must stay fresh so new deploys are picked up immediately.
        "/*.html",
        "  Cache-Control: public, max-age=0, must-revalidate",
      ].join("\n");
      fs.writeFileSync(path.join(outDir, "_headers"), headersRules, "utf-8");

      // We no longer write a manual HTML 404 because Vue Router handles it via 200/404 rewrites
      // or the index fallback. If needed by simple hosts, we point 404 to index
      fs.writeFileSync(fallback404, pageIndex, "utf-8");

      if (
        process.env.GITHUB_ACTIONS ||
        process.env.GITLAB_CI ||
        process.env.CF_PAGES
      ) {
        console.log(`[spa] base=${base} siteOrigin=${siteOrigin || "(auto)"}`);
      }
    },
  };
}

function createMultiHostBuildPlugin(): Plugin {
  return {
    name: "amneziawg-architect-multi-host-build",
    configResolved(config) {
      if (config.base && config.base !== "./" && config.base !== "/") return;
    },
  };
}

const base = inferBase();

/**
 * Vitest options.
 *
 * Declared up here and passed into `defineConfig` below — when this lived as a
 * standalone `export const test` after the config object, Vitest never saw it
 * and silently ran on its defaults (wrong `include`, no coverage scoping).
 * It stays exported because the config unit tests assert on it.
 */
export const test = {
  globals: true,
  environment: "node",
  include: ["src/**/__tests__/**/*.test.ts"],
  /**
   * Several suites are property-style: they generate a couple of hundred
   * configs and assert an invariant holds across all of them. Each generation
   * draws from crypto.getRandomValues many times over, so on a loaded machine
   * the 5s default is close enough to the line to produce flakes that look
   * like real failures.
   */
  testTimeout: 20_000,
  /**
   * Git worktrees are often created *inside* the repo (e.g. `.claude/worktrees`
   * by tooling). Without this, their `src/` trees are globbed too and every
   * suite runs twice against two different checkouts — which silently doubles
   * the reported test count and can hide a failure behind a stale copy.
   */
  exclude: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.git/**",
    "**/.claude/**",
    "**/.worktrees/**",
  ],
  coverage: {
    provider: "v8" as const,
    reporter: ["text", "json-summary", "html"],
    include: ["src/utils/**/*.ts"],
    exclude: ["src/utils/__tests__/**"],
  },
};

export default defineConfig({
  test,
  plugins: [vue(), createSpaFallbackPlugin(), createMultiHostBuildPlugin()],
  base,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: "esbuild",
    // Prod source maps shipped 1:1 with the bundle — pure deploy bloat and
    // source exposure. Keep them off for the public build.
    sourcemap: false,
    /**
     * Above the domain database, below anything else.
     *
     * `domains` is ~700 kB of source and 29 kB over the wire: it is a
     * thousand records of near-identical shape, so gzip eats it. It is also
     * not on the critical path — the entry preloads `index`, `vue` and
     * `icons` and nothing else, and the database arrives with whichever
     * generator view asked for it, then sits in cache for a year under the
     * `_headers` rules below.
     *
     * So the default 500 kB was firing on the one chunk where raw size says
     * least, and firing every build teaches you to read past it. Raised to
     * just above that chunk rather than switched off, so a genuinely new
     * heavyweight still trips it.
     */
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        /**
         * Collapse the per-icon chunk waterfall.
         *
         * lucide-vue-next ships every icon as its own ES module, so Vite was
         * emitting a separate network request per icon (zap.js, sparkles.js,
         * shield-check.js, git-merge.js, trash-2.js, triangle-alert.js …) that
         * loaded *after* index.js — adding ~1.2 s to the LCP render delay.
         *
         * Pin all icons into one shared `icons` chunk and the Vue runtime into
         * a `vue` chunk so the critical path is a couple of cached requests,
         * not a dozen round-trips.
         */
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("lucide-vue-next")) return "icons";
          if (
            id.includes("/vue/") ||
            id.includes("/@vue/") ||
            id.includes("/vue-router/")
          ) {
            return "vue";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    open: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
  },
});

