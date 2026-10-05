/**
 * AmneziaWG Architect — syntax highlighter (awgHighlight.ts)
 *
 * Lightweight, dependency-free highlighter for the editor overlay. Input is
 * fully HTML-escaped first, then tokens are wrapped in <span class="tok-*">.
 * Two grammars: wg-quick (".conf") and JSON. Deliberately no CodeMirror/Monaco
 * — the page perf budget matters more than perfect tokenisation.
 */

import type { AwgFormat } from "@/engines/awg/awgFormat";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Classify the meaningful sub-tokens inside a wg-quick value:
 *   whole integer          → tok-num   (e.g. Jc = 8)
 *   whole numeric range    → tok-range (e.g. 100000-200000 — H1–H4 magic headers)
 *   IPv4 / IPv6 / CIDR     → tok-ip    (1.2.3.4:51820, 10.0.0.2/32, ::/0, fd00::1/64)
 *   CPS tags <…>           → tok-cps   (<b 0x…>, <r 100>, <rc 24>, <t>, <c>, …)
 *
 * Bare digits are deliberately NOT highlighted inside mixed values, so random
 * digits in a base64 key (PrivateKey/PublicKey/PSK) stay un-coloured.
 */
function highlightValue(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) return `<span class="tok-num">${esc(raw)}</span>`;
  if (/^\d+\s*-\s*\d+$/.test(trimmed))
    return `<span class="tok-range">${esc(raw)}</span>`;

  let e = esc(raw);
  // CPS tags first (escaped as &lt;…&gt;).
  e = e.replace(
    /&lt;[^&]*?&gt;/g,
    (m) => `<span class="tok-cps">${m}</span>`,
  );
  // IPv4 with optional /cidr and :port.
  e = e.replace(
    /\b\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?(?::\d+)?\b/g,
    (m) => `<span class="tok-ip">${m}</span>`,
  );
  // IPv6 incl. shorthand (::/0, fe80::1, fd00::1/64).
  e = e.replace(
    /(?:[0-9A-Fa-f]{0,4}:){2,7}[0-9A-Fa-f]{0,4}(?:\/\d{1,3})?/g,
    (m) => `<span class="tok-ip">${m}</span>`,
  );
  return e;
}

/** wg-quick: section headers, keys, typed values, comments. */
function highlightConf(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith("#") || trimmed.startsWith(";"))
        return `<span class="tok-comment">${esc(line)}</span>`;

      const sec = line.match(/^(\s*)(\[.+\])(\s*)$/);
      if (sec)
        return `${esc(sec[1])}<span class="tok-section">${esc(sec[2])}</span>${esc(sec[3])}`;

      const kv = line.match(/^(\s*)([\w-]+)(\s*=\s*)(.*)$/);
      if (kv) {
        const value = `<span class="tok-val">${highlightValue(kv[4])}</span>`;
        return `${esc(kv[1])}<span class="tok-key">${esc(kv[2])}</span>${esc(kv[3])}${value}`;
      }

      return esc(line);
    })
    .join("\n");
}

/**
 * Classify a JSON string VALUE (quotes included) so a stringified number,
 * range, IP or CPS signature gets the same colour as its bare wg-quick form:
 *   "5" → num · "123-456" → range · "1.2.3.4:51820" / "::/0" → ip
 *   "<b 0x…>" → cps · anything else → str
 */
function classifyJsonString(str: string): string {
  const inner = str.slice(1, -1); // strip the surrounding quotes
  if (/^\d+$/.test(inner)) return "tok-num";
  if (/^\d+\s*-\s*\d+$/.test(inner)) return "tok-range";
  if (/^\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?(?::\d+)?$/.test(inner))
    return "tok-ip";
  if (/^(?:[0-9A-Fa-f]{0,4}:){2,7}[0-9A-Fa-f]{0,4}(?:\/\d{1,3})?$/.test(inner))
    return "tok-ip";
  if (inner.includes("&lt;")) return "tok-cps"; // escaped '<' from a CPS tag
  return "tok-str";
}

/**
 * JSON: single pass over the escaped text. A quoted string followed by ':' is
 * a key; otherwise a typed string value. Bare numbers and literals too.
 */
function highlightJson(text: string): string {
  const escaped = esc(text);
  // esc() leaves quotes literal (no need to escape " in HTML text content), so
  // match literal "…" with an optional trailing ":" (→ key); plus num/keyword.
  const re =
    /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?)|\b(true|false|null)\b/g;
  return escaped.replace(re, (m, str, colon, numTok, kw) => {
    if (str)
      return colon
        ? `<span class="tok-key">${str}</span>${colon}`
        : `<span class="${classifyJsonString(str)}">${str}</span>`;
    if (numTok) return `<span class="tok-num">${numTok}</span>`;
    if (kw) return `<span class="tok-kw">${kw}</span>`;
    return m;
  });
}

/** Highlight `text` for the given format; unknown formats are escaped only. */
export function highlight(text: string, format: AwgFormat): string {
  if (format === "json") return highlightJson(text);
  if (format === "conf") return highlightConf(text);
  return esc(text);
}
