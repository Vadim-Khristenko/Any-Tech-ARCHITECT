<script setup lang="ts">
/**
 * The landing.
 *
 * A working drawing, not a product page. The hero object is the packet the
 * generator builds — an octet ruler, the header fields at the byte widths RFC
 * 9000 §17.2.2 gives them, and two of the ranges the tool really emits. It is
 * data rather than scenery, which is the argument the page is making: this
 * thing shows you what it did.
 *
 * The page states what it does and then, at the same size, what it does not.
 * That pairing is the voice: a tool that will not promise a one-click VPN or a
 * guarantee against a whitelist is a tool you can believe about the rest.
 */

import { computed, onMounted, onUnmounted, ref } from "vue";
import {
    ArrowRight,
    ArrowUpRight,
    Check,
    X,
    Layers,
    Network,
    Combine,
    Activity,
    HelpCircle,
    Info,
    Shuffle,
    Boxes,
} from "lucide-vue-next";
import { localizePath, useI18n } from "@/i18n";
import { FAQ_ENTRIES } from "@/data/faq";

const { locale, t } = useI18n();
const at = (path: string) => localizePath(path, locale.value);

/**
 * A QUIC Initial long header, at the byte widths RFC 9000 §17.2.2 gives it.
 * `ours` marks what the mimicry profile writes as opposed to what it copies.
 */
const PACKET = [
    { name: "Flags", bytes: 1, ours: false },
    { name: "Version", bytes: 4, ours: false },
    { name: "DCID", bytes: 8, ours: true },
    { name: "SCID", bytes: 4, ours: true },
    { name: "Token", bytes: 0, ours: false, absent: true },
    { name: "Length", bytes: 2, ours: true },
    { name: "Pkt no.", bytes: 2, ours: true },
    { name: "Payload", bytes: 27, ours: true },
];

const ticks = Array.from({ length: 32 }, (_, i) => i);

/** Two real header ranges, so the dimension line has something to measure. */
const RANGES = [
    { key: "H1", lo: 404_731_556, hi: 404_774_416 },
    { key: "H2", lo: 1_917_908_238, hi: 1_917_941_084 },
];

const nf = new Intl.NumberFormat("ru-RU");

/* ── What it does, and what it does not ──────────────────────────────────── */

const CAN = ["landing.can.1", "landing.can.2", "landing.can.3"] as const;
const CANT = ["landing.cant.1", "landing.cant.2", "landing.cant.3"] as const;

/* ── The dial ────────────────────────────────────────────────────────────── */

/**
 * What a tunnel can pass for, from both engines.
 *
 * Each entry names the document it was built from, which is the point of the
 * whole section: it is the difference between imitating a protocol and
 * guessing at one. AmneziaWG shapes its own packets; XRay borrows a real
 * TLS session, so its entries cite the protocol rather than an RFC number.
 */
const PROFILES = [
    { name: "QUIC Initial", spec: "RFC 9000", engine: "AmneziaWG" },
    { name: "TLS ClientHello", spec: "RFC 8446", engine: "AmneziaWG" },
    { name: "DTLS 1.2 ClientHello", spec: "RFC 6347", engine: "AmneziaWG" },
    { name: "DTLS 1.3 ClientHello", spec: "RFC 9147", engine: "AmneziaWG" },
    { name: "DNS query", spec: "RFC 1035", engine: "AmneziaWG" },
    { name: "DNS-over-HTTPS", spec: "RFC 8484", engine: "AmneziaWG" },
    { name: "SIP INVITE", spec: "RFC 3261", engine: "AmneziaWG" },
    { name: "STUN binding", spec: "RFC 5389", engine: "AmneziaWG" },
    { name: "NTP client", spec: "RFC 5905", engine: "AmneziaWG" },
    { name: "REALITY", spec: "TLS 1.3", engine: "XRay" },
    { name: "XHTTP stream-up", spec: "HTTP/2", engine: "XRay" },
    { name: "XHTTP packet-up", spec: "HTTP/3", engine: "XRay" },
];

/** The junk train the AmneziaWG card draws: five decoys, then the handshake. */
const JUNK = [34, 58, 41, 72, 49];

/** Chips under each engine name, so the cards say something concrete. */
const AWG_DOES = ["Jc / Jmin / Jmax", "S1–S4", "H1–H4", "CPS I1–I5", "AWG 3.0"];
const XRAY_DOES = ["REALITY", "VLESS", "XHTTP", "FinalMask", "fingerprints"];

const dial = ref(0);
const profile = computed(() => PROFILES[dial.value % PROFILES.length]!);

/* The character count drives the step count and the duration, nothing else. */
const profileChars = computed(() => profile.value.name.length);

function spin() {
    dial.value += 1;
}

/*
 * One turn shortly after arrival, so the section is doing something the first
 * time it is seen rather than waiting to be poked. It stops there — a dial
 * that keeps spinning by itself is an advert.
 */
let firstSpin = 0;
onMounted(() => {
    firstSpin = window.setTimeout(spin, 1400);
});
onUnmounted(() => window.clearTimeout(firstSpin));

/* ── Everything else on the site ─────────────────────────────────────────── */

const MORE = [
    { icon: Combine, to: "/mergekeys", label: "nav.mergekeys", desc: "landing.more.mergekeys" },
    { icon: Activity, to: "/simulator", label: "nav.simulator", desc: "landing.more.simulator" },
    { icon: HelpCircle, to: "/faq", label: "nav.faq", desc: "landing.more.faq" },
    { icon: Info, to: "/about", label: "nav.about", desc: "landing.more.about" },
    // The one entry that is not part of this tool. It is here because the
    // question it answers — "is anything else being built?" — is one people
    // ask about a project with one author.
    { icon: Boxes, to: "/vaiexia", label: "nav.vaiexia", desc: "landing.more.vaiexia" },
] as const;
</script>

<template>
    <div class="landing">
        <!-- ══ Hero ═════════════════════════════════════════════════════ -->
        <header class="landing-hero">
            <div class="landing-hero-text stagger">
                <h1 class="wordmark">
                    <span class="wordmark-pre">{{ t("brand.pre") }}</span>
                    <span class="wordmark-main">{{ t("brand.main") }}</span>
                </h1>

                <p class="lede landing-lede">{{ t("landing.lede") }}</p>

                <p class="landing-trust">
                    <span class="dot dot--live"></span>
                    {{ t("landing.trust") }}
                </p>

                <div class="row landing-actions">
                    <a href="#tools" class="btn btn--primary btn--lg">
                        {{ t("landing.hero.cta") }}
                        <ArrowRight :size="16" />
                    </a>
                    <router-link :to="at('/about')" class="btn btn--secondary btn--lg">
                        {{ t("landing.hero.second") }}
                    </router-link>
                </div>
            </div>

            <!--
                The drawing. Not an illustration of a packet — the packet, at
                the widths its fields have, with the ranges the generator
                emits. aria-hidden because every fact in it is stated in the
                prose beside it; to a screen reader it is a diagram of nothing
                new.
            -->
            <figure class="landing-drawing sheet sheet--gridded" aria-hidden="true">
                <figcaption class="landing-drawing-head">
                    <span class="note-label">{{ t("landing.drawing") }}</span>
                    <span class="rev is-active">B</span>
                </figcaption>

                <div class="landing-drawing-body sheet-field">
                    <div class="fieldmap">
                        <div
                            v-for="f in PACKET"
                            :key="f.name"
                            class="fieldmap-field"
                            :class="{
                                'fieldmap-field--ours': f.ours,
                                'fieldmap-field--void': f.absent,
                            }"
                            :style="{ flexGrow: Math.max(f.bytes, 1), flexBasis: 0 }"
                        >
                            <span class="fieldmap-name">{{ f.name }}</span>
                            <span class="fieldmap-size">
                                {{ f.bytes ? `${f.bytes} B` : "—" }}
                            </span>
                        </div>
                    </div>

                    <!--
                        The ruler reads the drawing above it, the way a scale
                        sits under a plan rather than over it. Above the field
                        map its ticks collided with the field boundaries and
                        the eye had to work out which line meant what.
                    -->
                    <div class="ruler ruler--under">
                        <span
                            v-for="i in ticks"
                            :key="i"
                            class="ruler-tick"
                            :class="{ 'ruler-tick--major': i % 8 === 7 }"
                        >
                            <span v-if="i % 8 === 0">{{ i }}</span>
                        </span>
                    </div>

                    <div class="landing-dims">
                        <div v-for="r in RANGES" :key="r.key" class="landing-dimrow">
                            <span class="rev">{{ r.key }}</span>
                            <div class="dim">
                                <span class="dim-end">{{ nf.format(r.lo) }}</span>
                                <span class="dim-line trace">
                                    <span class="dim-span">{{ nf.format(r.hi - r.lo) }}</span>
                                </span>
                                <span class="dim-end">{{ nf.format(r.hi) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="titleblock landing-titleblock">
                    <div class="titleblock-cell">
                        <span class="titleblock-key">{{ t("landing.sheet") }}</span>
                        <span class="titleblock-val">AWG-3.0</span>
                    </div>
                    <div class="titleblock-cell">
                        <span class="titleblock-key">{{ t("landing.scale") }}</span>
                        <span class="titleblock-val">{{ t("landing.scale.value") }}</span>
                    </div>
                    <div class="titleblock-cell">
                        <span class="titleblock-key">{{ t("landing.rev") }}</span>
                        <span class="titleblock-val">B · 2026</span>
                    </div>
                </div>
            </figure>
        </header>

        <!-- ══ Does / does not ══════════════════════════════════════════ -->
        <section class="landing-section">
            <div class="landing-ledger">
                <div class="landing-ledger-col">
                    <h2 class="h2">{{ t("landing.can.title") }}</h2>
                    <ul class="landing-points">
                        <li v-for="k in CAN" :key="k" class="landing-point">
                            <Check :size="16" class="landing-point-yes" />
                            <span>{{ t(k) }}</span>
                        </li>
                    </ul>
                </div>

                <div class="landing-ledger-col">
                    <h2 class="h2">{{ t("landing.cant.title") }}</h2>
                    <ul class="landing-points">
                        <li v-for="k in CANT" :key="k" class="landing-point">
                            <X :size="16" class="landing-point-no" />
                            <span>{{ t(k) }}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </section>

        <!-- ══ The tools ════════════════════════════════════════════════ -->
        <section id="tools" class="landing-section">
            <h2 class="h2">{{ t("landing.tools.title") }}</h2>
            <p class="lede">{{ t("landing.tools.lede") }}</p>

            <div class="landing-engines">
                <router-link :to="at('/amneziawg')" class="card lift press landing-engine">
                    <span class="landing-engine-head">
                        <Layers :size="20" class="landing-engine-icon" />
                        <span class="h3">{{ t("landing.awg.name") }}</span>
                        <span class="rev landing-engine-tag">{{ t("landing.awg.tag") }}</span>
                        <span class="badge badge--ok landing-engine-status">
                            {{ t("landing.awg.status") }}
                        </span>
                    </span>

                    <!--
                        The junk train, drawn: five decoy packets of different
                        sizes and then the handshake they hide. It is what Jc,
                        Jmin and Jmax mean, at a glance and to scale.
                    -->
                    <span class="landing-train" aria-hidden="true">
                        <span
                            v-for="(w, i) in JUNK"
                            :key="i"
                            class="landing-train-car"
                            :style="{ width: `${w}px` }"
                        ></span>
                        <span class="landing-train-real">handshake</span>
                    </span>

                    <p class="prose">{{ t("landing.awg.desc") }}</p>

                    <span class="landing-chips">
                        <span v-for="c in AWG_DOES" :key="c" class="badge badge--quiet">
                            {{ c }}
                        </span>
                    </span>

                    <span class="landing-engine-go">
                        {{ t("landing.awg.go") }}
                        <ArrowRight :size="15" class="card-go" />
                    </span>
                </router-link>

                <router-link
                    :to="at('/xray')"
                    class="card lift press landing-engine"
                >
                    <span class="landing-engine-head">
                        <Network :size="20" class="landing-engine-icon" />
                        <span class="h3">{{ t("landing.xray.name") }}</span>
                        <span class="rev landing-engine-tag">{{ t("landing.xray.tag") }}</span>
                        <span class="badge landing-engine-status">
                            {{ t("landing.xray.status") }}
                        </span>
                    </span>

                    <!--
                        Two layers, because that is the whole trick: a real TLS
                        session on the outside and the tunnel inside it.
                    -->
                    <span class="landing-layers" aria-hidden="true">
                        <span class="landing-layer landing-layer--outer">TLS 1.3</span>
                        <span class="landing-layer landing-layer--inner">VLESS</span>
                    </span>

                    <p class="prose">{{ t("landing.xray.desc") }}</p>

                    <span class="landing-chips">
                        <span v-for="c in XRAY_DOES" :key="c" class="badge badge--quiet">
                            {{ c }}
                        </span>
                    </span>

                    <span class="landing-engine-go">
                        {{ t("landing.xray.go") }}
                        <ArrowRight :size="15" class="card-go" />
                    </span>
                </router-link>
            </div>
        </section>

        <!-- ══ The dial ═════════════════════════════════════════════════ -->
        <!--
            The one place the page plays. Still made of facts: eleven profiles
            across both engines, each with the document it was built from.
        -->
        <section class="landing-section">
            <h2 class="h2">{{ t("landing.fun.title") }}</h2>
            <p class="lede">{{ t("landing.fun.lede") }}</p>

            <div class="plate landing-dial">
                <div class="landing-dial-row">
                    <div class="landing-dial-inside">
                        <span class="note-label">{{ t("landing.fun.inside") }}</span>
                        <span class="mono landing-dial-was">
                            {{ t("landing.fun.insideValue") }}
                        </span>
                    </div>

                    <div class="landing-dial-arrow" aria-hidden="true">
                        <span class="landing-dial-line"></span>
                        <ArrowRight :size="16" />
                    </div>

                    <div class="landing-dial-outside">
                        <span class="note-label">{{ t("landing.fun.outside") }}</span>
                        <span class="landing-dial-line2">
                            <span
                                :key="dial"
                                class="mono landing-dial-name typing"
                                :style="{ '--chars': profileChars }"
                            >{{ profile.name }}</span>
                            <span :key="`e${dial}`" class="badge landing-dial-engine pop-in">
                                {{ profile.engine }}
                            </span>
                        </span>
                        <span :key="`s${dial}`" class="landing-dial-spec fade-swap">
                            {{ t("landing.fun.spec") }} {{ profile.spec }}
                        </span>
                    </div>
                </div>

                <div class="landing-dial-foot">
                    <span class="note-label">
                        {{ PROFILES.length }} {{ t("landing.fun.count") }}
                    </span>
                    <button class="btn btn--secondary" @click="spin">
                        <Shuffle :size="15" />
                        {{ t("landing.fun.again") }}
                    </button>
                </div>
            </div>
        </section>

        <!-- ══ Everything else ══════════════════════════════════════════ -->
        <section class="landing-section">
            <h2 class="h2">{{ t("landing.more.title") }}</h2>

            <ul class="list landing-more">
                <li v-for="m in MORE" :key="m.to" class="landing-more-item">
                    <router-link :to="at(m.to)" class="landing-more-link">
                        <component :is="m.icon" :size="17" class="landing-more-icon" />
                        <span class="landing-more-name">{{ t(m.label) }}</span>
                        <span class="landing-more-desc">{{ t(m.desc, { n: FAQ_ENTRIES.length }) }}</span>
                        <ArrowUpRight :size="15" class="landing-more-go" />
                    </router-link>
                </li>
            </ul>
        </section>
    </div>
</template>

<style scoped>
.landing {
    max-width: 1080px;
    margin: 0 auto;
    padding: var(--sp-8) var(--sp-gutter) var(--sp-10);
    display: flex;
    flex-direction: column;
    gap: var(--sp-section);
}

.landing-section {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
}

.landing-section > .lede {
    margin-bottom: var(--sp-3);
}

/* ── Hero ─────────────────────────────────────────────────────────────── */

/*
 * Asymmetric on purpose: the text column is narrower than the drawing, so the
 * page opens on the object rather than on a centred block of copy.
 */
.landing-hero {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    align-items: center;
    gap: var(--sp-8);
    padding-top: var(--sp-6);
}

.landing-hero-text {
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
}

/*
 * The lockup. "Any Tech" is a qualifier and sits at label size above the name;
 * ARCHITECT is the brand and takes the display scale. Two sizes of one family
 * rather than two families — the contrast is scale, not voice.
 */
.wordmark {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    margin: 0;
}

.wordmark-pre {
    font-family: var(--fm);
    font-size: var(--t-xs);
    font-weight: 500;
    letter-spacing: 0.36em;
    text-transform: uppercase;
    color: var(--ink-3);
    padding-left: 0.2em;
}

.wordmark-main {
    font-family: var(--fu);
    /*
     * Not the display scale's ceiling. Nine wide letters at 5.5rem are broader
     * than the column they have to live in, and a headline that runs under the
     * figure beside it is the one typographic failure that is never a matter
     * of taste.
     */
    font-size: clamp(2.25rem, 5.6vw, 4.25rem);
    font-weight: 800;
    line-height: 0.92;
    letter-spacing: var(--track-display);
    color: var(--accent-ink);
    text-wrap: balance;
}

.landing-lede {
    font-size: var(--t-md);
}

/* The claim the page makes about itself, marked as a live signal. */
.landing-trust {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    margin: 0;
    font-size: var(--t-sm);
    color: var(--ink-2);
}

.landing-actions {
    gap: var(--sp-3);
}

.landing-actions .btn {
    text-decoration: none;
}

/* ── The drawing ──────────────────────────────────────────────────────── */

.landing-drawing {
    margin: 0;
    padding: var(--sp-3);
    overflow: hidden;
}

.landing-drawing-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-2) var(--sp-3);
}

.landing-drawing-body {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
}

.landing-dims {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
}

.landing-dimrow {
    display: grid;
    grid-template-columns: 26px 1fr;
    align-items: center;
    gap: var(--sp-3);
}

.landing-titleblock {
    margin-top: var(--sp-3);
    border: none;
    border-radius: 0;
    background: transparent;
}

/* ── Does / does not ──────────────────────────────────────────────────── */

/*
 * Two columns of equal weight, because the point is that they are equal: a
 * tool willing to print what it cannot do is worth believing about the rest.
 */
.landing-ledger {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--sp-7);
}

.landing-ledger-col {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
}

.landing-points {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    margin: 0;
    padding: 0;
    list-style: none;
}

.landing-point {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--sp-3);
    font-size: var(--t-base);
    line-height: var(--lh-body);
    color: var(--ink-2);
    text-wrap: pretty;
}

.landing-point-yes {
    margin-top: 4px;
    color: var(--green);
}

.landing-point-no {
    margin-top: 4px;
    color: var(--red);
}

/* ── Engines ──────────────────────────────────────────────────────────── */

/*
 * Unequal by design. One engine works and one is half-built; giving them the
 * same weight would be the tidier layout and the less honest one.
 */
.landing-engines {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    gap: var(--sp-4);
    align-items: start;
}

.landing-engine {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
}

.landing-engine-head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--sp-3);
}

.landing-engine-icon {
    color: var(--accent-ink);
    flex-shrink: 0;
}

.landing-engine-status {
    margin-left: auto;
}

.landing-engine-go {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    margin-top: auto;
    padding-top: var(--sp-2);
    color: var(--accent-ink);
    font-size: var(--t-sm);
    font-weight: 700;
}

/* ── Engine signatures ────────────────────────────────────────────────── */

/*
 * The junk train, drawn to scale: five decoy packets of different sizes and
 * then the handshake they are hiding. It is what Jc, Jmin and Jmax mean,
 * without a sentence about them.
 */
.landing-train {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: var(--sp-2) 0;
}

.landing-train-car {
    height: 16px;
    border-radius: 2px;
    background: var(--surface-solid-3);
    border: var(--rule) solid var(--line-soft);
}

.landing-train-real {
    display: flex;
    align-items: center;
    height: 16px;
    padding: 0 var(--sp-2);
    border-radius: 2px;
    background: var(--accent);
    color: var(--on-accent);
    font-family: var(--fm);
    font-size: 9px;
    letter-spacing: var(--track-label);
    text-transform: uppercase;
}

/* Two layers, because that is the whole trick: a real session around a tunnel. */
.landing-layers {
    display: flex;
    align-items: center;
    padding: var(--sp-2) 0;
}

.landing-layer {
    display: flex;
    align-items: center;
    height: 26px;
    padding: 0 var(--sp-3);
    font-family: var(--fm);
    font-size: var(--t-2xs);
    letter-spacing: var(--track-label);
}

.landing-layer--outer {
    border: var(--rule) solid var(--line);
    border-radius: var(--r-2) 0 0 var(--r-2);
    background: var(--ground-3);
    color: var(--ink-3);
}

.landing-layer--inner {
    border: var(--rule) solid var(--accent);
    border-left: none;
    border-radius: 0 var(--r-2) var(--r-2) 0;
    background: var(--surface-solid-2);
    color: var(--accent-ink);
}

.landing-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
}

/* A tag beside the name: what this engine is to us, in two words. */
.landing-engine-tag {
    min-width: 0;
    padding: 0 var(--sp-2);
    text-transform: lowercase;
    letter-spacing: 0;
    color: var(--ink-3);
    border-color: var(--line-soft);
}

/* ── The dial ─────────────────────────────────────────────────────────── */

.landing-dial {
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
}

.landing-dial-row {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr);
    align-items: center;
    gap: var(--sp-5);
}

.landing-dial-inside,
.landing-dial-outside {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    min-width: 0;
}

.landing-dial-was {
    font-size: var(--t-sm);
    color: var(--ink-3);
}

/*
 * The name and its engine on one line, and the line is allowed to wrap. The
 * previous version put them in a fixed column that was narrower than
 * "DTLS ClientHello", so the longest profile names were cut off mid-word.
 */
.landing-dial-line2 {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--sp-3);
}

.landing-dial-name {
    font-size: var(--t-md);
    font-weight: 700;
    color: var(--accent-ink);
}

.landing-dial-engine {
    flex-shrink: 0;
}

.landing-dial-spec {
    font-family: var(--fm);
    font-size: var(--t-2xs);
    letter-spacing: var(--track-label);
    color: var(--ink-3);
}

/* A leader from what it is to what it looks like. */
.landing-dial-arrow {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    color: var(--draw);
}

.landing-dial-line {
    width: 44px;
    height: var(--rule);
    background: var(--draw);
}

.landing-dial-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--sp-3);
    padding-top: var(--sp-4);
    border-top: var(--rule) solid var(--line-faint);
}

/* ── More ─────────────────────────────────────────────────────────────── */

.landing-more {
    border: var(--rule) solid var(--line-soft);
    border-radius: var(--r-2);
    background: var(--ground-2);
    overflow: hidden;
}

.landing-more-item {
    border-bottom: var(--rule) solid var(--line-faint);
}

.landing-more-item:last-child {
    border-bottom: none;
}

.landing-more-link {
    display: grid;
    grid-template-columns: auto minmax(120px, max-content) 1fr auto;
    align-items: center;
    gap: var(--sp-4);
    padding: var(--sp-4);
    color: inherit;
    text-decoration: none;
    transition: background-color var(--trans-fast);
}

.landing-more-link:hover {
    background: var(--surface-solid);
}

.landing-more-icon {
    color: var(--ink-3);
}

.landing-more-name {
    font-weight: 700;
    color: var(--ink);
}

.landing-more-desc {
    font-size: var(--t-sm);
    color: var(--ink-3);
    text-wrap: pretty;
}

.landing-more-go {
    color: var(--ink-3);
    transition: transform var(--trans-fast);
}

.landing-more-link:hover .landing-more-go {
    transform: translate(2px, -2px);
    color: var(--accent-ink);
}

/* ── Narrow ───────────────────────────────────────────────────────────── */

@media (max-width: 900px) {
    .landing-hero {
        grid-template-columns: 1fr;
        gap: var(--sp-6);
    }

    .landing-engines {
        grid-template-columns: 1fr;
    }

    /* The dial stacks, and the leader between the halves turns to point down. */
    .landing-dial-row {
        grid-template-columns: 1fr;
        gap: var(--sp-4);
    }

    .landing-dial-arrow {
        transform: rotate(90deg);
        transform-origin: left center;
        margin-left: var(--sp-4);
    }
}

@media (max-width: 620px) {
    .landing-actions .btn {
        flex: 1 1 100%;
    }

    /* The description drops out rather than squeezing the name to two lines. */
    .landing-more-link {
        grid-template-columns: auto 1fr auto;
    }

    .landing-more-desc {
        display: none;
    }
}
</style>
