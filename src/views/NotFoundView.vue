<script setup lang="ts">
/**
 * 404.
 *
 * Styled as a dropped packet rather than a system error: nothing broke on the
 * visitor's side, so the page uses the product's own amber rather than alarm
 * red, and it carries the corner-bracket framing the OG images use.
 */
import { computed } from "vue";
import { Home, ArrowLeft, ArrowRight, Layers, HelpCircle, GitMerge } from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import { localizePath, useI18n } from "@/i18n";

const router = useRouter();
const route = useRoute();
const { locale, t } = useI18n();

function goHome() {
    router.push(localizePath("/", locale.value));
}

/**
 * `router.back()` walks out of the app entirely when the 404 was the first
 * page of the session, so fall back to the home route in that case.
 */
function goBack() {
    if (window.history.length > 1) router.back();
    else goHome();
}

/** Shown verbatim so a mistyped address is obvious at a glance. */
const requestedPath = computed(() => route.fullPath);

const suggestions = computed(() => [
    { to: localizePath("/amneziawg", locale.value), icon: Layers, label: t("nf.link.generator") },
    { to: localizePath("/faq", locale.value), icon: HelpCircle, label: t("nf.link.faq") },
    {
        to: localizePath("/mergekeys", locale.value),
        icon: GitMerge,
        label: t("nf.link.mergekeys"),
    },
]);
</script>

<template>
    <div class="notfound-wrap fade-in">
        <div class="notfound-card">
            <!-- Corner brackets, matching the link-preview artwork -->
            <span class="notfound-bracket notfound-bracket-tl"></span>
            <span class="notfound-bracket notfound-bracket-br"></span>

            <div class="notfound-badge">{{ t("nf.badge") }}</div>

            <div class="notfound-code" aria-hidden="true">404</div>

            <!-- A junk train with a gap where the packet should have been -->
            <div class="notfound-train" aria-hidden="true">
                <i style="--w: 14px"></i>
                <i style="--w: 22px"></i>
                <i style="--w: 11px"></i>
                <i class="notfound-gap"></i>
                <i style="--w: 26px"></i>
                <i style="--w: 17px"></i>
                <i style="--w: 30px"></i>
            </div>

            <h1 class="notfound-title">{{ t("nf.title") }}</h1>
            <p class="notfound-desc">{{ t("nf.desc") }}</p>

            <div class="notfound-path">
                <span class="notfound-path-label">{{ t("nf.requested") }}</span>
                <code>{{ requestedPath }}</code>
            </div>

            <div class="notfound-actions">
                <button class="btn btn-primary" @click="goHome">
                    <Home :size="16" />
                    {{ t("nf.home") }}
                </button>
                <button class="btn btn-secondary" @click="goBack">
                    <ArrowLeft :size="16" />
                    {{ t("nf.back") }}
                </button>
            </div>

            <div class="notfound-suggest">
                <span class="notfound-suggest-label">{{ t("nf.elsewhere") }}</span>
                <router-link
                    v-for="s in suggestions"
                    :key="s.to"
                    :to="s.to"
                    class="notfound-suggest-link"
                >
                    <component :is="s.icon" :size="15" />
                    <span>{{ s.label }}</span>
                    <ArrowRight :size="14" class="notfound-suggest-arrow" />
                </router-link>
            </div>
        </div>
    </div>
</template>

<style scoped>
.notfound-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 280px);
    padding: 48px 20px;
}

.notfound-card {
    position: relative;
    width: 100%;
    max-width: 560px;
    padding: 44px 36px 36px;
    text-align: center;
    background:
        radial-gradient(
            120% 80% at 50% 0%,
            rgb(var(--accent-rgb) / 0.09),
            transparent 70%
        ),
        var(--bg2);
    border: 1px solid var(--border2);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
}

/* ── Corner brackets ──────────────────────────────────────────────────── */
.notfound-bracket {
    position: absolute;
    width: 34px;
    height: 34px;
    border-color: var(--amber);
    opacity: 0.4;
    pointer-events: none;
}

.notfound-bracket-tl {
    top: 14px;
    left: 14px;
    border-top: 2px solid;
    border-left: 2px solid;
    border-top-left-radius: 4px;
}

.notfound-bracket-br {
    right: 14px;
    bottom: 14px;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-bottom-right-radius: 4px;
}

/* ── Head ─────────────────────────────────────────────────────────────── */
.notfound-badge {
    display: inline-block;
    margin-bottom: 18px;
    padding: 6px 14px;
    border: 1px solid var(--amber-dim);
    border-radius: 100px;
    background: rgb(var(--accent-rgb) / 0.1);
    color: var(--accent-ink-lift);
    font-family: var(--fm);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.16em;
}

.notfound-code {
    font-family: var(--fu);
    font-size: clamp(4rem, 16vw, 6rem);
    font-weight: 900;
    line-height: 0.95;
    letter-spacing: -0.03em;
    background: linear-gradient(135deg, var(--amber2), var(--amber-deep));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}

/* ── Junk train with a hole in it ─────────────────────────────────────── */
.notfound-train {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin: 18px 0 26px;
}

.notfound-train i {
    width: var(--w, 20px);
    height: 10px;
    border-radius: 3px;
    background: var(--amber);
    opacity: 0.32;
}

/* The dropped one: outline only, so the absence reads as deliberate. */
.notfound-train .notfound-gap {
    width: 30px;
    height: 10px;
    background: transparent;
    border: 1px dashed var(--amber);
    opacity: 0.55;
}

/* ── Body ─────────────────────────────────────────────────────────────── */
.notfound-title {
    margin: 0 0 12px;
    font-family: var(--fu);
    font-size: clamp(1.25rem, 4.5vw, 1.6rem);
    font-weight: 800;
    color: var(--text);
}

.notfound-desc {
    margin: 0 auto 22px;
    max-width: 44ch;
    font-size: 0.92rem;
    line-height: 1.65;
    color: var(--text2);
    text-wrap: pretty;
}

.notfound-path {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 26px;
    padding: 11px 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    text-align: left;
}

.notfound-path-label {
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text3);
}

.notfound-path code {
    font-family: var(--fm);
    font-size: 0.82rem;
    color: var(--accent-ink-lift);
    word-break: break-all;
}

.notfound-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
}

/* ── Suggestions ──────────────────────────────────────────────────────── */
.notfound-suggest {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 28px;
    padding-top: 22px;
    border-top: 1px solid var(--border);
    text-align: left;
}

.notfound-suggest-label {
    margin-bottom: 6px;
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text3);
}

.notfound-suggest-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius);
    color: var(--text2);
    font-size: 0.87rem;
    text-decoration: none;
    transition: all var(--trans-fast);
}

.notfound-suggest-link:hover {
    background: var(--bg4);
    color: var(--text);
}

.notfound-suggest-link svg:first-child {
    flex-shrink: 0;
    color: var(--accent-ink);
}

.notfound-suggest-arrow {
    margin-left: auto;
    flex-shrink: 0;
    opacity: 0;
    transform: translateX(-4px);
    transition: all var(--trans-fast);
}

.notfound-suggest-link:hover .notfound-suggest-arrow {
    opacity: 0.7;
    transform: none;
}

@media (prefers-reduced-motion: reduce) {
    .notfound-suggest-arrow {
        transition: none;
    }
}

@media (max-width: 480px) {
    .notfound-card {
        padding: 34px 20px 26px;
    }

    .notfound-actions {
        flex-direction: column;
    }

    .notfound-actions .btn {
        width: 100%;
        justify-content: center;
    }
}
</style>
