/**
 * A very small Markdown subset for editorial content.
 *
 * FAQ answers and changelog entries are written once and used twice: rendered
 * into the page, and emitted into FAQPage JSON-LD, which must not carry
 * markup. Storing HTML would break the second use; storing flat text made the
 * first one a wall of prose with no way to tell a rule from an aside.
 *
 * So the source carries a handful of marks and nothing else:
 *
 *   blank line          paragraph break
 *   ## / ###            a subheading, for answers long enough to have parts
 *   **bold**            the claim a reader must not miss
 *   *italic*            an aside, a caveat, something safe to skip
 *   `code`              anything spelled exactly — parameters, files, commands
 *   ```…```             a shape that only reads as lines: a URI, a field list
 *   [text](url)         a source worth citing
 *
 * The fence earns its place: a `vless://` URI and the field list inside a
 * `vpn://` key mean nothing run together as prose, and inline backticks
 * cannot hold a line break. Nothing inside a fence is parsed further — code
 * that says `**` means two asterisks.
 *
 * The page renders these as elements; the structured data and the search
 * index get them stripped. No HTML exists anywhere in the pipeline, so there
 * is nothing to escape and nothing to inject. Links are checked against an
 * allowlist of schemes at parse time rather than trusted.
 */

export type RichTokenType =
  | "text"
  | "strong"
  | "em"
  | "code"
  | "link"
  | "img";

export interface RichToken {
  t: RichTokenType;
  /** Text content. Meaningful for `text` and `code`, which do not nest. */
  v: string;
  /** Present on links and images. Always a safe scheme — see SAFE_HREF. */
  href?: string;
  /**
   * Bold, italic and links carry parsed children rather than raw text, so
   * **a `param` in bold** renders as bold with real code inside it instead of
   * printing the backticks. `text` and `code` are leaves.
   */
  children?: RichToken[];
}

export type RichBlockType = "p" | "h2" | "h3" | "pre";

export interface RichBlock {
  t: RichBlockType;
  tokens: RichToken[];
}

/**
 * Only absolute http(s) links and in-page anchors. Everything else — most of
 * all `javascript:` — is rendered as plain text instead of becoming a link.
 */
const SAFE_HREF = /^(https?:\/\/|#|\/)/i;

/**
 * One alternation, so the leftmost mark always wins and a backtick inside
 * bold cannot be reinterpreted.
 *
 * Order matters twice: `**` before `*`, and the image before the link. An
 * image is a link with a `!` in front, so a link pattern tried first matches
 * the tail of one and leaves the `!` stranded as text.
 */
const INLINE =
  /!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g;

/**
 * A fenced block, pulled out before anything else looks at the text.
 *
 * It has to come first because everything below splits on blank lines, and a
 * fence is allowed to contain them.
 */
const FENCE = /```[^\n]*\n?([\s\S]*?)```/g;

/**
 * Split one block into tokens. An unclosed mark is left as literal text
 * rather than swallowed — a typo should look wrong, not eat the paragraph.
 */
function tokenize(text: string, depth = 0): RichToken[] {
  const out: RichToken[] = [];
  let last = 0;

  // Marks nest — bold around code is the common case — but only a couple of
  // levels deep are meaningful, and the bound keeps a pathological string
  // from recursing far.
  const nest = (inner: string): RichToken[] =>
    depth < 3 ? tokenize(inner, depth + 1) : [{ t: "text", v: inner }];

  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ t: "text", v: text.slice(last, at) });

    if (m[1] !== undefined) {
      // An image whose source fails the check degrades to its alt text, which
      // is the sentence the author wrote for exactly this case.
      const src = m[2];
      if (SAFE_HREF.test(src)) out.push({ t: "img", v: m[1], href: src });
      else if (m[1]) out.push({ t: "text", v: m[1] });
    } else if (m[3] !== undefined) {
      const href = m[4];
      // An unsafe scheme keeps its text and loses its link, so the sentence
      // still reads correctly.
      if (SAFE_HREF.test(href)) {
        out.push({ t: "link", v: m[3], href, children: nest(m[3]) });
      } else {
        out.push({ t: "text", v: m[3] });
      }
    } else if (m[5] !== undefined) {
      out.push({ t: "strong", v: m[5], children: nest(m[5]) });
    } else if (m[6] !== undefined) {
      out.push({ t: "em", v: m[6], children: nest(m[6]) });
    } else {
      out.push({ t: "code", v: m[7] });
    }

    last = at + m[0].length;
  }

  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out.length ? out : [{ t: "text", v: text }];
}

/**
 * One line of marks with no block around it.
 *
 * For text that is already inside an element with meaning — a question, which
 * is a heading. Wrapping it in a paragraph would nest a `<p>` in an `<h3>`.
 */
export function tokenizeLine(text: string): RichToken[] {
  return tokenize(text);
}

/** Everything between blank lines, once the fences are out of the way. */
function proseBlocks(text: string): RichBlock[] {
  return text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block): RichBlock => {
      const h = block.match(/^(#{2,3})\s+(.*)$/s);
      if (h) {
        return {
          t: h[1].length === 2 ? "h2" : "h3",
          tokens: tokenize(h[2].trim()),
        };
      }
      return { t: "p", tokens: tokenize(block) };
    });
}

/** Parse editorial text into renderable blocks. */
export function parseRich(text: string): RichBlock[] {
  const out: RichBlock[] = [];
  let last = 0;

  for (const m of text.matchAll(FENCE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(...proseBlocks(text.slice(last, at)));
    // Nothing inside a fence is parsed: it is shown exactly as written.
    out.push({ t: "pre", tokens: [{ t: "text", v: m[1].replace(/\n$/, "") }] });
    last = at + m[0].length;
  }

  if (last < text.length) out.push(...proseBlocks(text.slice(last)));
  return out;
}

/**
 * The same text with every mark removed and blocks joined by a space — what
 * goes into JSON-LD and into the search index, so a search for a parameter
 * name still matches where the answer writes it in backticks.
 */
export function stripRich(text: string): string {
  return text
    // Fences first, for the same reason parseRich takes them first: their
    // contents may hold blank lines and anything else that looks like a mark.
    .replace(FENCE, (_, body: string) => ` ${body.replace(/\s+/g, " ")} `)
    // An image leaves its alt text, which is what a reader without the image
    // was always going to get.
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{2,3}\s+/gm, "")
    .split(/\n\s*\n/)
    .map((b) => b.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join(" ");
}
