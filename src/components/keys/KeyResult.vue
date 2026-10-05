<script setup lang="ts">
/**
 * What the active mode produced: what it holds, what is wrong with it, how to
 * read it, and how to take it away.
 *
 * One panel for all four modes. Reading a key, merging several, rewriting the
 * obfuscation and building one from parts all end in the same place, and
 * writing that place four times is how the four drift apart.
 */

import { computed, ref, watch } from "vue";
import {
    Check,
    Copy,
    Download,
    FileJson,
    FileText,
    KeyRound,
    Link2,
    Pencil,
    X,
} from "lucide-vue-next";
import { useI18n } from "@/i18n";
import { useCopyFeedback } from "@/composables/useCopyFeedback";
import { readKey } from "@/composables/useKeyWorkbench";
import { downloadText, timestampedName } from "@/utils/download";
import { resolveFinding, sortFindings } from "@/shared/findings";
import CodeView from "@/components/CodeView.vue";
import type { Workbench } from "./workbench";

const props = defineProps<{ w: Workbench }>();

const { t } = useI18n();
const { isCopied, copy } = useCopyFeedback();

const tk = (key: string) => t(key as "mk.result.service.free.title");

/* ── What it holds ───────────────────────────────────────────────────────── */

const findings = computed(() =>
    props.w.current.value ? sortFindings(props.w.current.value.findings) : [],
);

/**
 * A subscription key gets a paragraph rather than a badge.
 *
 * "Amnezia Premium" on a chip tells someone what they already knew. What they
 * do not know is why the page offers them nothing to do: the key holds access
 * to a service, and the configuration arrives later.
 */
const service = computed(() => {
    const current = props.w.current.value;
    if (!current || current.identity.shape !== "api") return null;

    const which =
        current.identity.service === "amnezia-premium"
            ? "premium"
            : current.identity.service === "amnezia-free"
              ? "free"
              : "other";

    const config = current.config as unknown as Record<string, unknown>;
    const api = config.api_config as Record<string, unknown> | undefined;
    const str = (v: unknown) => (typeof v === "string" ? v : undefined);

    return {
        title: tk(`mk.result.service.${which}.title`),
        desc: tk(`mk.result.service.${which}.desc`),
        // Read off the key rather than assumed: an older key keeps these flat.
        protocol: str(api?.service_protocol) ?? str(config.protocol),
        region: str(api?.user_country_code)?.toUpperCase(),
    };
});

/* ── Reading it in whichever format suits ────────────────────────────────── */

type View = "key" | "json" | "conf";

const view = ref<View>("key");

/** JSON's indentation is its structure; some clients want it compact. */
const indentJson = ref(true);

/*
 * A `.conf` is short lines and always wraps. JSON never does: wrapping folds a
 * long value back to the margin, which is what made the indent look broken.
 */
const softWrap = computed(() => view.value !== "json");

/** Every `.conf` the key can produce, with its container named when several. */
const confText = computed(() => {
    const files = props.w.currentExports.value?.conf ?? {};
    const names = Object.keys(files);
    if (names.length === 0) return "";
    return names
        .map((n) => (names.length > 1 ? `# ${n}\n${files[n]}` : files[n]))
        .join("\n\n");
});

const hasConf = computed(() => confText.value !== "");
const jsonText = computed(() => props.w.currentExports.value?.json ?? "");

const shown = computed(() => {
    if (view.value === "json") return jsonText.value;
    if (view.value === "conf" && hasConf.value) return confText.value;
    return props.w.currentKey.value;
});

const VIEWS = computed(() =>
    [
        { id: "key" as const, label: "vpn://", on: true },
        { id: "json" as const, label: "JSON", on: true },
        { id: "conf" as const, label: ".conf", on: hasConf.value },
    ].filter((v) => v.on),
);

/* ── Editing ─────────────────────────────────────────────────────────────── */

/**
 * The text being edited, or null when the panel is only showing.
 *
 * Kept apart from the key so a half-finished edit never becomes the current
 * config: it is applied on request, not on every keystroke.
 */
const draft = ref<string | null>(null);
const draftError = ref<string | null>(null);
const draftBox = ref<HTMLTextAreaElement | null>(null);

/** A vpn:// string is not for typing in; the text formats are. */
const editable = computed(() => view.value === "json" || view.value === "conf");

function startEdit(): void {
    draftError.value = null;
    draft.value = shown.value;
}

function cancelEdit(): void {
    draft.value = null;
    draftError.value = null;
}

/**
 * Apply an edit by handing the text back to the reader.
 *
 * Both formats already arrive that way, so an edited file takes exactly the
 * path a pasted one takes and gets the same checks — no second parser.
 */
function applyEdit(): void {
    const text = draft.value;
    if (text === null) return;

    const read = readKey(text);
    if (read.error || !read.config) {
        draftError.value = read.error ?? t("mk.edit.unreadable");
        return;
    }

    const w = props.w;
    if (w.mode.value === "merge" && w.mergeResult.value) {
        w.mergeResult.value = { ...w.mergeResult.value, config: read.config };
    } else if (w.mode.value === "refresh" && w.refreshResult.value) {
        w.refreshResult.value = { ...w.refreshResult.value, config: read.config };
    } else if (w.mode.value === "build") {
        w.parts.value = read.config.containers ?? [];
    } else if (w.mode.value === "refresh") {
        w.refreshInput.value = text;
    } else {
        w.inspectInput.value = text;
    }

    draft.value = null;
    draftError.value = null;
}

/* Changing format drops an unapplied edit rather than carrying it across. */
watch(view, cancelEdit);

/** Keep the highlighted copy under the caret as the box scrolls. */
function syncScroll(): void {
    const box = draftBox.value;
    const back = box?.parentElement?.querySelector("pre");
    if (box && back) {
        back.scrollTop = box.scrollTop;
        back.scrollLeft = box.scrollLeft;
    }
}

/* ── Taking it away ──────────────────────────────────────────────────────── */

/**
 * The extension is passed rather than baked into the name: this panel hands
 * out four formats, and the wrong one is a file the reader's system opens
 * with the wrong thing.
 */
function save(ext: string, text: string, mime: string): void {
    downloadText(text, timestampedName("AnyTech_Key", ext), mime);
}
</script>

<template>
    <section v-if="props.w.current.value" class="mk-result">
        <h2 class="h mk-result-title">{{ t("mk.result.title") }}</h2>

        <!-- A subscription key: say what it is and why nothing is on offer. -->
        <div v-if="service" class="panel mk-service">
            <div class="panel-head">
                <KeyRound :size="17" />
                <h3 class="panel-title">{{ service.title }}</h3>
            </div>
            <div class="panel-body">
                <p class="prose">{{ service.desc }}</p>
                <div v-if="service.protocol || service.region" class="titleblock">
                    <div v-if="service.protocol" class="titleblock-cell">
                        <span class="titleblock-key">
                            {{ t("mk.result.service.protocol") }}
                        </span>
                        <span class="titleblock-val">{{ service.protocol }}</span>
                    </div>
                    <div v-if="service.region" class="titleblock-cell">
                        <span class="titleblock-key">
                            {{ t("mk.result.service.region") }}
                        </span>
                        <span class="titleblock-val">{{ service.region }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Containers -->
        <div
            v-if="props.w.current.value.identity.containers.length"
            class="mk-containers"
        >
            <article
                v-for="c in props.w.current.value.identity.containers"
                :key="c.name"
                class="mk-container"
            >
                <header class="mk-container-head">
                    <span class="mk-container-label">{{ c.label }}</span>
                    <span v-if="c.awgVersion" class="rev">{{ c.awgVersion }}</span>
                    <span v-if="c.inferred" class="badge badge--quiet">
                        {{ t("mk.result.inferred") }}
                    </span>
                </header>
                <code class="code mk-container-name">{{ c.name }}</code>
                <p v-if="c.hostName" class="mk-container-addr mono">
                    {{ c.hostName }}<template v-if="c.port">:{{ c.port }}</template>
                </p>
            </article>
        </div>
        <p v-else class="mk-note">{{ t("mk.result.noContainers") }}</p>

        <!-- Findings -->
        <ul v-if="findings.length" class="mk-findings">
            <li
                v-for="(f, i) in findings"
                :key="`${f.code}-${i}`"
                class="mk-finding"
                :class="`is-${f.level}`"
            >
                <span class="dot" :class="f.level === 'error' ? 'dot--bad' : ''"></span>
                <span>{{ resolveFinding(f) }}</span>
            </li>
        </ul>

        <!-- Naming -->
        <div class="mk-fields">
            <label class="mk-field">
                <span class="mk-field-label">{{ t("mk.build.name") }}</span>
                <input
                    v-model="props.w.labelEdits.value.name"
                    class="mk-text"
                    type="text"
                />
            </label>
            <label class="mk-field">
                <span class="mk-field-label">{{ t("mk.build.description") }}</span>
                <input
                    v-model="props.w.labelEdits.value.description"
                    class="mk-text"
                    type="text"
                />
            </label>
            <button class="btn btn--secondary" @click="props.w.applyLabels()">
                {{ t("mk.result.rename") }}
            </button>
        </div>

        <!-- ══ Formats ═════════════════════════════════════════════════ -->
        <div class="mk-formats">
            <div class="mk-views">
                <button
                    v-for="v in VIEWS"
                    :key="v.id"
                    class="mk-view"
                    :class="{ 'is-active': view === v.id }"
                    @click="view = v.id"
                >
                    {{ v.label }}
                </button>
            </div>

            <div v-if="view === 'key'" class="mk-keyline">
                <code class="code mk-keyline-value">{{ props.w.currentKey.value }}</code>
            </div>

            <div v-else class="mk-viewer">
                <div class="mk-viewer-bar">
                    <label v-if="view === 'json'" class="mk-toggle">
                        <input v-model="indentJson" type="checkbox" />
                        <span>{{ t("mk.view.indent") }}</span>
                    </label>
                    <span v-else class="mk-viewer-note">
                        {{ t("mk.view.confWraps") }}
                    </span>

                    <button
                        v-if="draft === null && editable"
                        class="btn btn--ghost btn--sm"
                        @click="startEdit"
                    >
                        <Pencil :size="14" />
                        {{ t("mk.edit.start") }}
                    </button>

                    <template v-else-if="draft !== null">
                        <button class="btn btn--primary btn--sm" @click="applyEdit">
                            <Check :size="14" />
                            {{ t("mk.edit.apply") }}
                        </button>
                        <button class="btn btn--ghost btn--sm" @click="cancelEdit">
                            {{ t("mk.edit.cancel") }}
                        </button>
                    </template>
                </div>

                <!--
                    Editing keeps its colours: a highlighted copy underneath, a
                    transparent textarea on top, the two scrolling together. A
                    plain box drops the one thing that makes a key readable at
                    the moment it is being changed.
                -->
                <div v-if="draft !== null" class="mk-editor">
                    <CodeView
                        :text="draft"
                        :lang="view === 'json' ? 'json' : 'conf'"
                        :wrap="softWrap"
                        :indent="indentJson"
                        aria-hidden="true"
                    />
                    <textarea
                        ref="draftBox"
                        v-model="draft"
                        class="mk-editor-input"
                        :class="{ 'is-nowrap': !softWrap }"
                        spellcheck="false"
                        :aria-label="t('mk.edit.start')"
                        @scroll="syncScroll"
                    ></textarea>
                </div>
                <CodeView
                    v-else
                    :text="shown"
                    :lang="view === 'json' ? 'json' : 'conf'"
                    :wrap="softWrap"
                    :indent="indentJson"
                    expand
                />

                <p v-if="draftError" class="mk-error">
                    <X :size="15" />
                    {{ draftError }}
                </p>
            </div>
        </div>

        <!-- ══ Copy and save ═══════════════════════════════════════════ -->
        <div class="mk-take">
            <div class="mk-take-group">
                <span class="mk-take-label">{{ t("mk.act.copyGroup") }}</span>
                <div class="mk-take-row">
                    <button
                        class="btn btn--secondary"
                        :class="{ 'is-done': isCopied('c-key') }"
                        @click="copy('c-key', props.w.currentKey.value)"
                    >
                        <Copy :size="15" />
                        {{ t("mk.act.copyKey") }}
                    </button>
                    <button
                        class="btn btn--secondary"
                        :class="{ 'is-done': isCopied('c-json') }"
                        @click="copy('c-json', jsonText)"
                    >
                        <FileJson :size="15" />
                        {{ t("mk.act.copyJson") }}
                    </button>
                    <button
                        v-if="hasConf"
                        class="btn btn--secondary"
                        :class="{ 'is-done': isCopied('c-conf') }"
                        @click="copy('c-conf', confText)"
                    >
                        <FileText :size="15" />
                        {{ t("mk.act.copyConf") }}
                    </button>
                    <button
                        v-for="(text, name) in props.w.currentExports.value?.vless ?? {}"
                        :key="`v-${name}`"
                        class="btn btn--secondary"
                        :class="{ 'is-done': isCopied(`v-${name}`) }"
                        @click="copy(`v-${name}`, text)"
                    >
                        <Link2 :size="15" />
                        {{ t("mk.act.copyVless") }}
                    </button>
                </div>
            </div>

            <div class="mk-take-group">
                <span class="mk-take-label">{{ t("mk.act.saveGroup") }}</span>
                <div class="mk-take-row">
                    <button
                        class="btn btn--ghost"
                        @click="save('txt', props.w.currentKey.value, 'text/plain')"
                    >
                        <Download :size="15" />
                        {{ t("mk.act.saveKey") }}
                    </button>
                    <button
                        class="btn btn--ghost"
                        @click="save('json', jsonText, 'application/json')"
                    >
                        <Download :size="15" />
                        {{ t("mk.act.saveJson") }}
                    </button>
                    <button
                        v-if="hasConf"
                        class="btn btn--ghost"
                        @click="save('conf', confText, 'text/plain')"
                    >
                        <Download :size="15" />
                        {{ t("mk.act.saveConf") }}
                    </button>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.mk-result {
    padding: var(--sp-6);
    background: var(--surface-solid);
    border: var(--rule) solid var(--line);
    border-radius: var(--r-3);
    /* One rhythm down the panel, so nothing depends on a neighbour's margin. */
    display: grid;
    gap: var(--sp-5);
    min-width: 0;
}

/* See the note on `.mk > *`: a grid track will not shrink below its content. */
.mk-result > * {
    min-width: 0;
}

.mk-result-title {
    margin: 0;
}

.mk-service .panel-body {
    display: grid;
    gap: var(--sp-4);
}

/* ── Containers ───────────────────────────────────────────────────────── */
.mk-containers {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: var(--sp-3);
}

.mk-container {
    padding: var(--sp-4);
    background: var(--ground-2);
    border: var(--rule) solid var(--line-faint);
    border-radius: var(--r-1);
}

.mk-container-head {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex-wrap: wrap;
    margin-bottom: var(--sp-2);
}

.mk-container-label {
    font-family: var(--fw);
    font-weight: 800;
    font-size: var(--t-sm);
    color: var(--text);
}

.mk-container-name {
    font-size: var(--t-2xs);
}

.mk-container-addr {
    margin: var(--sp-2) 0 0;
    font-size: var(--t-2xs);
    color: var(--ink-3);
}

/* ── Findings ─────────────────────────────────────────────────────────── */
.mk-findings {
    display: grid;
    gap: var(--sp-2);
    margin: 0;
    padding: 0;
    list-style: none;
}

.mk-finding {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-3);
    font-size: var(--t-sm);
    line-height: 1.6;
    color: var(--ink-2);
    text-wrap: pretty;
    min-width: 0;
}

/*
 * A finding quotes what it found, and what it found is often a CPS chain or a
 * key: one token, no spaces, longer than the panel. `anywhere` lets it break
 * mid-token, which is the only way it fits.
 */
.mk-finding > span:last-child {
    min-width: 0;
    overflow-wrap: anywhere;
}

.mk-finding .dot {
    margin-top: 0.5em;
    flex-shrink: 0;
}

.mk-finding.is-error {
    color: var(--text);
}

/* ── Formats ──────────────────────────────────────────────────────────── */
.mk-formats {
    display: grid;
    gap: var(--sp-3);
}

.mk-views {
    display: flex;
    gap: var(--sp-1);
    flex-wrap: wrap;
}

.mk-view {
    padding: var(--sp-2) var(--sp-4);
    border: var(--rule) solid var(--line);
    border-radius: var(--r-pill);
    background: transparent;
    color: var(--ink-3);
    font-family: var(--fm);
    font-size: var(--t-2xs);
    cursor: pointer;
    transition:
        border-color var(--trans-fast),
        color var(--trans-fast);
}

.mk-view.is-active {
    background: var(--surface-solid-2);
    border-color: var(--accent-ink);
    color: var(--accent-ink);
}

/*
 * The key is one string with no break opportunity in it, and it is longer than
 * any panel. Scrolling it sideways hid most of it and pushed the panel's right
 * edge off the page; `anywhere` lets the line break mid-token, so it stays one
 * value that happens to be drawn across several rows.
 */
.mk-keyline-value {
    display: block;
    padding: var(--sp-3) var(--sp-4);
    min-width: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.7;
}

.mk-viewer {
    display: grid;
    gap: var(--sp-2);
    min-width: 0;
}

.mk-viewer > * {
    min-width: 0;
}

.mk-viewer-bar {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex-wrap: wrap;
}

.mk-toggle {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    margin-right: auto;
    font-size: var(--t-2xs);
    color: var(--ink-3);
    cursor: pointer;
}

/*
 * The box itself belongs to the kit, which draws its own fill and tick — an
 * `accent-color` here did nothing, since the kit takes the native rendering
 * away and `accent-color` only colours a control the browser still draws.
 * All that is left to say is that this one sits on a line rather than beside a
 * paragraph.
 */
.mk-toggle input {
    margin: 0;
}

.mk-viewer-note {
    margin-right: auto;
    font-size: var(--t-2xs);
    color: var(--ink-4);
}

/*
 * The two layers hold the same text in the same metrics, so the caret lands
 * where the colour is. Any difference in font, size or padding shows as drift.
 *
 * `min-width: 0` is what keeps the box on the page. The highlighted layer
 * scrolls on its own, so reading a config stayed bounded; editing put this
 * wrapper between it and the grid, and a wrapper that does not scroll takes
 * the width of its longest unwrapped line — six thousand pixels of JSON, with
 * the whole page dragged along behind it.
 */
.mk-editor {
    position: relative;
    min-width: 0;
}

.mk-editor-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: var(--sp-4);
    border: var(--rule) solid transparent;
    border-radius: var(--r-1);
    background: transparent;
    color: transparent;
    caret-color: var(--accent-ink);
    font-family: var(--fm);
    font-size: var(--t-2xs);
    line-height: 1.75;
    white-space: pre-wrap;
    word-break: break-all;
    overflow: auto;
    resize: none;
}

.mk-editor-input.is-nowrap {
    white-space: pre;
    word-break: normal;
}

.mk-editor-input:focus {
    outline: none;
    border-color: var(--accent-ink);
}

.mk-editor-input::selection {
    background: rgb(var(--accent-rgb) / 0.3);
}

/* ── Copy and save ────────────────────────────────────────────────────── */
.mk-take {
    display: grid;
    gap: var(--sp-4);
}

.mk-take-group {
    display: grid;
    gap: var(--sp-2);
}

.mk-take-label {
    font-family: var(--fm);
    font-size: var(--t-2xs);
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-4);
}

/* Buttons on one baseline, wrapping as a group rather than drifting apart. */
.mk-take-row {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: var(--sp-2);
}

.is-done {
    color: var(--green);
}

@media (max-width: 640px) {
    .mk-result {
        padding: var(--sp-4);
    }

    /* Full-width buttons stack predictably instead of leaving ragged rows. */
    .mk-take-row .btn {
        flex: 1 1 100%;
        justify-content: center;
    }
}
</style>
