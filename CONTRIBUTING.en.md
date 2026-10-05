# Contributing to Any Tech ARCHITECT

[Русский](CONTRIBUTING.md) · **English**

Thanks for wanting to help. This describes how the project is put together and
what makes a change easy to accept.

---

## Contents

- [Quick start](#quick-start)
- [Stack](#stack)
- [Project structure](#project-structure)
- [The brand kit](#the-brand-kit)
- [Code style](#code-style)
- [Localisation](#localisation)
- [Protocol changes](#protocol-changes)
- [Pull requests](#pull-requests)
- [Domain proposals](#domain-proposals)
- [Bug reports](#bug-reports)

---

## Quick start

```bash
# 1. Fork the repository on GitHub and clone your fork
git clone https://github.com/<you>/Any-Tech-ARCHITECT.git
cd Any-Tech-ARCHITECT

# 2. Install dependencies (bun recommended, npm works too)
bun install

# 3. Start the dev server
bun run dev
```

| Command | What it does |
|:--|:--|
| `bun run dev` | Dev server with HMR |
| `bun run build` | Production build, crawler stubs, sitemap, robots |
| `bun run preview` | Preview the built site |
| `bun run test:run` | Run the tests once |
| `bun run test` | Tests in watch mode |
| `bun run typecheck` | Type-check without building |
| `bun run og` | Rebuild the OG images and the GitHub preview |
| `bun run kit` | The brand-kit page, outside the production build |
| `bun run domains` | Work on the donor-domain database |
| `bun run configs` | Build the XRay config matrix and run it against real cores |

The server in `tools/awg-serve` builds separately, through cargo:

```bash
cd tools/awg-serve
cargo test          # path parsing, directory traversal, MIME types
cargo build --release
```

It has no dependencies and must not acquire any: it ships inside the release
archive, so it has to build on a bare toolchain. Edition 2024, Rust 1.85
minimum. CI builds it natively on a runner per OS rather than cross-compiling.

---

## Stack

Vue 3 (`<script setup>`), TypeScript, Vite, Vitest, `lucide-vue-next` for icons,
`pako` for the `vpn://` codec. No CSS framework — plain CSS with custom
properties.

---

## Project structure

```
src/
  engines/       one directory per engine, both behind a common interface
    awg/         AmneziaWG: generator, rules, parser, packet simulator
    xray/        XRay: REALITY, transports, FinalMask, field bindings
    registry.ts  what engines exist at all
  shared/        what is genuinely shared: RNG, x25519, domains, clients, findings
  composables/   reactive wrappers around the engines
  components/    shared components
  views/         pages
  i18n/          catalogs, runtime and per-locale SEO metadata
  data/          content: FAQ, changelog, support links
  workers/       batch generation off the main thread
assets/
  kit/           the brand kit: tokens and primitives
  main.css       style entry point
scripts/og/      the OG image generator
scripts/configs.ts  the XRay config matrix, against real cores in Docker
tools/awg-serve/ static server in Rust, ships in the release archive
```

**Architecture rules**

- An engine knows nothing about Vue, and about i18n where it can avoid it.
  `awg/generator/render.ts` takes translated strings as an argument rather than
  importing the catalog, so it still runs in the worker and in tests.
- `shared/` is for what both engines actually use. If only one needs it, it
  belongs to that engine, however general it looks.
- A number known in two places will eventually disagree with itself. The
  AmneziaWG message-size offsets were written out three times and two of them
  were wrong; they are now derived from the message sizes in
  `engines/awg/messageSizes.ts`. If you find yourself repeating a constant,
  lift it.
- `composables/` return refs, computeds and actions.
- `views/` hold template, scoped styles and as little logic as possible.

---

## The brand kit

Every token and primitive lives in `assets/kit/`. Components should not carry
their own colours, shadows or radii: if the primitive you need is missing, add
it to the kit rather than beside the place you needed it.

`bun run kit` opens a page showing everything the kit contains. It builds from
its own config and never reaches the production bundle.

One theme covers both schemes, through `light-dark()` and
`color-mix(in oklab, …)`, with the accent stored as RGB channels — so a new
colour almost never has to be written twice.

---

## Code style

**TypeScript** — strict typing; avoid `any` unless there is no alternative.
Prefer interfaces for object shapes. Engine code must stay pure. JSDoc on
exported functions, explaining *why* rather than restating the signature.

**Vue** — `<script setup lang="ts">` only, no Options API. Always
`<style scoped>`. `ref()` for primitives, `reactive()` for objects.
`PascalCase` components, `camelCase` everything else.

**CSS** — use the tokens in `assets/kit/tokens.css`. Breakpoints at 960px, 768px
and 480px. Respect `prefers-reduced-motion` for anything that moves.

**Formatting** — four spaces in `.vue`, two in `.ts`; semicolons; trailing
commas.

---

## Localisation

Catalogs live in `src/i18n/locales/`. Russian is the source of truth and
English is typed against it, so **a missing translation is a build error** —
add the key to `ru.ts` first, then `en.ts`.

Keys are flat and dotted (`gen.export.copyConf`), grouped by area. When adding
UI text:

- Never hardcode a string in a template. Use `t("some.key")`.
- In attributes use a binding — `:title='t("some.key")'` — not `{{ }}`
  interpolation, which is invalid there.
- Interpolate with `{name}` placeholders; pass values as the second argument.
- For counts, use plural forms. Russian needs three (`one`/`few`/`many`),
  English two.

Translate the meaning, not the word order. Where a Russian sentence works
because of how it is arranged, the English one should be rebuilt. One answer
here once ended up stating the exact opposite of its Russian original by being
rendered literally.

Page metadata is separate, in `src/i18n/seo.ts`, and is consumed by both the
router and the build-time stub generator — so the two cannot drift.

---

## Protocol changes

One thing worth knowing before touching a generator: **the documentation lags
behind the implementation.** AmneziaWG's still describes 2.0 at the time of
writing while `amneziawg-go` is on 3.0.1, and Xray-core's trails its releases by
about as much.

If you are changing anything about how parameters are produced or validated,
please cite the source — a file and line in `amneziawg-go`, `amneziawg-tools` or
`Xray-core` — rather than the docs. Several rules in this codebase exist only
because the code says so, for example the S1–S4 ≥ 12 floor under header
protection, which appears in no documentation at all.

XRay has a check stronger than tests: `bun run configs` generates a matrix of
configurations and offers each one to **the core of the version it was made
for**. A single core for all versions proves nothing — unknown keys are ignored.
That check found three mistakes the unit tests had kept.

New protocol behaviour should come with a test that encodes the invariant, not
just the happy path. And beware the "simplified check": a test that works one
thing out and asserts another is a comment, not a test.

---

## Pull requests

Branch from `main`:

```bash
git checkout -b feature/my-change
git checkout -b fix/issue-42
```

| Prefix | Use for |
|:--|:--|
| `feature/` | new functionality |
| `fix/` | bug fixes |
| `docs/` | documentation |
| `refactor/` | restructuring without behaviour change |
| `test/` | tests |

Before opening a PR, make sure `bun run typecheck` and `bun run test:run` both
pass. In the description, say **what** changes, **why** it is needed, and
attach a screenshot for anything visual.

---

## Domain proposals

The donor-domain database in `src/shared/domains.ts` is maintained by hand and
needs verification. Use the issue templates — they ask for the country and ISP
you tested from, which matters: reachability varies enormously by network, and
without it a local block cannot be told apart from a global one.

The database holds facts rather than judgements: what the site is, where it is
hosted, what its TLS and HTTP look like. Invented statuses like "good donor" are
not in it and will not be — they go stale faster than anyone can maintain them.

> Please do not add a domain you have not personally checked from the region it
> is meant to serve.

---

## Bug reports

Use the issue templates. For a config that will not connect, the important
fields are the AmneziaWG or Xray version, the client and its version, and the
parameters themselves.

Worth saying separately: **reading the code against the upstream sources is the
most useful kind of issue there is here.** Three mistakes — in the size-collision
rules, in the header-protection warning, and in an FAQ answer — were found that
way, by reading rather than by reproducing. If you are checking this generator
against your own and see a disagreement, say so; the odds are you are right.

> **Never paste private keys.** Remove `PrivateKey`, `PresharedKey`,
> `HeaderProtectionKey` and the private half of a REALITY key pair — they are
> not needed to reproduce anything, and a key posted in an issue is a key that
> has to be rotated.
