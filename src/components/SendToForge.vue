<script setup lang="ts">
/**
 * Hand the generated configuration to the key workbench.
 *
 * Both generators end with something a person then has to get into a key, and
 * the manual route is select, copy, navigate, paste. The text goes through
 * `sessionStorage` rather than the URL: a `.conf` carries a private key, and a
 * private key in an address bar is a private key in history, in a referrer,
 * and in whatever syncs the two.
 *
 * Session, not local: the handoff is meant to survive one navigation, not to
 * sit on the disk until something else picks it up.
 */

import { useRouter } from "vue-router";
import { ArrowRight } from "lucide-vue-next";
import { localizePath, useI18n } from "@/i18n";

const props = defineProps<{
    /** The `.conf` text or `vless://` link to carry over. */
    payload: string;
    /** Shown on the button; the caller knows what it is handing over. */
    label: string;
}>();

const { locale } = useI18n();
const router = useRouter();

function send(): void {
    if (!props.payload.trim()) return;
    try {
        sessionStorage.setItem("architect:pending-key", props.payload);
    } catch {
        // Storage blocked: navigate anyway, and the reader pastes by hand.
    }
    void router.push(localizePath("/mergekeys", locale.value));
}
</script>

<template>
    <button class="btn btn--secondary" :disabled="!payload.trim()" @click="send">
        <span>{{ label }}</span>
        <ArrowRight :size="15" />
    </button>
</template>
