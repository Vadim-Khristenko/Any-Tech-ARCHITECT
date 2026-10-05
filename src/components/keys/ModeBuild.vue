<script setup lang="ts">
/**
 * Assemble a key from parts.
 *
 * Two ways in, because a blank panel asks someone to know the format before
 * using the tool that explains it: start from a template, or paste something
 * you already have and take its containers.
 */

import { Plus, Trash2, X } from "lucide-vue-next";
import { useI18n } from "@/i18n";
import { TEMPLATES } from "@/engines/keys";
import type { Workbench } from "./workbench";

const props = defineProps<{ w: Workbench }>();
const { t } = useI18n();

const tk = (key: string) => t(key as "mk.tpl.awg3");
</script>

<template>
    <section class="mk-panel">
        <h2 class="h">{{ t("mk.mode.build.title") }}</h2>
        <p class="lede">{{ t("mk.mode.build.lede") }}</p>

        <div class="mk-fields">
            <label class="mk-field">
                <span class="mk-field-label">{{ t("mk.build.name") }}</span>
                <input
                    v-model="props.w.buildMeta.value.name"
                    class="mk-text"
                    type="text"
                />
            </label>
            <label class="mk-field">
                <span class="mk-field-label">{{ t("mk.build.description") }}</span>
                <input
                    v-model="props.w.buildMeta.value.description"
                    class="mk-text"
                    type="text"
                />
            </label>
        </div>

        <span class="mk-field-label mk-stack-label">
            {{ t("mk.build.templateLabel") }}
        </span>
        <div class="mk-templates">
            <button
                v-for="tpl in TEMPLATES"
                :key="tpl.id"
                class="mk-template"
                @click="props.w.addTemplate(tpl.id)"
            >
                <span class="mk-template-name">{{ tpl.label }}</span>
                <span class="mk-template-hint">{{ tk(`mk.tpl.${tpl.key}`) }}</span>
            </button>
        </div>

        <span class="mk-field-label mk-stack-label">
            {{ t("mk.build.addLabel") }}
        </span>
        <textarea
            v-model="props.w.buildInput.value"
            class="mk-input mk-input--short"
            rows="4"
            spellcheck="false"
            :placeholder="t('mk.input.placeholder')"
            :aria-label="t('mk.build.addLabel')"
        ></textarea>

        <div class="mk-actions">
            <button class="btn btn--secondary" @click="props.w.addPart()">
                <Plus :size="15" />
                {{ t("mk.build.add") }}
            </button>
        </div>

        <p v-if="props.w.buildError.value" class="mk-error">
            <X :size="15" />
            {{ props.w.buildError.value }}
        </p>

        <p class="prose mk-note">{{ t("mk.build.parts") }}</p>

        <ul v-if="props.w.parts.value.length" class="mk-parts">
            <li v-for="(part, i) in props.w.parts.value" :key="i" class="mk-part">
                <code class="code">{{ part.container }}</code>
                <button
                    class="btn btn--ghost btn--icon"
                    :aria-label="t('mk.build.removePart')"
                    @click="props.w.removePart(i)"
                >
                    <Trash2 :size="14" />
                </button>
            </li>
        </ul>
        <p v-else class="mk-note">{{ t("mk.build.empty") }}</p>
    </section>
</template>

<style scoped>
.mk-templates {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: var(--sp-2);
    margin-top: var(--sp-2);
}

.mk-template {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--sp-3) var(--sp-4);
    text-align: left;
    border: var(--rule) solid var(--line);
    border-radius: var(--r-1);
    background: var(--surface-solid);
    color: var(--ink-2);
    cursor: pointer;
    transition:
        border-color var(--trans-fast),
        color var(--trans-fast);
}

.mk-template:hover {
    border-color: var(--accent-ink);
    color: var(--text);
}

.mk-template-name {
    font-family: var(--fw);
    font-weight: 800;
    font-size: var(--t-sm);
}

.mk-template-hint {
    font-size: var(--t-2xs);
    color: var(--ink-3);
    line-height: 1.4;
}

.mk-parts {
    display: grid;
    gap: var(--sp-2);
    margin: var(--sp-3) 0 0;
    padding: 0;
    list-style: none;
}

.mk-part {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-4);
    background: var(--surface-solid);
    border: var(--rule) solid var(--line);
    border-radius: var(--r-1);
}

.mk-part .code {
    flex: 1;
}
</style>
