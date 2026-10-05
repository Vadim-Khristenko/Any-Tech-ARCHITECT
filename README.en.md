<div align="center">

<img src=".github/assets/github-preview.png" alt="Any Tech ARCHITECT" width="100%">

# Any Tech ARCHITECT Lite

[Русский](README.md) · **English**

[![Full version](https://img.shields.io/badge/Full_version-architect.vai--rice.space-e8a840?style=for-the-badge)](https://architect.vai-rice.space/en)
[![Lite](https://img.shields.io/badge/branch-lite-7a6f5f?style=for-the-badge)](#what-this-is)
[![MIT](https://img.shields.io/badge/License-MIT-c49040?style=for-the-badge)](LICENSE)

</div>

> [!WARNING]
> **This branch is updated rarely.** Lite catches up with the main version from
> time to time, not with every release, so it may lack recent fixes and new
> profiles. If you have a decent browser and a connection, use the full
> version: the site
> **[architect.vai-rice.space](https://architect.vai-rice.space/en)** or the
> [main release](https://github.com/Vadim-Khristenko/Any-Tech-ARCHITECT/releases/latest)
> from the [`main`](https://github.com/Vadim-Khristenko/Any-Tech-ARCHITECT/tree/main) branch.

---

## What this is

A very lightweight build of Architect for weak devices, slow links and working
offline. **One HTML file of about 170 KB**: download it, open it from disk, and
it works with no internet, no install and no outside requests.

The branch currently matches main version **4.4.0**.

| What is in | What is not |
|:--|:--|
| The AmneziaWG 1.0, 1.5, 2.0, 3.0 and 3.1 generator | XRay / REALITY |
| All 12 mimicry profiles, STUN / TURN included | The packet simulator |
| All 14 clients with their ceilings and builds | MergeKeys and `vpn://` |
| The 3.x block switches and the 3.1 flags | The FAQ and the About page |
| A check for pasted `.conf` files | Batch generation and history |
| Russian and English | Animation, web fonts, icons |

The generator, the check rules and the finding texts are the same as in the
main version rather than rewritten: lite is built from the same engine code.

## Download

The ready file is in the
[**lite-v4.4.0**](https://github.com/Vadim-Khristenko/Any-Tech-ARCHITECT/releases/tag/lite-v4.4.0)
pre-release: `any-tech-architect-lite-v4.4.0.html`. Open it in any browser. A
zip and checksums sit next to it.

## How it is built

The full version carries an 818 KB domain database, reactive Vue and the
translation catalogues of every page. Lite does without them:

- **Domains.** The generator does not need the whole database, only a random
  host from the right pool (region, role, DNS query type).
  `scripts/lite/prepare.ts` resolves those pools ahead of time with the same
  rules and fallbacks as `pickHost`, about 64 KB instead of 818. The hosts come
  out with the same distribution.
- **Text.** Only findings, client notes and `.conf` comments are taken from
  the catalogues.
- **Interface.** Plain TypeScript, no framework.
- **One file.** `vite.lite.config.ts` writes the script and styles into the HTML.

The tests in `src/lite/__tests__` hold the prepared data to its sources, so a
stale copy does not pass CI.

## Building

```bash
git clone -b lite https://github.com/Vadim-Khristenko/Any-Tech-ARCHITECT.git
cd Any-Tech-ARCHITECT
bun install
bun run build:lite      # dist-lite/index.html
```

Needs Bun 1.4 or newer. `bun run lite:prepare` rebuilds the data in
`src/lite/generated` on its own.

## How the branch is updated

The lite branch is `main` plus the lite files (`src/lite`, `scripts/lite`,
`vite.lite.config.ts`, `.github/workflows/build-lite.yml`, this README). To
catch up with a new version, `main` is merged into `lite`, the data is rebuilt
with `bun run lite:prepare`, and a push to the branch runs the
[pipeline](.github/workflows/build-lite.yml): tests, build, a size check (300 KB
at most) and a `lite-vX.Y.Z` pre-release that never becomes the latest release.

---

<div align="center">

**[MIT](LICENSE)** · Made for the AmneziaVPN community

</div>
