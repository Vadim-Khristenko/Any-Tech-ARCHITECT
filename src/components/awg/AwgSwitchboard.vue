<script setup lang="ts">
/**
 * The protocol switches of AmneziaWG 3.x, as one group.
 *
 * They used to sit in three places: the transport zone, a lone checkbox
 * under the padding bars, and a narrow-H toggle with a paragraph after it.
 * Here they are one sheet, drawn by revision: what 3.0 added, what 3.1 added,
 * and hanging off the two 3.1 parents on a leader line, the switches that
 * only mean something once both are on.
 *
 * The state is the generator's own reactive config, passed in and written in
 * place, the same object the page's other controls bind to. A change emits
 * `change`, and the page regenerates.
 */
import { computed } from "vue";
import { RotateCcw, Lock } from "lucide-vue-next";
import { useI18n } from "@/i18n";
import type { AWGConfig, AWGVersion } from "@/engines/awg/generator";
import { linkedSwitchesOn } from "@/engines/awg/generator/presets";
import type { ParamScope } from "@/types/protocol";

/** The fields this group owns. */
export interface SwitchState {
    useHeaderProtection: boolean;
    useContentPadding: boolean;
    useRandomTimings: boolean;
    useRandomTrailers: boolean;
    useDisableCookies: boolean;
    useNarrowH: boolean;
    useSameS: boolean;
    useDisableH: boolean;
}

type Field = keyof SwitchState;

interface SwitchDef {
    field: Field;
    /** i18n stem under gen.sw. */
    id: string;
    /** What it is called in a .conf. */
    keyName: string;
    scope: ParamScope;
}

const props = defineProps<{
    version: AWGVersion;
    state: SwitchState;
    /** The client keeps HeaderProtectionKey in its own app. */
    hpkManaged: boolean;
    /** The config on screen, for the readouts beside the linked switches. */
    current: AWGConfig | null;
}>();

const emit = defineEmits<{
    change: [];
    preset: [];
}>();

const { t } = useI18n();

const REV_30: SwitchDef[] = [
    { field: "useHeaderProtection", id: "hpk", keyName: "HeaderProtectionKey", scope: "shared" },
    { field: "useContentPadding", id: "cpa", keyName: "ContentPaddingAddition", scope: "sender" },
    { field: "useRandomTimings", id: "timers", keyName: "RekeyAfterTime · KeepaliveTimeout …", scope: "local" },
];

const REV_31: SwitchDef[] = [
    { field: "useRandomTrailers", id: "trailers", keyName: "RandomTrailers", scope: "shared" },
    { field: "useDisableCookies", id: "cookies", keyName: "DisableCookies", scope: "local" },
];

const LINKED: SwitchDef[] = [
    { field: "useDisableH", id: "disableH", keyName: "H1-H4 = 1 · 2 · 3 · 4", scope: "shared" },
    { field: "useSameS", id: "uniteS", keyName: "S1 = S2 = S3 = S4", scope: "shared" },
];

const NARROW: SwitchDef = { field: "useNarrowH", id: "narrowH", keyName: "H1-H4 ≤ 20 000", scope: "shared" };

const is31 = computed(() => props.version === "3.1");

/** Both parents on: the linked switches can act, so they are shown. */
const linked = computed(() =>
    linkedSwitchesOn({
        version: props.version,
        useHeaderProtection: props.state.useHeaderProtection,
        useRandomTrailers: props.state.useRandomTrailers,
    }),
);

/**
 * Narrow H matters only under trailers, and not at all once the headers are
 * replaced by 1-4. Offered as the alternative for whoever keeps ranges.
 */
const showNarrow = computed(
    () => is31.value && props.state.useRandomTrailers && !(linked.value && props.state.useDisableH),
);

const rev31 = computed(() => (showNarrow.value ? [...REV_31, NARROW] : REV_31));

/**
 * What "Unite S1-S4" drew, in the config on screen. Only that one: the value
 * is a fresh number each time, whereas disabled headers are always 1-4 and
 * the key line already says so.
 */
function readout(field: Field): string | null {
    const cfg = props.current;
    if (!cfg || field !== "useSameS" || !props.state[field]) return null;
    return [cfg.s1, cfg.s2, cfg.s3, cfg.s4].map((s) => `${s} B`).join(" · ");
}

function set(field: Field, value: boolean): void {
    // eslint-disable-next-line vue/no-mutating-props -- the generator's reactive config, see the header
    props.state[field] = value;
    emit("change");
}

const scopeLabel = (scope: ParamScope) => t(`gen.scope.${scope}` as never);
const scopeHint = (scope: ParamScope) => t(`gen.scope.hint.${scope}` as never);
</script>

<template>
    <section class="zone gen-span-12 sb" :aria-label="t('gen.sw.title')">
        <div class="zone-head">
            <span class="zone-title">{{ t("gen.sw.title") }}</span>
            <span class="zone-aside">
                <button
                    type="button"
                    class="btn btn--ghost btn--sm sb-preset"
                    :data-tooltip="t('gen.sw.presetHint')"
                    @click="emit('preset')"
                >
                    <RotateCcw :size="14" />
                    {{ t("gen.sw.preset", { version }) }}
                </button>
            </span>
        </div>

        <p class="zone-note">{{ t("gen.sw.note") }}</p>

        <div class="zone-body sb-sheet">
            <!-- ── Revision 3.0 ─────────────────────────────────────────── -->
            <div class="sb-rev">
                <div class="sb-rev-head">
                    <span class="rev" :class="{ 'is-active': version === '3.0' }">3.0</span>
                    <span class="sb-rev-label">{{ t("gen.sw.rev30") }}</span>
                </div>
                <ul class="sb-list">
                    <li v-for="s in REV_30" :key="s.field">
                        <label class="sb-row" :class="{ 'is-on': state[s.field] }">
                            <span class="sb-row-text">
                                <span class="sb-row-title">{{ t(`gen.sw.${s.id}.title` as never) }}</span>
                                <span class="sb-row-key">{{ s.keyName }}</span>
                                <span class="sb-row-desc">{{ t(`gen.sw.${s.id}.desc` as never) }}</span>
                                <span v-if="s.id === 'hpk' && hpkManaged" class="sb-row-desc sb-row-managed">
                                    {{ t("gen.sw.hpk.managed") }}
                                </span>
                            </span>
                            <span class="sb-row-side">
                                <span class="badge badge--quiet" :data-tooltip="scopeHint(s.scope)">
                                    {{ scopeLabel(s.scope) }}
                                </span>
                                <span class="switch">
                                    <input
                                        type="checkbox"
                                        :checked="state[s.field]"
                                        @change="set(s.field, ($event.target as HTMLInputElement).checked)"
                                    />
                                    <span class="switch-track"></span>
                                </span>
                            </span>
                        </label>
                    </li>
                </ul>
            </div>

            <!--
                On 3.0 the 3.1 column is drawn hatched with what it would hold:
                the kit's mark for "not available here", with the reason.
            -->
            <div v-if="!is31" class="sb-rev">
                <div class="sb-rev-head">
                    <span class="rev">3.1</span>
                    <span class="sb-rev-label">{{ t("gen.sw.rev31") }}</span>
                </div>
                <p class="sb-locked">
                    <Lock :size="14" aria-hidden="true" />
                    {{ t("gen.sw.only31") }}
                </p>
            </div>

            <!-- ── Revision 3.1 ─────────────────────────────────────────── -->
            <div v-else class="sb-rev">
                <div class="sb-rev-head">
                    <span class="rev is-active">3.1</span>
                    <span class="sb-rev-label">{{ t("gen.sw.rev31") }}</span>
                </div>
                <ul class="sb-list">
                    <li v-for="s in rev31" :key="s.field">
                        <label class="sb-row" :class="{ 'is-on': state[s.field] }">
                            <span class="sb-row-text">
                                <span class="sb-row-title">{{ t(`gen.sw.${s.id}.title` as never) }}</span>
                                <span class="sb-row-key">{{ s.keyName }}</span>
                                <span class="sb-row-desc">{{ t(`gen.sw.${s.id}.desc` as never) }}</span>
                            </span>
                            <span class="sb-row-side">
                                <span class="badge badge--quiet" :data-tooltip="scopeHint(s.scope)">
                                    {{ scopeLabel(s.scope) }}
                                </span>
                                <span class="switch">
                                    <input
                                        type="checkbox"
                                        :checked="state[s.field]"
                                        @change="set(s.field, ($event.target as HTMLInputElement).checked)"
                                    />
                                    <span class="switch-track"></span>
                                </span>
                            </span>
                        </label>
                    </li>
                </ul>

                <!--
                    The linked pair hangs off a leader line: it is drawn as
                    depending on the two switches above because it does, and
                    while either is off the place is hatched, the kit's mark
                    for "not available here", with the reason written in.
                -->
                <div class="sb-linked" :class="{ 'is-open': linked }">
                    <div class="sb-linked-head">
                        <span class="sb-linked-wire" aria-hidden="true"></span>
                        <span class="sb-linked-title">{{ t("gen.sw.linked.title") }}</span>
                        <span class="sb-linked-req">HeaderProtectionKey + RandomTrailers</span>
                    </div>
                    <ul v-if="linked" class="sb-list">
                        <li v-for="s in LINKED" :key="s.field">
                            <label class="sb-row" :class="{ 'is-on': state[s.field] }">
                                <span class="sb-row-text">
                                    <span class="sb-row-title">{{ t(`gen.sw.${s.id}.title` as never) }}</span>
                                    <span class="sb-row-key">{{ s.keyName }}</span>
                                    <span class="sb-row-desc">{{ t(`gen.sw.${s.id}.desc` as never) }}</span>
                                    <span v-if="readout(s.field)" class="sb-readout">{{ readout(s.field) }}</span>
                                </span>
                                <span class="sb-row-side">
                                    <span class="badge badge--quiet" :data-tooltip="scopeHint(s.scope)">
                                        {{ scopeLabel(s.scope) }}
                                    </span>
                                    <span class="switch">
                                        <input
                                            type="checkbox"
                                            :checked="state[s.field]"
                                            @change="set(s.field, ($event.target as HTMLInputElement).checked)"
                                        />
                                        <span class="switch-track"></span>
                                    </span>
                                </span>
                            </label>
                        </li>
                    </ul>
                    <p v-else class="sb-locked">
                        <Lock :size="14" aria-hidden="true" />
                        {{ t("gen.sw.linked.locked") }}
                    </p>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.sb-sheet {
    display: grid;
    gap: var(--sp-5);
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
}

.sb-rev {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    min-width: 0;
}

.sb-rev-head {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding-bottom: var(--sp-2);
    border-bottom: var(--rule) solid var(--line-soft);
}

.sb-rev-label {
    font-family: var(--fm);
    font-size: var(--t-xs);
    letter-spacing: var(--track-label);
    color: var(--ink-3);
}

.sb-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
}

/*
 * A row is the whole label, so the text toggles the switch as well. On, it
 * takes the solid surface and its key turns to the accent ink; off, it sits
 * back on the sheet. Only colours change: nothing here animates on its own.
 */
/*
 * Title and key beside the switch, the explanation underneath across the
 * whole row: squeezed into the column left of the switch it wrapped every
 * four words. The text wrapper steps out of the layout (display: contents)
 * so its children can take their own areas.
 */
.sb-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
        "title side"
        "key side";
    column-gap: var(--sp-4);
    row-gap: 2px;
    padding: var(--sp-3) var(--sp-4);
    border: var(--rule) solid var(--line-faint);
    border-radius: var(--r-2);
    background: var(--ground);
    cursor: pointer;
    transition:
        background-color var(--dur-2) var(--ease-out-quart),
        border-color var(--dur-2) var(--ease-out-quart);
}

.sb-row:hover {
    border-color: var(--line);
}

.sb-row.is-on {
    background: var(--surface-solid);
    border-color: var(--line);
}

.sb-row:has(input:focus-visible) {
    border-color: var(--accent);
}

.sb-row-text {
    display: contents;
}

.sb-row-title {
    grid-area: title;
    font-weight: 700;
    color: var(--ink-2);
}

.sb-row.is-on .sb-row-title {
    color: var(--ink);
}

.sb-row-key {
    grid-area: key;
    font-family: var(--fm);
    font-size: var(--t-2xs);
    color: var(--ink-3);
    overflow-wrap: anywhere;
}

.sb-row.is-on .sb-row-key {
    color: var(--accent-ink);
}

.sb-row-desc,
.sb-readout {
    grid-column: 1 / -1;
}

.sb-row-desc {
    margin-top: var(--sp-1);
    font-size: var(--t-sm);
    color: var(--ink-3);
    text-wrap: pretty;
    max-width: 68ch;
}

.sb-row-managed {
    color: var(--ink-2);
}

.sb-row-side {
    grid-area: side;
    align-self: start;
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    flex-shrink: 0;
}

/* What the switch did, in the generator's own numbers. */
.sb-readout {
    justify-self: start;
    margin-top: var(--sp-2);
    padding: 2px var(--sp-2);
    border: var(--rule) dashed var(--draw);
    border-radius: var(--r-1);
    font-family: var(--fm);
    font-size: var(--t-xs);
    color: var(--accent-ink);
}

/*
 * The linked pair. The wire is a leader line from the parents above: a
 * vertical hairline down the left with a tick where it turns, the same
 * mark the drawing uses for "this annotation belongs to that".
 */
.sb-linked {
    position: relative;
    margin-left: var(--sp-3);
    padding-left: var(--sp-5);
    border-left: var(--rule) solid var(--draw);
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
}

.sb-linked-head {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--sp-1) var(--sp-3);
}

.sb-linked-wire {
    position: absolute;
    left: calc(-1 * var(--sp-5));
    top: 0.7em;
    width: calc(var(--sp-5) - var(--sp-1));
    border-top: var(--rule) solid var(--draw);
}

.sb-linked-wire::after {
    content: "";
    position: absolute;
    right: 0;
    top: -4px;
    height: 7px;
    border-left: var(--rule) solid var(--draw);
}

.sb-linked-title {
    font-size: var(--t-sm);
    font-weight: 700;
    color: var(--ink-2);
}

.sb-linked-req {
    font-family: var(--fm);
    font-size: var(--t-2xs);
    color: var(--ink-3);
}

.sb-locked {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-2);
    margin: 0;
    padding: var(--sp-3) var(--sp-4);
    border: var(--rule) solid var(--line-faint);
    border-radius: var(--r-2);
    background-color: var(--ground-3);
    background-image: var(--hatch);
    font-size: var(--t-sm);
    color: var(--ink-2);
}

.sb-locked :deep(svg) {
    flex-shrink: 0;
    margin-top: 2px;
}

/*
 * On a phone the switch sits above its scope label rather than beside it, so
 * the side column is one label wide and the title and key keep their room:
 * side by side they squeezed the key into three-letter lines.
 */
@media (max-width: 560px) {
    .sb-row {
        padding: var(--sp-3);
        column-gap: var(--sp-3);
    }

    .sb-row-side {
        flex-direction: column-reverse;
        align-items: flex-end;
        gap: var(--sp-2);
    }

    .sb-linked {
        margin-left: var(--sp-1);
        padding-left: var(--sp-3);
    }

    .sb-linked-wire {
        left: calc(-1 * var(--sp-3));
        width: calc(var(--sp-3) - var(--sp-1));
    }
}

@media (prefers-reduced-motion: reduce) {
    .sb-row {
        transition-duration: 1ms;
    }
}
</style>
