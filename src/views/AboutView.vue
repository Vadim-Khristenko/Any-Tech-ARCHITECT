<script setup lang="ts">
/**
 * About — what this is, who made it, and what it will not do.
 *
 * Rebuilt on the kit. The page it replaces had grown a section per idea over a
 * year and read like a changelog of its own intentions; this one answers, in
 * order, the questions somebody actually arrives with: am I allowed to use
 * this, how big is it, what is it, how did it get here, what does it know
 * about me, where is the source, and who is behind it.
 *
 * Every number on it is checked against the code rather than typed once and
 * left. The parameter count comes from the two catalogues, the client count
 * from the client registry, the FAQ count from the FAQ, and the days from a
 * date — so none of them can quietly go stale.
 */

import { computed, ref, type Component } from "vue";
import {
    Scale,
    ShieldCheck,
    Sparkles,
    History as HistoryIcon,
    EyeOff,
    Github,
    GitBranch,
    Bug,
    Heart,
    ChevronDown,
    ArrowUpRight,
    Ruler,
    FlaskConical,
    WifiOff,
    BookOpen,
} from "lucide-vue-next";

import SupportSection from "@/components/SupportSection.vue";
import RichText from "@/components/RichText";
import { localizePath, useI18n, pick } from "@/i18n";
import { TIMELINE } from "@/data/changelog";
import { FAQ_ENTRIES } from "@/data/faq";
import { OTHER_PROJECTS } from "@/data/support";
import { AWG_PARAMETERS } from "@/engines/awg/generator/params";
import { XRAY_PARAMETERS } from "@/engines/xray/params";
import { AWG_CLIENT_PROFILES } from "@/engines/awg/generator/clients";

const { locale, t } = useI18n();
const at = (path: string) => localizePath(path, locale.value);

const SOURCE_URL = "https://github.com/Vadim-Khristenko/Any-Tech-ARCHITECT";
const MIRROR_URL = "https://git.vai-rice.space/vai_prog/Any-Tech-ARCHITECT";
const LICENSE_URL = "https://opensource.org/license/mit";

/* ── The numbers, counted rather than remembered ─────────────────────────── */

/**
 * Distinct parameters across both engines.
 *
 * By key, not by catalogue entry: AmneziaWG describes `H1` twice, once as a
 * single value for 1.x and once as a range for 2.0+, and counting the entries
 * would claim four parameters that are two.
 */
/* Counted, not typed: the text used to say "forty-four" and went stale. */
const faqCount = FAQ_ENTRIES.length;

const paramCount = computed(() => {
    const awg = new Set(AWG_PARAMETERS.map((p) => p.key)).size;
    const xray = new Set(XRAY_PARAMETERS.map((p) => p.key)).size;
    return awg + xray;
});

const clientCount = AWG_CLIENT_PROFILES.length;

/**
 * How long this has been going, in days.
 *
 * Counted from the start date every time the page renders. A number typed into
 * a string is right on the day it is written and wrong every day after.
 */
const START = Date.UTC(2026, 2, 1);
const dayCount = computed(() =>
    Math.max(1, Math.floor((Date.now() - START) / 86_400_000)),
);

/**
 * The test count is the one figure here that cannot be derived at runtime —
 * the suite does not exist in the bundle — so it is written as a floor rather
 * than an exact number, and a floor stays true as the suite grows.
 * 4.1.1: 1015 tests — bump floor to 1000+.
 */
const TEST_FLOOR = "1000+";

const chips = computed(() => [
    {
        id: "protocols",
        value: t("about.chip.protocols.value"),
        label: t("about.chip.protocols.label"),
        hint: "",
        span: 2,
    },
    {
        id: "params",
        value: String(paramCount.value),
        label: t("about.chip.params.label"),
        hint: t("about.chip.params.hint"),
        span: 1,
    },
    {
        id: "tests",
        value: TEST_FLOOR,
        label: t("about.chip.tests.label"),
        hint: t("about.chip.tests.hint"),
        span: 1,
    },
    {
        id: "clients",
        value: `${clientCount}`,
        label: t("about.chip.clients.label"),
        hint: t("about.chip.clients.hint"),
        span: 1,
    },
    {
        id: "people",
        value: t("about.chip.people.value"),
        label: t("about.chip.people.label"),
        hint: t("about.chip.people.hint"),
        span: 2,
    },
    {
        id: "days",
        value: String(dayCount.value),
        label: t("about.chip.days.label"),
        hint: t("about.chip.days.hint"),
        span: 1,
    },
]);

/* ── What it is ──────────────────────────────────────────────────────────── */

const WHAT: { icon: Component; n: 1 | 2 | 3 | 4 }[] = [
    { icon: Ruler, n: 1 },
    { icon: FlaskConical, n: 2 },
    { icon: WifiOff, n: 3 },
    { icon: BookOpen, n: 4 },
];

/* ── Timeline ────────────────────────────────────────────────────────────── */

const TIMELINE_ICONS: Record<string, Component> = {
    Rocket: Sparkles,
    Bug,
    Code: Ruler,
    Wrench: Ruler,
    GitMerge: GitBranch,
    Eye: EyeOff,
    Paintbrush: Sparkles,
    Sparkles,
    Layers: Ruler,
    Globe: ShieldCheck,
    Star: Sparkles,
    Cpu: Ruler,
    ShieldCheck,
};

/** Newest first: the entry a returning reader came for is the last one. */
const entries = computed(() =>
    [...TIMELINE].reverse().map((e) => ({
        version: e.version,
        date: pick(e.date, locale.value),
        title: pick(e.title, locale.value),
        desc: pick(e.desc, locale.value),
        icon: TIMELINE_ICONS[e.icon] ?? Sparkles,
        color: e.color,
    })),
);

/**
 * The newest is open on arrival.
 *
 * It was a list of closed rows, so the thing most people came to read took a
 * click to find, and which row it was took reading the version numbers.
 */
const openEntry = ref(0);
const toggleEntry = (i: number) => (openEntry.value = openEntry.value === i ? -1 : i);

/* ── Privacy ─────────────────────────────────────────────────────────────── */

const PRIVACY = [1, 2, 3, 4, 5] as const;

const projects = computed(() =>
    OTHER_PROJECTS.map((p) => ({
        id: p.id,
        title: pick(p.title, locale.value),
        desc: pick(p.desc, locale.value),
        url: p.url,
        external: p.url.startsWith("http"),
    })),
);
</script>

<template>
    <div class="about">
        <!-- ══ Hero ════════════════════════════════════════════════════ -->
        <header class="about-hero rise">
            <div class="about-lockup">
                <span class="about-pre">{{ t("brand.pre") }}</span>
                <h1 class="about-name">{{ t("brand.main") }}</h1>
            </div>
            <p class="about-tagline">{{ t("about.hero.tagline") }}</p>
            <p class="about-motto">{{ t("about.hero.motto") }}</p>
        </header>

        <!-- ══ Legal ═══════════════════════════════════════════════════ -->
        <section class="zone about-legal">
            <div class="zone-head">
                <Scale :size="15" class="about-icon" />
                <span class="zone-title">{{ t("about.legal.title") }}</span>
            </div>

            <div class="zone-body">
                <p class="prose">{{ t("about.legal.lede") }}</p>
                <p class="prose">
                    {{ t("about.legal.asis") }}
                    <a
                        :href="LICENSE_URL"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="about-link"
                    >
                        {{ t("about.legal.licenseLink") }}
                        <ArrowUpRight :size="13" />
                    </a>
                </p>

                <div class="about-legal-split">
                    <div>
                        <h3 class="about-h3">{{ t("about.legal.forTitle") }}</h3>
                        <ul class="list about-uses">
                            <li v-for="n in 4" :key="n" class="list-item">
                                <ShieldCheck :size="15" class="about-use-icon" />
                                <span>{{ t(`about.legal.for.${n}` as never) }}</span>
                            </li>
                        </ul>
                    </div>

                    <!--
                        The warning is a note rather than a heading in red: it
                        is the one paragraph on the page a reader must not skim,
                        and a shouted heading is exactly what gets skimmed.
                    -->
                    <div class="note note--warn about-warn">
                        <span class="note-body">
                            <span class="note-label">{{ t("about.legal.warnTitle") }}</span>
                            <span>{{ t("about.legal.warn") }}</span>
                        </span>
                    </div>
                </div>
            </div>
        </section>

        <!-- ══ Chips ═══════════════════════════════════════════════════ -->
        <!--
            Two rows of three, 2·1·1 over 1·2·1, so the two that need a
            sentence get the room and the four that are one number do not.
        -->
        <div class="about-chips">
            <div
                v-for="c in chips"
                :key="c.id"
                class="about-chip"
                :class="`about-chip--${c.span}`"
            >
                <span class="about-chip-value">{{ c.value }}</span>
                <span class="about-chip-label">{{ c.label }}</span>
                <span v-if="c.hint" class="about-chip-hint">{{ c.hint }}</span>
            </div>
        </div>

        <!-- ══ What it is ══════════════════════════════════════════════ -->
        <section class="about-section">
            <h2 class="about-h2">{{ t("about.what.title") }}</h2>
            <p class="lede">{{ t("about.what.lede") }}</p>
            <p class="prose">{{ t("about.what.p1") }}</p>
            <p class="prose">{{ t("about.what.p2") }}</p>

            <div class="grid grid--wide about-cards">
                <div v-for="w in WHAT" :key="w.n" class="card about-card">
                    <component :is="w.icon" :size="18" class="about-card-icon" />
                    <h3 class="about-h3">
                        {{ t(`about.what.card.${w.n}.title` as never) }}
                    </h3>
                    <p class="prose">{{ t(`about.what.card.${w.n}.desc` as never, { n: faqCount }) }}</p>
                </div>
            </div>
        </section>

        <!-- ══ Timeline ════════════════════════════════════════════════ -->
        <section class="about-section">
            <h2 class="about-h2">{{ t("about.timeline.title") }}</h2>
            <p class="lede">{{ t("about.timeline.lede") }}</p>

            <!-- What a number means here, said once beside the numbers. -->
            <div class="about-scheme">
                <span class="about-scheme-item">
                    {{ t("about.timeline.scheme.major") }}
                </span>
                <span class="about-scheme-item">
                    {{ t("about.timeline.scheme.minor") }}
                </span>
                <span class="about-scheme-item">
                    {{ t("about.timeline.scheme.patch") }}
                </span>
            </div>

            <div class="about-timeline">
                <article
                    v-for="(e, i) in entries"
                    :key="e.version"
                    class="about-entry"
                    :class="{ 'is-open': openEntry === i }"
                >
                    <button class="about-entry-head" @click="toggleEntry(i)">
                        <span class="rev about-entry-ver">v{{ e.version }}</span>
                        <span class="about-entry-title">{{ e.title }}</span>
                        <span class="about-entry-date">{{ e.date }}</span>
                        <ChevronDown
                            :size="15"
                            class="chevron about-entry-arrow"
                            :style="{
                                transform: openEntry === i ? 'rotate(180deg)' : 'none',
                            }"
                        />
                    </button>

                    <div class="disclose" :class="{ 'is-open': openEntry === i }">
                        <div>
                            <div class="about-entry-body">
                                <RichText :text="e.desc" />
                            </div>
                        </div>
                    </div>
                </article>
            </div>
        </section>

        <!-- ══ Privacy ═════════════════════════════════════════════════ -->
        <section class="about-section">
            <h2 class="about-h2">{{ t("about.privacy.title") }}</h2>
            <p class="lede">{{ t("about.privacy.lede") }}</p>

            <div class="grid grid--wide about-cards">
                <div v-for="n in PRIVACY" :key="n" class="card about-card">
                    <EyeOff :size="18" class="about-card-icon" />
                    <h3 class="about-h3">
                        {{ t(`about.privacy.${n}.title` as never) }}
                    </h3>
                    <p class="prose">{{ t(`about.privacy.${n}.desc` as never) }}</p>
                </div>
            </div>
        </section>

        <!-- ══ Source ══════════════════════════════════════════════════ -->
        <section class="about-section">
            <h2 class="about-h2">{{ t("about.source.title") }}</h2>
            <p class="lede">{{ t("about.source.lede") }}</p>

            <div class="grid about-cards">
                <a
                    :href="SOURCE_URL"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="card lift press about-card"
                >
                    <Github :size="18" class="about-card-icon" />
                    <h3 class="about-h3">{{ t("about.source.github") }}</h3>
                    <p class="prose">{{ t("about.source.githubDesc") }}</p>
                </a>

                <a
                    :href="MIRROR_URL"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="card lift press about-card"
                >
                    <GitBranch :size="18" class="about-card-icon" />
                    <h3 class="about-h3">{{ t("about.source.mirror") }}</h3>
                    <p class="prose">{{ t("about.source.mirrorDesc") }}</p>
                </a>

                <a
                    :href="`${SOURCE_URL}/issues`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="card lift press about-card"
                >
                    <Bug :size="18" class="about-card-icon" />
                    <h3 class="about-h3">{{ t("about.source.bugs") }}</h3>
                    <p class="prose">{{ t("about.source.bugsDesc") }}</p>
                    <span class="about-card-go">
                        {{ t("about.source.bugsGo") }}
                        <ArrowUpRight :size="14" />
                    </span>
                </a>
            </div>
        </section>

        <!-- ══ Donations ═══════════════════════════════════════════════ -->
        <SupportSection id="support" />

        <!-- ══ Who ═════════════════════════════════════════════════════ -->
        <section class="zone about-author">
            <div class="zone-head">
                <Heart :size="15" class="about-icon" />
                <span class="zone-title">{{ t("about.author.title") }}</span>
            </div>

            <div class="zone-body">
                <p class="prose">{{ t("about.author.p1") }}</p>
                <p class="prose">{{ t("about.author.p2") }}</p>

                <h3 class="about-h3">{{ t("about.author.projects") }}</h3>
                <div class="grid about-projects">
                    <component
                        :is="p.external ? 'a' : 'router-link'"
                        v-for="p in projects"
                        :key="p.id"
                        v-bind="
                            p.external
                                ? { href: p.url, target: '_blank', rel: 'noopener noreferrer' }
                                : { to: at(p.url) }
                        "
                        class="card lift press about-card"
                    >
                        <h3 class="about-h3">{{ p.title }}</h3>
                        <p class="prose">{{ p.desc }}</p>
                    </component>
                </div>

                <p class="prose about-author-donate">{{ t("about.author.donate") }}</p>
            </div>
        </section>
    </div>
</template>

<style scoped>
.about {
    max-width: 1000px;
    margin: 0 auto;
    padding: var(--sp-8) var(--sp-gutter) var(--sp-10);
    display: flex;
    flex-direction: column;
    gap: var(--sp-8);
}

/* ── Hero ─────────────────────────────────────────────────────────────── */

.about-hero {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
}

.about-lockup {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    line-height: 1;
}

.about-pre {
    font-family: var(--fm);
    font-size: var(--t-xs);
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: var(--ink-3);
}

.about-name {
    margin: 0;
    font-family: var(--fu);
    font-size: clamp(2.2rem, 6vw, 4rem);
    font-weight: 800;
    letter-spacing: var(--track-display);
    color: var(--accent-ink);
}

.about-tagline {
    margin: var(--sp-2) 0 0;
    font-family: var(--fu);
    font-size: var(--t-lg);
    color: var(--ink);
}

.about-motto {
    margin: 0;
    font-family: var(--fm);
    font-size: var(--t-sm);
    letter-spacing: var(--track-label);
    color: var(--ink-3);
}

/* ── Shared type ──────────────────────────────────────────────────────── */

.about-h2 {
    margin: 0;
    font-family: var(--fu);
    font-size: var(--t-xl);
    font-weight: 700;
    letter-spacing: var(--track-tight);
    color: var(--ink);
}

.about-h3 {
    margin: 0;
    font-family: var(--fu);
    font-size: var(--t-base);
    font-weight: 700;
    color: var(--ink);
}

.about-icon {
    color: var(--accent-ink);
    flex-shrink: 0;
}

.about-section {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
}

.about-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--accent-ink);
    text-decoration: underline;
    text-decoration-color: var(--line);
    text-underline-offset: 3px;
}

.about-link:hover {
    text-decoration-color: currentcolor;
}

/* ── Legal ────────────────────────────────────────────────────────────── */

.about-legal-split {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    align-items: start;
    gap: var(--sp-5);
    margin-top: var(--sp-2);
}

.about-uses {
    margin-top: var(--sp-3);
    border: var(--rule) solid var(--line-faint);
    border-radius: var(--r-2);
    overflow: hidden;
}

.about-use-icon {
    flex-shrink: 0;
    color: var(--green);
}

.about-warn .note-body {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
}

/* ── Chips ────────────────────────────────────────────────────────────── */

/*
 * Four columns, so a chip can take two of them. The two that need a sentence
 * — the two protocols and where the visitor count comes from — get the width;
 * the four that are one number do not need it.
 */
.about-chips {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--sp-3);
}

.about-chip {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--sp-4) var(--sp-5);
    background: var(--ground-2);
    border: var(--rule) solid var(--line-soft);
    border-radius: var(--r-3);
}

.about-chip--2 {
    grid-column: span 2;
}

.about-chip-value {
    font-family: var(--fu);
    font-size: var(--t-lg);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: var(--track-tight);
    color: var(--accent-ink);
}

.about-chip-label {
    font-size: var(--t-sm);
    color: var(--ink-2);
}

.about-chip-hint {
    margin-top: var(--sp-1);
    font-size: var(--t-2xs);
    line-height: 1.45;
    color: var(--ink-3);
}

/* ── Cards ────────────────────────────────────────────────────────────── */

.about-cards {
    margin-top: var(--sp-2);
}

.about-card {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
}

.about-card-icon {
    color: var(--accent-ink);
}

.about-card-go {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: auto;
    padding-top: var(--sp-2);
    font-family: var(--fm);
    font-size: var(--t-2xs);
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--accent-ink);
}

/* ── Timeline ─────────────────────────────────────────────────────────── */

.about-scheme {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
}

.about-scheme-item {
    padding: 3px var(--sp-3);
    border: var(--rule) solid var(--line-faint);
    border-radius: var(--r-pill);
    background: var(--ground-2);
    font-family: var(--fm);
    font-size: var(--t-2xs);
    color: var(--ink-3);
}

.about-timeline {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
}

.about-entry {
    background: var(--ground-2);
    border: var(--rule) solid var(--line-soft);
    border-radius: var(--r-2);
    overflow: hidden;
}

.about-entry.is-open {
    border-color: var(--line);
}

.about-entry-head {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    width: 100%;
    padding: var(--sp-4) var(--sp-5);
    border: none;
    background: transparent;
    text-align: left;
    cursor: pointer;
}

.about-entry-head:hover {
    background: var(--surface-solid);
}

.about-entry-ver {
    flex-shrink: 0;
}

.about-entry-title {
    flex: 1;
    min-width: 0;
    font-family: var(--fw);
    font-size: var(--t-base);
    font-weight: 700;
    color: var(--ink);
}

.about-entry-date {
    font-family: var(--fm);
    font-size: var(--t-2xs);
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-3);
    white-space: nowrap;
}

.about-entry-arrow {
    transition: transform var(--dur-2) var(--ease-out-quart);
}

.about-entry-body {
    padding: 0 var(--sp-5) var(--sp-5);
    max-width: 74ch;
}

/* ── Author ───────────────────────────────────────────────────────────── */

.about-projects {
    margin-top: var(--sp-2);
}

.about-author-donate {
    margin-top: var(--sp-3);
    color: var(--ink-2);
}

/* ── Narrow ───────────────────────────────────────────────────────────── */

@media (max-width: 760px) {
    .about-chips {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .about-chip--2 {
        grid-column: 1 / -1;
    }

    .about-entry-date {
        display: none;
    }
}
</style>
