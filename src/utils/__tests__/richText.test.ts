import { describe, it, expect } from "bun:test";
import { parseRich, stripRich } from "../richText";
import { pick } from "@/i18n";
import { FAQ_ENTRIES } from "@/data/faq";
import { TIMELINE } from "@/data/changelog";

describe("parseRich", () => {
  it("splits on blank lines", () => {
    expect(parseRich("one\n\ntwo\n\nthree")).toHaveLength(3);
  });

  it("reads bold, italic and code", () => {
    // Compare shape only; strong and em also carry parsed children.
    expect(
      parseRich("a **b** c *d* e `f` g")[0].tokens.map((t) => [t.t, t.v]),
    ).toEqual([
      ["text", "a "],
      ["strong", "b"],
      ["text", " c "],
      ["em", "d"],
      ["text", " e "],
      ["code", "f"],
      ["text", " g"],
    ]);
  });

  it("reads headings", () => {
    const b = parseRich("## Two\n\n### Three\n\nbody");
    expect(b.map((x) => x.t)).toEqual(["h2", "h3", "p"]);
    expect(b[0].tokens[0].v).toBe("Two");
  });

  it("nests code inside bold", () => {
    // Marks combine: this is the common case, and a flat parser printed the
    // backticks instead of rendering them.
    const tok = parseRich("**set `Jc` first**")[0].tokens[0];
    expect(tok.t).toBe("strong");
    expect(tok.children).toEqual([
      { t: "text", v: "set " },
      { t: "code", v: "Jc" },
      { t: "text", v: " first" },
    ]);
  });

  it("nests code inside link text", () => {
    const tok = parseRich("[`receive.go`](https://example.com/r)")[0].tokens[0];
    expect(tok.t).toBe("link");
    expect(tok.children).toEqual([{ t: "code", v: "receive.go" }]);
  });

  it("keeps a link and its href", () => {
    const tok = parseRich("see [docs](https://example.com/x)")[0].tokens[1];
    expect(tok.t).toBe("link");
    expect(tok.href).toBe("https://example.com/x");
    expect(tok.v).toBe("docs");
  });

  it("only links safe schemes wherever they appear", () => {
    for (const e of FAQ_ENTRIES) {
      for (const loc of ["ru", "en"] as const) {
        for (const url of pick(e.answer, loc).matchAll(/\]\(([^)\s]+)\)/g)) {
          expect(url[1], `${e.id}/${loc}`).toMatch(/^https:\/\//);
        }
      }
    }
  });

  it("refuses a dangerous scheme, keeping the text", () => {
    for (const bad of [
      "[click](javascript:alert(1))",
      "[click](data:text/html,x)",
      "[click](vbscript:x)",
    ]) {
      const tok = parseRich(bad)[0].tokens;
      expect(tok.some((t) => t.t === "link"), bad).toBe(false);
      expect(tok.map((t) => t.v).join(""), bad).toContain("click");
    }
  });

  it("leaves an unclosed mark as literal text", () => {
    // A typo should look wrong on the page, not silently eat the rest.
    expect(parseRich("a **b c")[0].tokens).toEqual([{ t: "text", v: "a **b c" }]);
  });
});

describe("stripRich", () => {
  it("removes every mark", () => {
    expect(stripRich("**bold** and `code`")).toBe("bold and code");
  });

  it("joins paragraphs into one line", () => {
    expect(stripRich("one\n\ntwo")).toBe("one two");
  });

  it("leaves no markup for the structured data to carry", () => {
    for (const e of FAQ_ENTRIES) {
      for (const loc of ["ru", "en"] as const) {
        const flat = stripRich(pick(e.answer, loc));
        expect(flat, `${e.id}/${loc}`).not.toMatch(/\*\*|`|\n|\]\(|^#/);
      }
    }
  });
});

describe("editorial content", () => {
  it("has balanced marks in every FAQ answer", () => {
    for (const e of FAQ_ENTRIES) {
      for (const loc of ["ru", "en"] as const) {
        const text = pick(e.answer, loc);
        expect((text.match(/\*\*/g) ?? []).length % 2, `${e.id}/${loc} bold`).toBe(0);
        expect((text.match(/`/g) ?? []).length % 2, `${e.id}/${loc} code`).toBe(0);
      }
    }
  });

  it("has balanced marks in every changelog entry", () => {
    for (const e of TIMELINE) {
      for (const loc of ["ru", "en"] as const) {
        const text = pick(e.desc, loc);
        expect((text.match(/\*\*/g) ?? []).length % 2, `${e.version}/${loc}`).toBe(0);
        expect((text.match(/`/g) ?? []).length % 2, `${e.version}/${loc}`).toBe(0);
      }
    }
  });

  it("breaks long answers into paragraphs", () => {
    // A wall of text is what this formatting exists to prevent, so hold the
    // line: anything past a screenful has to be split.
    const walls = FAQ_ENTRIES.flatMap((e) =>
      (["ru", "en"] as const)
        .filter(
          (loc) =>
            stripRich(pick(e.answer, loc)).length > 700 &&
            parseRich(pick(e.answer, loc)).length < 2,
        )
        .map((loc) => `${e.id}/${loc}`),
    );
    expect(walls).toEqual([]);
  });
});

/*
 * Fenced blocks and images arrived together, for the FAQ: a `vless://` URI and
 * the field list inside a `vpn://` key mean nothing run together as prose, and
 * screenshots were wanted for later answers.
 */
describe("fenced blocks", () => {
  it("keeps its contents verbatim and unparsed", () => {
    const b = parseRich("before\n\n```\na **b** `c`\n```\n\nafter");
    expect(b.map((x) => x.t)).toEqual(["p", "pre", "p"]);
    expect(b[1].tokens).toEqual([{ t: "text", v: "a **b** `c`" }]);
  });

  it("survives blank lines inside the fence", () => {
    // The whole reason fences are pulled out before the paragraph split.
    const b = parseRich("```\none\n\ntwo\n```");
    expect(b).toHaveLength(1);
    expect(b[0].t).toBe("pre");
    expect(b[0].tokens[0].v).toBe("one\n\ntwo");
  });

  it("ignores an info string after the opening fence", () => {
    expect(parseRich("```json\n{}\n```")[0].tokens[0].v).toBe("{}");
  });

  it("flattens into the stripped text rather than vanishing", () => {
    const flat = stripRich("intro\n\n```\nvless://uuid@host\n```\n\ntail");
    expect(flat).toContain("vless://uuid@host");
    expect(flat).not.toContain("`");
  });
});

describe("images", () => {
  it("reads an image and keeps its alt text", () => {
    const [tok] = parseRich("![a diagram](/assets/x.png)")[0].tokens;
    expect(tok.t).toBe("img");
    expect(tok.v).toBe("a diagram");
    expect(tok.href).toBe("/assets/x.png");
  });

  it("is not mistaken for a link", () => {
    // An image is a link with a `!` in front; a link pattern tried first
    // matches the tail and strands the `!` as text.
    const kinds = parseRich("![a](/x.png) and [b](/y)")[0].tokens.map((t) => t.t);
    expect(kinds).toEqual(["img", "text", "link"]);
  });

  it("degrades to alt text when the source is not a safe scheme", () => {
    const toks = parseRich("![alt](javascript:alert(1))")[0].tokens;
    expect(toks.map((t) => t.t)).not.toContain("img");
    expect(toks.map((t) => t.v).join("")).toContain("alt");
  });

  it("leaves only alt text in the stripped form", () => {
    expect(stripRich("see ![a chart](/c.png) here")).toBe("see a chart here");
  });
});
