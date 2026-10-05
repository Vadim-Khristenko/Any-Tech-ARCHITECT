<script setup lang="ts">
/**
 * Write new obfuscation into a key you already have.
 *
 * Two inputs, not one. What a generator hands over is a parameter set —
 * `[Interface]`, the obfuscation fields, and commented placeholders where the
 * keys go. It is not a tunnel; it is what to put into one.
 */

import { computed } from "vue";
import { ArrowRight, Wand2, X } from "lucide-vue-next";
import { useI18n } from "@/i18n";
import RichText from "@/components/RichText";
import type { Workbench } from "./workbench";

const props = defineProps<{ w: Workbench; handoff: boolean }>();
const { t } = useI18n();

const found = computed(() => Object.keys(props.w.patchFields.value));
</script>

<template>
    <section class="mk-panel">
        <h2 class="h">{{ t("mk.mode.refresh.title") }}</h2>
        <p class="lede">{{ t("mk.mode.refresh.lede") }}</p>

        <div v-if="props.handoff" class="well mk-handoff">
            <ArrowRight :size="15" />
            <p>{{ t("mk.refresh.handoff") }}</p>
        </div>

        <span class="mk-field-label mk-stack-label">
            {{ t("mk.refresh.keyLabel") }}
        </span>
        <textarea
            v-model="props.w.refreshInput.value"
            class="mk-input mk-input--short"
            rows="4"
            spellcheck="false"
            :placeholder="t('mk.input.placeholder')"
            :aria-label="t('mk.refresh.keyLabel')"
        ></textarea>

        <p v-if="props.w.refreshed.value.error" class="mk-error">
            <X :size="15" />
            {{ props.w.refreshed.value.error }}
        </p>

        <span class="mk-field-label mk-stack-label">
            {{ t("mk.refresh.paramsLabel") }}
        </span>
        <textarea
            v-model="props.w.refreshParams.value"
            class="mk-input mk-input--short"
            rows="6"
            spellcheck="false"
            :placeholder="t('mk.refresh.paramsPlaceholder')"
            :aria-label="t('mk.refresh.paramsLabel')"
        ></textarea>

        <p v-if="found.length" class="mk-found mono">{{ found.join(" · ") }}</p>

        <div class="mk-actions">
            <button class="btn btn--primary" @click="props.w.runRefresh()">
                <Wand2 :size="15" />
                {{ t("mk.refresh.run") }}
            </button>
        </div>

        <p v-if="props.w.refreshError.value" class="mk-error">
            <X :size="15" />
            {{ props.w.refreshError.value }}
        </p>

        <p v-if="props.w.refreshResult.value" class="mk-found">
            {{
                t("mk.refresh.done", {
                    fields: props.w.refreshResult.value.changed.join(", ") || "—",
                })
            }}
        </p>

        <RichText class="prose mk-note" :text="t('mk.refresh.scope')" inline />
    </section>
</template>

<style scoped>
.mk-handoff {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-3);
    margin-top: var(--sp-4);
    color: var(--accent-ink);
}

.mk-handoff p {
    margin: 0;
    font-size: var(--t-sm);
    line-height: 1.6;
    color: var(--ink-2);
}
</style>
