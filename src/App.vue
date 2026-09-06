<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView, useRouter } from "vue-router";
import MainHeader from "./components/MainHeader.vue";
import MainFooter from "./components/MainFooter.vue";
import MirrorBanner from "./components/MirrorBanner.vue";
import { accentFor, applyAccent } from "./composables/useTheme";

const router = useRouter();

/*
 * Mirror builds carry a notice strip above the header. Vite substitutes the
 * env constant at compile time, so a normal build sees `false` and shakes the
 * banner out entirely; only the mirror build ships it.
 */
const SITE_MIRROR = import.meta.env.VITE_SITE_MIRROR === "1";

/**
 * Recolour the app for the page that is about to appear.
 *
 * This used to run in the router's `afterEach`, which fires as soon as the
 * navigation is confirmed — before the new view has rendered. The whole shell
 * turned teal while the old page was still on screen, and the content caught
 * up a fifth of a second later. Hooking the transition's `before-enter`
 * instead ties the colour to the moment the new page is inserted, so they
 * arrive together.
 */
function syncAccent(): void {
    const name = router.currentRoute.value.name;
    applyAccent(accentFor(typeof name === "string" ? name : null));
}

// The transition does not run on the first render, so the initial page needs
// its colour applied directly once the route is known.
void router.isReady().then(syncAccent);

onMounted(() => {
    console.log(
        "%c AmneziaWG Architect %c Vue + TS + Router ",
        "background: #e8a840; color: #0a0806; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;",
        "background: #181410; color: #e0d4b8; padding: 2px 6px; border-radius: 0 4px 4px 0;",
    );
});
</script>

<template>
    <div class="app-wrapper" :class="{ 'is-mirror': SITE_MIRROR }">
        <!--
            The sheet the whole application is drawn on. Four layers instead of
            the eight the aurora needed, and only one of them moves.
        -->
        <div class="sheet-bg" aria-hidden="true">
            <div class="sheet-wash"></div>
            <div class="sheet-grid"></div>
            <div class="sheet-grain"></div>
            <div class="sheet-marks"></div>
            <div class="sheet-marks sheet-marks-lower"></div>
        </div>

        <!-- ── App Shell ──────────────────────────────────────────────── -->
        <MirrorBanner v-if="SITE_MIRROR" />
        <MainHeader />

        <main class="main-content">
            <RouterView v-slot="{ Component, route }">
                <transition
                    name="page-fade"
                    mode="out-in"
                    @before-enter="syncAccent"
                >
                    <component :is="Component" :key="route.path" />
                </transition>
            </RouterView>
        </main>

        <MainFooter />
    </div>
</template>

<style>
/* ── App Wrapper ──────────────────────────────────────────────────────── */
.app-wrapper {
    position: relative;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    z-index: 1;
    isolation: isolate;
}

/*
 * Mirror builds push the whole fixed shell down by the banner's height. One
 * variable drives every offset — the banner, the header under it and the
 * content padding — so the strip can grow or shrink in one place.
 */
.app-wrapper.is-mirror {
    --mirror-h: 38px;
}
/*
 * Below this width the strip is two rows — the badge and the ask on one, the
 * address on the other — because the full sentence no longer fits beside
 * them. The header is offset by the same variable, so it moves down with it
 * rather than over it.
 */
@media (max-width: 1080px) {
    .app-wrapper.is-mirror {
        --mirror-h: 56px;
    }
}
.app-wrapper.is-mirror .header {
    top: var(--mirror-h);
}
.app-wrapper.is-mirror .main-content {
    padding-top: calc(80px + var(--mirror-h));
}

.main-content {
    flex: 1;
    position: relative;
    z-index: 2;
    padding-top: 80px;
    /* Reserve the viewport below the header so the footer always starts below
       the fold. Without this, the app shell (header + footer) paints instantly
       while the lazy-loaded route chunk is still in flight, parking the footer
       right under the header — then the route content pushes it down a whole
       page, which was the real CLS ~0.9 culprit (not the font swap). */
    min-height: 100vh;
    min-height: 100dvh;
}

/* ── Page Transition ──────────────────────────────────────────────────── */

/*
 * `out-in` means the two halves add up: the old page has to finish leaving
 * before the new one starts arriving. At 200ms each that was 400ms of nothing
 * on every tab click, on top of fetching the route's chunk — which is most of
 * why moving around the app felt heavy.
 *
 * The leave is now brief enough to read as a dismissal rather than a wait, and
 * the arrival keeps its length because that is the half you actually watch.
 */
.page-fade-leave-active {
    transition:
        opacity 90ms linear,
        transform 90ms linear;
}

.page-fade-enter-active {
    transition:
        opacity 180ms var(--ease-snap),
        transform 180ms var(--ease-snap);
}

.page-fade-enter-from {
    opacity: 0;
    transform: translateY(6px);
}

.page-fade-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
    .page-fade-enter-active,
    .page-fade-leave-active {
        transition-duration: 1ms;
        transform: none;
    }

    .page-fade-enter-from,
    .page-fade-leave-to {
        transform: none;
    }
}
</style>
