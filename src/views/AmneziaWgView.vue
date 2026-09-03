<script setup lang="ts">
/**
 * The AmneziaWG generator, drawn rather than listed.
 *
 * THE IDEA
 *
 * A form drawn as a form is a column of labelled boxes that tells you nothing
 * about what you are setting. Each group of parameters is drawn as the thing
 * it controls: the junk train as a train, the packet sizes as bars to scale,
 * the header ranges as spans on one axis, the CPS chain as the packets.
 *
 * The headers justify the approach on their own. The one rule H1–H4 have to
 * obey is that their ranges must not overlap, and four pairs of ten-digit
 * numbers in a list make that impossible to check by eye. On a shared axis it
 * is the only thing you can see.
 *
 * WHAT THE FIRST DRAFT GOT WRONG
 *
 * It drew four groups beautifully and quietly dropped most of the controls:
 * the mimicry profile, the host, the browser fingerprint, the CPS tags, the
 * MTU, the entropy, the extreme ceilings. A page that cannot set them is not a
 * redesign of the generator, it is a picture of one. Everything is here now,
 * and the layout is denser to make room — the zones share a twelve-column grid
 * so a group takes the width its drawing needs rather than an equal share.
 *
 * It also drew a history button that opened nothing, which is worse than
 * leaving it out: a control that looks live and answers nothing reads as a
 * broken page rather than an unfinished one.
 *
 * All of the logic is the existing `useGenerator`. Nothing about how a config
 * is produced changed.
 */

import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
    Sparkles,
    History as HistoryIcon,
    Copy,
    Check,
    Download,
    Braces,
    Activity,
    HelpCircle,
    Combine,
    Info,
    Dices,
    ChevronRight,
    TriangleAlert,
    Search,
} from "lucide-vue-next";

import { useGenerator } from "@/composables/useGenerator";
import { useCopyFeedback } from "@/composables/useCopyFeedback";
import { useHistory } from "@/composables/useHistory";
import { downloadText } from "@/utils/download";
import SendToForge from "@/components/SendToForge.vue";
import HistoryPanel from "@/components/HistoryPanel.vue";
import type { AwgHistoryEntry } from "@/engines/awg/history";
import type { GeneratorHistoryEntry } from "@/types/generatorHistory";
import { awgParamRecord } from "@/engines/awg/generator";
import { AWG_VERSIONS } from "@/engines/awg/generator/versions";
import {
    AWG_CLIENT_PROFILES,
    YANDEX_UNSTABLE_PROFILES,
} from "@/engines/awg/generator";
import { clientCaps } from "@/engines/awg/generator/clients";
import { engineHasTag } from "@/engines/awg/generator/engines";
import { paramsFor } from "@/engines/awg/generator/params";
import { awgParamBlocks } from "@/engines/awg/generator";
import { REGIONS } from "@/shared/domains";
import { SIZED_FINGERPRINTS } from "@/shared/fingerprints";
import { handOffToSimulator } from "@/shared/simHandoff";
import type { AWGConfig, AWGVersion, Intensity } from "@/engines/awg/generator";
import { localizePath, useI18n } from "@/i18n";

const { locale, t } = useI18n();
const router = useRouter();
const at = (path: string) => localizePath(path, locale.value);

const {
    version,
    intensity,
    config,
    currentAwg,
    isGenerating,
    generate,
    setVersion,
    setIntensity,
    copyConfig,
    downloadConfig,
    copyJson,
    downloadJson,
    copyMihomo,
    downloadMihomo,
    plainText,
    batchCount,
    batchResults,
    runBatch,
    downloadBatch,
    isWorkerRunning,
    isCPSSupported,
    showCustomHost,
    hintMap,
    placeholderMap,
    domainStatus,
    checkSelectedDomain,
    restoreConfig,
} = useGenerator();

const { copy, isCopied } = useCopyFeedback();

/* ── The lockup doubles as engine navigation ─────────────────────────────── */

const ENGINES = [
    { id: "awg", label: "Amnezia", to: "/amneziawg" },
    { id: "xray", label: "XRay", to: "/xray" },
] as const;

/* ── Setup ───────────────────────────────────────────────────────────────── */

const versions = AWG_VERSIONS.map((v) => v.id as AWGVersion);
const clients = AWG_CLIENT_PROFILES;
const client = computed(() => clients.find((c) => c.id === config.clientId));
const releases = computed(() => client.value?.releases ?? []);

/**
 * What is known to be wrong with this client, including the chosen build.
 *
 * The registry carries these and nothing rendered them, so a user picking
 * AmneziaWG for Windows below 2.0.2 got the reduced header ceiling silently
 * applied and no word about why.
 */
const clientNotes = computed(() => {
    const notes = [...(client.value?.notes ?? [])];
    const rel = releases.value.find((r) => r.id === config.clientRelease);
    if (rel?.notes) notes.push(...rel.notes);
    return notes.map((k) => t(k as never));
});

/*
 * The three size classes, each showing the range it produces.
 *
 * Taken from JMIN_BY_INTENSITY and JMAX_BY_INTENSITY in the strategy, so the
 * control says what it does rather than asking the reader to trust a word like
 * "medium". Router mode overrides both, which the zone note says.
 */
const INTENSITIES: { id: Intensity; label: string; range: string }[] = [
    { id: "low", label: "LOW", range: "64–512" },
    { id: "medium", label: "MED", range: "128–1024" },
    { id: "high", label: "HIGH", range: "256–1280" },
];

/** The junk counts worth one click, with what each is for. */
const word = (s: string) => s.replace(/^d+s*(?:—|-|–)s*/, "");

const JUNK_PRESETS = [
    { value: 0, label: word(t("gen.junk.off")) },
    { value: 3, label: word(t("gen.junk.optimal")) },
    { value: 5, label: t("gen.junk.recommendedMark") },
    { value: 7, label: word(t("gen.junk.strong")) },
    { value: 10, label: word(t("gen.junk.max")) },
] as const;

/*
 * The three MTUs worth one click, each with the link it belongs to. A bare
 * number field made the reader remember which value their route needs, which
 * is the one thing they came here not to have to know.
 */
const MTUS = [
    { value: 1500, label: "Ethernet" },
    { value: 1420, label: "WG / PPPoE" },
    { value: 1280, label: "min IPv6" },
] as const;

/** Every profile the generator can build, with the document it is built from. */
const PROFILES = [
    { id: "quic_initial", label: "QUIC Initial", spec: "RFC 9000" },
    { id: "quic_0rtt", label: "QUIC 0-RTT", spec: "Early Data" },
    { id: "tls_client_hello", label: "TLS 1.3 Client Hello", spec: "RFC 8446" },
    { id: "wireguard_noise", label: "Noise_IK", spec: "standard" },
    { id: "dtls", label: "DTLS 1.3 Handshake", spec: "RFC 6347" },
    { id: "http3", label: "HTTP/3 Host Mimicry", spec: "RFC 9114" },
    { id: "sip", label: "SIP", spec: "RFC 3261" },
    { id: "tls_to_quic", label: "TLS → QUIC", spec: "Alt-Svc" },
    { id: "quic_burst", label: "QUIC Burst", spec: "multi-packet" },
    { id: "dns_query", label: "DNS Query", spec: "RFC 1035" },
    { id: "random", label: t("gen.profile.random"), spec: "" },
] as const;

/*
 * Straight off the registry rather than typed out here.
 *
 * The hand-written list had six entries and the registry has the packet sizes
 * for nine, so 360, QQ and iOS could not be picked however complete their data
 * was. A browser added to the registry now appears here on its own.
 */
const BROWSERS = computed(() =>
    SIZED_FINGERPRINTS.map((b) => ({
        id: b.id,
        label: b.label,
        /* Measured for this browser, or inherited from the engine it ships. */
        from: b.sizesFrom ?? "",
    })),
);

/**
 * Which mimicry profile reads which measurement slot.
 *
 * The profiles do this themselves inside the generator; repeating the mapping
 * here is what lets the zone show the range a choice will actually use, rather
 * than asserting that the choice matters and leaving the reader to trust it.
 */
const PROFILE_SLOT: Record<string, string> = {
    quic_initial: "qi",
    quic_burst: "qi",
    quic_0rtt: "q0",
    tls_to_quic: "q0",
    http3: "h3",
    tls_client_hello: "tls",
    wireguard_noise: "nx",
    dtls: "dtls",
};

/** Browsers grouped by the engine that shapes their traffic. */
const BROWSER_GROUPS = computed(() => {
    const order = ["chromium", "gecko", "webkit", "other"] as const;
    return order
        .map((family) => ({
            family,
            label: t(("gen.fp.family." + family) as never),
            items: SIZED_FINGERPRINTS.filter((b) => b.family === family),
        }))
        .filter((g) => g.items.length > 0);
});

/** The measured range the selected profile will draw from, if there is one. */
const fpRange = computed(() => {
    if (!config.useBrowserFp) return "";
    const slot = PROFILE_SLOT[config.profile];
    const entry = SIZED_FINGERPRINTS.find((b) => b.id === config.browserProfile);
    if (!slot || !entry?.sizes) return "";
    const range = entry.sizes[slot as keyof typeof entry.sizes];
    if (!range) return "";
    return range[0] === range[1] ? String(range[0]) : range[0] + "–" + range[1];
});

/** The entry behind the current selection, for its provenance line. */
const currentBrowser = computed(() =>
    BROWSERS.value.find((b) => b.id === config.browserProfile),
);

const yandexUnstable = computed(() =>
    (YANDEX_UNSTABLE_PROFILES as readonly string[]).includes(
        config.browserProfile,
    ),
);

/**
 * The five CPS tags, each naming the tag its engine has to know.
 *
 * `<t>` and `<r>` are in every engine we have read, so they are never gated.
 * The rest are, and used not to be visibly: the generator quietly dropped a
 * tag the chosen client could not parse, so someone who ticked one got a
 * config without it and no word about why. The box now says so itself.
 */
const TAGS = [
    { field: "useTagC", label: "<c>", tag: "c", warn: true },
    { field: "useTagT", label: "<t>", tag: null, warn: false },
    { field: "useTagR", label: "<r>", tag: null, warn: false },
    { field: "useTagRC", label: "<rc>", tag: "rc", warn: false },
    { field: "useTagRD", label: "<rd>", tag: "rd", warn: false },
] as const;

/** The engine behind the chosen client and build, which owns the tag set. */
const clientEngine = computed(
    () => clientCaps(config.clientId, config.clientRelease).limits.engine,
);

/**
 * What to call it in a sentence.
 *
 * Package names go through untouched; the one engine that is not a package
 * has a catalogue key instead, because "engine not established" sitting
 * inside a Russian sentence is how this first went wrong.
 */
const engineName = computed(() =>
    clientEngine.value.labelKey
        ? t(clientEngine.value.labelKey as never)
        : clientEngine.value.label,
);

/** The tags withheld, spelled out, so nobody has to work out which. */
const droppedTagList = computed(() =>
    TAGS.filter((item) => unavailableTags.value.has(item.field))
        .map((item) => item.label)
        .join(", "),
);

/**
 * Whether the client sends a chain at all.
 *
 * WireSock does not, and then no tag means anything: it is not that three of
 * the five are missing from its vocabulary, it is that there is nowhere for
 * any of them to go.
 */
const clientSendsChain = computed(
    () => clientCaps(config.clientId, config.clientRelease).limits.supportsI1I5,
);

/** Tags the chosen client cannot parse, so the UI can stop offering them. */
const unavailableTags = computed(() => {
    if (!clientSendsChain.value) return new Set(TAGS.map((item) => item.field));
    return new Set(
        TAGS.filter(
            (item) =>
                item.tag !== null && !engineHasTag(clientEngine.value, item.tag),
        ).map((item) => item.field),
    );
});

/* ── The help drawers ────────────────────────────────────────────────────── */

/**
 * Which zone has its explanation open. One at a time: two open drawers turn
 * the page into a document and push the thing being explained off screen.
 *
 * The same text is on the question mark as a tooltip, so a pointer that rests
 * there gets the answer without a click. The tooltip layer is one fixed
 * element on the body and can move nothing; the click form opens inside the
 * zone, which grows downward and therefore never covers the control.
 */
/** Which view of the result is on screen: the values, or the file. */
const outView = ref<"one" | "whole">("one");

const openHelp = ref<string | null>(null);
const toggleHelp = (zone: string) =>
    (openHelp.value = openHelp.value === zone ? null : zone);

/**
 * A group's parameters with everything the catalogue knows about them.
 *
 * The note alone was thin. What actually decides whether a tunnel comes up is
 * the scope — whether the server has to carry the identical value — so that is
 * stated on every line rather than left to the prose.
 */
function helpFor(group: string) {
    return paramsFor(version.value)
        .filter((p) => p.group === group)
        .map((p) => ({
            key: p.key,
            since: p.since,
            scope: p.scope,
            note: p.note ? t(p.note as never) : "",
        }));
}

const scopeLabel = (scope: string) => t(`gen.scope.${scope}` as never);
const scopeHint = (scope: string) => t(`gen.scope.hint.${scope}` as never);

/* ── The junk train ──────────────────────────────────────────────────────── */

/**
 * Cars at the sizes the train really carries.
 *
 * The generator emits a count and a range rather than the individual sizes, so
 * the drawing spreads Jc cars across Jmin–Jmax. It is the shape of the train,
 * not a claim about the bytes of each packet.
 */
const train = computed(() => {
    const cfg = currentAwg.value;
    if (!cfg || cfg.jc <= 0) return [];
    const { jc, jmin, jmax } = cfg;
    const step = jc > 1 ? (jmax - jmin) / (jc - 1) : 0;
    return Array.from({ length: jc }, (_, i) => {
        const bytes = Math.round(jmin + step * i);
        return { bytes, width: 22 + Math.round((bytes / Math.max(jmax, 1)) * 52) };
    });
});

/* ── Packet sizes ────────────────────────────────────────────────────────── */

const sizes = computed(() => {
    const cfg = currentAwg.value;
    if (!cfg) return [];
    const rows = [
        { key: "S1", value: cfg.s1 },
        { key: "S2", value: cfg.s2 },
        { key: "S3", value: cfg.s3 },
        { key: "S4", value: cfg.s4 },
    ].filter((r) => Number.isFinite(r.value) && r.value > 0);
    const top = Math.max(...rows.map((r) => r.value), 1);
    return rows.map((r) => ({ ...r, pct: (r.value / top) * 100 }));
});

/* ── Header ranges on one axis ───────────────────────────────────────────── */

const UINT32 = 4_294_967_295;

/**
 * Positioned truthfully and drawn legibly, which are not the same thing: a
 * real range is a few thousand wide against a scale of four billion, so the
 * left edge is exact and the width has a floor. A span you can see is not a
 * span whose width you should read.
 */
const spans = computed(() => {
    const cfg = currentAwg.value;
    if (!cfg) return [];

    const parse = (raw: string | number) => {
        const text = String(raw);
        if (text.includes("-")) {
            const [lo, hi] = text.split("-").map(Number);
            return { lo: lo ?? 0, hi: hi ?? 0 };
        }
        const n = Number(text);
        return { lo: n, hi: n };
    };

    const single = cfg.version === "1.0" || cfg.version === "1.5";
    const raw = single
        ? [cfg.h1s, cfg.h2s, cfg.h3s, cfg.h4s]
        : [cfg.h1, cfg.h2, cfg.h3, cfg.h4];

    return raw.map((value, i) => {
        const { lo, hi } = parse(value);
        return {
            key: `H${i + 1}`,
            lo,
            hi,
            single,
            left: (lo / UINT32) * 100,
            width: Math.max(((hi - lo) / UINT32) * 100, 0.5),
        };
    });
});

/** Do any two of them touch? The one rule these four values have to obey. */
const headersClash = computed(() => {
    const s = spans.value;
    for (let a = 0; a < s.length; a++) {
        for (let b = a + 1; b < s.length; b++) {
            if (s[a]!.lo <= s[b]!.hi && s[b]!.lo <= s[a]!.hi) return true;
        }
    }
    return false;
});

/* ── The CPS chain ───────────────────────────────────────────────────────── */

const chain = computed(() => {
    const cfg = currentAwg.value;
    if (!cfg) return [];
    return (["i1", "i2", "i3", "i4", "i5"] as const)
        .map((k, i) => ({ key: `I${i + 1}`, value: String(cfg[k] ?? "") }))
        .filter((r) => r.value.trim() !== "");
});

/* ── Every parameter, one at a time ──────────────────────────────────────── */

/**
 * The config as individual values, each with its own copy button.
 *
 * Copying the whole `.conf` is the common case and it was the only case: a
 * user pasting one header into a server file had to select it out of a code
 * block by hand.
 */
const paramBlocks = computed(() =>
    currentAwg.value ? awgParamBlocks(currentAwg.value) : [],
);

const GROUP_LABEL: Record<string, string> = {
    headers: "gen.zone.headers",
    sizes: "gen.zone.sizes",
    junk: "gen.zone.junk",
    cps: "gen.zone.cps",
    awg3: "gen.zone.transport",
};

const groupLabel = (group: string) =>
    GROUP_LABEL[group] ? t(GROUP_LABEL[group] as never) : group;

/** A CPS chain or a base64 key needs the whole row; a byte count does not. */
const isLong = (value: string | number) => String(value).length > 26;

function copyParam(key: string, value: string | number) {
    void copy(`p:${key}`, String(value));
}

/* ── History ─────────────────────────────────────────────────────────────── */

/*
 * The button existed and did nothing. It was drawn in the first sketch as a
 * placeholder for a panel that was never wired, which is worse than not
 * drawing it: a control that looks live and answers nothing reads as a broken
 * page rather than an unfinished one.
 *
 * Same store as the old generator — same key, same shape — so a config saved
 * on one page is there on the other.
 */
const {
    entries: historyEntries,
    visible: historyVisible,
    query: historyQuery,
    load: loadHistory,
    add: addToHistory,
    remove: removeHistoryEntry,
    clear: clearHistory,
    setPinned: setHistoryPinned,
    setNote: setHistoryNote,
    toJson: historyToJson,
    fromJson: historyFromJson,
} = useHistory<AwgHistoryEntry>({
    engineId: "awg",
    legacyKey: "awg-architect:history",
    /** Two generations are the same when the rendered config is the same. */
    fingerprint: (entry) => entry.text,
    searchText: (entry) => [entry.version, entry.label1, entry.label2].join(" "),
});

const showHistory = ref(false);

function saveToHistory() {
    if (!currentAwg.value || !plainText.value) return;
    const awg = currentAwg.value;
    addToHistory({
        version: version.value,
        // The panel shows two labels and does not care what they mean; here
        // they are the entropy class and the mimicry profile.
        label1: intensity.value,
        label2: config.profile,
        text: plainText.value,
        params: awgParamRecord(awg),
        // Structured clone: `currentAwg` keeps mutating as the user generates.
        cfg: JSON.parse(JSON.stringify(awg)) as AWGConfig,
    });
}

/**
 * Put a stored config back on screen; older entries can only be copied.
 *
 * The panel hands back the shared shape, where `cfg` is `unknown` — it serves
 * two engines and has no business knowing what either one's config looks like.
 * This is the place that does know, so this is where the narrowing belongs.
 */
function restoreFromHistory(entry: GeneratorHistoryEntry) {
    const cfg = entry.cfg as AWGConfig | undefined;
    if (cfg) restoreConfig(cfg);
    else void copy(`h:${entry.id}`, entry.text);
    showHistory.value = false;
}

function copyHistoryEntry(entry: GeneratorHistoryEntry) {
    void copy(`h:${entry.id}`, entry.text);
}

/*
 * `downloadText` takes the text first. Both exports passed the filename there,
 * so the saved file was named after its own JSON and contained the name — the
 * bug lived for as long as the feature did.
 */
function exportHistory() {
    downloadText(
        historyToJson(),
        "AnyTech_Architect_History_AmneziaWG.json",
        "application/json",
    );
}

async function importHistory(file: File) {
    historyFromJson(await file.text());
}

/**
 * Generate, then remember.
 *
 * The two are one action from the reader's side — a config that was on screen
 * and is gone because they pressed the button again is the thing history
 * exists to prevent.
 */
async function generateAndRemember() {
    await generate();
    saveToHistory();
}

/* ── Actions ─────────────────────────────────────────────────────────────── */

const nf = new Intl.NumberFormat("ru-RU");
const hasConfig = computed(() => currentAwg.value !== null);

/*
 * A config on arrival. The zones are drawings of values, and a drawing of no
 * values is a set of empty frames.
 */
onMounted(() => {
    loadHistory();
    if (!currentAwg.value) void generateAndRemember();
});

/**
 * Into the simulator, config in hand.
 *
 * The hand-off used to be a sessionStorage write somewhere upstream and this
 * button only navigated; after the MergeKeys rework the write was gone and
 * the page always showed its empty state. The payload now leaves from right
 * here: engine name for the registry, caption for the subtitle, client notes
 * so the simulator can say why this pairing's traffic looks the way it does.
 */
function toSimulator() {
    const cfg = currentAwg.value;
    if (!cfg) return;
    const profile =
        PROFILES.find((p) => p.id === cfg.profile)?.label ?? cfg.profile;
    handOffToSimulator({
        engine: "awg",
        caption: ["AmneziaWG", cfg.version, profile]
            .filter(Boolean)
            .join(" · "),
        notes: clientNotes.value,
        config: cfg,
    });
    router.push(at("/simulator"));
}
</script>

<template>
    <div class="gen">
        <!-- ══ Branding, which is also where you switch engine ══════════ -->
        <header class="gen-head">
            <div class="gen-lockup">
                <div class="gen-engines">
                    <router-link
                        v-for="(e, i) in ENGINES"
                        :key="e.id"
                        :to="at(e.to)"
                        class="gen-engine"
                        :class="{ 'is-on': e.id === 'awg' }"
                    >
                        {{ e.label }}<span v-if="i === 0" class="gen-slash">/</span>
                    </router-link>
                </div>
                <h1 class="gen-name">{{ t("brand.main") }}</h1>
            </div>

            <button
                class="btn btn--ghost"
                :class="{ 'is-active': showHistory }"
                :aria-expanded="showHistory"
                @click="showHistory = !showHistory"
            >
                <HistoryIcon :size="16" />
                {{ t("gen.act.history") }}
                <span v-if="historyEntries.length" class="badge">
                    {{ historyEntries.length }}
                </span>
            </button>
        </header>

        <transition name="expand">
            <HistoryPanel
                v-if="showHistory"
                :entries="historyEntries"
                :visible="historyVisible"
                :query="historyQuery"
                :marked-key="null"
                @update:query="historyQuery = $event"
                @restore="restoreFromHistory"
                @copy="copyHistoryEntry"
                @remove="removeHistoryEntry"
                @pin="setHistoryPinned"
                @note="setHistoryNote"
                @clear="clearHistory"
                @export="exportHistory"
                @import="importHistory"
            />
        </transition>

        <!-- ══ Setup ═══════════════════════════════════════════════════ -->
        <h2 class="gen-section">{{ t("gen.section.setup") }}</h2>

        <!--
            Four zones rather than one row of six controls. They were a single
            strip, and a strip gives a protocol version, a client build, an MTU
            and two mode switches exactly the same weight — which is wrong in
            both directions. The version decides which parameters exist; the
            modes are two ceilings you rarely touch.
        -->
        <div class="gen-zones zone-row">
            <section class="zone gen-span-4">
                <div class="zone-head">
                    <span class="zone-title">{{ t("gen.zone.protocol") }}</span>
                </div>
                <p class="zone-note">{{ t("gen.zone.protocol.note") }}</p>
                <div class="zone-body">
                    <div class="row gen-revs">
                        <button
                            v-for="v in versions"
                            :key="v"
                            class="rev gen-rev"
                            :class="{ 'is-active': version === v }"
                            @click="setVersion(v)"
                        >
                            {{ v }}
                        </button>
                    </div>
                    <!--
                        The mark left where a short card cannot fill its row:
                        the sheet's own furniture rather than a joke pasted
                        into a gap.
                    -->
                    <div class="zone-filler" aria-hidden="true">
                        <i class="zone-filler-tick"></i>
                        AWG · {{ version }}
                    </div>
                </div>
            </section>

            <section class="zone gen-span-8">
                <div class="zone-head">
                    <span class="zone-title">{{ t("gen.client.label") }}</span>
                </div>
                <p class="zone-note">{{ t("gen.zone.client.note") }}</p>
                <div class="zone-body">
                    <label class="field">
                        <select v-model="config.clientId" class="select" @change="generate()">
                            <option v-for="c in clients" :key="c.id" :value="c.id">
                                {{ c.name }}
                            </option>
                        </select>
                    </label>
                        <!--
                        Where the tunnel actually is. Empty leaves the file as
                        it has always been — the obfuscation block alone — and
                        filled adds the [Peer] section it belongs in.
                    -->
                    <label class="field">
                        <span class="label">
                            {{ t("gen.endpoint.label") }}
                            <span class="hint">{{ t("gen.endpoint.hint") }}</span>
                        </span>
                        <input
                            v-model="config.endpoint"
                            class="input input--mono"
                            placeholder="203.0.113.10:51820"
                            @change="generate()"
                        />
                    </label>

                <label v-if="releases.length" class="field">
                        <span class="label">{{ t("client.releaseLabel") }}</span>
                        <select v-model="config.clientRelease" class="select" @change="generate()">
                            <option :value="null">{{ t("client.releaseCurrent") }}</option>
                            <option v-for="r in releases" :key="r.id" :value="r.id">
                                {{ r.id }}
                            </option>
                        </select>
                    </label>

                    <!--
                        What the registry already knows about the choice. The
                        zone was a dropdown over an empty half, and the answer
                        to "did I pick the right one" was sitting unused in the
                        client profile the whole time.
                    -->
                    <div v-if="client" class="row gen-platforms">
                        <span
                            v-for="pl in client.platforms"
                            :key="pl"
                            class="badge"
                        >
                            {{ pl }}
                        </span>
                    </div>

                    <div
                        v-for="note in clientNotes"
                        :key="note"
                        class="note note--warn"
                    >
                        <TriangleAlert :size="15" class="note-icon" />
                        <span>{{ note }}</span>
                    </div>
                </div>
            </section>

            <section v-if="isCPSSupported" class="zone gen-span-6">
                <div class="zone-head">
                    <span class="zone-title">{{ t("gen.zone.net") }}</span>
                    <span class="zone-aside">
                        <span class="badge">MTU {{ config.mtu }}</span>
                    </span>
                </div>
                <p class="zone-note">{{ t("gen.zone.net.note") }}</p>
                <div class="zone-body">
                    <div class="field">
                        <input
                            v-model.number="config.mtu"
                            class="input input--mono"
                            type="number"
                            min="576"
                            max="9000"
                            @change="generate()"
                        />
                        <!--
                            The three values worth one click, each with the
                            link it belongs to. A number field alone made the
                            user remember which one their route needs.
                        -->
                        <div class="gen-mtus">
                            <button
                                v-for="m in MTUS"
                                :key="m.value"
                                class="gen-mtu"
                                :class="{ 'is-active': config.mtu === m.value }"
                                @click="config.mtu = m.value; generate()"
                            >
                                <span class="gen-mtu-value">{{ m.value }}</span>
                                <span class="gen-mtu-for">{{ m.label }}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section class="zone gen-span-6">
                <div class="zone-head">
                    <span class="zone-title">{{ t("gen.zone.modes") }}</span>
                </div>
                <p class="zone-note">{{ t("gen.zone.modes.note") }}</p>
                <div class="zone-body">
                    <label class="switch">
                        <input v-model="config.routerMode" type="checkbox" @change="generate()" />
                        <span class="switch-track"></span>
                        <span>{{ t("gen.router.title") }}</span>
                    </label>
                    <label class="switch">
                        <input v-model="config.useExtremeMax" type="checkbox" @change="generate()" />
                        <span class="switch-track"></span>
                        <span>{{ t("gen.extreme.title") }}</span>
                    </label>
                </div>
            </section>
        </div>

        <!-- ══ The zones ═══════════════════════════════════════════════ -->
        <div class="gen-zones">
            <!-- ── Junk train ─────────────────────────────────────────── -->
            <section class="zone gen-span-7">
                <div class="zone-head">
                    <span class="zone-title">{{ t("gen.zone.junk") }}</span>
                    <span class="zone-aside">
                        <span v-if="currentAwg" class="badge">Jc {{ currentAwg.jc }}</span>
                        <button
                            class="help-btn"
                            :class="{ 'is-on': openHelp === 'junk' }"
                            :data-tooltip="t('gen.help.open')"
                            @click="toggleHelp('junk')"
                        >
                            ?
                        </button>
                    </span>
                </div>

                <p class="zone-note">{{ t("gen.zone.junk.note") }}</p>

                <div class="zone-body">
                    <div class="train">
                        <template v-if="train.length">
                            <span
                                v-for="(car, i) in train"
                                :key="i"
                                class="train-car"
                                :style="{ width: `${car.width}px` }"
                            >
                                <span class="train-car-size">{{ car.bytes }}</span>
                            </span>
                        </template>
                        <span v-else-if="hasConfig" class="train-none">
                            {{ t("gen.junk.none") }}
                        </span>
                        <span class="train-real">{{ t("gen.junk.handshake") }}</span>
                    </div>

                    <!--
                        How many, and how large. They were in two different
                        sections — Jc here and an "entropy" control up in the
                        setup strip — and read as two competing answers to
                        "how aggressive should this be". They are not: reading
                        the generator, intensity sets Jmin and Jmax and nothing
                        else on 1.x, so it is the size half of this very zone.

                        The slider is what you asked for; the badge above is
                        what came out. They differ until you regenerate.
                    -->
                    <label class="field">
                        <span class="label">
                            {{ t("gen.junk.label") }} · {{ t("gen.junk.ask") }}
                            {{ config.junkLevel }}
                            <span class="hint">{{ t("gen.junk.count") }}</span>
                        </span>
                        <input
                            v-model.number="config.junkLevel"
                            class="range"
                            type="range"
                            min="0"
                            max="15"
                            @change="generate()"
                        />
                    </label>

                    <div class="row gen-presets">
                        <button
                            v-for="p in JUNK_PRESETS"
                            :key="p.value"
                            class="gen-preset"
                            :class="{ 'is-active': config.junkLevel === p.value }"
                            @click="config.junkLevel = p.value; generate()"
                        >
                            <span class="gen-preset-value">{{ p.value }}</span>
                            <span class="gen-preset-for">{{ p.label }}</span>
                        </button>
                    </div>

                    <div class="field">
                        <span class="label">
                            {{ t("gen.junk.size") }}
                            <span class="hint">{{ t("gen.junk.sizeNote") }}</span>
                        </span>
                        <div class="segment">
                            <button
                                v-for="i in INTENSITIES"
                                :key="i.id"
                                class="segment-opt"
                                :class="{ 'is-active': intensity === i.id }"
                                @click="setIntensity(i.id)"
                            >
                                {{ i.label }}
                                <span class="gen-int-range">{{ i.range }}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="disclose" :class="{ 'is-open': openHelp === 'junk' }">
                    <div>
                        <div class="zone-help">
                            <div v-for="h in helpFor('junk')" :key="h.key" class="zone-help-item">
                                <span class="zone-help-key">{{ h.key }}</span>
                                <span>
                                    {{ h.note }}
                                    <span class="zone-help-meta" :data-tooltip="scopeHint(h.scope)">
                                        {{ scopeLabel(h.scope) }} · {{ t("gen.since", { v: h.since }) }}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ── Packet sizes ───────────────────────────────────────── -->
            <section class="zone gen-span-5">
                <div class="zone-head">
                    <span class="zone-title">{{ t("gen.zone.sizes") }}</span>
                    <span class="zone-aside">
                        <button
                            class="help-btn"
                            :class="{ 'is-on': openHelp === 'sizes' }"
                            :data-tooltip="t('gen.help.open')"
                            @click="toggleHelp('sizes')"
                        >
                            ?
                        </button>
                    </span>
                </div>

                <p class="zone-note">{{ t("gen.zone.sizes.note") }}</p>

                <div class="zone-body">
                    <div v-if="sizes.length" class="bars">
                        <div v-for="s in sizes" :key="s.key" class="bar">
                            <span class="bar-key">{{ s.key }}</span>
                            <span class="bar-track">
                                <span class="bar-fill" :style="{ width: `${s.pct}%` }"></span>
                            </span>
                            <span class="bar-value">{{ s.value }} B</span>
                        </div>
                    </div>
                    <span v-if="config.useHeaderProtection && version === '3.0'" class="hint">
                        {{ t("gen.sizes.floor") }}
                    </span>
                </div>

                <div class="disclose" :class="{ 'is-open': openHelp === 'sizes' }">
                    <div>
                        <div class="zone-help">
                            <div v-for="h in helpFor('sizes')" :key="h.key" class="zone-help-item">
                                <span class="zone-help-key">{{ h.key }}</span>
                                <span>
                                    {{ h.note }}
                                    <span class="zone-help-meta" :data-tooltip="scopeHint(h.scope)">
                                        {{ scopeLabel(h.scope) }} · {{ t("gen.since", { v: h.since }) }}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ── Headers ────────────────────────────────────────────── -->
            <section class="zone gen-span-12">
                <div class="zone-head">
                    <span class="zone-title">{{ t("gen.zone.headers") }}</span>
                    <span class="zone-aside">
                        <span
                            v-if="spans.length"
                            class="badge"
                            :class="headersClash ? 'badge--bad' : 'badge--ok'"
                        >
                            {{ headersClash ? t("gen.headers.clash") : t("gen.headers.ok") }}
                        </span>
                        <button
                            class="help-btn"
                            :class="{ 'is-on': openHelp === 'headers' }"
                            :data-tooltip="t('gen.help.open')"
                            @click="toggleHelp('headers')"
                        >
                            ?
                        </button>
                    </span>
                </div>

                <p class="zone-note">{{ t("gen.zone.headers.note") }}</p>

                <div class="zone-body">
                    <p class="hint">{{ t("gen.headers.rule") }}</p>

                    <div v-if="spans.length" class="axis">
                        <template v-for="s in spans" :key="s.key">
                            <span class="axis-label" :style="{ left: `${Math.min(s.left, 96)}%` }">
                                {{ s.key }}
                            </span>
                            <span
                                class="axis-span"
                                :class="{ 'is-clash': headersClash }"
                                :style="{ left: `${s.left}%`, width: `${s.width}%` }"
                            ></span>
                        </template>
                        <span class="axis-end axis-end--min">0</span>
                        <span class="axis-end axis-end--max">2³² − 1</span>
                    </div>

                    <div v-if="spans.length" class="gen-spanlist">
                        <!--
                            Low on the left, high on the right, the width on
                            the line between them. On 1.x a header is a single
                            magic number, so there is no width to draw.
                        -->
                        <div v-for="s in spans" :key="s.key" class="gen-spanrow">
                            <span class="rev">{{ s.key }}</span>
                            <div v-if="!s.single" class="dim">
                                <span class="dim-end">{{ nf.format(s.lo) }}</span>
                                <span class="dim-line">
                                    <span class="dim-span">{{ nf.format(s.hi - s.lo) }}</span>
                                </span>
                                <span class="dim-end">{{ nf.format(s.hi) }}</span>
                            </div>
                            <span v-else class="mono">{{ nf.format(s.lo) }}</span>
                        </div>
                    </div>
                </div>

                <div class="disclose" :class="{ 'is-open': openHelp === 'headers' }">
                    <div>
                        <div class="zone-help">
                            <div v-for="h in helpFor('headers')" :key="h.key" class="zone-help-item">
                                <span class="zone-help-key">{{ h.key }}</span>
                                <span>
                                    {{ h.note }}
                                    <span class="zone-help-meta" :data-tooltip="scopeHint(h.scope)">
                                        {{ scopeLabel(h.scope) }} · {{ t("gen.since", { v: h.since }) }}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ── Mimicry ────────────────────────────────────────────── -->
            <section class="zone gen-span-7">
                <div class="zone-head">
                    <span class="zone-title">{{ t("gen.zone.mimic") }}</span>
                </div>

                <p class="zone-note">{{ t("gen.zone.mimic.note") }}</p>

                <div class="zone-body">
                    <label class="field">
                        <span class="label">{{ t("gen.profile.label") }}</span>
                        <select v-model="config.profile" class="select" @change="generate()">
                            <option v-for="p in PROFILES" :key="p.id" :value="p.id">
                                {{ p.label }}{{ p.spec ? ` · ${p.spec}` : "" }}
                            </option>
                        </select>
                    </label>

                    <label v-if="showCustomHost" class="field">
                        <span class="label">
                            {{ t("gen.host.label") }}
                            <span class="hint">{{ hintMap[config.profile] }}</span>
                        </span>
                        <div class="inputgroup">
                            <input
                                v-model="config.customHost"
                                class="input"
                                type="text"
                                :placeholder="placeholderMap[config.profile]"
                                @input="generate()"
                            />
                            <button
                                class="btn btn--secondary btn--sm"
                                :data-tooltip="t('gen.host.check')"
                                @click="checkSelectedDomain()"
                            >
                                <Search :size="14" />
                            </button>
                        </div>
                        <span
                            v-if="domainStatus && domainStatus !== 'idle'"
                            class="hint"
                        >
                            {{ domainStatus }}
                        </span>
                    </label>

                    <label class="field">
                        <span class="label">{{ t("gen.region.label") }}</span>
                        <select v-model="config.hostRegion" class="select" @change="generate()">
                            <option value="any">{{ t("gen.region.any") }}</option>
                            <option v-for="r in REGIONS" :key="r" :value="r">
                                {{ r.toUpperCase() }}
                            </option>
                        </select>
                    </label>

                    <label class="switch">
                        <input v-model="config.mimicAll" type="checkbox" @change="generate()" />
                        <span class="switch-track"></span>
                        <span>{{ t("gen.mimicAll") }}</span>
                    </label>
                </div>
            </section>

            <!-- ── Browser fingerprint ────────────────────────────────── -->
            <section class="zone gen-span-5">
                <div class="zone-head">
                    <span class="zone-title">{{ t("gen.zone.fp") }}</span>
                </div>

                <p class="zone-note">{{ t("gen.zone.fp.note") }}</p>

                <div class="zone-body">
                    <label class="switch">
                        <input v-model="config.useBrowserFp" type="checkbox" @change="generate()" />
                        <span class="switch-track"></span>
                        <span>{{ t("gen.fp.toggle") }}</span>
                    </label>

                    <div class="disclose" :class="{ 'is-open': config.useBrowserFp }">
                        <div>
                            <!--
                                Grouped by rendering engine, because that is
                                what actually shapes the traffic — a Chromium
                                fork and Chromium send the same datagrams, and
                                a flat alphabetical list hides exactly that.
                            -->
                            <label class="field">
                                <select
                                    v-model="config.browserProfile"
                                    class="select"
                                    @change="generate()"
                                >
                                    <optgroup
                                        v-for="g in BROWSER_GROUPS"
                                        :key="g.family"
                                        :label="g.label"
                                    >
                                        <option
                                            v-for="b in g.items"
                                            :key="b.id"
                                            :value="b.id"
                                        >
                                            {{ b.label }}
                                        </option>
                                    </optgroup>
                                </select>
                            </label>

                            <!--
                                What the choice will actually do, for the
                                mimicry profile that is selected. The dropdown
                                on its own asked the reader to believe that
                                picking a browser changed something.
                            -->
                            <div v-if="fpRange" class="readout gen-fprange">
                                <span class="readout-key">
                                    {{ t("gen.fp.willUse", { range: fpRange }) }}
                                </span>
                            </div>

                            <span v-if="currentBrowser?.from" class="hint">
                                {{ t("gen.fp.derived", { from: currentBrowser.from }) }}
                            </span>
                            <div v-if="yandexUnstable" class="note note--warn">
                                <TriangleAlert :size="15" class="note-icon" />
                                <span>{{ t("gen.fp.yandexUnstable") }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ── CPS tags and the chain ─────────────────────────────── -->
            <section v-if="isCPSSupported" class="zone gen-span-12">
                <div class="zone-head">
                    <span class="zone-title">{{ t("gen.zone.cps") }}</span>
                    <span class="zone-aside">
                        <button
                            class="help-btn"
                            :class="{ 'is-on': openHelp === 'cps' }"
                            :data-tooltip="t('gen.help.open')"
                            @click="toggleHelp('cps')"
                        >
                            ?
                        </button>
                    </span>
                </div>

                <p class="zone-note">{{ t("gen.zone.cps.note") }}</p>

                <div class="zone-body">
                    <div class="field">
                        <span class="label">{{ t("gen.tags.label") }}</span>
                        <div class="row gen-tags">
                            <label
                                v-for="tag in TAGS"
                                :key="tag.field"
                                class="check"
                                :class="{
                                    'is-unavailable': unavailableTags.has(tag.field),
                                }"
                                :data-tooltip="
                                    unavailableTags.has(tag.field)
                                        ? t('gen.tags.unavailable', {
                                              engine: clientEngine.label,
                                          })
                                        : undefined
                                "
                            >
                                <input
                                    v-model="config[tag.field]"
                                    type="checkbox"
                                    :disabled="unavailableTags.has(tag.field)"
                                    @change="generate()"
                                />
                                <span class="check-box"></span>
                                <span class="mono">{{ tag.label }}</span>
                            </label>
                        </div>
                    </div>

                    <!--
                        Named rather than counted: "two tags are unavailable"
                        makes the reader work out which, and the whole point is
                        that they stopped having to guess.
                    -->
                    <div v-if="!clientSendsChain" class="note note--warn">
                        <TriangleAlert :size="15" class="note-icon" />
                        <span>{{ t("gen.tags.noChain") }}</span>
                    </div>
                    <!--
                        A confirmed engine and an unconfirmed one withhold a
                        tag for different reasons, and saying "the client will
                        reject it" when we only failed to establish what the
                        client runs would be stating a fact we do not have.
                    -->
                    <div v-else-if="unavailableTags.size" class="note">
                        <Info :size="15" class="note-icon" />
                        <span>
                            {{
                                t(
                                    clientEngine.verified
                                        ? "gen.tags.engineDrops"
                                        : "gen.tags.engineUnknownDrops",
                                    { tags: droppedTagList, engine: engineName },
                                )
                            }}
                        </span>
                    </div>

                    <div v-if="config.useTagC" class="note note--warn">
                        <TriangleAlert :size="15" class="note-icon" />
                        <span>{{ t("gen.tags.warnC") }}</span>
                    </div>

                    <div v-if="chain.length" class="chain">
                        <div v-for="c in chain" :key="c.key" class="chain-row">
                            <span class="chain-key">{{ c.key }}</span>
                            <span class="chain-val">{{ c.value }}</span>
                        </div>
                    </div>
                </div>

                <div class="disclose" :class="{ 'is-open': openHelp === 'cps' }">
                    <div>
                        <div class="zone-help">
                            <div v-for="h in helpFor('cps')" :key="h.key" class="zone-help-item">
                                <span class="zone-help-key">{{ h.key }}</span>
                                <span>
                                    {{ h.note }}
                                    <span class="zone-help-meta" :data-tooltip="scopeHint(h.scope)">
                                        {{ scopeLabel(h.scope) }} · {{ t("gen.since", { v: h.since }) }}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ── AWG 3.0 ────────────────────────────────────────────── -->
            <section v-if="version === '3.0' || version === '3.1'" class="zone gen-span-12">
                <div class="zone-head">
                    <span class="zone-title">{{ t("gen.zone.transport") }}</span>
                    <span class="zone-aside">
                        <button
                            class="help-btn"
                            :class="{ 'is-on': openHelp === 'awg3' }"
                            :data-tooltip="t('gen.help.open')"
                            @click="toggleHelp('awg3')"
                        >
                            ?
                        </button>
                    </span>
                </div>

                <p class="zone-note">{{ t("gen.zone.transport.note") }}</p>

                <div class="zone-body gen-switchrow">
                    <label class="switch">
                        <input v-model="config.useHeaderProtection" type="checkbox" @change="generate()" />
                        <span class="switch-track"></span>
                        <span class="mono">HeaderProtectionKey</span>
                    </label>
                    <label class="switch">
                        <input v-model="config.useContentPadding" type="checkbox" @change="generate()" />
                        <span class="switch-track"></span>
                        <span class="mono">ContentPaddingAddition</span>
                    </label>
                    <label class="switch">
                        <input v-model="config.useRandomTimings" type="checkbox" @change="generate()" />
                        <span class="switch-track"></span>
                        <span>{{ t("awg3.timings.title") }}</span>
                    </label>
                    <!--
                        The 3.1 switches. A 3.0 device refuses both keys at
                        config parse, so they exist only on the 3.1 tab.
                    -->
                    <template v-if="version === '3.1'">
                        <label class="switch">
                            <input v-model="config.useRandomTrailers" type="checkbox" @change="generate()" />
                            <span class="switch-track"></span>
                            <span class="mono">RandomTrailers</span>
                        </label>
                        <label class="switch">
                            <input v-model="config.useDisableCookies" type="checkbox" @change="generate()" />
                            <span class="switch-track"></span>
                            <span class="mono">DisableCookies</span>
                        </label>
                        <!--
                            Narrow H1-H4 for the 3.1 bug. Visible only on 3.1
                            and only when the triggering feature is on — wide
                            header intervals cost CPU in amneziawg-go 3.1 packet
                            classification and can misclassify when header
                            protection is active. Clamping each range to ~20k
                            fixes the bug at the cost of slightly less header
                            obfuscation. Detailed note lives in the help drawer
                            and in i18n gen.narrowH.*
                        -->
                        <label v-if="config.useHeaderProtection" class="switch">
                            <input v-model="config.useNarrowH" type="checkbox" @change="generate()" />
                            <span class="switch-track"></span>
                            <span>{{ t("gen.narrowH.label") }}</span>
                        </label>
                    </template>
                    <p v-if="version === '3.1' && config.useHeaderProtection" class="hint" style="margin-top:8px">
                        {{ t("gen.narrowH.detail") }}
                    </p>
                </div>

                <div class="disclose" :class="{ 'is-open': openHelp === 'awg3' }">
                    <div>
                        <div class="zone-help">
                            <div v-for="h in helpFor('awg3')" :key="h.key" class="zone-help-item">
                                <span class="zone-help-key">{{ h.key }}</span>
                                <span>
                                    {{ h.note }}
                                    <span class="zone-help-meta" :data-tooltip="scopeHint(h.scope)">
                                        {{ scopeLabel(h.scope) }} · {{ t("gen.since", { v: h.since }) }}
                                    </span>
                                </span>
                            </div>
                            <div v-if="version === '3.1'" class="zone-help-item">
                                <span class="zone-help-key">H1–H4 narrow</span>
                                <span>
                                    {{ t("gen.narrowH.help") }}
                                    <span class="zone-help-meta">local · since 3.1</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <!-- ══ Actions ═════════════════════════════════════════════════ -->
        <div class="strip gen-actions">
            <button
                class="btn btn--primary btn--lg"
                :class="{ 'is-loading': isGenerating }"
                @click="generateAndRemember()"
            >
                <Sparkles :size="16" />
                {{ hasConfig ? t("gen.act.regenerate") : t("gen.act.generate") }}
            </button>

            <div class="inputgroup gen-batch">
                <input v-model.number="batchCount" class="input" type="number" min="2" max="500" />
                <button
                    class="btn btn--secondary"
                    :class="{ 'is-loading': isWorkerRunning }"
                    @click="runBatch()"
                >
                    <Dices :size="15" />
                    {{ t("gen.act.batch") }}
                </button>
            </div>

            <button
                v-if="batchResults.length"
                class="btn btn--ghost"
                @click="downloadBatch()"
            >
                <Download :size="15" />
                {{ t("gen.batch.download", { n: batchResults.length }) }}
            </button>
        </div>

        <!-- ══ Result ══════════════════════════════════════════════════ -->
        <h2 class="gen-section">{{ t("gen.section.result") }}</h2>

        <section class="zone">
            <div class="zone-head">
                <span class="zone-title">{{ t("gen.out.title") }}</span>
                <span class="zone-aside">
                    <span v-if="hasConfig" class="badge">{{ version }}</span>
                    <!--
                        Two views of one object. Showing both at once asked the
                        reader to decide which of them was the answer.
                    -->
                    <div class="segment">
                        <button
                            class="segment-opt"
                            :class="{ 'is-active': outView === 'one' }"
                            @click="outView = 'one'"
                        >
                            {{ t("gen.view.one") }}
                        </button>
                        <button
                            class="segment-opt"
                            :class="{ 'is-active': outView === 'whole' }"
                            @click="outView = 'whole'"
                        >
                            {{ t("gen.view.whole") }}
                        </button>
                    </div>
                </span>
            </div>

            <div class="zone-body">
                <div v-if="!hasConfig" class="empty">
                    <span class="empty-desc">{{ t("gen.out.empty") }}</span>
                </div>

                <!--
                    Grouped and tiled, not one flat column.
                    A flat list put a twenty-character key like
                    MaxHandshakeAttempts into a fixed narrow column and the
                    name ran straight over its own value. Tiles give each
                    parameter its own box, so a long key simply makes a taller
                    tile instead of colliding with anything.
                -->
                <div v-else-if="outView === 'one'" class="gen-groups">
                    <section
                        v-for="block in paramBlocks"
                        :key="block.group"
                        class="gen-group"
                    >
                        <h3 class="gen-group-head">
                            <span class="gen-group-name">
                                {{ groupLabel(block.group) }}
                            </span>
                            <span class="gen-group-rule"></span>
                            <span class="gen-group-count">
                                {{ block.items.length }}
                            </span>
                        </h3>

                        <div class="gen-tiles">
                            <button
                                v-for="item in block.items"
                                :key="item.key"
                                class="gen-tile"
                                :class="{ 'gen-tile--wide': isLong(item.value) }"
                                :data-tooltip="t('gen.params.copyHint')"
                                @click="copyParam(item.key, item.value)"
                            >
                                <span class="gen-tile-key">{{ item.key }}</span>
                                <span class="gen-tile-val">{{ item.value }}</span>
                                <Check
                                    v-if="isCopied(`p:${item.key}`)"
                                    :size="13"
                                    class="gen-tile-ok"
                                />
                                <Copy v-else :size="13" class="gen-tile-copy" />
                            </button>
                        </div>
                    </section>
                </div>


                <pre v-else class="well gen-out">{{ plainText }}</pre>
            </div>

            <div v-if="hasConfig" class="zone-foot gen-outacts">
                <button class="btn btn--secondary btn--sm" @click="copyConfig()">
                    <Copy :size="14" /> {{ t("gen.out.copyConf") }}
                </button>
                <button class="btn btn--secondary btn--sm" @click="downloadConfig()">
                    <Download :size="14" /> {{ t("gen.out.downloadConf") }}
                </button>
                <button class="btn btn--ghost btn--sm" @click="copyJson()">
                    <Braces :size="14" /> {{ t("gen.out.copyJson") }}
                </button>
                <button class="btn btn--ghost btn--sm" @click="downloadJson()">
                    <Download :size="14" /> {{ t("gen.out.downloadJson") }}
                </button>
                <!--
                    mihomo speaks a format of its own, so the export exists
                    only for the visitor who picked mihomo as the client.
                -->
                <template v-if="config.clientId === 'mihomo'">
                    <button class="btn btn--ghost btn--sm" @click="copyMihomo()">
                        <Braces :size="14" /> {{ t("gen.out.copyYaml") }}
                    </button>
                    <button class="btn btn--ghost btn--sm" @click="downloadMihomo()">
                        <Download :size="14" /> {{ t("gen.out.downloadYaml") }}
                    </button>
                </template>
                <button class="btn btn--ghost btn--sm" @click="toSimulator">
                    <Activity :size="14" /> {{ t("gen.act.simulator") }}
                </button>
            </div>
        </section>

        <!-- ══ Where to go when it does not work ═══════════════════════ -->
        <!--
            Straight into the workbench with the config already in it, because
            the manual route is select, copy, navigate, paste.
        -->
        <div v-if="hasConfig" class="gen-forge">
            <SendToForge :payload="plainText" :label="t('gen.forge.send')" />
        </div>

        <section class="gen-links">
            <h2 class="note-label">{{ t("gen.links.title") }}</h2>
            <ul class="list gen-linklist">
                <li class="list-item">
                    <router-link :to="at('/faq')" class="gen-link">
                        <HelpCircle :size="16" />
                        <span>{{ t("gen.links.faq") }}</span>
                        <ChevronRight :size="15" class="gen-link-go" />
                    </router-link>
                </li>
                <li class="list-item">
                    <router-link :to="at('/about')" class="gen-link">
                        <Info :size="16" />
                        <span>{{ t("gen.links.about") }}</span>
                        <ChevronRight :size="15" class="gen-link-go" />
                    </router-link>
                </li>
            </ul>
        </section>
    </div>
</template>

<style scoped>
.gen {
    max-width: 1120px;
    margin: 0 auto;
    padding: var(--sp-7) var(--sp-gutter) var(--sp-10);
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
}

/* ── The lockup ───────────────────────────────────────────────────────── */

/*
 * The two engine names are the qualifier line of the brand and the way you
 * move between them. One control, one piece of type, and no separate tab bar
 * saying the same thing a second time.
 */
.gen-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--sp-4);
}

.gen-lockup {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
}

.gen-engines {
    display: flex;
    align-items: baseline;
    gap: var(--sp-2);
    font-family: var(--fm);
    font-size: var(--t-xs);
    letter-spacing: 0.28em;
    text-transform: uppercase;
}

.gen-engine {
    color: var(--ink-3);
    transition: color var(--trans-fast);
}

.gen-engine.is-on {
    color: var(--accent-ink);
}

.gen-engine:hover {
    color: var(--ink);
}

.gen-slash {
    margin-left: var(--sp-2);
    color: var(--ink-faint);
}

.gen-name {
    margin: 0;
    font-family: var(--fu);
    font-size: clamp(1.9rem, 4.4vw, 3rem);
    font-weight: 800;
    line-height: 1;
    letter-spacing: var(--track-display);
    color: var(--ink);
}

/*
 * The two section headings carry the whole shape of the page: everything above
 * one is something you set, everything below the other is something that came
 * out. They are the only display type on the page after the lockup.
 */
.gen-section {
    margin: var(--sp-4) 0 0;
    font-family: var(--fu);
    font-size: var(--t-lg);
    font-weight: 700;
    letter-spacing: var(--track-tight);
    color: var(--ink);
}

/* ── Setup ────────────────────────────────────────────────────────────── */

/*
 * One dense row rather than a column of fields. Everything here is picked once
 * and rarely changed, so it should cost one glance and one line, not a screen.
 */
.gen-setup {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    align-items: end;
    align-content: start;
    gap: var(--sp-4);
}

.gen-cell {
    min-width: 0;
}

.gen-cell--switches {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
}

.gen-revs {
    gap: var(--sp-2);
}

.gen-rev {
    min-width: 44px;
    height: 32px;
    cursor: pointer;
}

/* ── Zones ────────────────────────────────────────────────────────────── */

/*
 * Twelve columns, and a zone takes the width its drawing needs. Two equal
 * panels would give the train and the size bars the same room, and one of them
 * is a diagram that has to be read left to right while the other is four
 * numbers.
 */
.gen-zones {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    align-items: start;
    gap: var(--sp-4);
}

/*
 * Counted in sixths: 2 · 4 on the first row, 3 · 3 on the second. Four equal
 * quarters gave the version chips as much room as a client that carries its
 * platforms and its known issues underneath.
 */
.gen-span-4 {
    grid-column: span 4;
}

.gen-span-6 {
    grid-column: span 6;
}

.gen-span-8 {
    grid-column: span 8;
}

.gen-span-5 {
    grid-column: span 5;
}

.gen-span-7 {
    grid-column: span 7;
}

.gen-span-12 {
    grid-column: 1 / -1;
}

.gen-presets {
    flex-wrap: wrap;
    gap: var(--sp-2);
}

/*
 * A preset chip states the number and what it is for. A row of buttons reading
 * "0 — Отключено / 3 — Оптимально" put the value and its meaning in one line
 * of running text, which is the hardest possible way to compare five of them.
 */
.gen-preset,
.gen-mtu {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    padding: var(--sp-2) var(--sp-3);
    border: var(--rule) solid var(--line-soft);
    border-radius: var(--r-1);
    background: var(--ground-2);
    cursor: pointer;
    transition:
        border-color var(--dur-2) var(--ease-out-quart),
        background-color var(--dur-2) var(--ease-out-quart);
}

.gen-preset:hover,
.gen-mtu:hover {
    border-color: var(--line);
    background: var(--surface-solid);
}

.gen-preset.is-active,
.gen-mtu.is-active {
    border-color: var(--accent);
    background: var(--surface-solid-2);
}

.gen-preset-value,
.gen-mtu-value {
    font-family: var(--fm);
    font-size: var(--t-sm);
    color: var(--accent-ink);
}

.gen-preset-for,
.gen-mtu-for {
    font-family: var(--fm);
    font-size: 10px;
    color: var(--ink-3);
    white-space: nowrap;
}

.gen-mtus {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
    margin-top: var(--sp-2);
}

/* The range a size class produces, under its name. */
.gen-int-range {
    display: block;
    font-family: var(--fm);
    font-size: 9px;
    opacity: 0.75;
}

.gen-fprange {
    margin-top: var(--sp-2);
}

.gen-platforms {
    flex-wrap: wrap;
    gap: var(--sp-2);
}

.gen-tags {
    flex-wrap: wrap;
    gap: var(--sp-4);
}

.gen-switchrow {
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--sp-5);
}

.gen-spanlist {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
}

.gen-spanrow {
    display: grid;
    grid-template-columns: 30px 1fr;
    align-items: center;
    gap: var(--sp-3);
}

/* The scope and the version a parameter arrived in, after its explanation. */
.zone-help-meta {
    margin-left: var(--sp-2);
    font-family: var(--fm);
    font-size: var(--t-2xs);
    color: var(--ink-3);
    white-space: nowrap;
    cursor: help;
    border-bottom: var(--rule) dotted var(--line);
}

/* ── The result, one value at a time ──────────────────────────────────── */

.gen-groups {
    display: flex;
    flex-direction: column;
    gap: var(--sp-6);
    max-height: 560px;
    overflow: auto;
    padding-right: var(--sp-2);
}

/*
 * A group heading that is a drawn division rather than a bolder line of text:
 * a rule across the remaining width and the count at the end, which is how a
 * section is separated on a sheet.
 */
.gen-group-head {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    margin: 0 0 var(--sp-3);
}

.gen-group-name {
    font-family: var(--fm);
    font-size: var(--t-2xs);
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--accent-ink);
    white-space: nowrap;
}

.gen-group-rule {
    flex: 1;
    height: var(--rule);
    background: var(--line-faint);
}

.gen-group-count {
    font-family: var(--fm);
    font-size: var(--t-2xs);
    color: var(--ink-3);
}

.gen-tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(184px, 1fr));
    gap: var(--sp-2);
}

/*
 * One box per value. The flat two-column list put a twenty-character key into
 * a fixed narrow column and the name ran over its own value; here a long key
 * makes a taller tile and collides with nothing.
 */
.gen-tile {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    padding: var(--sp-3) var(--sp-7) var(--sp-3) var(--sp-3);
    border: var(--rule) solid var(--line-faint);
    border-radius: var(--r-2);
    background: var(--ground-3);
    text-align: left;
    cursor: pointer;
    transition:
        border-color var(--dur-2) var(--ease-out-quart),
        background-color var(--dur-2) var(--ease-out-quart);
}

.gen-tile--wide {
    grid-column: 1 / -1;
}

.gen-tile:hover {
    border-color: var(--accent);
    background: var(--surface-solid);
}

.gen-tile-key {
    font-family: var(--fm);
    font-size: var(--t-2xs);
    letter-spacing: var(--track-label);
    color: var(--ink-3);
}

.gen-tile-val {
    font-family: var(--fm);
    font-size: var(--t-sm);
    color: var(--accent-ink);
    overflow-wrap: anywhere;
    line-height: 1.45;
}

.gen-tile-copy,
.gen-tile-ok {
    position: absolute;
    top: var(--sp-3);
    right: var(--sp-3);
}

.gen-tile-copy {
    color: var(--ink-faint);
}

.gen-tile:hover .gen-tile-copy {
    color: var(--accent-ink);
}

.gen-tile-ok {
    color: var(--green);
}

/* ── Actions ──────────────────────────────────────────────────────────── */

.gen-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--sp-4);
    border-radius: var(--r-3);
    padding: var(--sp-4) var(--sp-5);
}

.gen-batch .input {
    width: 80px;
    text-align: center;
}

/* ── Output ───────────────────────────────────────────────────────────── */

.gen-out {
    margin: 0;
    max-height: 420px;
    overflow: auto;
    font-size: var(--t-sm);
}

.gen-outacts {
    flex-wrap: wrap;
}

/* ── Links ────────────────────────────────────────────────────────────── */

.gen-links {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
}

.gen-linklist {
    border: var(--rule) solid var(--line-soft);
    border-radius: var(--r-2);
    background: var(--ground-2);
    overflow: hidden;
}

.gen-link {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    width: 100%;
    color: var(--ink-2);
}

.gen-link:hover {
    color: var(--accent-ink);
}

.gen-link-go {
    margin-left: auto;
    color: var(--ink-3);
}

@media (max-width: 640px) {
    .zone-head {
        flex-wrap: wrap;
    }

    .zone-aside {
        width: 100%;
        margin-left: 0;
    }

    .zone-aside .segment {
        flex: 1;
    }

    .zone-aside .segment-opt {
        flex: 1;
        text-align: center;
    }
}

/* ── Narrow ───────────────────────────────────────────────────────────── */

@media (max-width: 1080px) {
    .gen-span-4,
    .gen-span-8 {
        grid-column: span 6;
    }
}

@media (max-width: 900px) {
    .gen-span-4,
    .gen-span-5,
    .gen-span-6,
    .gen-span-7,
    .gen-span-8 {
        grid-column: 1 / -1;
    }
}
</style>
