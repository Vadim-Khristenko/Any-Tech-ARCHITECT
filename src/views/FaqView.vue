<script setup lang="ts">
/**
 * FAQ — searchable, filterable, and emitted as FAQPage structured data.
 *
 * The JSON-LD block is built from the same source as the visible answers, so
 * what search engines index can never drift from what a visitor reads.
 *
 * Two things shape the layout. First, the list is long enough now that a flat
 * run of sixty-odd rows is not a reference, it is a scroll: with no search and
 * no filter the entries are grouped under their sections. Second, a filtered
 * or searched list carries its section on each card as a stamp — mixed
 * together there was no way to tell an XRay question from an AmneziaWG one
 * until you opened it.
 */
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import {
    Search,
    ChevronDown,
    X,
    Link2,
    Check,
    ChevronsDownUp,
    ChevronsUpDown,
} from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import { useI18n, pick } from "@/i18n";
import {
    FAQ_CATEGORIES,
    FAQ_ENTRIES,
    type FaqCategoryId,
    type FaqEntry,
} from "@/data/faq";
import ClientFieldGuide from "@/components/ClientFieldGuide.vue";
import { stripRich } from "@/utils/richText";
import RichText from "@/components/RichText";
import { useCopyFeedback } from "@/composables/useCopyFeedback";

const { locale, t } = useI18n();
const route = useRoute();
const router = useRouter();

const query = ref("");
const activeCategory = ref<FaqCategoryId | "all">("all");
const openIds = ref<Set<string>>(new Set());
const { copied: copiedId, copy } = useCopyFeedback();

/* ── Search ──────────────────────────────────────────────────────────────── */

/** Fold case and strip diacritics so "ё" matches "е" and casing never matters. */
function normalize(text: string): string {
    return text
        .toLowerCase()
        .replace(/ё/g, "е")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
}

const filtered = computed(() => {
    const q = normalize(query.value.trim());
    const cat = activeCategory.value;

    return FAQ_ENTRIES.filter((entry) => {
        if (cat !== "all" && entry.category !== cat) return false;
        if (!q) return true;

        // Search both languages: someone reading the Russian page may well be
        // searching for an English parameter name, and vice versa.
        const haystack = normalize(
            [
                pick(entry.question, "ru"),
                pick(entry.question, "en"),
                // Stripped, so a search for HeaderProtectionKey still matches
                // where the answer writes it in backticks.
                stripRich(pick(entry.answer, "ru")),
                stripRich(pick(entry.answer, "en")),
                ...(entry.keywords ?? []),
            ].join(" "),
        );
        return q.split(/\s+/).every((term) => haystack.includes(term));
    });
});

/** Counts per category for the filter chips. */
const counts = computed(() => {
    const out: Record<string, number> = { all: FAQ_ENTRIES.length };
    for (const c of FAQ_CATEGORIES) {
        out[c.id] = FAQ_ENTRIES.filter((e) => e.category === c.id).length;
    }
    return out;
});

const labelFor = (id: FaqCategoryId) =>
    FAQ_CATEGORIES.find((c) => c.id === id)?.label[locale.value] ?? id;

/* ── Grouping ────────────────────────────────────────────────────────────── */

/**
 * Group only when there is nothing narrowing the list.
 *
 * A search result is already a selection, and a section heading over two rows
 * is noise; one filtered category is its own group by definition.
 */
const grouped = computed(
    () => !query.value.trim() && activeCategory.value === "all",
);

const groups = computed(() => {
    const list = filtered.value;
    return FAQ_CATEGORIES.map((c) => ({
        id: c.id,
        label: c.label[locale.value],
        entries: list.filter((e) => e.category === c.id),
    })).filter((g): g is { id: FaqCategoryId; label: string; entries: FaqEntry[] } =>
        g.entries.length > 0,
    );
});

const STATS = computed(() => [
    { key: "answers", value: String(FAQ_ENTRIES.length) },
    { key: "sections", value: String(FAQ_CATEGORIES.length) },
    { key: "engines", value: "2" },
    { key: "updated", value: t("faq.stat.updated.value") },
]);

/* ── Disclosure ──────────────────────────────────────────────────────────── */

function toggle(id: string): void {
    const next = new Set(openIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    openIds.value = next;
}

const isOpen = (id: string) => openIds.value.has(id);

const allOpen = computed(
    () =>
        filtered.value.length > 0 &&
        filtered.value.every((e) => openIds.value.has(e.id)),
);

function toggleAll(): void {
    openIds.value = allOpen.value
        ? new Set()
        : new Set(filtered.value.map((e) => e.id));
}

/** Searching expands matches automatically — hunting twice is a chore. */
watch(query, (value) => {
    if (value.trim()) {
        openIds.value = new Set(filtered.value.map((e) => e.id));
    } else {
        openIds.value = new Set();
    }
});

function clearSearch(): void {
    query.value = "";
    activeCategory.value = "all";
}

/* ── Deep links ──────────────────────────────────────────────────────────── */

async function copyLink(id: string): Promise<void> {
    await copy(id, `${window.location.origin}${route.path}#${id}`);
    // The hash updates whether or not the copy worked, so the address bar
    // carries a shareable URL even when the browser refuses the clipboard.
    router.replace({ hash: `#${id}` }).catch(() => {});
}

function openFromHash(): void {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const entry = FAQ_ENTRIES.find((e) => e.id === id);
    if (!entry) return;
    openIds.value = new Set([...openIds.value, id]);
    // Wait a frame so the panel has expanded before we scroll to it.
    requestAnimationFrame(() => {
        document
            .getElementById(id)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
}

/* ── Structured data ─────────────────────────────────────────────────────── */

const JSONLD_ID = "faq-jsonld";

function syncJsonLd(): void {
    const loc = locale.value;
    const payload = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQ_ENTRIES.map((entry) => ({
            "@type": "Question",
            // Stripped on both halves: a question carries marks now too.
            name: stripRich(pick(entry.question, loc)),
            acceptedAnswer: {
                "@type": "Answer",
                // Structured data must not carry markup, so the marks come
                // out here rather than the source being kept flat.
                text: stripRich(pick(entry.answer, loc)),
            },
        })),
    };

    let el = document.getElementById(JSONLD_ID);
    if (!el) {
        el = document.createElement("script");
        el.id = JSONLD_ID;
        el.setAttribute("type", "application/ld+json");
        document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(payload);
}

watch(locale, syncJsonLd);

onMounted(() => {
    syncJsonLd();
    openFromHash();
});

onBeforeUnmount(() => {
    document.getElementById(JSONLD_ID)?.remove();
});
</script>

<template>
    <div class="faq rise">
        <!-- ══ Hero ═════════════════════════════════════════════════════ -->
        <header class="faq-hero">
            <h1 class="faq-wordmark">
                <span class="faq-wordmark-pre">{{ t("faq.title.pre") }}</span>
                <span class="faq-wordmark-main">{{ t("faq.title.main") }}</span>
            </h1>

            <p class="lede faq-lede">{{ t("faq.lede") }}</p>

            <div class="titleblock faq-stats">
                <div v-for="s in STATS" :key="s.key" class="titleblock-cell">
                    <span class="titleblock-key">
                        {{ t(`faq.stat.${s.key}` as "faq.stat.answers") }}
                    </span>
                    <span class="titleblock-val">{{ s.value }}</span>
                </div>
            </div>
        </header>

        <!-- ══ Search and filters ═══════════════════════════════════════ -->
        <div class="faq-controls">
            <div class="faq-search">
                <Search :size="17" class="faq-search-icon" />
                <input
                    v-model="query"
                    type="search"
                    class="faq-search-input"
                    :placeholder="t('faq.search.placeholder')"
                    :aria-label="t('faq.search.label')"
                />
                <button
                    v-if="query"
                    class="faq-search-clear"
                    :aria-label="t('faq.search.clear')"
                    @click="clearSearch"
                >
                    <X :size="15" />
                </button>
            </div>

            <div class="faq-cats" role="tablist">
                <button
                    class="faq-cat"
                    :class="{ 'is-active': activeCategory === 'all' }"
                    role="tab"
                    :aria-selected="activeCategory === 'all'"
                    @click="activeCategory = 'all'"
                >
                    {{ t("faq.category.all") }}
                    <span class="faq-cat-n">{{ counts.all }}</span>
                </button>
                <button
                    v-for="cat in FAQ_CATEGORIES"
                    :key="cat.id"
                    class="faq-cat"
                    :class="{ 'is-active': activeCategory === cat.id }"
                    role="tab"
                    :aria-selected="activeCategory === cat.id"
                    @click="activeCategory = cat.id"
                >
                    {{ cat.label[locale] }}
                    <span class="faq-cat-n">{{ counts[cat.id] }}</span>
                </button>
            </div>
        </div>

        <!-- ══ Where the parameters go ══════════════════════════════════ -->
        <ClientFieldGuide id="client-fields" />

        <!-- ══ Result bar ═══════════════════════════════════════════════ -->
        <div class="faq-bar">
            <p class="faq-count mono" aria-live="polite">
                {{
                    query.trim()
                        ? `${t("faq.searching")}: ${filtered.length}`
                        : t("faq.found", { n: filtered.length })
                }}
            </p>

            <button
                v-if="filtered.length"
                class="btn btn--ghost btn--sm faq-toggle-all"
                @click="toggleAll"
            >
                <component
                    :is="allOpen ? ChevronsDownUp : ChevronsUpDown"
                    :size="14"
                />
                <span>{{
                    allOpen ? t("faq.collapse.all") : t("faq.expand.all")
                }}</span>
            </button>
        </div>

        <!-- ══ Entries ══════════════════════════════════════════════════ -->
        <template v-if="filtered.length">
            <!--
                Grouped when nothing narrows the list, flat when something
                does. The same card renders in both, so an entry does not
                change shape when you search for it.
            -->
            <template v-if="grouped">
                <!--
                    No section rail here. It listed the same eleven labels with
                    the same eleven counts as the filter chips two hundred
                    pixels above, and a reader cannot tell by looking which of
                    the two rows filters and which one scrolls.
                -->
                <section
                    v-for="g in groups"
                    :id="`faq-group-${g.id}`"
                    :key="g.id"
                    class="faq-group"
                >
                    <div class="faq-group-head">
                        <h2 class="faq-group-title">{{ g.label }}</h2>
                        <span class="faq-group-rule"></span>
                        <span class="faq-group-n mono">{{ g.entries.length }}</span>
                    </div>

                    <div class="faq-list">
                        <article
                            v-for="entry in g.entries"
                            :id="entry.id"
                            :key="entry.id"
                            class="faq-item"
                            :class="{ 'is-open': isOpen(entry.id) }"
                        >
                            <h3 class="faq-q-wrap">
                                <button
                                    class="faq-q"
                                    :aria-expanded="isOpen(entry.id)"
                                    :aria-controls="`${entry.id}-answer`"
                                    @click="toggle(entry.id)"
                                >
                                    <RichText
                                        class="faq-q-text"
                                        :text="pick(entry.question, locale)"
                                        inline
                                    />
                                    <ChevronDown
                                        :size="17"
                                        class="chevron faq-chevron"
                                    />
                                </button>
                            </h3>

                            <transition name="expand">
                                <div
                                    v-show="isOpen(entry.id)"
                                    :id="`${entry.id}-answer`"
                                    class="faq-a"
                                >
                                    <RichText :text="pick(entry.answer, locale)" />
                                    <button
                                        class="faq-link"
                                        @click="copyLink(entry.id)"
                                    >
                                        <Check
                                            v-if="copiedId === entry.id"
                                            :size="13"
                                        />
                                        <Link2 v-else :size="13" />
                                        <span>{{
                                            copiedId === entry.id
                                                ? t("faq.link.copied")
                                                : t("faq.link.copy")
                                        }}</span>
                                    </button>
                                </div>
                            </transition>
                        </article>
                    </div>
                </section>
            </template>

            <div v-else class="faq-list faq-list--flat">
                <article
                    v-for="entry in filtered"
                    :id="entry.id"
                    :key="entry.id"
                    class="faq-item"
                    :class="{ 'is-open': isOpen(entry.id) }"
                >
                    <h2 class="faq-q-wrap">
                        <button
                            class="faq-q"
                            :aria-expanded="isOpen(entry.id)"
                            :aria-controls="`${entry.id}-answer`"
                            @click="toggle(entry.id)"
                        >
                            <span class="rev faq-stamp">
                                {{ labelFor(entry.category) }}
                            </span>
                            <RichText
                                class="faq-q-text"
                                :text="pick(entry.question, locale)"
                                inline
                            />
                            <ChevronDown :size="17" class="chevron faq-chevron" />
                        </button>
                    </h2>

                    <transition name="expand">
                        <div
                            v-show="isOpen(entry.id)"
                            :id="`${entry.id}-answer`"
                            class="faq-a"
                        >
                            <RichText :text="pick(entry.answer, locale)" />
                            <button class="faq-link" @click="copyLink(entry.id)">
                                <Check v-if="copiedId === entry.id" :size="13" />
                                <Link2 v-else :size="13" />
                                <span>{{
                                    copiedId === entry.id
                                        ? t("faq.link.copied")
                                        : t("faq.link.copy")
                                }}</span>
                            </button>
                        </div>
                    </transition>
                </article>
            </div>
        </template>

        <div v-else class="faq-empty">
            <Search :size="22" />
            <p>{{ t("faq.empty") }}</p>
            <button class="btn btn--secondary" @click="clearSearch">
                {{ t("faq.reset") }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.faq {
    max-width: 1000px;
    margin: 0 auto;
    padding: var(--sp-8) var(--sp-gutter) var(--sp-10);
}

/* ── Hero ─────────────────────────────────────────────────────────────── */
.faq-hero {
    margin-bottom: var(--sp-8);
}

/*
 * The same lockup the site wears: a small qualifier over one large name. The
 * page used to open with an icon in a circle and a centred title, which is the
 * shape every FAQ on the internet has.
 */
.faq-wordmark {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    margin: 0 0 var(--sp-4);
}

.faq-wordmark-pre {
    font-family: var(--fm);
    font-size: var(--t-sm);
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-3);
}

.faq-wordmark-main {
    font-family: var(--fu);
    font-weight: 900;
    font-size: clamp(2.2rem, 7vw, 3.6rem);
    line-height: 1;
    letter-spacing: var(--track-display);
    color: var(--accent-ink);
}

.faq-lede {
    max-width: 68ch;
    margin: 0;
}

.faq-stats {
    margin-top: var(--sp-6);
}

/* ── Controls ─────────────────────────────────────────────────────────── */
.faq-controls {
    display: grid;
    gap: var(--sp-3);
    margin-bottom: var(--sp-6);
}

.faq-search {
    position: relative;
    display: flex;
    align-items: center;
}

.faq-search-icon {
    position: absolute;
    left: var(--sp-4);
    color: var(--ink-4);
    pointer-events: none;
}

.faq-search-input {
    width: 100%;
    padding: var(--sp-4) var(--sp-9);
    background: var(--surface-solid);
    border: var(--rule) solid var(--line);
    border-radius: var(--r-2);
    color: var(--text);
    font-family: var(--fw);
    font-size: var(--t-base);
    transition: border-color var(--trans-fast);
}

.faq-search-input::placeholder {
    color: var(--ink-4);
}

.faq-search-input:focus {
    outline: none;
    border-color: var(--accent-ink);
}

/* The native clear affordance sits under ours and looks foreign here. */
.faq-search-input::-webkit-search-cancel-button {
    display: none;
}

.faq-search-clear {
    position: absolute;
    right: var(--sp-3);
    display: flex;
    padding: var(--sp-2);
    border: none;
    border-radius: var(--r-pill);
    background: var(--surface-solid-2);
    color: var(--ink-2);
    cursor: pointer;
}

.faq-search-clear:hover {
    color: var(--text);
}

/* ── Categories ───────────────────────────────────────────────────────── */
.faq-cats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
}

.faq-cat {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-4);
    border-radius: var(--r-pill);
    border: var(--rule) solid var(--line);
    background: var(--surface-solid);
    color: var(--ink-2);
    font-family: var(--fw);
    font-weight: 700;
    font-size: var(--t-xs);
    cursor: pointer;
    transition:
        color var(--trans-fast),
        border-color var(--trans-fast),
        background var(--trans-fast);
}

.faq-cat:hover {
    color: var(--text);
    border-color: var(--accent-ink);
}

.faq-cat.is-active {
    background: rgb(var(--accent-rgb));
    border-color: rgb(var(--accent-rgb));
    color: var(--on-accent);
}

.faq-cat-n {
    font-family: var(--fm);
    font-size: var(--t-2xs);
    opacity: 0.7;
}

/* ── Result bar ───────────────────────────────────────────────────────── */
.faq-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-4);
    flex-wrap: wrap;
    margin: var(--sp-6) 0 var(--sp-4);
}

.faq-count {
    margin: 0;
    font-size: var(--t-2xs);
    letter-spacing: var(--track-mono);
    color: var(--ink-3);
    text-transform: uppercase;
}

.faq-toggle-all {
    flex-shrink: 0;
}

/* ── Groups ───────────────────────────────────────────────────────────── */
.faq-group {
    margin-bottom: var(--sp-8);
    scroll-margin-top: 84px;
}

.faq-group-head {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    margin-bottom: var(--sp-3);
}

.faq-group-title {
    margin: 0;
    font-family: var(--fw);
    font-weight: 800;
    font-size: var(--t-md);
    color: var(--text);
    white-space: nowrap;
}

/* A drawn rule rather than a border: this is a sheet, not a document. */
.faq-group-rule {
    flex: 1;
    height: 0;
    border-top: var(--rule) solid var(--line);
}

.faq-group-n {
    font-size: var(--t-2xs);
    color: var(--ink-4);
}

/* ── List ─────────────────────────────────────────────────────────────── */
.faq-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
}

.faq-item {
    background: var(--surface-solid);
    border: var(--rule) solid var(--line);
    border-radius: var(--r-2);
    overflow: hidden;
    transition:
        border-color var(--trans-fast),
        background var(--trans-fast);
    /* Deep-linked items land under the sticky header without this. */
    scroll-margin-top: 90px;
}

.faq-item:hover {
    border-color: var(--line-soft);
}

.faq-item.is-open {
    background: var(--surface-solid-2);
    border-color: var(--accent-ink);
}

.faq-q-wrap {
    margin: 0;
    font-size: inherit;
    font-weight: inherit;
}

.faq-q {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    width: 100%;
    padding: var(--sp-4) var(--sp-5);
    border: none;
    background: transparent;
    color: var(--text);
    font-family: var(--fw);
    font-weight: 700;
    font-size: var(--t-base);
    line-height: 1.45;
    text-align: left;
    cursor: pointer;
}

.faq-q-text {
    flex: 1;
}

/*
 * The section, stamped on the card. In a mixed list there was no way to see
 * which engine a question belonged to without opening it.
 */
.faq-stamp {
    flex-shrink: 0;
    align-self: flex-start;
    margin-top: 2px;
}

.faq-q:hover {
    color: var(--accent-ink);
}

/* Shared: see `.chevron` in the kit. */
.faq-chevron {
    flex-shrink: 0;
    margin-left: auto;
}

.faq-item.is-open .faq-chevron {
    transform: rotate(180deg);
    color: var(--accent-ink);
}

.faq-a {
    padding: 0 var(--sp-5) var(--sp-5);
}

/*
 * The answer is inset behind a hairline, so an open card reads as a question
 * with its working shown rather than as two stacked blocks.
 */
.faq-a > :deep(*:first-child) {
    margin-top: 0;
}

.faq-a :deep(p) {
    margin: 0 0 var(--sp-3);
    font-size: var(--t-sm);
    line-height: 1.7;
    color: var(--ink-2);
    text-wrap: pretty;
}

.faq-a :deep(p:last-of-type) {
    margin-bottom: var(--sp-4);
}

/*
 * Subheadings for answers long enough to have parts. Sized below the question
 * they sit under, so the hierarchy stays question → section → prose.
 */
.faq-a :deep(h2),
.faq-a :deep(h3) {
    margin: var(--sp-5) 0 var(--sp-2);
    font-size: var(--t-sm);
    font-weight: 800;
    letter-spacing: 0.01em;
    color: var(--text);
}

.faq-a :deep(h3) {
    font-size: var(--t-xs);
    color: var(--ink-2);
}

.faq-a :deep(strong) {
    color: var(--text);
    font-weight: 700;
}

/*
 * Asides and caveats. The italic carries the demotion on its own; dropping to
 * a dimmer ink as well would put this text near 2.4:1, and an aside a reader
 * cannot make out is worse than no aside.
 */
.faq-a :deep(em) {
    font-style: italic;
}

.faq-a :deep(a) {
    color: var(--accent-ink);
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-thickness: 1px;
}

.faq-a :deep(a:hover) {
    text-decoration-thickness: 2px;
}

.faq-a :deep(code) {
    font-family: var(--fm);
    font-size: 0.86em;
    padding: 1px 5px;
    border-radius: var(--r-0);
    background: var(--ground-3);
    color: var(--accent-ink);
    white-space: nowrap;
}

/*
 * A fenced block: a URI or a field list, which mean nothing run together as
 * prose. It scrolls inside itself rather than widening the card.
 */
.faq-a :deep(.rich-pre) {
    margin: 0 0 var(--sp-4);
    padding: var(--sp-4);
    border: var(--rule) solid var(--line);
    border-radius: var(--r-1);
    background: var(--ground-2);
    overflow-x: auto;
}

.faq-a :deep(.rich-pre code) {
    display: block;
    padding: 0;
    background: none;
    color: var(--ink-2);
    font-size: var(--t-xs);
    line-height: 1.7;
    white-space: pre;
}

/* For answers that will carry a screenshot. */
.faq-a :deep(.rich-img) {
    display: block;
    max-width: 100%;
    height: auto;
    margin: var(--sp-4) 0;
    border: var(--rule) solid var(--line);
    border-radius: var(--r-1);
}

.faq-link {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    border: var(--rule) solid var(--line);
    border-radius: var(--r-1);
    background: transparent;
    color: var(--ink-3);
    font-family: var(--fw);
    font-size: var(--t-2xs);
    cursor: pointer;
    transition:
        color var(--trans-fast),
        border-color var(--trans-fast);
}

.faq-link:hover {
    color: var(--accent-ink);
    border-color: var(--accent-ink);
}

/* ── Empty ────────────────────────────────────────────────────────────── */
.faq-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-9) var(--sp-4);
    text-align: center;
    color: var(--ink-4);
}

.faq-empty p {
    margin: 0;
    max-width: 42ch;
    font-size: var(--t-sm);
    line-height: 1.6;
    color: var(--ink-2);
}

@media (max-width: 560px) {
    .faq {
        padding: var(--sp-6) var(--sp-gutter) var(--sp-8);
    }

    .faq-q {
        padding: var(--sp-3) var(--sp-4);
        gap: var(--sp-3);
        flex-wrap: wrap;
    }

    .faq-a {
        padding: 0 var(--sp-4) var(--sp-4);
    }

    /* The stamp takes a whole line rather than squeezing the question. */
    .faq-stamp {
        order: -1;
    }

    .faq-q-text {
        flex-basis: 100%;
    }
}
</style>
