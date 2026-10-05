/**
 * SVG building blocks for the OG images.
 *
 * The visual language carries over from the original Python generator — dark
 * ground, amber radial glows, a faint grid and corner brackets — with two
 * additions: a layered vignette that stops the corners going flat, and a
 * "packet train" motif along the bottom that says what the tool actually does.
 */

import { FAMILY } from "./fonts.mjs";

export const COLORS = {
  bg: "#0a0804",
  bgDeep: "#050403",
  accent: "#e8a840",
  accentBright: "#f5c060",
  accentDim: "#c49040",
  textMain: "#ffffff",
  textBody: "#d4c4a0",
  textSub: "#c4a868",
  textMuted: "#6b5430",
  green: "#5fbf7f",
};

/**
 * Per-page palettes.
 *
 * Amber is the product's own colour and stays on the pages that *are* the
 * product. The rest get a distinct hue so a link preview is recognisable at a
 * glance in a feed — VAIEXIA in particular is purple, matching that tool's own
 * palette rather than this one's.
 *
 * Every ground stays near-black: these are link previews, not posters, and
 * they sit on white and dark social backgrounds alike.
 */
export const THEMES = {
  amber: {
    bg: "#0a0804",
    accent: "#e8a840",
    accentBright: "#f5c060",
    accentDim: "#c49040",
    textBody: "#d4c4a0",
    textSub: "#c4a868",
    textMuted: "#6b5430",
    data: "#5fbf7f",
  },
  gold: {
    bg: "#0b0803",
    accent: "#f0b860",
    accentBright: "#ffd08a",
    accentDim: "#c99a46",
    textBody: "#e0cfa8",
    textSub: "#cfae70",
    textMuted: "#6f5730",
    data: "#5fbf7f",
  },
  teal: {
    bg: "#04090b",
    accent: "#4fb3c9",
    accentBright: "#7fd6e8",
    accentDim: "#3c8a9c",
    textBody: "#bcd6dd",
    textSub: "#8fc0cd",
    textMuted: "#2f5b66",
    data: "#5fbf7f",
  },
  green: {
    bg: "#040a06",
    accent: "#5fbf7f",
    accentBright: "#8ee0a6",
    accentDim: "#469462",
    textBody: "#bfdcc8",
    textSub: "#93c9a6",
    textMuted: "#2f6141",
    data: "#e8a840",
  },
  blue: {
    bg: "#040711",
    accent: "#5b9bd5",
    accentBright: "#8dc0f0",
    accentDim: "#4276a5",
    textBody: "#c2d3e6",
    textSub: "#93b4d6",
    textMuted: "#31517a",
    data: "#5fbf7f",
  },
  purple: {
    bg: "#08050f",
    accent: "#9d7bf0",
    accentBright: "#c0a6ff",
    accentDim: "#7255bb",
    textBody: "#cfc3e8",
    textSub: "#ac96dd",
    textMuted: "#4a3878",
    data: "#5fbf7f",
  },
};

/** XML-escape a string for safe interpolation into SVG text nodes. */
export function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Background ──────────────────────────────────────────────────────────── */

export function defs(T) {
  return `
  <defs>
    <radialGradient id="glowTop" cx="50%" cy="0%" r="72%">
      <stop offset="0%" stop-color="${T.accent}" stop-opacity="0.32"/>
      <stop offset="45%" stop-color="${T.accent}" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="${T.accent}" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="glowCorner" cx="10%" cy="98%" r="60%">
      <stop offset="0%" stop-color="${T.accent}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${T.accent}" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="glowFar" cx="92%" cy="8%" r="42%">
      <stop offset="0%" stop-color="${T.accentBright}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${T.accentBright}" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="vignette" cx="50%" cy="45%" r="78%">
      <stop offset="52%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.6"/>
    </radialGradient>

    <linearGradient id="titleFade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${T.accentBright}"/>
      <stop offset="60%" stop-color="${T.accent}"/>
      <stop offset="100%" stop-color="${T.accentDim}"/>
    </linearGradient>

    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${T.accent}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${T.accent}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${T.accent}" stop-opacity="0"/>
    </linearGradient>

    <pattern id="grid" width="150" height="120" patternUnits="userSpaceOnUse">
      <path d="M150 0 L0 0 0 120" fill="none"
            stroke="${T.accent}" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>

    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="20"/>
    </filter>
  </defs>`;
}

export function background(w, h, T) {
  return `
  <rect width="${w}" height="${h}" fill="${T.bg}"/>
  <rect width="${w}" height="${h}" fill="url(#grid)"/>
  <rect width="${w}" height="${h}" fill="url(#glowTop)"/>
  <rect width="${w}" height="${h}" fill="url(#glowCorner)"/>
  <rect width="${w}" height="${h}" fill="url(#glowFar)"/>
  <rect width="${w}" height="${h}" fill="url(#vignette)"/>`;
}

/** Corner brackets — the signature framing device. */
export function brackets(w, h, T, pad = 40, arm = 70) {
  const s = `stroke="${T.accent}" stroke-opacity="0.36" stroke-width="2" fill="none" stroke-linecap="square"`;
  return `
  <g ${s}>
    <path d="M${pad} ${pad + arm} L${pad} ${pad} L${pad + arm} ${pad}"/>
    <path d="M${w - pad - arm} ${pad} L${w - pad} ${pad} L${w - pad} ${pad + arm}"/>
    <path d="M${pad} ${h - pad - arm} L${pad} ${h - pad} L${pad + arm} ${h - pad}"/>
    <path d="M${w - pad - arm} ${h - pad} L${w - pad} ${h - pad} L${w - pad} ${h - pad - arm}"/>
  </g>`;
}

/**
 * Packet train — blocks standing in for the junk packets, the handshake and
 * the data that follows. Widths are fixed rather than random so regenerating
 * produces identical files.
 */
export function packetTrain(cx, y, T, opts = {}) {
  const { scale = 1 } = opts;
  const widths = [14, 22, 11, 30, 17, 26, 44, 30, 20, 20, 20];
  const kinds  = [ 0,  0,  0,  0,  0,  0,  1,  2,  3,  3,  3];
  const gap = 7 * scale;

  const total =
    widths.reduce((a, b) => a + b * scale, 0) + gap * (widths.length - 1);
  let x = cx - total / 2;

  const fill = [T.accentDim, T.accentBright, T.accent, T.data];
  const alpha = [0.38, 1, 0.8, 0.62];

  const parts = widths.map((wRaw, i) => {
    const bw = wRaw * scale;
    const bh = (kinds[i] === 0 ? 10 : 16) * scale;
    const rect = `<rect x="${x.toFixed(1)}" y="${(y - bh / 2).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="${(3 * scale).toFixed(1)}" fill="${fill[kinds[i]]}" fill-opacity="${alpha[kinds[i]]}"/>`;
    x += bw + gap;
    return rect;
  });

  return `<g>${parts.join("")}</g>`;
}

/* ── Type ────────────────────────────────────────────────────────────────── */

export function badge(cx, y, text, T, w = 250, h = 40) {
  const x = cx - w / 2;
  return `
  <g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"
          fill="${T.accent}" fill-opacity="0.12"
          stroke="${T.accent}" stroke-opacity="0.45" stroke-width="1"/>
    <text x="${cx}" y="${y + h / 2 + 5}" text-anchor="middle"
          font-family="${FAMILY.mono}" font-size="15" letter-spacing="2.5"
          fill="${T.accentBright}">${esc(text)}</text>
  </g>`;
}

/**
 * Two-tone display title with a blurred copy behind it for the bloom.
 * Rendered as one text run so the halves stay kerned together.
 */
export function title(cx, y, left, right, T, size = 96) {
  const common = `text-anchor="middle" font-family="${FAMILY.display}" font-size="${size}" letter-spacing="-1"`;
  const body = (fillL, fillR, extra = "") =>
    `<text x="${cx}" y="${y}" ${common} ${extra}><tspan fill="${fillL}">${esc(left)}</tspan><tspan fill="${fillR}"> ${esc(right)}</tspan></text>`;

  return `
  <g>
    ${body(T.accent, T.accent, `filter="url(#softGlow)" opacity="0.5"`)}
    ${body(COLORS.textMain, "url(#titleFade)")}
  </g>`;
}

/**
 * The brand lockup: a small tracked qualifier over one large name.
 *
 * The two-part `title` sets both halves on one line at one size, which is
 * right for "MERGE KEYS" and wrong for "Any Tech ARCHITECT" — there the first
 * part is a qualifier and the second is the name, and giving them equal weight
 * makes the product sound as though it is called all three words.
 */
export function lockup(cx, y, pre, name, T, size = 96) {
  const preSize = Math.round(size * 0.2);
  const common = `text-anchor="middle" font-family="${FAMILY.display}" font-size="${size}" letter-spacing="-1"`;
  const body = (fill, extra = "") =>
    `<text x="${cx}" y="${y}" ${common} ${extra} fill="${fill}">${esc(name)}</text>`;

  return `
  <g>
    <text x="${cx}" y="${y - size * 0.86}" text-anchor="middle"
      font-family="${FAMILY.mono}" font-size="${preSize}"
      letter-spacing="${(preSize * 0.42).toFixed(1)}"
      fill="${T.textSub}">${esc(pre.toUpperCase())}</text>
    ${body(T.accent, `filter="url(#softGlow)" opacity="0.5"`)}
    ${body("url(#titleFade)")}
  </g>`;
}

export function subtitle(cx, y, text, T, size = 30) {
  return `<text x="${cx}" y="${y}" text-anchor="middle"
    font-family="${FAMILY.body}" font-size="${size}" fill="${T.textBody}"
    >${esc(text)}</text>`;
}

/** Row of monospaced keywords with dot separators. */
export function tagRow(cx, y, tags, T, size = 19) {
  const text = tags.join("   ·   ");
  return `<text x="${cx}" y="${y}" text-anchor="middle"
    font-family="${FAMILY.mono}" font-size="${size}" letter-spacing="1.5"
    fill="${T.textSub}">${esc(text)}</text>`;
}

export function rule(cx, y, w = 420) {
  return `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="1" fill="url(#rule)"/>`;
}

export function footer(cx, y, url, tagline, T) {
  return `
  <text x="${cx}" y="${y}" text-anchor="middle"
    font-family="${FAMILY.mono}" font-size="16" letter-spacing="0.5"
    fill="${T.textMuted}">${esc(url)}</text>
  <text x="${cx}" y="${y + 30}" text-anchor="middle"
    font-family="${FAMILY.body}" font-size="18"
    fill="${T.textSub}">${esc(tagline)}</text>`;
}
