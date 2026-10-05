<script setup lang="ts">
/**
 * Read a key: paste anything, be told what it is.
 *
 * The front door of the workbench, because the first question is never "merge
 * or rewrite" — it is what the string in the clipboard actually holds.
 */

import { X } from "lucide-vue-next";
import { useI18n } from "@/i18n";
import RichText from "@/components/RichText";
import type { Workbench } from "./workbench";

const props = defineProps<{ w: Workbench }>();
const { t } = useI18n();
</script>

<template>
    <section class="mk-panel">
        <h2 class="h">{{ t("mk.mode.inspect.title") }}</h2>
        <RichText class="lede" :text="t('mk.mode.inspect.lede')" inline />

        <textarea
            v-model="props.w.inspectInput.value"
            class="mk-input"
            rows="5"
            spellcheck="false"
            :placeholder="t('mk.input.placeholder')"
            :aria-label="t('mk.mode.inspect.title')"
        ></textarea>

        <p v-if="props.w.inspected.value.error" class="mk-error">
            <X :size="15" />
            {{ props.w.inspected.value.error }}
        </p>
    </section>
</template>
