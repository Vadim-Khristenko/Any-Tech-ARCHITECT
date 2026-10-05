<script setup lang="ts">
/**
 * VAIEXIA — a status report, not an announcement.
 *
 * The previous version of this page was six identical cards of promises under
 * a "SOON" badge, and its one link pointed at the Amnezia app mirror rather
 * than at VAIEXIA at all. An announcement asks to be believed; nothing on it
 * could be checked.
 *
 * So the page is built out of what the forge reports. The centrepiece is a
 * section drawing through the stack, bottom-up, with the written layers solid
 * and the unwritten ones hatched — the line between them is the honest answer
 * to "how far along is this". Under it, every repository in the organisation,
 * including the six that hold no code.
 *
 * Every claim about a layer comes from that crate's own README. Numbers come
 * from src/data/vaiexia.ts, which says out loud which day it was read.
 */

import { computed } from "vue";
import {
    ArrowUpRight,
    Check,
    Copy,
    ExternalLink,
    Info,
    Layers,
    ArrowRight,
} from "lucide-vue-next";
import { localizePath, useI18n } from "@/i18n";
import { useCopyFeedback } from "@/composables/useCopyFeedback";
import {
    SNAPSHOT,
    VAIEXIA_ORG,
    VAIEXIA_REPOS,
    VAIEXIA_STACK,
    builtCount,
    builtSize,
    repoCount,
} from "@/data/vaiexia";

const { locale, t } = useI18n();
const at = (path: string) => localizePath(path, locale.value);

const { isCopied, copy } = useCopyFeedback();
const ORG_KEY = "org";

/** Dates are facts from the forge; only their formatting is local. */
const dateFmt = computed(
    () =>
        new Intl.DateTimeFormat(locale.value === "ru" ? "ru-RU" : "en-GB", {
            day: "numeric",
            month: "short",
        }),
);
const day = (iso: string) => dateFmt.value.format(new Date(iso));

const snapshotLong = computed(() =>
    new Intl.DateTimeFormat(locale.value === "ru" ? "ru-RU" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(SNAPSHOT)),
);

/**
 * The strata are declared bottom-up and drawn top-down, which is how a section
 * is read: the surface at the top, the foundation under everything.
 */
const strata = computed(() => VAIEXIA_STACK);

const STATS = computed(() => [
    { key: "repos", value: String(repoCount) },
    { key: "built", value: `${builtCount} / ${repoCount}` },
    { key: "size", value: String(builtSize) },
    { key: "lang", value: "Rust" },
]);

/** The ledger keeps the stack's order, so the built ones read as a run. */
const rows = computed(() => VAIEXIA_REPOS);

const tk = (key: string) => t(key as "vaiexia.badge");
</script>

<template>
    <div class="vx rise">
        <!-- ══ Hero ═════════════════════════════════════════════════════ -->
        <header class="vx-hero">
            <div class="vx-hero-copy">
                <span class="badge badge--quiet vx-badge">
                    <span class="dot dot--live"></span>
                    {{ t("vaiexia.badge") }}
                </span>

                <h1 class="display vx-name">VAIEXIA</h1>

                <p class="lede vx-lede">{{ t("vaiexia.lede") }}</p>
                <p class="prose vx-desc">{{ t("vaiexia.desc") }}</p>
            </div>

            <div class="titleblock vx-stats">
                <div v-for="s in STATS" :key="s.key" class="titleblock-cell">
                    <span class="titleblock-key">
                        {{ tk(`vaiexia.stat.${s.key}`) }}
                    </span>
                    <span class="titleblock-val">{{ s.value }}</span>
                </div>
            </div>

            <p class="vx-snapshot mono">
                {{ t("vaiexia.snapshot", { date: snapshotLong }) }}
            </p>
        </header>

        <!-- ══ The section drawing ══════════════════════════════════════ -->
        <section class="vx-section">
            <h2 class="h">{{ t("vaiexia.stack.title") }}</h2>
            <p class="lede">{{ t("vaiexia.stack.lede") }}</p>

            <!--
                Top-down on screen, foundation last. The unwritten layer is not
                omitted and not greyed out as an afterthought: it is drawn in
                the same place at the same size, hatched, because where the
                building stops is the thing this drawing is about.
            -->
            <div class="vx-strata">
                <article
                    v-for="(l, i) in strata"
                    :key="l.key"
                    class="vx-stratum"
                    :class="l.built ? 'vx-stratum--built' : 'vx-stratum--open void'"
                    :style="{ '--i': i }"
                >
                    <header class="vx-stratum-head">
                        <h3 class="vx-stratum-title">
                            {{ tk(`vaiexia.stack.${l.key}.title`) }}
                        </h3>
                        <code class="code vx-stratum-crate">{{ l.crate }}</code>
                        <span
                            class="badge vx-stratum-state"
                            :class="l.built ? 'badge--ok' : 'badge--quiet'"
                        >
                            {{
                                l.built
                                    ? t("vaiexia.stack.built")
                                    : t("vaiexia.stack.planned")
                            }}
                        </span>
                    </header>

                    <ul class="vx-points">
                        <li v-for="p in l.points" :key="p" class="vx-point">
                            {{ tk(`vaiexia.stack.${l.key}.${p}`) }}
                        </li>
                    </ul>
                </article>
            </div>
        </section>

        <!-- ══ The ledger ═══════════════════════════════════════════════ -->
        <section class="vx-section">
            <h2 class="h">{{ t("vaiexia.ledger.title") }}</h2>
            <p class="lede">{{ t("vaiexia.ledger.lede") }}</p>

            <div class="tablewrap">
                <table class="table vx-table">
                    <thead>
                        <tr>
                            <th>{{ t("vaiexia.ledger.col.repo") }}</th>
                            <th>{{ t("vaiexia.ledger.col.what") }}</th>
                            <th>{{ t("vaiexia.ledger.col.state") }}</th>
                            <th>{{ t("vaiexia.ledger.col.touched") }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="r in rows"
                            :key="r.name"
                            :class="{ 'vx-row--open': !r.built }"
                        >
                            <td>
                                <a
                                    class="vx-repo"
                                    :href="`${VAIEXIA_ORG}/${r.name}`"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {{ r.name }}
                                    <ArrowUpRight :size="12" />
                                </a>
                            </td>
                            <td>{{ tk(`vaiexia.repo.${r.key}`) }}</td>
                            <td class="vx-state">
                                <span
                                    class="dot"
                                    :class="r.built ? 'dot--ok' : ''"
                                ></span>
                                <span class="mono">
                                    {{
                                        r.built
                                            ? t("vaiexia.ledger.size", { n: r.size })
                                            : t("vaiexia.ledger.empty")
                                    }}
                                </span>
                            </td>
                            <td class="mono vx-touched">{{ day(r.touched) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- ══ Where it meets Architect ═════════════════════════════════ -->
        <section class="vx-section">
            <div class="panel vx-bridge">
                <div class="panel-head">
                    <Layers :size="17" />
                    <h2 class="panel-title">{{ t("vaiexia.bridge.title") }}</h2>
                </div>
                <div class="panel-body">
                    <p class="prose">{{ t("vaiexia.bridge.lede") }}</p>
                    <p class="prose vx-muted">{{ t("vaiexia.bridge.note") }}</p>

                    <router-link :to="at('/amneziawg')" class="btn btn-secondary">
                        <span>{{ t("vaiexia.bridge.go") }}</span>
                        <ArrowRight :size="15" />
                    </router-link>
                </div>
            </div>
        </section>

        <!-- ══ Go and look ══════════════════════════════════════════════ -->
        <section class="vx-section">
            <h2 class="h">{{ t("vaiexia.go.title") }}</h2>
            <p class="lede">{{ t("vaiexia.go.lede") }}</p>

            <div class="vx-org">
                <code class="code vx-org-url">{{ VAIEXIA_ORG }}</code>
                <button
                    class="btn btn-ghost btn-icon"
                    :class="{ 'vx-copied': isCopied(ORG_KEY) }"
                    :aria-label="t('vaiexia.go.copy')"
                    @click="copy(ORG_KEY, VAIEXIA_ORG)"
                >
                    <Check v-if="isCopied(ORG_KEY)" :size="16" />
                    <Copy v-else :size="16" />
                </button>
                <a
                    class="btn btn-primary"
                    :href="VAIEXIA_ORG"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <ExternalLink :size="15" />
                    <span>{{ t("vaiexia.go.open") }}</span>
                </a>
            </div>
        </section>

        <!-- ══ What is not there ════════════════════════════════════════ -->
        <section class="vx-section vx-section--last">
            <div class="well vx-caveat">
                <div class="vx-caveat-head">
                    <Info :size="16" />
                    <h2 class="vx-caveat-title">{{ t("vaiexia.caveat.title") }}</h2>
                </div>
                <p class="prose">{{ t("vaiexia.caveat.body") }}</p>
                <p class="prose vx-muted">{{ t("vaiexia.caveat.snapshot") }}</p>
            </div>
        </section>
    </div>
</template>

<style scoped>
.vx {
    max-width: 1060px;
    margin: 0 auto;
    padding: var(--sp-8) var(--sp-gutter) var(--sp-10);
}

.vx-section {
    margin-top: var(--sp-section);
}

.vx-section--last {
    margin-bottom: 0;
}

/* ── Hero ─────────────────────────────────────────────────────────────── */
.vx-hero-copy {
    max-width: 62ch;
}

.vx-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    margin-bottom: var(--sp-5);
}

/*
 * Solid, not a gradient. The name used to be clipped out of a two-stop
 * background, which reads as decoration applied to a word rather than as the
 * word being the brand.
 */
.vx-name {
    margin: 0 0 var(--sp-4);
    color: var(--accent-ink);
}

.vx-lede {
    margin: 0 0 var(--sp-4);
}

.vx-desc {
    margin: 0;
}

.vx-stats {
    margin-top: var(--sp-7);
}

.vx-snapshot {
    margin: var(--sp-3) 0 0;
    font-size: var(--t-2xs);
    color: var(--ink-4);
    letter-spacing: var(--track-mono);
}

/* ── The section drawing ──────────────────────────────────────────────── */
.vx-strata {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    margin-top: var(--sp-6);
}

.vx-stratum {
    padding: var(--sp-5) var(--sp-5) var(--sp-4);
    animation: vx-settle 620ms var(--ease, cubic-bezier(0.16, 1, 0.3, 1)) backwards;
    animation-delay: calc(var(--i) * 80ms);
}

/*
 * Written layers carry the accent wash and a solid rule; unwritten ones keep
 * the hatch from the kit's `.void` and a dashed edge. Same box, same padding,
 * different material — which is what a section drawing does with a floor that
 * is planned rather than poured.
 */
.vx-stratum--built {
    background: var(--surface-solid);
    border: var(--rule) solid var(--line);
    border-radius: var(--r-1);
    border-left: var(--rule) solid var(--line);
}

.vx-stratum--open {
    color: var(--ink-3);
}

.vx-stratum-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: var(--sp-3);
    margin-bottom: var(--sp-3);
}

.vx-stratum-title {
    margin: 0;
    font-family: var(--fw);
    font-weight: 800;
    font-size: var(--t-md);
    color: var(--text);
}

.vx-stratum--open .vx-stratum-title {
    color: var(--ink-3);
}

.vx-stratum-crate {
    font-size: var(--t-2xs);
}

.vx-stratum-state {
    margin-left: auto;
}

.vx-points {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--sp-2);
}

.vx-point {
    position: relative;
    padding-left: var(--sp-5);
    font-size: var(--t-sm);
    line-height: 1.6;
    color: var(--ink-2);
    text-wrap: pretty;
}

.vx-stratum--open .vx-point {
    color: var(--ink-3);
}

/* A tick on the leader line, not a bullet: this is a drawing, not a list. */
.vx-point::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0.62em;
    width: var(--sp-3);
    height: 0;
    border-top: var(--rule) solid var(--accent-ink);
    opacity: 0.55;
}

.vx-stratum--open .vx-point::before {
    border-top-style: dashed;
    opacity: 0.4;
}

@keyframes vx-settle {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: none;
    }
}

/* ── Ledger ───────────────────────────────────────────────────────────── */
.vx-table {
    margin-top: var(--sp-6);
}

.vx-row--open td {
    color: var(--ink-3);
}

.vx-repo {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    font-family: var(--fm);
    font-size: var(--t-xs);
    color: var(--accent-ink);
    text-decoration: none;
    white-space: nowrap;
}

.vx-repo:hover {
    text-decoration: underline;
}

.vx-state {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    white-space: nowrap;
}

.vx-state .mono {
    font-size: var(--t-xs);
}

.vx-touched {
    font-size: var(--t-xs);
    color: var(--ink-3);
    white-space: nowrap;
}

/* ── Bridge ───────────────────────────────────────────────────────────── */
.vx-bridge .panel-body {
    display: grid;
    gap: var(--sp-4);
    justify-items: start;
}

.vx-muted {
    color: var(--ink-3);
    font-size: var(--t-sm);
}

/* ── Org link ─────────────────────────────────────────────────────────── */
.vx-org {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex-wrap: wrap;
    margin-top: var(--sp-5);
}

.vx-org-url {
    flex: 1;
    min-width: 0;
    padding: var(--sp-3) var(--sp-4);
    overflow-x: auto;
    white-space: nowrap;
}

.vx-copied {
    color: var(--green);
}

/* ── Caveat ───────────────────────────────────────────────────────────── */
.vx-caveat {
    display: grid;
    gap: var(--sp-3);
}

.vx-caveat-head {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    color: var(--accent-ink);
}

.vx-caveat-title {
    margin: 0;
    font-family: var(--fw);
    font-weight: 800;
    font-size: var(--t-md);
    color: var(--text);
}

@media (max-width: 720px) {
    .vx {
        padding: var(--sp-6) var(--sp-gutter) var(--sp-8);
    }

    .vx-stratum-state {
        margin-left: 0;
    }
}

@media (prefers-reduced-motion: reduce) {
    .vx-stratum {
        animation: none;
    }
}
</style>
