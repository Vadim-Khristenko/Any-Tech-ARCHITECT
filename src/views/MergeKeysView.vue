<script setup lang="ts">
/**
 * MergeKeys — a workbench for keys.
 *
 * Four modes over one shared result, because the first question is never
 * "merge or rewrite" — it is what the string in the clipboard actually holds.
 * A key that turns out to be a subscription rather than a tunnel, or a
 * container whose three copies of itself disagree, is invisible until
 * something says so.
 *
 * This file is deliberately thin: the hero, the mode switcher, and whichever
 * panel is active. Each mode lives in its own component under
 * `components/keys/` and every one of them reads the same workbench, so state
 * is in one place and markup is in four small ones.
 *
 * Nothing leaves the tab, which is the only reason a page that handles private
 * keys can exist at all.
 */

import { computed, onMounted, ref } from "vue";
import { Info, Layers, Search, Shuffle, Wand2 } from "lucide-vue-next";
import { useI18n } from "@/i18n";
import { useKeyWorkbench, type WorkbenchMode } from "@/composables/useKeyWorkbench";
import RichText from "@/components/RichText";
import ModeInspect from "@/components/keys/ModeInspect.vue";
import ModeMerge from "@/components/keys/ModeMerge.vue";
import ModeRefresh from "@/components/keys/ModeRefresh.vue";
import ModeBuild from "@/components/keys/ModeBuild.vue";
import KeyResult from "@/components/keys/KeyResult.vue";

const { t } = useI18n();
const w = useKeyWorkbench();

const MODES: { id: WorkbenchMode; icon: typeof Search }[] = [
    { id: "inspect", icon: Search },
    { id: "merge", icon: Shuffle },
    { id: "refresh", icon: Wand2 },
    { id: "build", icon: Layers },
];

const tk = (key: string) => t(key as "mk.mode.inspect.title");

const PANELS = {
    inspect: ModeInspect,
    merge: ModeMerge,
    refresh: ModeRefresh,
    build: ModeBuild,
} as const;

const panel = computed(() => PANELS[w.mode.value]);

/* ── A config handed over by one of the generators ───────────────────────── */

const handoff = ref(false);

onMounted(() => {
    /*
     * The generators drop a parameter set here on their way over. Read once and
     * cleared: a stale handoff surfacing on a later visit would attach a config
     * to a key the reader never meant to touch.
     */
    try {
        const raw = sessionStorage.getItem("architect:pending-key");
        if (raw) {
            w.refreshParams.value = raw;
            w.mode.value = "refresh";
            handoff.value = true;
            sessionStorage.removeItem("architect:pending-key");
        }
    } catch {
        // Storage blocked. The page works without it.
    }
});
</script>

<template>
    <div class="mk rise">
        <!-- ══ Hero ═════════════════════════════════════════════════════ -->
        <header class="mk-hero">
            <h1 class="mk-wordmark">
                <span class="mk-wordmark-pre">{{ t("mk.hero.pre") }}</span>
                <span class="mk-wordmark-main">MergeKeys</span>
            </h1>

            <p class="lede mk-lede">{{ t("mk.hero.lede") }}</p>
            <RichText class="prose mk-desc" :text="t('mk.hero.desc')" inline />

            <div class="well mk-privacy">
                <Info :size="15" />
                <p>{{ t("mk.hero.privacy") }}</p>
            </div>
        </header>

        <!-- ══ Modes ════════════════════════════════════════════════════ -->
        <nav class="mk-modes" role="tablist" :aria-label="t('mk.modes.label')">
            <button
                v-for="m in MODES"
                :key="m.id"
                class="mk-mode"
                :class="{ 'is-active': w.mode.value === m.id }"
                role="tab"
                :aria-selected="w.mode.value === m.id"
                @click="w.mode.value = m.id"
            >
                <component :is="m.icon" :size="17" class="mk-mode-icon" />
                <span class="mk-mode-text">
                    <span class="mk-mode-title">{{ tk(`mk.mode.${m.id}.title`) }}</span>
                    <span class="mk-mode-hint">{{ tk(`mk.mode.${m.id}.hint`) }}</span>
                </span>
            </button>
        </nav>

        <!-- ══ The active mode ══════════════════════════════════════════ -->
        <component :is="panel" :w="w" :handoff="handoff" />

        <!-- ══ What it produced ═════════════════════════════════════════ -->
        <KeyResult :w="w" />
    </div>
</template>

<style scoped>
.mk {
    max-width: 1000px;
    margin: 0 auto;
    padding: var(--sp-8) var(--sp-gutter) var(--sp-10);
    /* One rhythm for the page, so no section leans on a neighbour's margin. */
    display: grid;
    gap: var(--sp-7);
    align-content: start;
}

/*
 * A grid track is `min-width: auto` by default, which means it refuses to
 * shrink below its content — and a key or a CPS chain has no break
 * opportunity in it at all. One of those inside pushed the whole page wider
 * than the viewport and dragged every panel's right edge off screen with it.
 *
 * Stated on the page, the panels and the result alike, because the overflow
 * travels up through every grid it passes.
 */
.mk > * {
    min-width: 0;
}

/* ── Hero ─────────────────────────────────────────────────────────────── */
.mk-hero {
    display: grid;
    gap: var(--sp-4);
}

.mk-wordmark {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    margin: 0;
}

.mk-wordmark-pre {
    font-family: var(--fm);
    font-size: var(--t-sm);
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-3);
}

.mk-wordmark-main {
    font-family: var(--fu);
    font-weight: 900;
    font-size: clamp(2.2rem, 7vw, 3.4rem);
    line-height: 1;
    letter-spacing: var(--track-display);
    color: var(--accent-ink);
}

.mk-lede,
.mk-desc {
    max-width: 68ch;
    margin: 0;
}

.mk-privacy {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-3);
    color: var(--accent-ink);
}

.mk-privacy p {
    margin: 0;
    font-size: var(--t-sm);
    line-height: 1.6;
    color: var(--ink-2);
}

/* ── Modes ────────────────────────────────────────────────────────────── */
.mk-modes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: var(--sp-2);
}

.mk-mode {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-3);
    padding: var(--sp-4);
    text-align: left;
    border: var(--rule) solid var(--line);
    border-radius: var(--r-2);
    background: var(--surface-solid);
    color: var(--ink-2);
    cursor: pointer;
    transition:
        border-color var(--trans-fast),
        background var(--trans-fast),
        color var(--trans-fast);
}

.mk-mode:hover {
    color: var(--text);
    border-color: var(--accent-ink);
}

.mk-mode.is-active {
    background: var(--surface-solid-2);
    border-color: var(--accent-ink);
    color: var(--text);
}

/* The icon keeps its box so titles line up whatever the icon's own width. */
.mk-mode-icon {
    flex-shrink: 0;
    margin-top: 1px;
}

.mk-mode-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.mk-mode-title {
    font-family: var(--fw);
    font-weight: 800;
    font-size: var(--t-sm);
}

.mk-mode-hint {
    font-size: var(--t-2xs);
    color: var(--ink-3);
    line-height: 1.4;
}

@media (max-width: 640px) {
    .mk {
        padding: var(--sp-6) var(--sp-gutter) var(--sp-8);
        gap: var(--sp-6);
    }
}
</style>

<!--
    Shared by every mode panel.

    Unscoped on purpose: the four panels are separate components but one form,
    and duplicating an input's padding four times is how four inputs end up
    slightly different heights. Everything here is `mk-` prefixed and belongs
    to this page.
-->
<style>
.mk-panel {
    display: grid;
    gap: var(--sp-3);
    align-content: start;
    min-width: 0;
}

.mk-panel > * {
    min-width: 0;
}

.mk-panel > .h {
    margin: 0;
}

.mk-panel > .lede {
    margin: 0 0 var(--sp-2);
    max-width: 72ch;
}

.mk-input {
    display: block;
    width: 100%;
    margin: 0;
    padding: var(--sp-4);
    background: var(--ground-2);
    border: var(--rule) solid var(--line);
    border-radius: var(--r-2);
    color: var(--text);
    font-family: var(--fm);
    font-size: var(--t-xs);
    line-height: 1.6;
    resize: vertical;
    word-break: break-all;
}

.mk-input:focus {
    outline: none;
    border-color: var(--accent-ink);
}

.mk-error {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-2);
    margin: 0;
    font-size: var(--t-sm);
    line-height: 1.5;
    color: var(--red);
}

.mk-error svg {
    flex-shrink: 0;
    margin-top: 2px;
}

.mk-note {
    margin: 0;
    font-size: var(--t-sm);
    line-height: 1.6;
    color: var(--ink-3);
    text-wrap: pretty;
}

.mk-found {
    margin: 0;
    font-size: var(--t-xs);
    color: var(--accent-ink);
}

/* Actions sit on one baseline and wrap as a group. */
.mk-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
}

.mk-fields {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--sp-3);
}

.mk-field {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    flex: 1 1 220px;
}

.mk-field-label {
    font-family: var(--fm);
    font-size: var(--t-2xs);
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-3);
}

/* A label introducing the control under it, rather than sitting beside one. */
.mk-stack-label {
    display: block;
    margin-top: var(--sp-2);
}

.mk-text {
    padding: var(--sp-3) var(--sp-4);
    background: var(--ground-2);
    border: var(--rule) solid var(--line);
    border-radius: var(--r-1);
    color: var(--text);
    font-family: var(--fw);
    font-size: var(--t-sm);
}

.mk-text:focus {
    outline: none;
    border-color: var(--accent-ink);
}

@media (max-width: 640px) {
    .mk-actions .btn {
        flex: 1 1 100%;
        justify-content: center;
    }
}
</style>
