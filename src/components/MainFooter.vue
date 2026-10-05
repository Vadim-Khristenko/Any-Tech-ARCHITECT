<script setup lang="ts">
/**
 * The footer, as the title block of the sheet.
 *
 * The old one was a gradient band of its own colour with three link columns in
 * it — a component that happened to be at the bottom of the page rather than
 * the end of the drawing. This closes the sheet the way a drawing is closed:
 * the links first, then a stamp of the facts that identify what you have been
 * looking at.
 *
 * Every rule that draws it lives in kit/shell.css. What is here is content.
 */

import { ref, computed, onMounted, watch } from "vue";
import {
    Github,
    GitBranch,
    User,
    Send,
    Shield,
    Heart,
    ChevronRight,
    ExternalLink,
} from "lucide-vue-next";

import { localizePath, useI18n } from "@/i18n";

const { locale, t } = useI18n();

const SOURCE_URL = "https://github.com/Vadim-Khristenko/Any-Tech-ARCHITECT";

/** About page, anchored at the support block. */
const supportLink = computed(() => ({
    path: localizePath("/about", locale.value),
    hash: "#support",
}));

const lastBuild = ref<string>("");

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
};

const dateLocale = computed(() => (locale.value === "ru" ? "ru-RU" : "en-GB"));

function formatBuild() {
    let d: Date;
    try {
        d = new Date(__BUILD_TIME__);
        if (Number.isNaN(d.getTime())) d = new Date();
    } catch {
        d = new Date();
    }
    lastBuild.value = d.toLocaleString(dateLocale.value, DATE_FORMAT);
}

onMounted(formatBuild);
// Re-render the timestamp in the new locale's conventions on a language switch.
watch(locale, formatBuild);
</script>

<template>
    <footer class="footer">
        <div class="container footer-inner">
            <!-- ── Brand and support ───────────────────────────────────── -->
            <div class="footer-top">
                <div class="footer-brand">
                    <div class="footer-lockup">
                        <span class="footer-pre">{{ t("brand.pre") }}</span>
                        <span class="footer-name">{{ t("brand.main") }}</span>
                    </div>
                    <p class="footer-slogan">
                        {{ t("footer.slogan.lead") }}
                        <span class="text-accent">{{
                            t("footer.slogan.accent")
                        }}</span>
                        {{ t("footer.slogan.tail") }}
                    </p>
                </div>

                <!-- Points at the About page's support section rather than a
                     single payment provider, so every method is on offer. -->
                <router-link :to="supportLink" class="card footer-donate">
                    <span class="footer-donate-icon">
                        <Heart :size="18" fill="currentColor" />
                    </span>
                    <span class="footer-donate-text">
                        <span class="h3">{{ t("footer.donate.title") }}</span>
                        <span class="note-label">{{
                            t("footer.donate.methods")
                        }}</span>
                    </span>
                    <ChevronRight :size="17" class="card-go" />
                </router-link>
            </div>

            <!-- ── Link columns ────────────────────────────────────────── -->
            <div class="footer-cols">
                <div class="footer-col">
                    <h2 class="footer-colhead">
                        {{ t("footer.col.resources") }}
                    </h2>
                    <a
                        :href="SOURCE_URL"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="footer-link"
                    >
                        <Github :size="15" /> {{ t("footer.link.source") }}
                    </a>
                    <a
                        href="https://git.vai-rice.space/vai_prog/Any-Tech-ARCHITECT"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="footer-link"
                    >
                        <GitBranch :size="15" />
                        {{ t("footer.link.sourceMirror") }}
                    </a>
                    <a
                        href="https://github.com/amnezia-vpn/"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="footer-link"
                    >
                        <Shield :size="15" />
                        {{ t("footer.link.amneziaGithub") }}
                    </a>
                </div>

                <div class="footer-col">
                    <h2 class="footer-colhead">
                        {{ t("footer.col.community") }}
                    </h2>
                    <a
                        href="https://t.me/amnezia_vpn"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="footer-link"
                    >
                        <Send :size="15" /> {{ t("footer.link.telegram") }}
                    </a>
                    <a
                        href="https://github.com/Vadim-Khristenko/"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="footer-link"
                    >
                        <User :size="15" /> {{ t("footer.link.author") }}
                    </a>
                </div>

                <div class="footer-col">
                    <h2 class="footer-colhead">
                        {{ t("footer.col.research") }}
                    </h2>
                    <p class="footer-credits">
                        {{ t("footer.credits.basedOn") }}
                        <a
                            href="https://voidwaifu.github.io/Special-Junk-Packet-List/"
                            target="_blank"
                            rel="noopener noreferrer"
                            >Special Junk Packet List</a
                        >
                        {{ t("footer.credits.from") }}
                        <a
                            href="https://github.com/VoidWaifu"
                            target="_blank"
                            rel="noopener noreferrer"
                            >@VoidWaifu</a
                        >
                    </p>
                </div>
            </div>

            <!--
                The stamp. Four facts about what you have been looking at, in
                the order a title block puts them, using the same primitive the
                landing's drawing uses for its own.
            -->
            <div class="footer-stamp">
                <div class="footer-stamp-cell">
                    <span class="footer-stamp-key">
                        {{ t("footer.stamp.project") }}
                    </span>
                    <span class="footer-stamp-val">Any Tech ARCHITECT</span>
                </div>
                <div class="footer-stamp-cell">
                    <span class="footer-stamp-key">
                        {{ t("footer.stamp.build") }}
                    </span>
                    <span class="footer-stamp-val">{{ lastBuild || "—" }}</span>
                </div>
                <div class="footer-stamp-cell">
                    <span class="footer-stamp-key">
                        {{ t("footer.stamp.data") }}
                    </span>
                    <span class="footer-stamp-val footer-stamp-ok">
                        <i class="dot dot--ok"></i>
                        {{ t("footer.stamp.dataValue") }}
                    </span>
                </div>
                <div class="footer-stamp-cell">
                    <span class="footer-stamp-key">
                        {{ t("footer.stamp.source") }}
                    </span>
                    <span class="footer-stamp-val">
                        <a
                            :href="SOURCE_URL"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="footer-stamp-link"
                        >
                            GitHub <ExternalLink :size="11" />
                        </a>
                    </span>
                </div>
            </div>

            <p class="footer-made">
                &copy; 2026 · {{ t("footer.madeWith") }}
                <Heart
                    :size="12"
                    fill="currentColor"
                    class="footer-heart"
                    aria-hidden="true"
                />
                {{ t("footer.forCommunity") }}
            </p>
        </div>
    </footer>
</template>

<style scoped>
/*
 * The surface — the rule across the top, the grid beneath it, the stamp cells,
 * the link columns — is in kit/shell.css. Only the arrangement of this
 * footer's own content is here.
 */

.footer-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--sp-6);
}

.footer-brand {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    min-width: 260px;
    flex: 1;
}

.footer-lockup {
    display: flex;
    flex-direction: column;
    gap: 4px;
    line-height: 1;
}

.footer-pre {
    font-family: var(--fm);
    font-size: var(--t-2xs);
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--ink-3);
}

.footer-name {
    font-family: var(--fu);
    font-size: var(--t-xl);
    font-weight: 800;
    letter-spacing: var(--track-tight);
    color: var(--accent-ink);
}

.footer-slogan {
    max-width: 42ch;
    margin: 0;
    font-size: var(--t-sm);
    color: var(--ink-3);
}

/* ── Support ──────────────────────────────────────────────────────────── */

.footer-donate {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    padding: var(--sp-4) var(--sp-5);
    min-width: 280px;
}

.footer-donate-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: var(--r-2);
    background: var(--accent);
    color: var(--on-accent);
}

.footer-donate-text {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

/* ── Columns ──────────────────────────────────────────────────────────── */

.footer-credits {
    margin: 0;
    max-width: 34ch;
    font-size: var(--t-sm);
    color: var(--ink-3);
}

.footer-credits a {
    color: var(--ink-2);
    text-decoration: underline;
    text-decoration-color: var(--line);
    text-underline-offset: 3px;
}

.footer-credits a:hover {
    color: var(--accent-ink);
    text-decoration-color: currentcolor;
}

/* ── Stamp ────────────────────────────────────────────────────────────── */

.footer-stamp-ok {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    color: var(--green);
}

.footer-stamp-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

/* ── Closing line ─────────────────────────────────────────────────────── */

.footer-made {
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 0;
    font-family: var(--fm);
    font-size: var(--t-2xs);
    color: var(--ink-3);
}

.footer-heart {
    color: var(--red);
}

@media (max-width: 640px) {
    .footer-donate {
        min-width: 0;
        width: 100%;
    }
}
</style>
