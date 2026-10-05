# Design — Any Tech ARCHITECT

The visual system. `PRODUCT.md` answers who and why; this answers how it looks.

Everything here is real: the whole system is in `assets/kit/` — tokens, base
elements, primitives and the shell, one file per family behind a single
`index.css` — and all of it can be seen across every accent and both schemes
with `bun run kit`, which is not part of the production build.

`assets/main.css` is what is left of the old stylesheet. It holds only what
views that have not been rewritten still reach for, and it shrinks with each
one.

## Concept

**A working drawing of a packet.**

The name is the brief. The interface is a drawing sheet rather than a
dashboard: hairline rules, dimension lines with tick terminators, leader lines,
hatch for what is unavailable, revision letters, and a title block.

The rule that stops this being a costume: **every motif carries data.**

| Motif | What it means |
|---|---|
| Dimension line | A parameter range — `Jmin`–`Jmax`, `H1`–`H4` |
| Octet ruler | Byte offsets in a header |
| Field map | The packet, drawn at the widths its fields really have |
| Hatch (45°) | The selected client does not support this |
| Revision letter | A protocol version |
| Title block | The four facts that identify a configuration |
| Sheet grid | Scale |

Anything that is only there to look technical does not get a token.

## Theme

Two independent axes, and keeping them independent is the point.

- **Accent belongs to the page.** Six, one per surface, matching the link
  previews the site has had for a year: amber (landing and AmneziaWG), teal
  (FAQ), gold (about), green (MergeKeys), blue (simulator), purple (VAIEXIA).
  Set as `data-accent` on `<html>`.
- **Scheme belongs to the reader.** `data-theme` of `light` / `dark`, or absent
  to follow the system. Implemented with `light-dark()`, so the kit is written
  once rather than twice.

Tying the two together is what produces a dark mode that also changes the
brand.

## Color

Stored as channels — `--accent-rgb: 232 168 64` — so every border, wash and
glow derives from one value and a new accent is one line.

**The ground carries the accent.** Every ground is `color-mix`ed from it in
oklab, which mixes by perceived lightness. Light is pastel; the six mixing
ratios differ (amber 20%, purple 15%, gold 24%…) because the accents differ in
lightness, and each was solved for the ground the others land on.

**The accent is two colours.** `--accent` is for surfaces — a fill, a border, a
glow. `--accent-ink` is the same hue taken down until it can be read: amber on
the pastel ground is about 1.9:1, so every `color:` in the app points at the
ink form and only borders and fills get the brand colour itself.
`--on-accent` is what sits on top of an accent fill, near-black in both schemes
because the accent is mid-light in both.

Semantic colours (`--green`, `--red`, `--blue`, `--cyan`) keep their meaning
across schemes and are measured against the washes they are actually used on,
not against plain white.

**Contrast is measured, not judged.** A walk over every rendered text node,
resolving each run against its real composited backdrop, runs against all six
pages in both schemes. Both currently pass WCAG AA with nothing below 4.5:1.

## Typography

Three faces on real contrast axes, self-hosted with metric-matched fallbacks so
the swap causes no reflow.

| Role | Face | Where |
|---|---|---|
| Display | Unbounded Variable | Headings, brand, panel titles |
| Body | Manrope Variable | Prose, labels, buttons |
| Data | JetBrains Mono Variable | Every number, key, hex string and annotation |

Mono is not costume here: it is what the product outputs. It is also the voice
of the drawing's annotations — a label on a technical drawing is lettered, not
typeset.

Scale at a ratio near 1.25 (`--t-2xs` … `--t-2xl`), display sizes fluid and
capped at 5.5rem. Display tracking floor `-0.035em`. Prose capped at `68ch`,
`text-wrap: balance` on headings and `pretty` on prose.

## Space, shape, depth

- Space on a 4px base, `--sp-1` … `--sp-10`, plus a fluid `--sp-section`.
- Radii `--r-0` … `--r-5`. A drawing sheet is mostly square: the things that
  hold data stay at 3–10px and only physical-feeling controls go rounder.
- A named z-index scale from `--z-raised` to `--z-tooltip`. No arbitrary 9999.
- Shadows are scheme-aware: depth from black in dark, from a hairline and a
  hint in light.

## Motion

Exponential ease-out only; nothing bounces, because an instrument that springs
reads as a toy. Durations `--dur-1` (90ms) … `--dur-5` (650ms).

- One orchestrated entrance per page, not a reveal on every section.
- Reveals enhance an already-visible default. Visibility is never gated on a
  class, because a transition that does not run leaves the section blank — on a
  hidden tab, in a headless renderer, in a pane that is not compositing.
- Scheme changes are instant plus a view transition, never a per-element
  transition: separate durations arrive as a wave rather than a fade.
- Every animation has a `prefers-reduced-motion` alternative.

## Components

`assets/kit/`, one file per family, no prefix: `.btn` is the button. Named
`.block`, `.block-element`, `.block--variant`, with `is-` / `has-` states.

| File | What is in it |
|---|---|
| `tokens.css` | Colour, space, type, radii, motion, depth, the drawing materials |
| `base.css` | Reset, faces, bare elements, scrollbars |
| `surfaces.css` | sheet · sheet-field · panel · card · plate · well · strip · titleblock |
| `buttons.css` | btn (primary/secondary/ghost/danger, three sizes, icon, block, loading) · btngroup |
| `forms.css` | field · input · select · textarea · inputgroup · affix · check · switch · range · segment |
| `marks.css` | badge · rev · kbd · code · dot · chevron · badge-glow |
| `drawing.css` | dim · ruler · fieldmap · leader · rule · void |
| `data.css` | readout · table (striped, active row) · list |
| `feedback.css` | note · empty · progress · skeleton · spinner |
| `disclosure.css` | tabs · accordion |
| `overlays.css` | menu · dialog · toast · tooltip |
| `type.css` | display · h2 · h3 · lede · prose · mono · stack · row · grid |
| `motion.css` | Everything below |
| `shell.css` | The sheet background, the header, the footer |

Rules with a pre-kit equivalent carry the old class as an extra selector —
`.note, .alert { … }` — so an un-rewritten view gets the new design without a
second definition of it existing. Those come out as each view migrates.

### Motion

Four entrances, each with an exit, and each doing something the others do not:
`.rise` moves up, `.settle` scales down onto its place, `.sweep-in` is
uncovered top to bottom, `.slide-in` comes from the side. Durations rise with
weight — 520ms to 900ms — because a large thing arriving quickly is a flicker.

`.disclose` opens and closes on a grid track from `0fr` to `1fr`, so there is
no guessed `max-height` in the CSS and no measurement in script. Collapsed, it
is `visibility: hidden`, so nothing inside stays in the tab order.

`.typing` reveals mono text a character at a time. Its width is stated in `ch`
from a count the markup supplies, because an animation running to `width: auto`
does not interpolate and does nothing at all — which is what the first version
did. `.typing-cursor` is the caret; `utils/typing.ts` drives the cycling form,
where each phrase is a different length and CSS cannot know the next one.

Also: `.trace` (a rule drawing itself), `.pop-in`, `.nudge` (a rejected value),
`.fade-swap` (a value replacing itself), `.reveal-rows` (delay from the row
index), `.lift` / `.press` (pointer), and two that report state rather than
decorate — `.marching` for work in progress and `.glow-pulse` for something
live.

Glow is a dark-scheme idea: light emitted around an object does nothing on
paper. `--glow-ring` and `--glow-halo` give the light scheme the same emphasis
by the means a light interface has — a ring of the deep accent and a real
shadow.

### Two deliberate choices

- **Disabled is hatched, not faded.** A faded control raises the question of
  whether it is disabled or merely low-contrast. Hatching is the same mark the
  kit uses everywhere else for "not available".
- **Notes are bordered on four sides.** A coloured bar down the left edge is
  the most common way an alert is drawn and it carries nothing the background
  tint does not already carry.

### Opaque by default

The page has a grid on it, so anything that can stand directly on it has an
opaque ground. `--surface` and its friends are the accent at low alpha, which
is right on a panel and wrong on the page — a six-percent wash lets every
square through. `--surface-solid` is the same tint already composited onto a
ground.

## What this is not

No neon-on-black. No terminal green, glitch type, shields or padlocks. No
gradient text. No glassmorphism as decoration. No identical card grids. No tiny
uppercase eyebrow above every section. No cyan-on-navy blueprint literalism.
