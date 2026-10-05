/**
 * Renders the editorial markup from `utils/richText` as real elements.
 *
 * A render function rather than a template, because marks nest: bold can hold
 * code, a link can hold both, and a template cannot recurse into itself
 * without being registered as its own component. It also keeps FAQ answers
 * and changelog entries rendering through exactly one code path.
 *
 * Nothing here touches innerHTML — every node is constructed, so the markup
 * cannot carry HTML even if someone writes a tag into the source text.
 */

import { defineComponent, h, type PropType, type VNode } from "vue";
import { parseRich, tokenizeLine, type RichToken } from "@/utils/richText";

function renderTokens(tokens: RichToken[]): (VNode | string)[] {
  return tokens.map((tok) => {
    switch (tok.t) {
      case "code":
        return h("code", tok.v);
      case "strong":
        return h("strong", renderTokens(tok.children ?? []));
      case "em":
        return h("em", renderTokens(tok.children ?? []));
      case "link":
        return h(
          "a",
          { href: tok.href, target: "_blank", rel: "noopener noreferrer" },
          renderTokens(tok.children ?? []),
        );
      case "img":
        // `loading` and `decoding` because an answer can hold several and none
        // of them is above the fold; the alt text is whatever the author wrote
        // between the brackets, so an image that fails to load still says
        // something.
        return h("img", {
          src: tok.href,
          alt: tok.v,
          loading: "lazy",
          decoding: "async",
          class: "rich-img",
        });
      default:
        return tok.v;
    }
  });
}

export default defineComponent({
  name: "RichText",
  props: {
    text: { type: String as PropType<string>, required: true },
    /**
     * Render one line without block elements.
     *
     * A question is a heading already; wrapping its marks in a paragraph puts
     * a `<p>` inside an `<h3>`, which is invalid and which the browser fixes
     * by breaking the heading apart. Inline mode renders the marks and nothing
     * around them.
     */
    inline: { type: Boolean, default: false },
  },
  setup(props) {
    return () => {
      // A single span rather than a bare fragment: a fragment has no root for
      // a class or a style to attach to, so `class="…"` on the component is
      // silently dropped and the caller's layout never applies.
      if (props.inline) {
        return h("span", renderTokens(tokenizeLine(props.text)));
      }

      return parseRich(props.text).map((block) =>
        block.t === "pre"
          ? h("pre", { class: "rich-pre" }, h("code", block.tokens[0]?.v ?? ""))
          : h(block.t, renderTokens(block.tokens)),
      );
    };
  },
});
