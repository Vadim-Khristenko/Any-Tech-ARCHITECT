<script setup lang="ts">
/**
 * The generation history, as a panel.
 *
 * Lifted out of the generator view, where it was two hundred lines of markup
 * and three hundred of CSS inside a file that had grown past three and a half
 * thousand. Nothing here decides anything: it renders what it is given and
 * says what the user did.
 *
 * Restoring and copying stay with the page, because both reach into the
 * generator — one puts a config back on screen, the other writes to the log.
 * What travels down instead is `markedKey`: the page owns one copy-feedback
 * instance shared with the config and parameter buttons, and a second instance
 * in here would let two things claim to have been copied at once.
 */
import { nextTick, ref } from "vue";
import {
    Clock,
    ClipboardCheck,
    Copy,
    Download,
    History,
    Pin,
    RotateCcw,
    Search,
    StickyNote,
    Trash2,
    Upload,
    X,
    Check,
} from "lucide-vue-next";

import { useI18n } from "@/i18n";
import type { GeneratorHistoryEntry } from "@/types/generatorHistory";

const props = defineProps<{
    /** Everything stored, which is what the count and the empty state read. */
    entries: readonly GeneratorHistoryEntry[];
    /** What the query leaves, pinned first. */
    visible: readonly GeneratorHistoryEntry[];
    query: string;
    /** The page's currently-marked copy key, or null. */
    markedKey: string | null;
}>();

const emit = defineEmits<{
    (e: "update:query", value: string): void;
    (e: "restore", entry: GeneratorHistoryEntry): void;
    (e: "copy", entry: GeneratorHistoryEntry): void;
    (e: "remove", id: number): void;
    (e: "pin", id: number, pinned: boolean): void;
    (e: "note", id: number, text: string): void;
    (e: "clear"): void;
    (e: "export"): void;
    (e: "import", file: File): void;
}>();

const { t, locale } = useI18n();

const isMarked = (key: string) => props.markedKey === key;

/** Which entry has its note field open. Entries with a note always show it. */
const noteOpen = ref<number | null>(null);
const noteInputs = new Map<number, HTMLInputElement>();

function registerNoteInput(id: number, el: unknown) {
    if (el instanceof HTMLInputElement) noteInputs.set(id, el);
    else noteInputs.delete(id);
}

/**
 * Open the note field, and put the cursor in it.
 *
 * Opening a field the user then has to click into is two actions where they
 * asked for one.
 */
function toggleNote(entry: GeneratorHistoryEntry) {
    noteOpen.value = noteOpen.value === entry.id ? null : entry.id;
    if (noteOpen.value === entry.id) {
        void nextTick(() => noteInputs.get(entry.id)?.focus());
    }
}

function onImport(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) emit("import", file);
    // Cleared, or choosing the same file twice does nothing the second time.
    input.value = "";
}

function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString(locale.value === "ru" ? "ru-RU" : "en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}
</script>

<template>
    <div class="history-panel">
                    <div class="history-header">
                        <div class="history-header-left">
                            <History :size="16" />
                            <span class="history-title">{{ t("history.title") }}</span>
                            <span class="badge badge-amber">{{
                                entries.length
                            }}</span>
                        </div>
                        <div class="history-header-actions">
                            <label
                                class="btn btn-ghost btn-icon sm"
                                :data-tooltip='t("history.import")'
                            >
                                <Upload :size="14" />
                                <input
                                    type="file"
                                    accept="application/json"
                                    class="visually-hidden"
                                    @change="onImport"
                                />
                            </label>
                            <button
                                v-if="entries.length"
                                class="btn btn-ghost btn-icon sm"
                                @click="$emit('export')"
                                :data-tooltip='t("history.export")'
                            >
                                <Download :size="14" />
                            </button>
                            <button
                                v-if="entries.length"
                                class="btn btn-ghost btn-icon sm"
                                @click="$emit('clear')"
                                :data-tooltip='t("history.clear")'
                            >
                                <Trash2 :size="14" />
                            </button>
                        </div>
                    </div>

                    <!-- Worth showing only once the list is long enough to
                         need looking through. -->
                    <div v-if="entries.length > 3" class="history-search">
                        <Search :size="14" />
                        <input
                            :value="query"
                            @input="$emit('update:query', ($event.target as HTMLInputElement).value)"
                            type="text"
                            class="input-field"
                            :placeholder='t("history.search")'
                            :aria-label='t("history.search")'
                        />
                    </div>

                    <div v-if="!entries.length" class="history-empty">
                        <Clock :size="20" />
                        <span>{{ t("history.empty") }}</span>
                    </div>

                    <!-- A search that matched nothing is not an empty
                         history, and saying nothing at all reads as a bug. -->
                    <div
                        v-else-if="!visible.length"
                        class="history-empty"
                    >
                        <Search :size="20" />
                        <span>{{ t("history.noMatch") }}</span>
                    </div>

                    <div v-else class="history-list">
                        <transition-group
                            name="hist-item"
                            tag="div"
                            class="history-list-inner"
                        >
                            <div
                                v-for="entry in visible"
                                :key="entry.id"
                                class="history-entry"
                                :class="{ pinned: entry.pinned }"
                            >
                                <div class="history-entry-info">
                                    <div class="history-entry-time-row">
                                    <button
                                        class="history-entry-pin"
                                        :class="{ 'is-on': entry.pinned }"
                                        type="button"
                                        :data-tooltip="
                                            entry.pinned
                                                ? t('history.unpin')
                                                : t('history.pin')
                                        "
                                        @click="
                                            $emit('pin', entry.id, !entry.pinned)
                                        "
                                    >
                                        <Pin :size="13" />
                                    </button>
                                    <span class="history-entry-time">{{
                                        formatTime(entry.timestamp)
                                    }}</span>
                                    </div>
                                    <span class="history-entry-tags">
                                        <span class="history-entry-tag">{{
                                            entry.version
                                        }}</span>
                                        <span class="history-entry-tag">{{
                                            entry.label1
                                        }}</span>
                                        <span class="history-entry-tag">{{
                                            entry.label2
                                        }}</span>
                                    </span>
                                </div>
                                <div class="history-entry-params">
                                    <span
                                        v-for="(val, key) in entry.params"
                                        :key="key"
                                        class="history-entry-param"
                                        :class="{
                                            'history-entry-param-wide':
                                                String(val).length > 20,
                                        }"
                                    >
                                        <span class="history-entry-param-k">{{
                                            key
                                        }}</span>
                                        <span
                                            class="history-entry-param-v"
                                            :title="String(val)"
                                            >{{
                                                String(val).length > 30
                                                    ? String(val).slice(0, 27) +
                                                      "…"
                                                    : val
                                            }}</span
                                        >
                                    </span>
                                </div>
                                <div class="history-entry-actions">
                                    <button
                                        class="btn btn-ghost btn-icon sm"
                                        :class="{ 'is-on': noteOpen === entry.id }"
                                        @click="toggleNote(entry)"
                                        :data-tooltip='t("history.note")'
                                    >
                                        <StickyNote :size="14" />
                                    </button>
                                    <button
                                        class="btn btn-ghost btn-icon sm"
                                        :class="{
                                            'copy-ok': isMarked(`restore:${entry.id}`),
                                        }"
                                        :disabled="!entry.cfg"
                                        @click="$emit('restore', entry)"
                                        :data-tooltip="
                                            entry.cfg
                                                ? t('history.restore')
                                                : t('history.legacy')
                                        "
                                    >
                                        <Check
                                            v-if="isMarked(`restore:${entry.id}`)"
                                            :size="14"
                                        />
                                        <RotateCcw v-else :size="14" />
                                    </button>
                                    <button
                                        class="btn btn-ghost btn-icon sm"
                                        :class="{
                                            'copy-ok':
                                                isMarked(`history:${entry.id}`),
                                        }"
                                        @click="$emit('copy', entry)"
                                        :data-tooltip="
                                            t('history.copy')
                                        "
                                    >
                                        <ClipboardCheck
                                            v-if="isMarked(`history:${entry.id}`)"
                                            :size="14"
                                        />
                                        <Copy v-else :size="14" />
                                    </button>
                                    <button
                                        class="btn btn-ghost btn-icon sm"
                                        @click="$emit('remove', entry.id)"
                                        :data-tooltip="
                                            t('history.delete')
                                        "
                                    >
                                        <X :size="14" />
                                    </button>
                                </div>

                                <!-- Below the row rather than in it: a note
                                     is a sentence, and a sentence in a cell
                                     squeezes everything else out. -->
                                <div
                                    v-if="noteOpen === entry.id || entry.note"
                                    class="history-entry-note"
                                >
                                    <input
                                        :ref="
                                            (el) => registerNoteInput(entry.id, el)
                                        "
                                        :value="entry.note ?? ''"
                                        type="text"
                                        class="input-field"
                                        :placeholder='t("history.notePlaceholder")'
                                        :aria-label='t("history.note")'
                                        @change="
                                            $emit('note', entry.id, ($event.target as HTMLInputElement).value)
                                        "
                                        @keyup.enter="
                                            ($event.target as HTMLInputElement).blur()
                                        "
                                    />
                                </div>
                            </div>
                        </transition-group>
                    </div>
    </div>
</template>

<style scoped>
.history-panel {
    background: var(--bg2);
    border: 1px solid var(--border2);
    border-radius: var(--radius-lg);
    padding: 20px;
    margin-bottom: 1.5rem;
    max-height: 400px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: panelSlideIn 0.3s var(--ease-snap);
}

@keyframes panelSlideIn {
    0% {
        opacity: 0;
        transform: translateY(-8px);
    }
    100% {
        opacity: 1;
        transform: translateY(0);
    }
}

.history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.history-header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
}

/*
 * A file input styled as a button. Hiding it with display:none would take it
 * out of the tab order too, which is the one thing a keyboard user needs it
 * to keep.
 */
.visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}

.history-search {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    color: var(--text3);
}

.history-search .input-field {
    flex: 1;
}

.history-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text2);
}

.history-title {
    font-family: var(--fu);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.history-empty {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--text3);
    font-size: 0.85rem;
    padding: 16px 0;
}

.history-list {
    overflow-y: auto;
    max-height: 300px;
}

.history-list-inner {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.hist-item-enter-active {
    transition: all 0.35s var(--ease-snap);
}
.hist-item-leave-active {
    transition: all 0.2s var(--ease);
}
.hist-item-enter-from {
    opacity: 0;
    transform: translateX(-16px);
}
.hist-item-leave-to {
    opacity: 0;
    transform: translateX(16px) scale(0.95);
}

.history-entry {
    display: grid;
    grid-template-columns: minmax(150px, auto) 1fr auto;
    align-items: center;
    gap: 10px 16px;
    padding: 10px 14px;
    background: var(--bg3);
    border: 1px solid var(--border3);
    border-radius: var(--radius-sm);
    transition: all var(--trans-fast);
}

.history-entry:hover {
    border-color: var(--border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* A pinned entry is outside the cap, so it says so before it is hovered. */
.history-entry.pinned {
    border-color: var(--amber, var(--accent));
    background: color-mix(in srgb, var(--amber, var(--accent)) 6%, var(--bg3));
}

.history-entry-pin {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text3);
    cursor: pointer;
    transition: color var(--trans-fast), background var(--trans-fast);
}

.history-entry-pin:hover {
    color: var(--text2);
    background: var(--bg2);
}

.history-entry-pin.is-on {
    color: var(--amber, var(--accent));
}

.history-entry-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.history-entry-time-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.history-entry-time {
    font-family: var(--fm);
    font-size: 0.72rem;
    color: var(--text3);
}

.history-entry-tags {
    display: flex;
    gap: 4px;
}

.history-entry-tag {
    font-size: 0.6rem;
    font-family: var(--fm);
    padding: 1px 6px;
    background: var(--surface);
    border-radius: 4px;
    color: var(--text2);
    text-transform: uppercase;
}

/*
 * Two rows, then it stops.
 *
 * A row is here to identify an entry at a glance — the whole config is one
 * click away on the restore button. An AWG 3.0 entry carries five CPS chains
 * and a header-protection key, and with every long value claiming a row of
 * its own a single entry filled the entire panel.
 */
.history-entry-params {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    flex: 1;
    min-width: 0;
    max-height: 2.6rem;
    overflow: hidden;
    /* Fades rather than cuts, so it reads as "there is more" instead of as a
       rendering fault. */
    mask-image: linear-gradient(to bottom, #000 60%, transparent);
}

.history-entry-param {
    display: flex;
    gap: 3px;
    font-family: var(--fm);
    font-size: 0.68rem;
    max-width: 180px;
}

/* A long value gets more room, not a row to itself. */
.history-entry-param-wide {
    max-width: 260px;
}

.history-entry-param-k {
    color: var(--text3);
    flex-shrink: 0;
}

.history-entry-param-v {
    color: var(--accent-ink);
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.history-entry-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
}

/* Spans every column: a note is a sentence, and a sentence in a cell
   squeezes the parameters into nothing. */
.history-entry-note {
    grid-column: 1 / -1;
}

.history-entry-note .input-field {
    width: 100%;
    font-size: 0.75rem;
    padding: 5px 9px;
}

/*
 * On a narrow screen the three columns stack. Parameters wrap either way, so
 * the row was already the tallest thing in the panel; what it could not do was
 * keep the action buttons on screen.
 */
@media (max-width: 640px) {
    .history-entry {
        grid-template-columns: 1fr;
    }

    .history-entry-actions {
        justify-content: flex-end;
    }
}
</style>
