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
 *
 * WHY IT IS BUILT THE WAY IT IS
 *
 * The strip is `position: fixed` and the header under it is offset by
 * `--mirror-h`, so its height has to be known before anything is measured.
 * That rules out "let it grow": a banner that flows would either overlap the
 * header or need a ResizeObserver to tell the header how far to move, which
 * is a listener running for the sake of a line of text.
 *
 * So the height is stated per breakpoint instead, and each state's copy is
 * clamped to the number of lines that height allows. Wide: one row, the full
 * sentence. Narrow: the badge, the address, and the donate link on their own
 * rows. The previous version solved the narrow case by hiding the text
 * entirely — which left a strip explaining that this is a mirror without
 * saying where the real one is.
 */

import { Heart, Globe } from "lucide-vue-next";
import { useI18n } from "@/i18n";

const { t } = useI18n();

const MAIN_SITE = "https://architect.vai-rice.space";
const DONATE_URL = "https://yoomoney.ru/fundraise/1GA2JV51324.260304";
</script>

<template>
    <div class="mirror-banner" role="note">
        <span class="badge mirror-tag">
            <Globe :size="11" />
            {{ t("mirror.badge") }}
        </span>

        <!--
            Two lengths of the same sentence: the full one, and the short
            line for a narrow strip where the full one would push the address
            off the end.

            The space before the address is written out on purpose. A newline
            between an interpolation and an element is condensed away, which
            would run the sentence straight into the address with no gap.
        -->
        <p class="mirror-text">
            <span class="mirror-text-full">{{ t("mirror.text") }} <a class="mirror-host" :href="MAIN_SITE" rel="noopener">architect.vai-rice.space</a>.</span>
            <span class="mirror-text-short">{{ t("mirror.short") }} <a class="mirror-host" :href="MAIN_SITE" rel="noopener">architect.vai-rice.space</a></span>
        </p>

        <a
            class="mirror-donate"
            :href="DONATE_URL"
            target="_blank"
            rel="noopener noreferrer"
        >
            <Heart :size="11" class="mirror-donate-icon" />
            <span class="mirror-donate-full">{{ t("mirror.donate") }}</span>
            <span class="mirror-donate-short">{{ t("mirror.donateShort") }}</span>
        </a>
    </div>
</template>

<style scoped>
/*
 * Everything here is the kit's: `.badge` for the chip, the ground and rule
 * tokens for the bar, the mono face for the address. The only measurements
 * particular to this strip are its height and the point at which it wraps.
 */
.mirror-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: calc(var(--z-header) + 1);
    height: var(--mirror-h);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    padding: 0 var(--sp-gutter);
    background: var(--ground-2);
    border-bottom: var(--rule) solid var(--line-soft);
    font-size: var(--t-2xs);
    color: var(--ink-2);
    overflow: hidden;
}

.mirror-tag {
    flex-shrink: 0;
}

/*
 * One row, and the sentence is the part that gives way. The badge and the
 * donate link are the identity and the ask; the prose between them is what
 * can lose a few words without the strip losing its point.
 */
.mirror-text {
    margin: 0;
    min-width: 0;
    color: var(--ink-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.mirror-text-full {
    display: inline;
}
.mirror-text-short {
    display: none;
}

.mirror-host {
    color: var(--accent-ink);
    font-family: var(--fm);
    font-weight: 600;
    /* The address is the one thing here nobody can afford to lose to a
       truncation, so it never breaks across lines. */
    white-space: nowrap;
}

.mirror-donate {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    flex-shrink: 0;
    color: var(--accent-ink);
    font-weight: 600;
    white-space: nowrap;
}

.mirror-donate-icon {
    flex-shrink: 0;
}

.mirror-donate-short {
    display: none;
}

.mirror-host:hover,
.mirror-donate:hover {
    text-decoration: underline;
}

/*
 * Narrow.
 *
 * Two rows: who and what on the first, the address on the second. The full
 * sentence is nine words in Russian and would take the whole strip, leaving
 * the address clipped off the end — the previous build's answer was to hide
 * the text and keep the badge, which said "this is a mirror" without saying
 * where the real one was.
 */
@media (max-width: 1080px) {
    .mirror-banner {
        flex-wrap: wrap;
        align-content: center;
        row-gap: 2px;
        text-align: center;
    }

    /* Text last, so the badge and the donate link share the first row instead
       of the text taking it and pushing the link to a third one. */
    .mirror-tag {
        order: 1;
    }
    .mirror-donate {
        order: 2;
    }

    .mirror-text {
        order: 3;
        flex: 1 1 100%;
        white-space: normal;
        /* Two lines is what the narrow height allows; a third would push the
           donate row out through the bottom of the strip. */
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        overflow: hidden;
    }

    .mirror-text-full {
        display: none;
    }
    .mirror-text-short {
        display: inline;
    }
}

/* Phone: the donate sentence goes to its one word and keeps the heart. */
@media (max-width: 480px) {
    .mirror-donate-full {
        display: none;
    }
    .mirror-donate-short {
        display: inline;
    }
}
</style>
