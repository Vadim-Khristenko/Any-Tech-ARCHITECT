<script setup lang="ts">
/**
 * Where each parameter goes in the Amnezia client.
 *
 * A recreation of the client's own parameter form rather than screenshots:
 * the field names and their order match what the app shows, so the mapping is
 * unambiguous, but it renders in this site's theme and — when a config has
 * been generated — carries the visitor's real values instead of placeholders.
 *
 * Field labels are copied verbatim from the client, including the ones that do
 * not match the protocol docs. H3 is "Underload packet magic header" there,
 * not "Cookie reply"; matching the app matters more than matching the spec,
 * because the app is what the visitor is looking at.
 */
import { ref, computed, onMounted, nextTick } from "vue";
import { Copy, Check, Info, ChevronDown, LayoutGrid } from "lucide-vue-next";
import { useI18n } from "@/i18n";
import { useCopyFeedback } from "@/composables/useCopyFeedback";
import { pendingSimulation } from "@/shared/simHandoff";
import type { AWGConfig } from "@/engines/awg/generator";
import { capsFor } from "@/engines/awg/generator/versions";

const { t } = useI18n();

const cfg = ref<AWGConfig | null>(null);
const { copied, copy } = useCopyFeedback();

/**
 * Sixteen fields is a lot of page, and most FAQ visitors are not mid-setup, so
 * it starts folded. Anyone arriving on the #client-fields anchor — the link
 * from the generator — clearly does want it, so that opens it.
 */
const open = ref(false);

onMounted(() => {
    try {
        const pending = pendingSimulation();
        if (pending && pending.engine === "awg") {
            const c = pending.config as Partial<AWGConfig> | null;
            // The hand-off config carries its version inside, unlike the old
            // envelope that kept it in a sibling field.
            if (c && typeof c === "object" && c.version) {
                cfg.value = c as AWGConfig;
            }
        }
    } catch {
        // A malformed entry just means placeholders — nothing to report.
    }

    if (window.location.hash === "#client-fields") {
        open.value = true;
        nextTick(() => {
            document
                .getElementById("client-fields")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }
});


interface Field {
    key: string;
    /**
     * Verbatim from the client. The app labels these in English whatever its
     * UI language is set to, so translating them here would send a Russian
     * reader looking for text that is not on their screen.
     */
    label: string;
    /** Secondary gloss under the label — never the field name itself. */
    hint: string;
    value: () => string;
}

const ph = (name: string) => `—< ${name} >—`;

const c = () => cfg.value;
const v = (get: (k: AWGConfig) => unknown, name: string) => () => {
    const k = c();
    if (!k) return ph(name);
    const out = get(k);
    return out === undefined || out === null || out === "" ? ph(name) : String(out);
};

/**
 * Whether headers are ranges. With no config yet, assume the newest shape —
 * that is what capsFor returns for an unknown version, and it matches the
 * generator's own default of showing the richest form.
 */
const ranged = () => {
    const k = c();
    return !k || capsFor(k.version).rangedHeaders;
};

const groups = computed<{ key: string; title: string; fields: Field[] }[]>(
    () => [
        {
            key: "junk",
            title: t("clientFields.group.junk"),
            fields: [
                {
                    key: "Jc",
                    label: "Jc – Junk packet count",
                    hint: t("clientFields.hint.jc"),
                    value: v((k) => k.jc, "JC"),
                },
                {
                    key: "Jmin",
                    label: "Jmin – Junk packet minimum size",
                    hint: t("clientFields.hint.jmin"),
                    value: v((k) => k.jmin, "JMIN"),
                },
                {
                    key: "Jmax",
                    label: "Jmax – Junk packet maximum size",
                    hint: t("clientFields.hint.jmax"),
                    value: v((k) => k.jmax, "JMAX"),
                },
            ],
        },
        {
            key: "sizes",
            title: t("clientFields.group.sizes"),
            fields: [
                {
                    key: "S1",
                    label: "S1 – Init packet junk size",
                    hint: t("clientFields.hint.s1"),
                    value: v((k) => k.s1, "S1"),
                },
                {
                    key: "S2",
                    label: "S2 – Response packet junk size",
                    hint: t("clientFields.hint.s2"),
                    value: v((k) => k.s2, "S2"),
                },
                {
                    key: "S3",
                    label: "S3 – Cookie reply packet junk size",
                    hint: t("clientFields.hint.s3"),
                    value: v((k) => k.s3, "S3"),
                },
                {
                    key: "S4",
                    label: "S4 – Transport packet junk size",
                    hint: t("clientFields.hint.s4"),
                    value: v((k) => k.s4, "S4"),
                },
            ],
        },
        {
            key: "headers",
            title: t("clientFields.group.headers"),
            fields: [
                {
                    key: "H1",
                    label: "H1 – Init packet magic header",
                    hint: t("clientFields.hint.h1"),
                    value: v((k) => (ranged() ? k.h1 : k.h1s), "H1"),
                },
                {
                    key: "H2",
                    label: "H2 – Response packet magic header",
                    hint: t("clientFields.hint.h2"),
                    value: v((k) => (ranged() ? k.h2 : k.h2s), "H2"),
                },
                {
                    key: "H3",
                    label: "H3 – Underload packet magic header",
                    // The client calls this "Underload"; the protocol calls the
                    // same field the cookie reply header. Both names, so the
                    // form and the docs line up.
                    hint: t("clientFields.hint.h3"),
                    value: v((k) => (ranged() ? k.h3 : k.h3s), "H3"),
                },
                {
                    key: "H4",
                    label: "H4 – Transport packet magic header",
                    hint: t("clientFields.hint.h4"),
                    value: v((k) => (ranged() ? k.h4 : k.h4s), "H4"),
                },
            ],
        },
        {
            key: "cps",
            title: t("clientFields.group.cps"),
            fields: ([1, 2, 3, 4, 5] as const).map((n) => ({
                key: `I${n}`,
                label: `I${n} – Special junk ${n}`,
                hint: t("clientFields.hint.cps", { n }),
                value: v((k) => k[`i${n}` as keyof AWGConfig], `I${n}`),
            })),
        },
    ],
);

const hasConfig = computed(() => cfg.value !== null);

function copyValue(key: string, value: string) {
    // Placeholders are not values; copying "—< S1 >—" would be worse than
    // doing nothing.
    if (value.startsWith("—<")) return;
    void copy(key, value);
}
</script>

<template>
    <section id="client-fields" class="guide-root" :class="{ 'is-open': open }">
        <!-- Collapsed by default: the full form is sixteen cards tall. -->
        <button
            class="guide-toggle"
            type="button"
            :aria-expanded="open"
            aria-controls="client-fields-body"
            @click="open = !open"
        >
            <span class="guide-toggle-icon"><LayoutGrid :size="18" /></span>
            <span class="guide-toggle-text">
                <b>{{ t("clientFields.toggle.title") }}</b>
                <small>
                    {{
                        hasConfig
                            ? t("clientFields.toggle.filled")
                            : t("clientFields.toggle.empty")
                    }}
                </small>
            </span>
            <ChevronDown :size="18" class="chevron guide-toggle-arrow" />
        </button>

        <div v-show="open" id="client-fields-body" class="guide-body">
        <header class="guide-head">
            <p>{{ t("clientFields.intro") }}</p>

            <div class="guide-state" :class="{ live: hasConfig }">
                <Info :size="14" />
                <span v-if="hasConfig">{{ t("clientFields.state.filled") }}</span>
                <span v-else>{{ t("clientFields.state.empty") }}</span>
            </div>
        </header>

        <div class="guide-groups">
            <div v-for="g in groups" :key="g.key" class="guide-group">
                <h3 class="guide-group-title">{{ g.title }}</h3>

                <div class="guide-fields">
                    <!-- One card per client field, mirroring the app's layout -->
                    <button
                        v-for="f in g.fields"
                        :key="f.key"
                        class="guide-field"
                        :class="{
                            filled: hasConfig && !f.value().startsWith('—<'),
                            copied: copied === f.key,
                        }"
                        type="button"
                        @click="copyValue(f.key, f.value())"
                    >
                        <span class="guide-field-label">
                            {{ f.label }}
                            <em v-if="f.hint">— {{ f.hint }}</em>
                        </span>
                        <span class="guide-field-value">{{ f.value() }}</span>
                        <span class="guide-field-copy" aria-hidden="true">
                            <Check v-if="copied === f.key" :size="15" />
                            <Copy v-else :size="15" />
                        </span>
                    </button>
                </div>
            </div>
        </div>
        </div>
    </section>
</template>

<style scoped>
.guide-root {
    margin: 1.75rem 0;
    background: var(--bg2);
    border: 1px solid var(--border2);
    border-radius: var(--radius-xl);
    overflow: hidden;
    scroll-margin-top: 90px;
    transition: border-color var(--trans-fast);
}

.guide-root.is-open {
    border-color: var(--amber-dim);
}

/* ── Toggle ───────────────────────────────────────────────────────────── */
.guide-toggle {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 18px 22px;
    border: none;
    background: transparent;
    text-align: left;
    cursor: pointer;
    transition: background var(--trans-fast);
}

.guide-toggle:hover {
    background: var(--bg3);
}

.guide-toggle-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    border-radius: var(--radius);
    background: var(--bg4);
    color: var(--accent-ink);
}

.guide-toggle-text {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
}

.guide-toggle-text b {
    font-family: var(--fw);
    font-weight: 800;
    font-size: 0.95rem;
    color: var(--text);
}

.guide-toggle-text small {
    font-size: 0.78rem;
    color: var(--text2);
}

/* Shared: see `.chevron` in main.css. */

.guide-root.is-open .guide-toggle-arrow {
    transform: rotate(180deg);
    color: var(--accent-ink);
}

.guide-body {
    padding: 4px 22px 24px;
}

/* ── Head ─────────────────────────────────────────────────────────────── */
.guide-head p {
    margin: 0 0 14px;
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--text2);
    text-wrap: pretty;
}

.guide-state {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 24px;
    padding: 10px 13px;
    border-left: 2px solid var(--border3);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    background: var(--bg3);
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--text2);
}

.guide-state svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--text3);
}

.guide-state.live {
    border-left-color: var(--green);
}

.guide-state.live svg {
    color: var(--green);
}

/* ── Groups ───────────────────────────────────────────────────────────── */
.guide-groups {
    display: flex;
    flex-direction: column;
    gap: 26px;
}

.guide-group-title {
    margin: 0 0 10px;
    font-family: var(--fw);
    font-weight: 800;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent-ink);
}

.guide-fields {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

/* ── Field card — the client's own shape, in this site's palette ──────── */
.guide-field {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 7px;
    width: 100%;
    padding: 15px 46px 15px 18px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--bg3);
    text-align: left;
    cursor: pointer;
    transition:
        border-color var(--trans-fast),
        background var(--trans-fast);
}

.guide-field:hover {
    border-color: var(--border3);
    background: var(--bg4);
}

.guide-field.filled {
    border-color: var(--amber-dim);
}

.guide-field.copied {
    border-color: var(--green);
}

.guide-field-label {
    font-family: var(--fw);
    font-size: 0.78rem;
    color: var(--text2);
}

/* The gloss sits behind the English name, never in place of it. */
.guide-field-label em {
    font-style: normal;
    color: var(--text3);
}

.guide-field-value {
    font-family: var(--fm);
    font-size: 0.98rem;
    line-height: 1.45;
    color: var(--text);
    /* CPS chains are long; wrap rather than clip so the whole value is
       readable without a horizontal scrollbar inside every card. */
    word-break: break-all;
}

.guide-field:not(.filled) .guide-field-value {
    color: var(--text3);
}

.guide-field-copy {
    position: absolute;
    top: 15px;
    right: 15px;
    display: flex;
    color: var(--text4);
    opacity: 0;
    transition: opacity var(--trans-fast);
}

.guide-field:hover .guide-field-copy,
.guide-field.copied .guide-field-copy {
    opacity: 1;
}

.guide-field.copied .guide-field-copy {
    color: var(--green);
}

.guide-field:not(.filled) .guide-field-copy {
    display: none;
}

@media (max-width: 480px) {
    .guide-toggle {
        padding: 15px 16px;
        gap: 12px;
    }

    .guide-body {
        padding: 2px 16px 20px;
    }

    .guide-field {
        padding: 13px 14px;
    }

    /* No hover on touch, so the copy affordance would never show. */
    .guide-field-copy {
        opacity: 1;
        top: 13px;
        right: 12px;
    }
}
</style>
