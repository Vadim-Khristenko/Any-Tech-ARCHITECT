/**
 * Tooltips that are not trapped by whatever they sit inside.
 *
 * They used to be a `::after` on the element itself, absolutely positioned
 * above it. That works until the element is inside something that scrolls —
 * and the history panel is exactly that. `overflow-y: auto` clips on both
 * axes, so a tooltip on a button near the edge of the list was cut off by the
 * list, and a long one like "Pin — the limit will not push it out" ran past
 * the panel and lost its own text.
 *
 * No amount of care in the CSS fixes that, because a descendant cannot escape
 * an ancestor's clip. So there is one tooltip element, appended to the body,
 * positioned with `position: fixed` against the element's viewport rectangle.
 * Nothing clips it, it flips when it would leave the screen, and long text
 * wraps instead of running away.
 *
 * The authoring API is unchanged — `data-tooltip="…"` on anything — so this is
 * a change of mechanism rather than of markup.
 */

/** Gap between the element and its tooltip. */
const OFFSET = 8;

/** Never let a tooltip touch the viewport edge. */
const MARGIN = 8;

let layer: HTMLElement | null = null;
let current: Element | null = null;
/**
 * Whether anything is on screen to dismiss.
 *
 * The scroll listener below is registered with `capture`, so it is handed
 * every scroll from every scrolling element in the document — the history
 * list, a config view, the page itself. Without this guard each one of those
 * wrote two attributes into the DOM, and a page with a long scroll in it
 * produced thousands of writes for a tooltip that was never shown.
 */
let shown = false;

function ensureLayer(): HTMLElement {
  if (layer) return layer;
  layer = document.createElement("div");
  layer.className = "tooltip-layer";
  layer.setAttribute("role", "tooltip");
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  return layer;
}

function hide(): void {
  current = null;
  if (!shown) return;
  shown = false;
  if (!layer) return;
  layer.classList.remove("visible");
  layer.setAttribute("aria-hidden", "true");
}

function show(target: Element): void {
  const text = target.getAttribute("data-tooltip");
  if (!text) return;

  current = target;
  shown = true;
  const el = ensureLayer();
  el.textContent = text;
  el.classList.add("visible");
  el.setAttribute("aria-hidden", "false");

  // Measured after the text is in, or the width belongs to whatever was
  // shown last and the placement is wrong on the first frame.
  const anchor = target.getBoundingClientRect();
  const box = el.getBoundingClientRect();

  // Above by default; below when there is no room above, which is the case
  // for anything near the top of the page.
  const above = anchor.top - box.height - OFFSET >= MARGIN;
  const top = above
    ? anchor.top - box.height - OFFSET
    : anchor.bottom + OFFSET;

  // Centred on the element, then pulled back inside the viewport. A button in
  // the right-hand corner of a panel is the case that used to break.
  const centred = anchor.left + anchor.width / 2 - box.width / 2;
  const left = Math.min(
    Math.max(centred, MARGIN),
    window.innerWidth - box.width - MARGIN,
  );

  el.style.top = `${Math.round(top)}px`;
  el.style.left = `${Math.round(left)}px`;
  el.classList.toggle("below", !above);
}

function targetFor(node: EventTarget | null): Element | null {
  return node instanceof Element ? node.closest("[data-tooltip]") : null;
}

/**
 * Start listening. Idempotent, so a hot reload does not stack listeners.
 *
 * Pointer *and* focus: a tooltip that only answers the mouse is one a
 * keyboard user never sees, and these carry the only label some of the icon
 * buttons have.
 */
export function installTooltips(): void {
  if (typeof document === "undefined") return;
  if (document.body.dataset.tooltipsInstalled) return;
  document.body.dataset.tooltipsInstalled = "true";

  document.addEventListener(
    "pointerover",
    (event) => {
      const target = targetFor(event.target);
      if (target === current) return;
      if (target) show(target);
      else hide();
    },
    { passive: true },
  );

  document.addEventListener("focusin", (event) => {
    const target = targetFor(event.target);
    if (target) show(target);
    else hide();
  });

  document.addEventListener("focusout", hide);
  // A tooltip pinned to a rectangle that has moved is worse than none, and
  // both of these move every rectangle on the page.
  window.addEventListener("scroll", hide, { passive: true, capture: true });
  window.addEventListener("resize", hide, { passive: true });
  // Clicking the button the tooltip describes should not leave it hanging.
  document.addEventListener("click", hide, { passive: true });
}
