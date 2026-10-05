<script setup lang="ts">
/**
 * Support section — fiat links and crypto addresses.
 *
 * The author's other projects used to sit at the bottom of this block, which
 * put "here is where to send money" and "here is what else I make" in one
 * breath. They are a paragraph of their own on the About page now, at the end,
 * where the sentence about who writes this belongs.
 *
 * Lives on the About page under the `#support` anchor, which the footer's
 * donate button links to.
 */
import { computed } from "vue";
import {
    Coffee,
    Copy,
    Check,
    ExternalLink,
    TriangleAlert,
    Wallet,
    Compass,
    ArrowUpRight,
} from "lucide-vue-next";
import { useI18n } from "@/i18n";
import { useCopyFeedback } from "@/composables/useCopyFeedback";
import {
    CRYPTO_WALLETS,
    FIAT_METHODS,
} from "@/data/support";

const { locale, t } = useI18n();

const { copied: copiedId, copy } = useCopyFeedback();

/**
 * Copy an address.
 *
 * The selection fallback matters here more than anywhere else on the site:
 * without a working copy the visitor retypes a forty-character string by hand,
 * and one wrong character loses the money. It used to live only here; it is in
 * the shared helper now, so every other copy button gets it too.
 */
const copyAddress = (id: string, address: string) => copy(id, address);

/** Internal routes get a router-link; everything else an external anchor. */
const isInternal = (url: string) => url.startsWith("/");

</script>

<template>
    <section id="support" class="support">
        <header class="support-head">
            <div class="support-icon"><Coffee :size="26" /></div>
            <h2>{{ t("donate.title") }}</h2>
            <p>{{ t("donate.desc") }}</p>
        </header>

        <!-- ── Fiat / recurring ────────────────────────────────────────── -->
        <div class="fiat-row">
            <a
                v-for="m in FIAT_METHODS"
                :key="m.id"
                :href="m.url"
                target="_blank"
                rel="noopener noreferrer"
                class="fiat-card"
            >
                <span class="fiat-label">{{ m.label }}</span>
                <span class="fiat-note">{{ m.note[locale] }}</span>
                <ExternalLink :size="14" class="fiat-arrow" />
            </a>
        </div>

        <!-- ── Crypto ──────────────────────────────────────────────────── -->
        <div class="crypto-block">
            <div class="crypto-head">
                <Wallet :size="16" />
                <h3>{{ t("donate.crypto") }}</h3>
            </div>

            <div class="alert alert-warn crypto-warn">
                <TriangleAlert :size="16" class="alert-icon" />
                <div class="alert-content">{{ t("donate.warning") }}</div>
            </div>

            <ul class="crypto-list">
                <li v-for="w in CRYPTO_WALLETS" :key="w.id" class="crypto-item">
                    <div class="crypto-meta">
                        <span class="crypto-name">
                            {{ w.name }}
                            <span class="crypto-ticker">{{ w.ticker }}</span>
                        </span>
                        <span class="crypto-network">
                            {{ t("donate.network") }}: {{ w.network[locale] }}
                        </span>
                    </div>

                    <div class="crypto-addr-row">
                        <code class="crypto-addr">{{ w.address }}</code>
                        <button
                            class="crypto-copy"
                            :class="{ 'is-done': copiedId === w.id }"
                            :aria-label="`${t('donate.copyAddress')} — ${w.name}`"
                            @click="copyAddress(w.id, w.address)"
                        >
                            <Check v-if="copiedId === w.id" :size="15" />
                            <Copy v-else :size="15" />
                            <span>{{
                                copiedId === w.id
                                    ? t("donate.copied")
                                    : t("donate.copyAddress")
                            }}</span>
                        </button>
                    </div>
                </li>
            </ul>
        </div>

    </section>
</template>

<style scoped>
.support {
    padding: 26px;
    background: var(--bg2);
    border: 1px solid var(--border2);
    border-radius: var(--radius-xl);
    scroll-margin-top: 90px;
}

/* ── Head ─────────────────────────────────────────────────────────────── */
.support-head {
    text-align: center;
    max-width: 560px;
    margin: 0 auto 22px;
}

.support-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 54px;
    height: 54px;
    margin-bottom: 14px;
    border-radius: var(--radius-lg);
    background: var(--bg4);
    color: var(--accent-ink);
}

.support-head h2 {
    margin: 0 0 8px;
    font-family: var(--fu);
    font-weight: 900;
    font-size: clamp(1.3rem, 4vw, 1.7rem);
    color: var(--text);
}

.support-head p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.65;
    color: var(--text2);
    text-wrap: pretty;
}

/* ── Fiat ─────────────────────────────────────────────────────────────── */
.fiat-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
    margin-bottom: 26px;
}

.fiat-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 14px 34px 14px 16px;
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    background: var(--bg3);
    text-decoration: none;
    transition: all var(--trans-fast);
}

.fiat-card:hover,


.fiat-label {
    font-family: var(--fw);
    font-weight: 800;
    font-size: 0.95rem;
    color: var(--text);
}

.fiat-note {
    font-size: 0.76rem;
    color: var(--text2);
}

.fiat-arrow {
    position: absolute;
    top: 14px;
    right: 14px;
    color: var(--text3);
}

/* ── Crypto ───────────────────────────────────────────────────────────── */
.crypto-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    color: var(--accent-ink);
}

.crypto-head h3 {
    margin: 0;
    font-family: var(--fw);
    font-weight: 800;
    font-size: 0.95rem;
}

.crypto-warn {
    margin-bottom: 14px;
}

.crypto-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0 0 26px;
    padding: 0;
    list-style: none;
}

.crypto-item {
    padding: 14px 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg3);
}

.crypto-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 10px;
}

.crypto-name {
    display: flex;
    align-items: center;
    gap: 7px;
    font-family: var(--fw);
    font-weight: 800;
    font-size: 0.9rem;
    color: var(--text);
}

.crypto-ticker {
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--bg5);
    color: var(--accent-ink-lift);
    font-family: var(--fm);
    font-size: 0.68rem;
    letter-spacing: 0.03em;
}

.crypto-network {
    font-size: 0.74rem;
    color: var(--text2);
}

.crypto-addr-row {
    display: flex;
    align-items: stretch;
    gap: 8px;
}

.crypto-addr {
    flex: 1;
    min-width: 0;
    padding: 9px 11px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--accent-ink-lift);
    font-family: var(--fm);
    font-size: 0.76rem;
    line-height: 1.5;
    /* Addresses must stay readable in full — wrap rather than truncate, and
       break only between characters so nothing is misread as a hyphen. */
    word-break: break-all;
}

.crypto-copy {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    padding: 0 12px;
    border: 1px solid var(--border2);
    border-radius: var(--radius-sm);
    background: var(--bg4);
    color: var(--text2);
    font-family: var(--fw);
    font-weight: 700;
    font-size: 0.75rem;
    white-space: nowrap;
    cursor: pointer;
    transition: all var(--trans-fast);
}

.crypto-copy:hover {
    color: var(--text);
    border-color: var(--border3);
}

.crypto-copy.is-done {
    color: var(--green);
    border-color: var(--green);
}

/* ── Projects ─────────────────────────────────────────────────────────── */
.projects-lede {
    margin: 0 0 12px;
    font-size: 0.86rem;
    line-height: 1.6;
    color: var(--text2);
    text-wrap: pretty;
}

.projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 10px;
}

.project-card {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 14px 16px;
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    background: var(--bg3);
    text-decoration: none;
    transition: all var(--trans-fast);
}



.project-title {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: var(--fw);
    font-weight: 800;
    font-size: 0.88rem;
    color: var(--text);
}

.project-desc {
    font-size: 0.78rem;
    line-height: 1.55;
    color: var(--text2);
    text-wrap: pretty;
}

@media (prefers-reduced-motion: reduce) {
    .fiat-card:hover,
    .project-card:hover {
        transform: none;
    }
}

@media (max-width: 560px) {
    .support {
        padding: 18px 16px;
    }

    /* Stack the copy button under the address: side by side it squeezes the
       address into a two-character column on narrow phones. */
    .crypto-addr-row {
        flex-direction: column;
    }

    .crypto-copy {
        justify-content: center;
        padding: 9px 12px;
    }
}
</style>
