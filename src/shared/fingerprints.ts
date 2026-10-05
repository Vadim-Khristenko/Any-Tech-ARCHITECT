/**
 * One browser, described once, used by both engines.
 *
 * AmneziaWG and XRay both imitate browsers, but they imitate different parts
 * of one. AmneziaWG copies UDP payload *sizes*, because that is all its
 * padding can control. XRay copies the TLS ClientHello, by naming a uTLS
 * profile. Same browsers, two facets — so the browser is described once here
 * and each engine reads the facet it can use.
 *
 * The uTLS names come from `transport/internet/tls/tls.go` in Xray-core, which
 * sorts them into three tiers with meanings worth preserving:
 *
 *   - preset   what GUI clients offer, and what `chrome` etc. resolve to
 *   - modern   the pool `random` draws from at startup
 *   - other    Golang, randomised, and per the code comment "too old"
 *
 * REALITY separately refuses `unsafe` and `hellogolang`, so neither appears
 * here at all.
 */

/**
 * Message slots a browser fingerprint carries sizes for.
 *
 * Defined here rather than imported from the AmneziaWG generator: a shared
 * module that depends on one engine is not shared. The generator re-exports
 * this name so its own code keeps reading naturally.
 */
export type BfpSlot = "qi" | "q0" | "h3" | "tls" | "nx" | "dtls";

/** Rendering engine, which is what actually shapes the traffic. */
export type BrowserFamily = "chromium" | "gecko" | "webkit" | "other";

/** UDP payload size range in bytes, excluding UDP and IP headers. */
export type SizeRange = readonly [number, number];

export interface BrowserFingerprint {
  /** Stable key used in configs and storage. */
  id: string;
  /** Shown in the UI. Not translated: these are product names. */
  label: string;
  family: BrowserFamily;

  /**
   * AmneziaWG facet: real UDP payload sizes per message slot. Absent when we
   * have no measurements for that browser.
   */
  sizes?: Readonly<Record<BfpSlot, SizeRange>>;

  /**
   * Where a size table came from, when it was not measured for this browser.
   *
   * A Chromium fork ships Chromium's QUIC stack, so its datagram sizes are
   * Chromium's until somebody patches the network layer — inheriting them is
   * accurate and inventing per-fork numbers would not be. Recording it keeps
   * the two kinds of entry apart: absent means measured, present means
   * derived, and the interface can say which.
   */
  sizesFrom?: string;

  /**
   * XRay facet: the uTLS profile to name in `fingerprint`.
   *
   * `preset` is the stable alias a client shows; `modern` pins a concrete
   * version, which is more faithful but ages. Pinning is worth it only while
   * the version is current, so anything pinned here is reviewed per release.
   */
  utls?: {
    preset: string;
    modern?: string;
  };
}

/* ── The registry ─────────────────────────────────────────────────────────── */

/**
 * Ordered by how often a real user is behind one, since the first entry is the
 * default and most people never change it.
 */
export const BROWSER_FINGERPRINTS: readonly BrowserFingerprint[] = [
  {
    id: "chrome",
    label: "Chrome",
    family: "chromium",
    sizes: {
      qi: [1250, 1250],
      q0: [1250, 1350],
      h3: [1250, 1350],
      tls: [512, 800],
      nx: [1200, 1250],
      dtls: [1100, 1200],
    },
    utls: { preset: "chrome", modern: "hellochrome_133" },
  },
  {
    id: "edge",
    label: "Edge",
    family: "chromium",
    sizes: {
      qi: [1250, 1250],
      q0: [1250, 1350],
      h3: [1250, 1350],
      tls: [512, 800],
      nx: [1200, 1250],
      dtls: [1100, 1200],
    },
    // helloedge_106 is in Xray's Modern pool, but uTLS itself says
    // "HelloEdge_106 seems to be incompatible with this library" and points
    // HelloEdge_Auto at 85. Pinning 106 would ship a broken hello.
    utls: { preset: "edge", modern: "helloedge_85" },
  },
  {
    id: "firefox",
    label: "Firefox",
    family: "gecko",
    sizes: {
      qi: [1200, 1252],
      q0: [1200, 1300],
      h3: [1200, 1350],
      tls: [512, 700],
      nx: [1200, 1250],
      dtls: [1050, 1200],
    },
    utls: { preset: "firefox", modern: "hellofirefox_148" },
  },
  {
    id: "safari",
    label: "Safari",
    family: "webkit",
    sizes: {
      qi: [1250, 1252],
      q0: [1250, 1300],
      h3: [1250, 1350],
      tls: [512, 750],
      nx: [1200, 1250],
      dtls: [1100, 1200],
    },
    utls: { preset: "safari", modern: "hellosafari_26_3" },
  },
  {
    id: "ios",
    label: "Safari (iOS)",
    family: "webkit",
    sizes: {
      qi: [1250, 1252],
      q0: [1250, 1300],
      h3: [1250, 1350],
      tls: [512, 750],
      nx: [1200, 1250],
      dtls: [1100, 1200],
    },
    /* Inherited: Safari — the same WebKit networking stack. */
    sizesFrom: "safari",
    utls: { preset: "ios", modern: "helloios_14" },
  },
  {
    id: "android",
    label: "Android (OkHttp)",
    family: "other",
    utls: { preset: "android" },
  },
  {
    id: "yandex_desktop",
    label: "Yandex Browser",
    family: "chromium",
    sizes: {
      qi: [1250, 1250],
      q0: [1250, 1350],
      h3: [1350, 1350],
      tls: [512, 800],
      nx: [1200, 1250],
      dtls: [1100, 1200],
    },
    // No uTLS profile exists for Yandex; it is Chromium, so a Chrome hello is
    // the honest approximation rather than a missing option.
    utls: { preset: "chrome" },
  },
  {
    id: "yandex_mobile",
    label: "Yandex Browser (mobile)",
    family: "chromium",
    sizes: {
      qi: [1232, 1232],
      q0: [1250, 1350],
      h3: [1350, 1350],
      tls: [512, 800],
      nx: [1200, 1250],
      dtls: [1100, 1200],
    },
    utls: { preset: "chrome" },
  },
  {
    id: "360",
    label: "360 Browser",
    family: "chromium",
    sizes: {
      qi: [1250, 1250],
      q0: [1250, 1350],
      h3: [1250, 1350],
      tls: [512, 800],
      nx: [1200, 1250],
      dtls: [1100, 1200],
    },
    /* Inherited: Chrome — a Chromium fork with an unmodified QUIC stack. */
    sizesFrom: "chrome",
    // Same story as Edge: uTLS points Hello360_Auto at 7.5 and calls 11.0
    // incompatible, despite Xray listing 11.0 as Modern.
    utls: { preset: "360", modern: "hello360_7_5" },
  },
  {
    id: "qq",
    label: "QQ Browser",
    family: "chromium",
    sizes: {
      qi: [1250, 1250],
      q0: [1250, 1350],
      h3: [1250, 1350],
      tls: [512, 800],
      nx: [1200, 1250],
      dtls: [1100, 1200],
    },
    /* Inherited: Chrome — a Chromium fork with an unmodified QUIC stack. */
    sizesFrom: "chrome",
    utls: { preset: "qq", modern: "helloqq_11_1" },
  },
];

const BY_ID = new Map(BROWSER_FINGERPRINTS.map((b) => [b.id, b]));

export function fingerprintById(id: string): BrowserFingerprint | undefined {
  return BY_ID.get(id);
}

/** Browsers we have packet measurements for — the ones AmneziaWG can use. */
export const SIZED_FINGERPRINTS = BROWSER_FINGERPRINTS.filter((b) => b.sizes);

/** Browsers with a uTLS profile — the ones XRay can use. */
export const UTLS_FINGERPRINTS = BROWSER_FINGERPRINTS.filter((b) => b.utls);

/* ── Detecting the visitor's own browser ──────────────────────────────────── */

/**
 * What we managed to work out about the browser in front of us.
 *
 * `exact` is always false, and that is not a placeholder. A page cannot read
 * its own TLS ClientHello: the handshake happens in the network stack, below
 * anything JavaScript can see. What a page *can* see is the user agent, which
 * names a browser and a version but not the platform quirks that change the
 * hello — Chrome on Windows and Chrome on Android do not send the same one.
 *
 * So this is a suggestion, and the UI has to say so. The alternative would be
 * asking a server to echo the fingerprint back, which is accurate and which
 * this project will not do: it has no backend, and the FAQ says so.
 */
export interface DetectedBrowser {
  fingerprint: BrowserFingerprint;
  /** Version read from the user agent, when it offered one. */
  version?: number;
  /** Always false. Kept explicit so callers cannot forget to caveat it. */
  exact: false;
  /** Why this one was chosen, for the tooltip. */
  reason: "client-hints" | "user-agent" | "fallback";
}

interface UADataBrand {
  brand: string;
  version: string;
}

interface NavigatorUAData {
  brands?: UADataBrand[];
  platform?: string;
}

/** Brand strings browsers put in `navigator.userAgentData`, in priority order. */
const BRAND_MATCHES: readonly (readonly [RegExp, string])[] = [
  [/edge/i, "edge"],
  [/yandex/i, "yandex_desktop"],
  [/opera|opr/i, "chrome"],
  [/chrome|chromium/i, "chrome"],
  [/firefox/i, "firefox"],
];

/** Same idea for the classic user agent string, where order matters more. */
const UA_MATCHES: readonly (readonly [RegExp, string])[] = [
  [/\bEdgA?\//i, "edge"],
  [/\bYaBrowser\//i, "yandex_desktop"],
  [/\bOPR\//i, "chrome"],
  [/\bFirefox\//i, "firefox"],
  [/\biPhone\b|\biPad\b/i, "ios"],
  [/\bAndroid\b.*\bChrome\//i, "chrome"],
  [/\bAndroid\b/i, "android"],
  // Safari must come last: every WebKit-derived UA also says "Safari".
  [/\bChrome\//i, "chrome"],
  [/\bSafari\//i, "safari"],
];

function versionFrom(ua: string): number | undefined {
  const m =
    ua.match(/(?:Chrome|Firefox|Version|Edg)\/(\d+)/i) ??
    ua.match(/OS (\d+)[._]/i);
  return m ? Number(m[1]) : undefined;
}

/**
 * Best guess at the visitor's browser.
 *
 * Client hints first, because they survive the user-agent reduction Chromium
 * has been rolling out; the UA string second; Chrome last, because it is the
 * most common answer and a wrong common answer beats no answer.
 */
export function detectBrowser(
  nav: Navigator | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator,
): DetectedBrowser {
  const fallback: DetectedBrowser = {
    fingerprint: BY_ID.get("chrome")!,
    exact: false,
    reason: "fallback",
  };
  if (!nav) return fallback;

  const uaData = (nav as Navigator & { userAgentData?: NavigatorUAData })
    .userAgentData;

  if (uaData?.brands?.length) {
    for (const [pattern, id] of BRAND_MATCHES) {
      const hit = uaData.brands.find((b) => pattern.test(b.brand));
      if (!hit) continue;
      const fingerprint = BY_ID.get(id);
      if (!fingerprint) continue;
      const version = Number(hit.version);
      return {
        fingerprint,
        version: Number.isFinite(version) ? version : undefined,
        exact: false,
        reason: "client-hints",
      };
    }
  }

  const ua = nav.userAgent ?? "";
  if (ua) {
    for (const [pattern, id] of UA_MATCHES) {
      if (!pattern.test(ua)) continue;
      const fingerprint = BY_ID.get(id);
      if (!fingerprint) continue;
      return {
        fingerprint,
        version: versionFrom(ua),
        exact: false,
        reason: "user-agent",
      };
    }
  }

  return fallback;
}
