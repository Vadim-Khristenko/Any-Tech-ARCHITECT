/** WCAG relative luminance and contrast, so the comments in theme.css are true. */
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const LIGHT_GROUND = "#f6f6f7";
const LIGHT_CARD = "#ffffff";
const DARK_GROUND = "#0a0806";
const DARK_CARD = "#110e0a";

const rows = [
  ["light ink", "#17161a", LIGHT_GROUND],
  ["light ink-2", "#45434d", LIGHT_GROUND],
  ["light ink-3 (muted)", "#63616b", LIGHT_GROUND],
  ["light ink-3 on card", "#63616b", LIGHT_CARD],
  ["dark ink", "#e0d4b8", DARK_GROUND],
  ["dark ink-2", "#9a8a68", DARK_GROUND],
  ["dark ink-3 (muted)", "#8a7c5c", DARK_GROUND],
  ["dark ink-3 on card", "#8a7c5c", DARK_CARD],
  ["dark placeholder", "#8a7c5c", DARK_CARD],
  ["light placeholder", "#6b6974", LIGHT_CARD],
  ["accent-ink amber", "#7a5000", LIGHT_GROUND],
  ["accent-ink gold", "#7a5400", LIGHT_GROUND],
  ["accent-ink teal", "#0d5a68", LIGHT_GROUND],
  ["accent-ink green", "#176438", LIGHT_GROUND],
  ["accent-ink blue", "#1a5490", LIGHT_GROUND],
  ["accent-ink purple", "#533aa8", LIGHT_GROUND],
  ["light green", "#2f7d4c", LIGHT_GROUND],
  ["light red", "#b03a26", LIGHT_GROUND],
  ["light blue", "#1f5f9c", LIGHT_GROUND],
  ["dark accent-lift amber", "#f5c060", DARK_GROUND],
  ["dark accent-lift teal", "#7fd6e8", DARK_GROUND],
  ["dark accent-lift purple", "#c0a6ff", DARK_GROUND],
];

let failed = 0;
for (const [name, fg, bg] of rows) {
  const r = ratio(fg, bg);
  const ok = r >= 4.5;
  if (!ok) failed += 1;
  console.log(`${ok ? "  " : "！ "}${name.padEnd(24)} ${r.toFixed(2)}:1`);
}
console.log(failed ? `\n${failed} below 4.5:1` : "\nevery pair clears 4.5:1");
