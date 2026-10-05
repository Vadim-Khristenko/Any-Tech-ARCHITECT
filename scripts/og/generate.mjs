/**
 * AmneziaWG Architect — Open Graph image generator.
 *
 * A TypeScript-era rewrite of the original `ogImageGen.py`: same visual
 * language, but composed as SVG and rasterised with resvg instead of drawn
 * pixel by pixel with Pillow. That buys real vector type, gradients and
 * filters, and makes the layouts easy to change.
 *
 * Emits one image per page per locale, in two aspect ratios:
 *   1200×630  — Open Graph and twitter:summary_large_image
 *   1200×1200 — square crop for platforms that centre-crop feeds
 *
 * Output is deterministic: no randomness, so regenerating produces byte-stable
 * files and a clean diff.
 *
 *   bun run og
 */

import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { ensureFonts, FAMILY } from "./fonts.mjs";
import {
  THEMES,
  COLORS,
  badge,
  background,
  brackets,
  defs,
  esc,
  footer,
  lockup,
  packetTrain,
  rule,
  subtitle,
  tagRow,
  title,
} from "./svg.mjs";

const OUT_DIR = path.join(import.meta.dirname, "../../public/assets");
const SITE = "architect.vai-rice.space";

/* ── Page definitions ────────────────────────────────────────────────────── */

/**
 * `slug` becomes `og-<slug>.png` for Russian and `og-<slug>-en.png` for
 * English, matching the filenames referenced from `src/i18n/seo.ts`.
 */
const PAGES = [
  /*
   * The landing. One lockup and no protocol in it: this card is what gets
   * shared when somebody links the project rather than one of its tools.
   */
  {
    slug: "image",
    theme: "amber",
    badge: "TWO ENGINES",
    pre: "Any Tech",
    titleLeft: "ARCHITECT",
    titleRight: "",
    tags: ["AmneziaWG", "XRay", "REALITY", "DPI"],
    ru: {
      subtitle: "Конфигурации обфускации, и объяснение каждого числа",
      tagline: "Всё считается в браузере",
    },
    en: {
      subtitle: "Obfuscation configs, with every number explained",
      tagline: "Everything runs in your browser",
    },
  },
  {
    slug: "amneziawg",
    theme: "amber",
    badge: "AWG 3.0 READY",
    pre: "AmneziaWG",
    titleLeft: "ARCHITECT",
    titleRight: "",
    tags: ["Jc / Jmin / Jmax", "S1–S4", "H1–H4", "CPS"],
    ru: {
      subtitle: "Генератор продвинутой обфускации для обхода DPI",
      tagline: "23 параметра, каждый объяснён",
    },
    en: {
      subtitle: "Advanced obfuscation generator for defeating DPI",
      tagline: "23 parameters, every one explained",
    },
  },
  {
    slug: "xray",
    theme: "blue",
    badge: "REALITY · VLESS",
    pre: "XRay",
    titleLeft: "ARCHITECT",
    titleRight: "",
    tags: ["REALITY", "XHTTP", "xmux", "FinalMask"],
    ru: {
      subtitle: "Снаружи рукопожатие чужого сайта, внутри ваш туннель",
      tagline: "74 параметра ядра Xray",
    },
    en: {
      subtitle: "Someone else's handshake outside, your tunnel inside",
      tagline: "74 Xray-core parameters",
    },
  },
  {
    slug: "faq",
    theme: "teal",
    badge: "FAQ",
    titleLeft: "AWG",
    titleRight: "FAQ",
    ru: {
      subtitle: "Параметры, версии и разбор типичных проблем",
      tagline: "Поиск, категории, прямые ссылки на ответы",
    },
    en: {
      subtitle: "Parameters, versions and common failure modes",
      tagline: "Search, categories, linkable answers",
    },
    tags: ["Jc", "S1–S4", "H1–H4", "I1–I5", "3.0"],
  },
  {
    slug: "about",
    theme: "gold",
    badge: "ABOUT",
    pre: "Any Tech",
    titleLeft: "ARCHITECT",
    titleRight: "",
    ru: {
      subtitle: "Твой протокол → твои правила",
      tagline: "Открытый код, ноль телеметрии",
    },
    en: {
      subtitle: "Your protocol → your rules",
      tagline: "Open source, zero telemetry",
    },
    tags: ["Vue 3", "TypeScript", "OFFLINE", "MIT"],
  },
  {
    slug: "mergekeys",
    theme: "green",
    badge: "MERGE KEYS",
    titleLeft: "MERGE",
    titleRight: "KEYS",
    ru: {
      subtitle: "Редактор и объединение ключей Amnezia VPN",
      tagline: "Ключи не покидают браузер",
    },
    en: {
      subtitle: "Edit and merge Amnezia VPN keys",
      tagline: "Keys never leave your browser",
    },
    tags: ["vpn://", "AWG", "XRay", "OpenVPN"],
  },
  {
    slug: "simulator",
    theme: "blue",
    badge: "PACKET SIMULATOR",
    titleLeft: "PACKET",
    titleRight: "SIM",
    ru: {
      subtitle: "Визуализация handshake AmneziaWG",
      tagline: "Посмотрите, что видит DPI",
    },
    en: {
      subtitle: "Visualise the AmneziaWG handshake",
      tagline: "See what DPI actually sees",
    },
    tags: ["CPS", "JUNK", "INIT", "DATA"],
  },
  /*
   * The card says what the page says. "COMING SOON" over a name is the one
   * claim nobody can check; five repositories out of ten is one anybody can.
   */
  {
    slug: "vaiexia",
    theme: "purple",
    badge: "5 / 10 WRITTEN",
    titleLeft: "VAI",
    titleRight: "EXIA",
    ru: {
      subtitle: "Управление сервером и VPN, которое можно поднять у себя",
      tagline: "Rust и WASM · собирается снизу вверх",
    },
    en: {
      subtitle: "Server and VPN management you can host yourself",
      tagline: "Rust and WASM · built from the bottom up",
    },
    tags: ["Noise XK", "ChaCha20", "MIMICRY", "WASM"],
  },
];

const LOCALES = ["ru", "en"];

/* ── Layouts ─────────────────────────────────────────────────────────────── */

/** Wide 1200×630 — the primary Open Graph card. */
function wideSvg(page, loc) {
  const W = 1200;
  const H = 630;
  const cx = W / 2;
  const copy = page[loc];
  const T = THEMES[page.theme] ?? THEMES.amber;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs(T)}
  ${background(W, H, T)}
  ${brackets(W, H, T)}
  ${badge(cx, 92, page.badge, T)}
  ${
    page.pre
      ? lockup(cx, 262, page.pre, page.titleLeft, T, 92)
      : title(cx, 262, page.titleLeft, page.titleRight, T, 96)
  }
  ${subtitle(cx, 322, copy.subtitle, T, 29)}
  ${rule(cx, 360, 460)}
  ${tagRow(cx, 404, page.tags, T, 19)}
  ${packetTrain(cx, 470, T, { scale: 1.15 })}
  ${footer(cx, 545, SITE, copy.tagline, T)}
</svg>`;
}

/** Square 1200×1200 — for feeds that centre-crop. */
function squareSvg(page, loc) {
  const W = 1200;
  const H = 1200;
  const cx = W / 2;
  const copy = page[loc];
  const T = THEMES[page.theme] ?? THEMES.amber;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs(T)}
  ${background(W, H, T)}
  ${brackets(W, H, T, 56, 96)}
  ${badge(cx, 300, page.badge, T)}
  ${
    page.pre
      ? lockup(cx, 500, page.pre, page.titleLeft, T, 100)
      : title(cx, 500, page.titleLeft, page.titleRight, T, 104)
  }
  ${subtitle(cx, 570, copy.subtitle, T, 32)}
  ${rule(cx, 618, 520)}
  ${tagRow(cx, 668, page.tags, T, 21)}
  ${packetTrain(cx, 760, T, { scale: 1.4 })}
  ${footer(cx, 880, SITE, copy.tagline, T)}
</svg>`;
}

/* ── GitHub social preview ───────────────────────────────────────────────── */

/**
 * One engine, drawn rather than listed.
 *
 * The panel is deliberately not a card in the site's sense: no shadow, no
 * nesting, just a bounded area with the engine's name, how many parameters it
 * has, and a small picture of what it actually does to a packet.
 */
function enginePanel(x, y, w, h, T, engine) {
  const pad = 26;
  const nameY = y + 42;

  return `
  <g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14"
          fill="${T.accent}" fill-opacity="0.05"
          stroke="${T.accent}" stroke-opacity="0.26" stroke-width="1"/>

    <text x="${x + pad}" y="${nameY}"
          font-family="${FAMILY.mono}" font-size="21" letter-spacing="3.4"
          fill="${T.accentBright}">${esc(engine.name)}</text>
    <text x="${x + w - pad}" y="${nameY}" text-anchor="end"
          font-family="${FAMILY.mono}" font-size="15" letter-spacing="1.2"
          fill="${T.textMuted}">${esc(engine.count)}</text>

    <rect x="${x + pad}" y="${y + 60}" width="${w - pad * 2}" height="1"
          fill="${T.accent}" fill-opacity="0.16"/>

    ${engine.motif}

    <text x="${x + pad}" y="${y + h - 24}"
          font-family="${FAMILY.mono}" font-size="15" letter-spacing="1.1"
          fill="${T.textSub}">${esc(engine.caption)}</text>
  </g>`;
}

/**
 * AmneziaWG: junk packets in front of a handshake.
 *
 * The widths are the ones the shared packet train uses, so the two motifs are
 * recognisably the same drawing at two sizes.
 */
function junkMotif(x, y, T) {
  const widths = [16, 26, 12, 34, 19, 30, 52, 34, 23, 23, 23];
  const kinds = [0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3];
  const fill = [T.accentDim, T.accentBright, T.accent, T.data];
  const alpha = [0.38, 1, 0.8, 0.62];

  let cursor = x;
  return widths
    .map((bw, i) => {
      const bh = kinds[i] === 0 ? 13 : 22;
      const r = `<rect x="${cursor}" y="${y - bh / 2}" width="${bw}" height="${bh}" rx="4"
        fill="${fill[kinds[i]]}" fill-opacity="${alpha[kinds[i]]}"/>`;
      cursor += bw + 8;
      return r;
    })
    .join("");
}

/**
 * XRay: someone else's handshake on the outside, your traffic on the inside.
 *
 * Two nested shapes say it in a way a list of feature names cannot — the outer
 * one is what a passive observer gets to read, and it carries a real donor's
 * name.
 */
function realityMotif(x, y, w, B) {
  const h = 62;
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"
          fill="${B.accent}" fill-opacity="0.07"
          stroke="${B.accent}" stroke-opacity="0.5" stroke-width="1"/>
    <text x="${x + 14}" y="${y + 24}"
          font-family="${FAMILY.mono}" font-size="14" letter-spacing="0.6"
          fill="${B.textSub}">www.microsoft.com</text>
    <rect x="${x + 14}" y="${y + 34}" width="${w - 28}" height="14" rx="5"
          fill="${B.data}" fill-opacity="0.6"/>`;
}

/**
 * GitHub social preview — 1280×640, the size GitHub renders in link unfurls
 * and on the repository page.
 *
 * Not a third copy of the link cards. Those are centred stacks meant to be
 * read in a feed in half a second; this one is looked at deliberately, next to
 * a README, so it is a spread: the name on the left, and on the right the two
 * engines as drawings of what each one does. It is also the only image that
 * carries both accents, because carrying both engines is the whole point of
 * the version it is announcing.
 */
function githubSvg() {
  const W = 1280;
  const H = 640;
  const T = THEMES.amber;
  const B = THEMES.blue;

  const L = 104;              // left column origin
  const R = 700;              // right column origin
  const RW = W - R - 104;     // right column width

  const pill = (x, y, text, w = 250, h = 38) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"
          fill="${T.accent}" fill-opacity="0.12"
          stroke="${T.accent}" stroke-opacity="0.45" stroke-width="1"/>
    <text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle"
          font-family="${FAMILY.mono}" font-size="14" letter-spacing="2.4"
          fill="${T.accentBright}">${esc(text)}</text>`;

  const name = (fill, extra = "") =>
    `<text x="${L}" y="308" font-family="${FAMILY.display}" font-size="78"
      letter-spacing="-1" ${extra} fill="${fill}">ARCHITECT</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs(T)}
  ${background(W, H, T)}
  ${brackets(W, H, T, 44, 78)}

  ${pill(L, 120, "OPEN SOURCE · MIT", 244)}
  ${pill(L + 258, 120, "TWO ENGINES", 178)}

  <text x="${L}" y="236" font-family="${FAMILY.mono}" font-size="19"
    letter-spacing="8" fill="${T.textSub}">ANY TECH</text>
  ${name(T.accent, `filter="url(#softGlow)" opacity="0.5"`)}
  ${name("url(#titleFade)")}

  <rect x="${L}" y="348" width="404" height="1" fill="${T.accent}" fill-opacity="0.3"/>

  <text x="${L}" y="392" font-family="${FAMILY.body}" font-size="23"
    fill="${T.textBody}">Конфигурации обфускации, и объяснение</text>
  <text x="${L}" y="424" font-family="${FAMILY.body}" font-size="23"
    fill="${T.textBody}">каждого числа в них</text>
  <text x="${L}" y="464" font-family="${FAMILY.body}" font-size="21"
    fill="${T.textSub}" fill-opacity="0.8">Obfuscation configs, with every number explained</text>

  <text x="${L}" y="530" font-family="${FAMILY.mono}" font-size="15"
    letter-spacing="1.2" fill="${T.textSub}" fill-opacity="0.72"
    >Vue 3 · TypeScript · no server · no analytics</text>
  <text x="${L}" y="562" font-family="${FAMILY.mono}" font-size="17"
    letter-spacing="0.6" fill="${T.textSub}">architect.vai-rice.space</text>

  ${enginePanel(R, 128, RW, 194, T, {
    name: "AMNEZIAWG",
    count: "23 PARAMS",
    caption: "Jc · Jmin/Jmax · S1–S4 · H1–H4",
    motif: junkMotif(R + 26, 128 + 108, T),
  })}

  <!--
    Two panels side by side are two products; a bracket across the gap makes
    them two engines of one. It is the only mark on the image that says what
    the version being announced actually changed.
  -->
  <g stroke="${T.accent}" stroke-opacity="0.34" stroke-width="1" fill="none">
    <path d="M${R + 14} 322 L${R} 322 L${R} 346 L${R + 14} 346"/>
  </g>
  ${enginePanel(R, 346, RW, 194, B, {
    name: "XRAY",
    count: "74 PARAMS",
    caption: "REALITY · XHTTP · xmux · FinalMask",
    motif: realityMotif(R + 26, 346 + 78, RW - 52, B),
  })}
</svg>`;
}

/* ── Render ──────────────────────────────────────────────────────────────── */

async function main() {
  console.log("AmneziaWG Architect — OG image generation\n");

  const fontFiles = await ensureFonts();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const fontOpts = {
    fontFiles,
    loadSystemFonts: false,
    defaultFontFamily: "Manrope",
  };

  let count = 0;
  for (const page of PAGES) {
    for (const loc of LOCALES) {
      const suffix = loc === "ru" ? "" : "-en";

      const variants = [
        { svg: wideSvg(page, loc), name: `og-${page.slug}${suffix}.png` },
        {
          svg: squareSvg(page, loc),
          name: `og-${page.slug}${suffix}-square.png`,
        },
      ];

      for (const v of variants) {
        const png = new Resvg(v.svg, { font: fontOpts }).render().asPng();
        fs.writeFileSync(path.join(OUT_DIR, v.name), png);
        console.log(`  ${v.name.padEnd(34)} ${(png.length / 1024).toFixed(0)} KB`);
        count++;
      }
    }
  }

  // GitHub social preview lives with the other repo assets, not in public/.
  const ghDir = path.join(import.meta.dirname, "../../.github/assets");
  fs.mkdirSync(ghDir, { recursive: true });
  const ghPng = new Resvg(githubSvg(), { font: fontOpts }).render().asPng();
  fs.writeFileSync(path.join(ghDir, "github-preview.png"), ghPng);
  console.log(
    `  ${"github-preview.png".padEnd(34)} ${(ghPng.length / 1024).toFixed(0)} KB  → .github/assets`,
  );
  count++;

  console.log(`\n${count} images written`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
