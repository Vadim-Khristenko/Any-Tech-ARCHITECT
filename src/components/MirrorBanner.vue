<script setup lang="ts">
/**
 * The mirror notice, shown only in builds made for hosting mirrors.
 *
 * The build flips `VITE_SITE_MIRROR=1` and Vite substitutes the constant at
 * compile time, so App.vue's `v-if` folds the whole component out of a normal
 * bundle — the banner costs the main site nothing, not even a download.
 *
 * The copy is three short facts rather than an apology: what this is, where
 * the main site lives, and what keeps the lights on.
 */
import { Heart, Globe } from "lucide-vue-next";
import { useI18n } from "@/i18n";

const { t } = useI18n();

const MAIN_SITE = "https://architect.vai-rice.space";
const DONATE_URL = "https://yoomoney.ru/fundraise/1GA2JV51324.260304";
</script>

<template>
    <div class="mirror-banner">
        <span class="mirror-badge">
            <Globe :size="12" />
            {{ t("mirror.badge") }}
        </span>
        <p class="mirror-text">
            {{ t("mirror.text") }}
            <a :href="MAIN_SITE" rel="noopener">architect.vai-rice.space</a>.
        </p>
        <a class="mirror-donate" :href="DONATE_URL" target="_blank" rel="noopener">
            <Heart :size="12" />
            {{ t("mirror.donate") }}
        </a>
    </div>
</template>

<style scoped>
.mirror-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--mirror-h);
    z-index: calc(var(--z-header) + 1);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 0 12px;
    background: var(--bg2);
    border-bottom: 1px solid var(--border);
    font-size: 0.78rem;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
}
.mirror-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    padding: 2px 9px;
    border-radius: 999px;
    background: rgb(var(--accent-rgb) / 0.1);
    color: var(--accent-ink);
    font-weight: 700;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
.mirror-text {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mirror-text a {
    color: var(--accent-ink);
    font-weight: 600;
}
.mirror-donate {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    color: var(--accent-ink);
    font-weight: 600;
}
.mirror-donate:hover,
.mirror-text a:hover {
    text-decoration: underline;
}

@media (max-width: 720px) {
    .mirror-text {
        display: none;
    }
}
</style>
