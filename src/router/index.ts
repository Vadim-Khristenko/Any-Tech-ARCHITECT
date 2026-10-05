/**
 * Vue Router — SPA navigation for AmneziaWG Architect.
 *
 * Routes (Russian at the root, English under /en):
 *   /            → LandingView   (the landing)
 *   /amneziawg   → AmneziaWgView (the AmneziaWG generator)
 *   /xray        → XrayView      (XRay, in progress)
 *   /mergekeys   → MergeKeysView (MergeKeys tool)
 *   /simulator   → SimulatorView (Packet simulator)
 *   /about       → AboutView     (About page)
 *   /faq         → FaqView       (FAQ)
 *   /vaiexia     → VaiexiaView   (VAIEXIA announcement)
 *   /iaa         → redirect to /vaiexia (the page it replaced)
 *
 * The default locale deliberately keeps the bare paths. Everything already
 * indexed against `/about` stays valid, and only the added English tree needs
 * to be crawled fresh.
 *
 * Uses HTML5 history mode for clean URLs. For static hosting, index.html is
 * copied to 404.html at build time so deep links resolve to the SPA.
 *
 * Page metadata lives in `@/i18n/seo` and is applied — together with the
 * canonical link and hreflang alternates — by the afterEach hook below.
 */

import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_META,
  applyLocaleFromRoute,
  isLocale,
  type Locale,
} from "@/i18n";
import { seoFor } from "@/i18n/seo";

/* ── Extended route meta typing ──────────────────────────────────────────── */

declare module "vue-router" {
  interface RouteMeta {
    /** Locale this record serves; drives catalog loading and <html lang>. */
    locale?: Locale;
    /** Locale-independent name used to look up SEO copy. */
    seoKey?: string;
  }
}

/* ── Base route definitions (bare paths, no locale prefix) ───────────────── */

/**
 * `component` is typed as a concrete lazy loader rather than
 * `RouteRecordRaw["component"]`, which admits undefined and so lets the
 * generated record match the redirect arm of the RouteRecordRaw union.
 */
interface BaseRoute {
  path: string;
  name: string;
  component: () => Promise<unknown>;
}

const BASE_ROUTES: BaseRoute[] = [
  // The root is the landing. The generator moved to a path of its own when a
  // second engine arrived: "/" had been one of the two tools, which left the
  // other one looking like a subpage of it.
  {
    path: "/",
    name: "home",
    component: () => import("@/views/LandingView.vue"),
  },
  {
    path: "/amneziawg",
    name: "amneziawg",
    component: () => import("@/views/AmneziaWgView.vue"),
  },
  {
    path: "/xray",
    name: "xray",
    component: () => import("@/views/XrayView.vue"),
  },
  {
    path: "/mergekeys",
    name: "mergekeys",
    component: () => import("@/views/MergeKeysView.vue"),
  },
  {
    path: "/simulator",
    name: "simulator",
    component: () => import("@/views/SimulatorView.vue"),
  },
  {
    path: "/about",
    name: "about",
    component: () => import("@/views/AboutView.vue"),
  },
  { path: "/faq", name: "faq", component: () => import("@/views/FaqView.vue") },
  {
    path: "/vaiexia",
    name: "vaiexia",
    component: () => import("@/views/VaiexiaView.vue"),
  },
];

/**
 * Fetch every route's chunk once the app has settled.
 *
 * Each view is its own chunk, which is the right call for the first paint and
 * the wrong one for the second click: nothing is on disk until you ask for the
 * page, so every tab switch paid a round trip before it could render. The five
 * views together are smaller than the validator bundle the generator already
 * loads, so warming them while the browser is idle costs nothing anyone can
 * feel and makes the rest of the session immediate.
 *
 * Failures are swallowed deliberately. This is a speculative fetch; if it does
 * not arrive, the navigation will ask for it again in the normal way.
 */
export function prefetchRoutes(): void {
  const warm = () => {
    for (const route of BASE_ROUTES) void route.component().catch(() => {});
  };

  // Read off the object rather than testing with `in`: the DOM lib this build
  // targets has no `requestIdleCallback`, so `in` narrows the else branch to
  // `never` and `setTimeout` stops existing.
  const idle = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }
  ).requestIdleCallback;

  if (idle) idle(warm, { timeout: 4000 });
  else window.setTimeout(warm, 1500);
}

/** Build the concrete records for one locale. */
function routesForLocale(loc: Locale): RouteRecordRaw[] {
  const prefix = LOCALE_META[loc].prefix;

  return BASE_ROUTES.map(
    ({ path, name, component }): RouteRecordRaw => ({
      // "/" under a prefix must not become "/en/", which would not match.
      path: prefix ? (path === "/" ? prefix : `${prefix}${path}`) : path,
      name: loc === DEFAULT_LOCALE ? name : `${loc}-${name}`,
      component,
      meta: { locale: loc, seoKey: name },
    }),
  );
}

const routes: RouteRecordRaw[] = [
  ...LOCALES.flatMap(routesForLocale),

  // The IAA page was replaced by VAIEXIA. Redirect rather than 404 so old
  // links and any existing index entries land somewhere meaningful.
  { path: "/iaa", redirect: { name: "vaiexia" } },
  { path: "/en/iaa", redirect: { name: "en-vaiexia" } },

  // Catch-all 404, per locale so the shell stays in the right language.
  {
    path: "/en/:pathMatch(.*)*",
    name: "en-not-found",
    component: () => import("@/views/NotFoundView.vue"),
    meta: { locale: "en", seoKey: "not-found" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("@/views/NotFoundView.vue"),
    meta: { locale: DEFAULT_LOCALE, seoKey: "not-found" },
  },
];

/* ── Router instance ─────────────────────────────────────────────────────── */

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: "smooth" };
    return { top: 0 };
  },
});

/* ── Locale activation ───────────────────────────────────────────────────── */

/**
 * Load the target catalog before the view renders, so a language switch never
 * paints a frame of half-translated UI.
 */
router.beforeEach(async (to) => {
  const loc = isLocale(to.meta.locale) ? to.meta.locale : DEFAULT_LOCALE;
  await applyLocaleFromRoute(loc);
});

/* ── <head> synchronisation ──────────────────────────────────────────────── */

function setMeta(
  name: string,
  content: string,
  attr: "name" | "property" = "name",
): void {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** Absolute URL for a path, respecting the deploy base. */
function absoluteUrl(path: string): string {
  const base = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(path.replace(/^\//, ""), base).toString();
}

function setLink(rel: string, href: string, hreflang?: string): void {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    if (hreflang) el.setAttribute("hreflang", hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

router.afterEach((to) => {
  const loc = isLocale(to.meta.locale) ? to.meta.locale : DEFAULT_LOCALE;
  const seoKey = to.meta.seoKey ?? "home";
  const seo = seoFor(seoKey, loc);

  document.title = seo.title;
  setMeta("description", seo.description);
  if (seo.keywords) setMeta("keywords", seo.keywords);

  setMeta("og:title", seo.ogTitle, "property");
  setMeta("og:description", seo.ogDescription, "property");
  setMeta("og:image", absoluteUrl(`assets/${seo.ogImage}`), "property");
  setMeta("og:locale", LOCALE_META[loc].tag.replace("-", "_"), "property");
  setMeta("og:url", absoluteUrl(to.path), "property");

  setMeta("twitter:card", "summary_large_image");
  setMeta("twitter:title", seo.ogTitle);
  setMeta("twitter:description", seo.ogDescription);
  setMeta("twitter:image", absoluteUrl(`assets/${seo.ogImage}`));

  // Canonical points at the current locale's own URL; alternates advertise the
  // rest of the tree so engines serve the right language per visitor.
  setLink("canonical", absoluteUrl(to.path));

  const barePath =
    loc === DEFAULT_LOCALE
      ? to.path
      : to.path.slice(LOCALE_META[loc].prefix.length) || "/";

  for (const alt of LOCALES) {
    const prefix = LOCALE_META[alt].prefix;
    const altPath = prefix
      ? barePath === "/"
        ? prefix
        : `${prefix}${barePath}`
      : barePath;
    setLink("alternate", absoluteUrl(altPath), LOCALE_META[alt].tag);
  }
  setLink("alternate", absoluteUrl(barePath), "x-default");
});

export default router;
