<script setup lang="ts">
/**
 * Fold several keys into one.
 *
 * Each box is read on its own so a bad key is reported against the box it was
 * pasted into rather than as one failure for the lot.
 */

import { Plus, Shuffle, Trash2, X } from "lucide-vue-next";
import { useI18n } from "@/i18n";
import type { Workbench } from "./workbench";

const props = defineProps<{ w: Workbench }>();
const { t } = useI18n();

/** What a slot holds, said in one phrase for the badge beside it. */
function slotLabel(index: number): string {
    const read = props.w.slotReads.value[index];
    const containers = read?.identity?.containers ?? [];
    return containers.length
        ? containers.map((c) => c.label).join(" · ")
        : t("mk.result.noContainers");
}
</script>

<template>
    <section class="mk-panel">
        <h2 class="h">{{ t("mk.mode.merge.title") }}</h2>
        <p class="lede">{{ t("mk.mode.merge.lede") }}</p>

        <div class="mk-slots">
            <div v-for="(slot, i) in props.w.slots.value" :key="slot.id">
                <div class="mk-slot-head">
                    <span class="rev">{{ i + 1 }}</span>

                    <span v-if="props.w.slotReads.value[i]?.identity" class="badge badge--ok">
                        {{ slotLabel(i) }}
                    </span>
                    <span
                        v-else-if="props.w.slotReads.value[i]?.error"
                        class="badge badge--bad"
                    >
                        {{ t("mk.slot.unreadable") }}
                    </span>

                    <button
                        v-if="props.w.slots.value.length > 2"
                        class="btn btn--ghost btn--icon mk-slot-drop"
                        :aria-label="t('mk.slot.remove')"
                        @click="props.w.removeSlot(slot.id)"
                    >
                        <Trash2 :size="14" />
                    </button>
                </div>

                <textarea
                    v-model="slot.value"
                    class="mk-input mk-input--short"
                    rows="3"
                    spellcheck="false"
                    :placeholder="t('mk.input.placeholder')"
                ></textarea>
            </div>
        </div>

        <div class="mk-actions">
            <button class="btn btn--secondary" @click="props.w.addSlot()">
                <Plus :size="15" />
                {{ t("mk.slot.add") }}
            </button>
            <button class="btn btn--primary" @click="props.w.runMerge()">
                <Shuffle :size="15" />
                {{ t("mk.merge.run") }}
            </button>
        </div>

        <p v-if="props.w.mergeError.value" class="mk-error">
            <X :size="15" />
            {{ props.w.mergeError.value }}
        </p>

        <div v-if="props.w.mergeResult.value" class="titleblock mk-stats">
            <div class="titleblock-cell">
                <span class="titleblock-key">{{ t("mk.merge.total") }}</span>
                <span class="titleblock-val">
                    {{ props.w.mergeResult.value.stats.total }}
                </span>
            </div>
            <div class="titleblock-cell">
                <span class="titleblock-key">{{ t("mk.merge.unique") }}</span>
                <span class="titleblock-val">
                    {{ props.w.mergeResult.value.stats.unique }}
                </span>
            </div>
            <div class="titleblock-cell">
                <span class="titleblock-key">{{ t("mk.merge.dupes") }}</span>
                <span class="titleblock-val">
                    {{ props.w.mergeResult.value.stats.dupes }}
                </span>
            </div>
        </div>
    </section>
</template>

<style scoped>
.mk-slots {
    display: grid;
    gap: var(--sp-4);
    margin-top: var(--sp-5);
}

.mk-slot-head {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex-wrap: wrap;
}

.mk-slot-drop {
    margin-left: auto;
}

.mk-stats {
    margin-top: var(--sp-5);
}
</style>
