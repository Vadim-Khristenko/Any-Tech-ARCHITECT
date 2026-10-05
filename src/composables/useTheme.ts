/**
 * Which colour a page wears, and whether it is light or dark.
 *
 * Two separate things, deliberately. The accent belongs to the page — the FAQ
 * is teal wherever you read it, the same teal its link preview has been for a
 * year — and the scheme belongs to the reader. Tying them together is what
 * makes a "dark mode" that also changes the brand.
 *
 * Both land on `<html>` as attributes, which is all `assets/theme.css` needs:
 * `data-accent` selects the accent channels, `data-theme` sets `color-scheme`,
 * and `light-dark()` does the rest.
 */

import { ref, watch } from "vue";

/** The six the link previews already use, so a page matches its own card. */
export type Accent = "amber" | "gold" | "teal" | "green" | "blue" | "purple";

/**
 * What the reader asked for.
 *
 * `system` is not the absence of a choice — it is a choice, and the one most
 * people want. Storing it explicitly is what lets someone go back to it after
 * trying the other two.
 */
export type ThemeChoice = "system" | "light" | "dark";

const STORAGE_KEY = "awg-architect:theme";

/**
 * In control order, and `system` first on purpose.
 *
 * A two-state sun/moon toggle cannot express "follow the system", so the
 * moment someone touches it they are opted out of it forever without being
 * told. Three states put the default back within reach.
 */
export const THEME_CHOICES: readonly ThemeChoice[] = ["system", "light", "dark"];

const CHOICES = THEME_CHOICES;

export const theme = ref<ThemeChoice>("system");

/** Route name (without a locale prefix) to the colour that page wears. */
const PAGE_ACCENT: Record<string, Accent> = {
  home: "amber",
  amneziawg: "amber",
  xray: "blue",
  faq: "teal",
  about: "gold",
  mergekeys: "green",
  simulator: "blue",
  vaiexia: "purple",
};

export function accentFor(routeName: string | undefined | null): Accent {
  if (!routeName) return "amber";
  // `en-faq` and `faq` are the same page in two languages, not two pages.
  const base = routeName.replace(/^[a-z]{2}-/, "");
  return PAGE_ACCENT[base] ?? "amber";
}

export function applyAccent(accent: Accent): void {
  // Idempotent, because the callers are not: the first page applies its accent
  // from two directions and every re-entry would otherwise force a pair of
  // synchronous reflows to arrive at the colour already on screen.
  if (document.documentElement.dataset.accent === accent) return;

  // Instant, not crossfaded: this runs as the page transition inserts the new
  // view, and a view transition on top of that would snapshot the app halfway
  // through an animation it knows nothing about.
  instantly(() => {
    document.documentElement.dataset.accent = accent;
  });
}

function setThemeAttribute(choice: ThemeChoice): void {
  const root = document.documentElement;
  // No attribute means `color-scheme: light dark`, which follows the system.
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
}

/**
 * Change every colour in one frame instead of in a wave.
 *
 * Repainting the app means repainting elements whose own rules say
 * `transition: all 0.2s`, `transition: all 0.15s`, `transition: color 150ms`
 * and so on. Each eases to its new colour on its own schedule, so a scheme
 * change is not a fade — it is a smear, the borders arriving after the
 * backgrounds and the text after both. `[data-switching]` suspends every
 * transition in the document for the frame in which the change lands.
 */
function instantly(mutate: () => void): void {
  const root = document.documentElement;

  root.dataset.switching = "";
  mutate();

  // Read a layout property to force a style recalculation while the
  // suppression is in effect. Without it the attribute and the new colours
  // land in the same pass and the transitions run after all.
  void root.offsetHeight;

  // Released in the same call rather than on a later frame. Two frames was the
  // obvious way to write this and it is wrong twice over: a tab that is not
  // compositing never gets those frames, so the app would be left with every
  // transition disabled for the rest of the session — and it is unnecessary,
  // because the colours have already been recalculated. Removing the attribute
  // recomputes the same values a second time, and a transition only starts
  // when a value actually changes.
  delete root.dataset.switching;
  void root.offsetHeight;
}

/**
 * The same change, smoothed — but smoothed as one thing.
 *
 * A view transition crossfades a snapshot of the whole page into another, so
 * nothing can arrive out of order however many different durations the
 * underlying rules declare. Where the browser has no such thing, or the reader
 * has asked for less motion, the change is simply instant: not as pretty, but
 * never wrong.
 */
function crossfade(mutate: () => void): void {
  const start = document.startViewTransition?.bind(document);
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (!start || reduced) {
    instantly(mutate);
    return;
  }

  start(() => instantly(mutate));
}

/** Read the stored choice. Called once, before the first paint if possible. */
export function initTheme(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (CHOICES as readonly string[]).includes(stored)) {
      theme.value = stored as ThemeChoice;
    }
  } catch {
    // Storage blocked. The system default is a perfectly good answer.
  }
  // Directly, not through a crossfade: there is nothing yet to fade from.
  setThemeAttribute(theme.value);
}

export function setTheme(choice: ThemeChoice): void {
  theme.value = choice;
}

/** Step through the three, which is what a single button wants. */
export function cycleTheme(): ThemeChoice {
  const next = CHOICES[(CHOICES.indexOf(theme.value) + 1) % CHOICES.length]!;
  setTheme(next);
  return next;
}

watch(theme, (choice) => {
  crossfade(() => setThemeAttribute(choice));
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Not being able to remember it is not a reason to refuse to do it.
  }
});
