/**
 * What VAIEXIA actually consists of, as of a stated day.
 *
 * A page that says "coming soon" and nothing else asks to be believed. This
 * one does not ask: it lists every repository in the organisation, including
 * the six that are still empty, with the size and the date the forge reports.
 * Anyone can open the same page and disagree with it.
 *
 * A snapshot rather than a live query, deliberately. The forge is self-hosted
 * and this site has no server to proxy through, so a fetch from the browser
 * would be a cross-origin request that fails in exactly the places this
 * project's readers live. A number with a date on it beats a spinner that
 * never resolves.
 *
 * Read from https://git.vai-rice.space/api/v1/orgs/VAIEXIA/repos
 */

export const VAIEXIA_ORG = "https://git.vai-rice.space/VAIEXIA";

/** The day the numbers below were read. Shown on the page, not hidden. */
export const SNAPSHOT = "2026-08-05";

export interface VaiexiaRepo {
  name: string;
  /** i18n key stem for the one-line description. */
  key: string;
  /** Has code, as opposed to an initialised-but-empty repository. */
  built: boolean;
  /** What the forge reports, in KB. Zero for the empty ones. */
  size: number;
  /** Last push, ISO date. */
  touched: string;
  /** Where it sits in the stack — drives the section it is listed under. */
  layer: "wire" | "transport" | "contract" | "agent" | "surface" | "tooling";
}

/**
 * Every repository, built and unbuilt alike.
 *
 * Ordered bottom-up through the stack rather than alphabetically or by date,
 * because the interesting fact about this list is where the finished part
 * stops.
 */
export const VAIEXIA_REPOS: VaiexiaRepo[] = [
  {
    name: "vaiexia-wire",
    key: "wire",
    built: true,
    size: 154,
    touched: "2026-07-19",
    layer: "wire",
  },
  {
    name: "vaiexia-obfs",
    key: "obfs",
    built: true,
    size: 231,
    touched: "2026-07-19",
    layer: "transport",
  },
  {
    name: "vaiexia-core",
    key: "core",
    built: true,
    size: 241,
    touched: "2026-07-18",
    layer: "contract",
  },
  {
    name: "vaiexia-server",
    key: "server",
    built: true,
    size: 754,
    touched: "2026-07-23",
    layer: "agent",
  },
  {
    name: "vaiexia-panel",
    key: "panel",
    built: false,
    size: 0,
    touched: "2026-07-17",
    layer: "surface",
  },
  {
    name: "vaiexia-client",
    key: "client",
    built: false,
    size: 0,
    touched: "2026-07-17",
    layer: "surface",
  },
  {
    name: "vaiexia-bot",
    key: "bot",
    built: false,
    size: 0,
    touched: "2026-07-17",
    layer: "surface",
  },
  {
    name: "vaiexia-plugins",
    key: "plugins",
    built: false,
    size: 0,
    touched: "2026-07-17",
    layer: "surface",
  },
  {
    name: "vgit",
    key: "vgit",
    built: true,
    size: 138,
    touched: "2026-07-18",
    layer: "tooling",
  },
  {
    name: "website",
    key: "website",
    built: false,
    size: 0,
    touched: "2026-07-17",
    layer: "tooling",
  },
];

/**
 * The four strata, bottom-up.
 *
 * `crate` names the repository the layer is; `points` are i18n key stems for
 * what is in it. Every claim here comes from that repository's own README —
 * this page does not describe what VAIEXIA intends to be.
 */
export interface VaiexiaLayer {
  key: string;
  crate: string;
  built: boolean;
  points: string[];
}

export const VAIEXIA_STACK: VaiexiaLayer[] = [
  {
    key: "surface",
    crate: "panel · client · bot · plugins",
    built: false,
    points: ["1", "2"],
  },
  {
    key: "agent",
    crate: "vaiexia-server",
    built: true,
    points: ["1", "2", "3"],
  },
  {
    key: "contract",
    crate: "vaiexia-core",
    built: true,
    points: ["1", "2", "3"],
  },
  {
    key: "transport",
    crate: "vaiexia-obfs",
    built: true,
    points: ["1", "2", "3"],
  },
  {
    key: "wire",
    crate: "vaiexia-wire",
    built: true,
    points: ["1", "2", "3"],
  },
];

export const builtCount = VAIEXIA_REPOS.filter((r) => r.built).length;
export const repoCount = VAIEXIA_REPOS.length;

/** Total of what the forge reports across the repositories that have code. */
export const builtSize = VAIEXIA_REPOS.reduce(
  (sum, r) => sum + (r.built ? r.size : 0),
  0,
);
