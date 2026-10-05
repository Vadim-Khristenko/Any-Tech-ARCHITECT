<script setup lang="ts">
/**
 * The packet simulator page.
 *
 * Generic on purpose: it knows about engines, not protocols. A generator
 * hands over a config through `shared/simHandoff`, the engine is resolved
 * from the registry by name, and everything drawn here — kinds, legend,
 * notes, the per-packet extras — comes off that engine's own simulator.
 * Adding a protocol to this page is adding a simulator to its engine; the
 * page itself does not change.
 */
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
    ArrowLeft,
    Play,
    RefreshCw,
    Activity,
    Server,
    Monitor,
    ArrowRight,
    Info,
    Clock,
    Database,
    Gauge,
} from "lucide-vue-next";
import { pendingSimulation } from "@/shared/simHandoff";
import { engineById } from "@/engines/registry";
import type {
    ExtraField,
    SimPacket,
    SimResult,
    Simulator,
} from "@/shared/simulation";
import { localizePath, useI18n } from "@/i18n";

const { locale, t } = useI18n();

const router = useRouter();

/*
 * The hand-off, read once. The registry hands back engines with their config
 * types erased, so the simulator is widened at this seam — the one place that
 * holds both the typed engine and the untyped payload.
 */
const pending = pendingSimulation();
const engine = pending ? engineById(pending.engine) : undefined;
const simulator = (engine?.simulator ?? null) as Simulator<
    unknown,
    unknown
> | null;
const cfg = pending?.config ?? null;

const sim = ref<SimResult<unknown> | null>(null);
const selectedPacket = ref<SimPacket<unknown> | null>(null);

onMounted(runSim);

function runSim() {
    if (!simulator || !cfg) return;
    sim.value = simulator.simulate(cfg);
    selectedPacket.value = null;
}

function goBack() {
    router.push(localizePath(engine?.route ?? "/", locale.value));
}

function selectPacket(p: SimPacket<unknown>) {
    selectedPacket.value =
        selectedPacket.value?.id === p.id ? null : p;
}

const caption = computed(() => pending?.caption ?? "");

/** Facts the engine itself states about this particular config. */
const engineNotes = computed(() =>
    simulator && cfg ? (simulator.notes?.(cfg) ?? []) : [],
);

/** Facts the sending view stated about the client behind the config. */
const clientNotes = computed(() => pending?.notes ?? []);

const stats = computed(() => {
    if (!sim.value) return null;
    const totals = sim.value.totals;
    return {
        count: sim.value.packets.length,
        total: totals.totalBytes,
        payload: totals.payloadBytes,
        overhead: totals.overheadBytes,
        share: Math.round(totals.overheadShare * 100),
        seconds: sim.value.estSeconds10mbps,
    };
});

/** Legend entries in the engine's own order. */
const legendItems = computed(() => {
    if (!simulator) return [];
    return simulator.legend
        .map((id) => ({ id, kind: simulator.kinds[id] }))
        .filter((e) => e.kind);
});

/** Kinds this run never produced draw dimmed, so the legend reads honestly. */
function kindUsed(id: string): boolean {
    return !!sim.value?.totals.byKind[id];
}

function kindColor(id: string): string {
    return simulator?.kinds[id]?.accent ?? "";
}

function kindLabel(id: string): string {
    return simulator?.kinds[id]?.label ?? id;
}

function sideName(side: "client" | "server"): string {
    return side === "client" ? t("sim.client") : t("sim.server");
}

/** Engine-specific rows for the detail panel, via the engine itself. */
const extraRows = computed<readonly ExtraField[]>(() => {
    const p = selectedPacket.value;
    if (!p || !simulator?.describeExtra) return [];
    return simulator.describeExtra(p.extra);
});
</script>

<template>
    <div class="simulator-page fade-in">
        <div class="container">
            <header class="sim-header">
                <button class="btn btn-ghost btn-icon" @click="goBack">
                    <ArrowLeft :size="18" />
                </button>
                <div class="sim-title">
                    <Activity :size="20" class="text-accent" />
                    <div>
                        <h1>Packet Simulator</h1>
                        <span v-if="caption" class="sim-subtitle">
                            {{ caption }}
                        </span>
                    </div>
                </div>
            </header>

            <div v-if="!simulator || !cfg" class="alert alert-info">
                {{ t("sim.noData") }}
                <router-link :to="localizePath('/', locale)" class="link">{{ t("sim.noData.link") }}</router-link>.
            </div>

            <template v-else>
                <!-- What this config actually puts on the wire -->
                <div
                    v-for="(note, i) in engineNotes"
                    :key="`en${i}`"
                    class="alert alert-info"
                >
                    <Info :size="16" class="alert-icon" />
                    <div class="alert-content">{{ note }}</div>
                </div>

                <div
                    v-for="(note, i) in clientNotes"
                    :key="`cn${i}`"
                    class="alert alert-info"
                >
                    <Info :size="16" class="alert-icon" />
                    <div class="alert-content">{{ note }}</div>
                </div>

                <div class="sim-toolbar">
                    <button class="btn btn-primary" @click="runSim">
                        <RefreshCw :size="15" /> {{ t("sim.restart") }}
                    </button>
                </div>

                <div v-if="stats" class="sim-stats">
                    <div class="stat-card">
                        <span class="stat-value">{{ stats.count }}</span>
                        <span class="stat-label">{{ t("sim.stat.packets") }}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">{{ stats.total }}</span>
                        <span class="stat-label">{{ t("sim.stat.bytes") }}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">{{ stats.payload }}</span>
                        <span class="stat-label">{{ t("sim.stat.payload") }}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">{{ stats.overhead }}</span>
                        <span class="stat-label">
                            {{ t("sim.stat.overhead") }} · {{ stats.share }}%
                        </span>
                    </div>
                    <div class="stat-card">
                        <Clock :size="16" class="stat-icon" />
                        <span class="stat-value">~{{ stats.seconds }}s</span>
                        <span class="stat-label">{{ t("sim.stat.at10mbit") }}</span>
                    </div>
                </div>

                <!-- Sequence diagram -->
                <div class="sim-diagram panel">
                    <div class="panel-head">
                        <Play :size="14" class="text-accent" />
                        <span class="panel-title">{{ t("sim.diagram.title") }}</span>
                    </div>

                    <div class="diagram-canvas">
                        <div class="lane">
                            <div class="lane-title">
                                <Monitor :size="14" /> {{ t("sim.client") }}
                            </div>
                            <div class="lane-line"></div>
                        </div>
                        <div class="timeline">
                            <div
                                v-for="p in sim?.packets"
                                :key="p.id"
                                class="packet-row"
                                :class="{ right: p.from === 'client' }"
                                :style="{
                                    '--kind-color': kindColor(p.kind),
                                }"
                                @click="selectPacket(p)"
                            >
                                <span class="packet-step">{{ p.step }}</span>
                                <span class="packet-badge">
                                    {{ p.label }}
                                </span>
                                <component
                                    :is="
                                        p.from === 'client'
                                            ? ArrowRight
                                            : ArrowLeft
                                    "
                                    :size="14"
                                    class="packet-arrow"
                                />
                                <span class="packet-size">
                                    {{ p.size }} {{ t("sim.bytes") }}
                                </span>
                            </div>
                        </div>
                        <div class="lane">
                            <div class="lane-title">
                                <Server :size="14" /> {{ t("sim.server") }}
                            </div>
                            <div class="lane-line"></div>
                        </div>
                    </div>
                </div>

                <!-- Legend -->
                <div class="sim-legend panel">
                    <div class="panel-head">
                        <Info :size="14" class="text-accent" />
                        <span class="panel-title">{{ t("sim.legend.title") }}</span>
                    </div>
                    <div class="legend-grid">
                        <div
                            v-for="entry in legendItems"
                            :key="entry.id"
                            class="legend-item"
                            :class="{ 'is-dim': !kindUsed(entry.id) }"
                        >
                            <span
                                class="legend-dot"
                                :style="{ background: kindColor(entry.id) }"
                            ></span>
                            <div class="legend-text">
                                <strong>{{ entry.kind.label }}</strong>
                                <span>{{ t(entry.kind.descriptionKey as never) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Selected packet detail -->
                <div v-if="selectedPacket" class="packet-detail panel">
                    <div class="panel-head">
                        <Database :size="14" class="text-accent" />
                        <span class="panel-title">
                            {{ t("sim.packet") }} {{ selectedPacket.step }} —
                            {{ kindLabel(selectedPacket.kind) }}
                        </span>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">{{ t("sim.detail.direction") }}</span>
                            <span class="detail-value">
                                {{ sideName(selectedPacket.from) }}
                                →
                                {{ sideName(selectedPacket.to) }}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t("sim.detail.size") }}</span>
                            <span class="detail-value">
                                {{ selectedPacket.size }} {{ t("sim.bytes") }}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t("sim.detail.payload") }}</span>
                            <span class="detail-value">
                                {{ selectedPacket.payload }} {{ t("sim.bytes") }}
                            </span>
                        </div>
                        <div
                            v-for="row in extraRows"
                            :key="row.label"
                            class="detail-item"
                        >
                            <span class="detail-label">{{ row.label }}</span>
                            <span class="detail-value">{{ row.value }}</span>
                        </div>
                    </div>
                    <p class="detail-desc">{{ selectedPacket.description }}</p>
                </div>

                <!-- Packet list -->
                <div class="sim-table panel">
                    <div class="panel-head">
                        <Gauge :size="14" class="text-accent" />
                        <span class="panel-title">{{ t("sim.table.title") }}</span>
                    </div>
                    <div class="table-wrap">
                        <table class="sim-table-inner">
                            <thead>
                                <tr>
                                    <th>#)</th>
                                    <th>{{ t("sim.table.type") }}</th>
                                    <th>{{ t("sim.table.direction") }}</th>
                                    <th>{{ t("sim.table.size") }}</th>
                                    <th class="desc">{{ t("sim.table.desc") }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="p in sim?.packets"
                                    :key="p.id"
                                    :class="{ 'is-active': selectedPacket?.id === p.id }"
                                    @click="selectPacket(p)"
                                >
                                    <td>{{ p.step }}</td>
                                    <td>
                                        <span
                                            class="kind-badge"
                                            :style="{
                                                background:
                                                    kindColor(p.kind) + '22',
                                                color: kindColor(p.kind),
                                            }"
                                        >
                                            {{ p.label }}
                                        </span>
                                    </td>
                                    <td class="dir">
                                        {{ sideName(p.from) }} →
                                        {{ sideName(p.to) }}
                                    </td>
                                    <td>{{ p.size }} {{ t("sim.bytes") }}</td>
                                    <td class="desc">{{ p.description }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<style scoped>
.simulator-page {
    padding: 24px 0 48px;
}
.sim-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
}
.sim-title {
    display: flex;
    align-items: center;
    gap: 12px;
}
.sim-title h1 {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0;
}
.sim-subtitle {
    display: block;
    font-size: 0.78rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
.sim-toolbar {
    margin-bottom: 16px;
}
.sim-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 12px;
    margin-bottom: 24px;
}
.stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
    text-align: center;
}
.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--accent-ink);
}
.stat-label {
    font-size: 0.72rem;
    color: var(--muted);
}
.stat-icon {
    color: var(--muted);
    margin-bottom: 2px;
}

/* Diagram */
.sim-diagram {
    margin-bottom: 24px;
}
.diagram-canvas {
    display: grid;
    grid-template-columns: 110px 1fr 110px;
    gap: 12px;
    padding: 20px;
}
.lane {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}
.lane-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--muted);
    text-align: center;
}
.lane-line {
    width: 2px;
    height: 100%;
    min-height: 200px;
    background: var(--border);
}
.timeline {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.packet-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-left: 4px solid var(--kind-color);
    cursor: pointer;
    transition: var(--trans-fast);
}
.packet-row:hover,
.packet-row.is-active {
    background: var(--bg2);
}
.packet-row.right {
    justify-content: flex-start;
}
.packet-row:not(.right) {
    justify-content: flex-end;
}
.packet-step {
    font-size: 0.7rem;
    color: var(--muted);
    min-width: 26px;
}
.packet-badge {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--kind-color);
}
.packet-arrow {
    color: var(--muted);
}
.packet-size {
    font-size: 0.72rem;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
}

/* Legend */
.sim-legend {
    margin-bottom: 24px;
}
.legend-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
    padding: 16px;
}
.legend-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    transition: opacity var(--trans-fast);
}
/* A kind this run never produced stays visible but quiet. */
.legend-item.is-dim {
    opacity: 0.35;
}
.legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-top: 3px;
    flex-shrink: 0;
}
.legend-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.78rem;
    color: var(--muted);
}
.legend-text strong {
    color: var(--text);
}

/* Detail */
.packet-detail {
    margin-bottom: 24px;
}
.detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    padding: 16px 16px 0;
}
.detail-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.detail-label {
    font-size: 0.7rem;
    color: var(--muted);
}
.detail-value {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text);
}
.detail-desc {
    margin: 12px 16px 16px;
    font-size: 0.82rem;
    color: var(--muted);
    line-height: 1.5;
}

/* Table */
.table-wrap {
    overflow-x: auto;
}
.sim-table-inner {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
}
.sim-table-inner th,
.sim-table-inner td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    text-align: left;
}
.sim-table-inner th {
    color: var(--muted);
    font-weight: 600;
}
.sim-table-inner tbody tr {
    cursor: pointer;
    transition: var(--trans-fast);
}
.sim-table-inner tbody tr:hover,
.sim-table-inner tbody tr.is-active {
    background: var(--panel-2);
}
.kind-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
}
.dir {
    white-space: nowrap;
}
.desc {
    color: var(--muted);
}
.link {
    color: var(--accent-ink);
    text-decoration: underline;
}

@media (max-width: 640px) {
    .diagram-canvas {
        grid-template-columns: 60px 1fr 60px;
        gap: 6px;
        padding: 12px;
    }
    .lane-title {
        font-size: 0.65rem;
    }
    .packet-row {
        padding: 6px 8px;
        gap: 6px;
    }
    .packet-step {
        min-width: 22px;
    }
    .packet-size {
        display: none;
    }
    .legend-grid {
        grid-template-columns: 1fr;
    }
}
</style>
