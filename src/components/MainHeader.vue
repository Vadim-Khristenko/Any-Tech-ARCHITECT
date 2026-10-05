<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type Component } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
    Menu,
    X,
    Github,
    Layers,
    Info,
    Download,
    HelpCircle,
    Rocket,
    Languages,
    Check,
    ChevronRight,
    ChevronDown,
    Network,
    Monitor,
    Sun,
    Moon,
} from "lucide-vue-next";
import {
    THEME_CHOICES,
    setTheme,
    theme,
    type ThemeChoice,
} from "@/composables/useTheme";
import {
    LOCALES,
    LOCALE_META,
    localizePath,
    splitLocalePath,
    useI18n,
    type Locale,
    type MessageKey,
} from "@/i18n";
import { rafThrottle } from "@/utils/raf";

interface NavLink {
    /** Catalog key, resolved at render so the label follows the locale. */
    labelKey: MessageKey;
    /** Bare path; the locale prefix is applied when rendering. */
    to: string;
    icon: Component;
}

const route = useRoute();
const router = useRouter();
const { locale, t, setLocale } = useI18n();

const isMenuOpen = ref(false);
const isScrolled = ref(false);

/**
 * Which header dropdown is open, if any.
 *
 * One piece of state rather than a boolean per menu: two booleans allow both
 * menus to be open at once, which is a state nobody wants and every "close the
 * other one" handler has to remember to prevent.
 */
type HeaderMenu = "lang" | "theme";
const openMenu = ref<HeaderMenu | null>(null);

function toggleHeaderMenu(which: HeaderMenu): void {
    openMenu.value = openMenu.value === which ? null : which;
}

const faviconUrl = `${import.meta.env.BASE_URL}assets/favicon.svg`;

const navLinks: NavLink[] = [
    { labelKey: "nav.awg", to: "/amneziawg", icon: Layers },
    { labelKey: "nav.xray", to: "/xray", icon: Network },
    { labelKey: "nav.mergekeys", to: "/mergekeys", icon: Download },
    { labelKey: "nav.faq", to: "/faq", icon: HelpCircle },
    { labelKey: "nav.vaiexia", to: "/vaiexia", icon: Rocket },
    { labelKey: "nav.about", to: "/about", icon: Info },
];

/** Nav targets carry the active locale's prefix. */
const resolvedLinks = computed(() =>
    navLinks.map((link) => ({
        ...link,
        href: localizePath(link.to, locale.value),
        label: t(link.labelKey),
    })),
);

/** The three theme states, with an icon and a translated label each. */
const themeOptions = computed<
    { value: ThemeChoice; icon: Component; label: string }[]
>(() => {
    const icons: Record<ThemeChoice, Component> = {
        system: Monitor,
        light: Sun,
        dark: Moon,
    };
    const labels: Record<ThemeChoice, MessageKey> = {
        system: "theme.system",
        light: "theme.light",
        dark: "theme.dark",
    };
    return THEME_CHOICES.map((value) => ({
        value,
        icon: icons[value],
        label: t(labels[value]),
    }));
});

/** What the closed control shows: the state you are actually in. */
const currentTheme = computed(
    () => themeOptions.value.find((o) => o.value === theme.value) ?? themeOptions.value[0]!,
);

function chooseTheme(next: ThemeChoice): void {
    openMenu.value = null;
    setTheme(next);
}

const isActive = (href: string): boolean => {
    const root = localizePath("/", locale.value) || "/";
    if (href === root) return route.path === href || route.path === `${href}/`;
    return route.path === href || route.path.startsWith(`${href}/`);
};

/**
 * Switch language while staying on the same page: strip the current prefix,
 * re-apply the target one, and keep any hash so a deep-linked FAQ answer
 * survives the switch.
 */
async function switchLocale(next: Locale): Promise<void> {
    openMenu.value = null;
    if (next === locale.value) return;

    const { path } = splitLocalePath(route.path);
    await setLocale(next);
    await router.push({ path: localizePath(path, next), hash: route.hash });
}

/**
 * Close on a click anywhere that is not inside the open menu.
 *
 * Marked with `data-menu` rather than by class name so this stays one handler
 * as menus are added; clicking the *other* menu's trigger still closes this
 * one, because the name under the pointer is not the name that is open.
 */
function closeOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    const inside = target?.closest<HTMLElement>("[data-menu]")?.dataset.menu;
    if (inside !== openMenu.value) openMenu.value = null;
}

function closeOnEscape(event: KeyboardEvent): void {
    if (event.key === "Escape") openMenu.value = null;
}

const toggleMenu = () => {
    isMenuOpen.value = !isMenuOpen.value;
    if (isMenuOpen.value) {
        document.body.style.overflow = "hidden";
    } else {
        document.body.style.overflow = "";
    }
};

/**
 * Whether the bar has left the top of the page.
 *
 * Throttled to one read per frame and registered `passive`: a scroll listener
 * that is neither has to be waited for before the browser can scroll, and on a
 * trackpad it is asked to run several times for every frame the reader sees.
 * Assigning the ref is guarded too, so a page that never crosses the
 * threshold never invalidates anything.
 */
const handleScroll = rafThrottle(() => {
    const next = window.scrollY > 10;
    if (next !== isScrolled.value) isScrolled.value = next;
});

onMounted(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("click", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
});

onUnmounted(() => {
    // The frame a live throttle asked for still holds a reference to this
    // component, so it has to be dropped, not just unlistened.
    handleScroll.cancel();
    window.removeEventListener("scroll", handleScroll);
    document.removeEventListener("click", closeOnOutsideClick);
    document.removeEventListener("keydown", closeOnEscape);
    // Leaving with the menu open would strand the body scroll lock.
    document.body.style.overflow = "";
});
</script>

<template>
    <header class="header" :class="{ 'is-scrolled': isScrolled }">
        <div class="header-inner container">
            <!-- Brand Logo -->
            <router-link
                :to="localizePath('/', locale)"
                class="brand"
                @click="isMenuOpen = false"
            >
                <div class="brand-logo">
                    <img :src="faviconUrl" alt="AWG Logo" />
                </div>
                <div class="brand-info">
                    <span class="brand-title">{{ t("brand.pre") }}</span>
                    <span class="brand-subtitle">{{ t("brand.main") }}</span>
                </div>
            </router-link>

            <!-- Desktop Nav -->
            <nav class="nav-desktop">
                <div class="nav-list">
                    <router-link
                        v-for="link in resolvedLinks"
                        :key="link.href"
                        :to="link.href"
                        class="nav-link"
                        :class="{ 'router-link-active': isActive(link.href) }"
                    >
                        <span>{{ link.label }}</span>
                    </router-link>
                </div>
                <div class="nav-sep"></div>

                <!-- Theme switcher -->
                <div class="menu-wrap" data-menu="theme">
                    <button
                        class="menu-btn"
                        :aria-label="t('theme.label')"
                        :aria-expanded="openMenu === 'theme'"
                        aria-haspopup="listbox"
                        @click="toggleHeaderMenu('theme')"
                    >
                        <component :is="currentTheme.icon" :size="17" />
                        <ChevronDown :size="13" class="menu-caret" />
                    </button>

                    <transition name="fade">
                        <ul
                            v-if="openMenu === 'theme'"
                            class="menu-list"
                            role="listbox"
                            :aria-label="t('theme.label')"
                        >
                            <li v-for="opt in themeOptions" :key="opt.value">
                                <button
                                    class="menu-item"
                                    :class="{ 'is-on': theme === opt.value }"
                                    role="option"
                                    :aria-selected="theme === opt.value"
                                    @click="chooseTheme(opt.value)"
                                >
                                    <component
                                        :is="opt.icon"
                                        :size="15"
                                        class="menu-item-icon"
                                    />
                                    <span>{{ opt.label }}</span>
                                    <Check
                                        v-if="theme === opt.value"
                                        :size="14"
                                        class="menu-item-mark"
                                    />
                                </button>
                            </li>
                        </ul>
                    </transition>
                </div>

                <!-- Language switcher -->
                <div class="menu-wrap" data-menu="lang">
                    <button
                        class="menu-btn"
                        :aria-label="t('lang.switch')"
                        :aria-expanded="openMenu === 'lang'"
                        aria-haspopup="listbox"
                        @click="toggleHeaderMenu('lang')"
                    >
                        <Languages :size="17" />
                        <span class="menu-btn-code">{{
                            locale.toUpperCase()
                        }}</span>
                    </button>

                    <transition name="fade">
                        <ul
                            v-if="openMenu === 'lang'"
                            class="menu-list"
                            role="listbox"
                            :aria-label="t('lang.label')"
                        >
                            <li v-for="loc in LOCALES" :key="loc">
                                <button
                                    class="menu-item"
                                    :class="{ 'is-on': loc === locale }"
                                    role="option"
                                    :aria-selected="loc === locale"
                                    @click="switchLocale(loc)"
                                >
                                    <span>{{ LOCALE_META[loc].name }}</span>
                                    <Check
                                        v-if="loc === locale"
                                        :size="14"
                                        class="menu-item-mark"
                                    />
                                </button>
                            </li>
                        </ul>
                    </transition>
                </div>

                <a
                    href="https://github.com/Vadim-Khristenko/Any-Tech-ARCHITECT"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="gh-link"
                    :title="t('nav.github')"
                >
                    <Github :size="20" />
                </a>
            </nav>

            <!-- Mobile Toggle -->
            <button
                class="menu-toggle"
                @click="toggleMenu"
                aria-label="Toggle navigation"
            >
                <Menu v-if="!isMenuOpen" :size="24" />
                <X v-else :size="24" />
            </button>
        </div>

        <!-- Mobile Menu Overlay -->
        <transition name="fade">
            <div
                v-if="isMenuOpen"
                class="mobile-overlay"
                @click="toggleMenu"
            ></div>
        </transition>

        <!-- Mobile Slide Panel -->
        <transition name="slide">
            <div v-if="isMenuOpen" class="mobile-panel">
                <div class="mobile-head">
                    <span class="mobile-title">{{ t("nav.menu") }}</span>
                </div>
                <div class="mobile-links">
                    <router-link
                        v-for="link in resolvedLinks"
                        :key="link.href"
                        :to="link.href"
                        class="mobile-item"
                        :class="{ 'is-active': isActive(link.href) }"
                        @click="toggleMenu"
                    >
                        <component :is="link.icon" :size="20" class="mobile-item-icon" />
                        <span class="mobile-item-text">{{ link.label }}</span>
                        <ChevronRight :size="16" class="mobile-item-arrow" />
                    </router-link>
                </div>

                <div class="mobile-lang">
                    <span class="mobile-lang-label">
                        <Sun :size="15" />
                        {{ t("theme.label") }}
                    </span>
                    <div class="mobile-lang-opts is-three">
                        <button
                            v-for="opt in themeOptions"
                            :key="opt.value"
                            class="mobile-lang-opt"
                            :class="{ 'is-active': theme === opt.value }"
                            :aria-pressed="theme === opt.value"
                            @click="setTheme(opt.value)"
                        >
                            <component :is="opt.icon" :size="15" />
                            <span>{{ opt.label }}</span>
                        </button>
                    </div>
                </div>

                <div class="mobile-lang">
                    <span class="mobile-lang-label">
                        <Languages :size="15" />
                        {{ t("lang.label") }}
                    </span>
                    <div class="mobile-lang-opts">
                        <button
                            v-for="loc in LOCALES"
                            :key="loc"
                            class="mobile-lang-opt"
                            :class="{ 'is-active': loc === locale }"
                            @click="
                                switchLocale(loc);
                                toggleMenu();
                            "
                        >
                            {{ LOCALE_META[loc].name }}
                        </button>
                    </div>
                </div>

                <div class="mobile-footer">
                    <a
                        href="https://github.com/Vadim-Khristenko/Any-Tech-ARCHITECT"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="mobile-gh"
                    >
                        <Github :size="18" />
                        <span>{{ t("nav.github") }}</span>
                    </a>
                </div>
            </div>
        </transition>
    </header>
</template>

<style scoped>
/* ── Header Container ─────────────────────────────────────────────────── */
/*
 * The bar itself is the kit's: `.header` and `.header-inner` in
 * kit/shell.css, where it is the sheet's top margin rather than a floating
 * strip. What stays here is only what is particular to this header — the
 * brand, the links, the mobile panel.
 */

/* The kit centres nothing; the shell is a bar and this is its content. */
.header-inner {
    justify-content: space-between;
}

/* ── Brand ────────────────────────────────────────────────────────────── */
.brand {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    user-select: none;
    z-index: 1002;
}

.brand-logo {
    width: 38px;
    height: 38px;
    background: linear-gradient(
        135deg,
        rgb(var(--accent-rgb) / 0.1) 0%,
        rgb(var(--accent-rgb) / 0.05) 100%
    );
    border: 1px solid rgb(var(--accent-rgb) / 0.2);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.brand-logo img {
    width: 36px;
    height: 36px;
    object-fit: contain;
}

.brand-info {
    display: flex;
    flex-direction: column;
}

.brand-title {
    font-family: var(--fm);
    font-size: 0.6rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.28em;
    color: var(--text3);
    line-height: 1;
}

.brand-subtitle {
    font-family: var(--fu);
    font-weight: 800;
    font-size: 1.05rem;
    letter-spacing: -0.01em;
    color: var(--text);
    line-height: 1;
    margin-top: 3px;
}

/* ── Desktop Nav ──────────────────────────────────────────────────────── */
.nav-desktop {
    display: none;
    align-items: center;
    gap: 24px;
}

@media (min-width: 860px) {
    .nav-desktop {
        display: flex;
    }
}

.nav-list {
    display: flex;
    gap: 6px;
}

.nav-link {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    border-radius: 100px;
    color: var(--text2);
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.2s;
    position: relative;
}

.nav-link:hover {
    color: var(--accent-ink);
    background: rgb(var(--accent-rgb) / 0.04);
}

.nav-link.router-link-active {
    color: var(--text);
    background: rgb(var(--accent-rgb) / 0.08);
}

.nav-link.router-link-active::before {
    content: "";
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--accent);
    opacity: 0;
}

.nav-sep {
    width: 1px;
    height: 18px;
    background: var(--border);
}

.gh-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    color: var(--text2);
    transition: all 0.2s;
    border: 1px solid transparent;
}



/* ── Language switcher ────────────────────────────────────────────────── */
/* ── Header dropdowns: theme and language ─────────────────────────────── */

/*
 * One set of rules for both. They were two — `.lang-btn`/`.lang-menu`/
 * `.lang-opt` beside a separate segmented theme control — and the second one
 * was on its way to being a copy of the first with a different prefix. Sharing
 * the names means the two controls cannot drift apart, which is what a reader
 * expects of two things that sit next to each other and behave identically.
 */
.menu-wrap {
    position: relative;
}

.menu-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 36px;
    padding: 0 10px;
    border-radius: 100px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text2);
    font-family: var(--fw);
    font-weight: 700;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
}

.menu-btn:hover,
.menu-btn[aria-expanded="true"],
.gh-link:hover {
    color: var(--accent-ink);
    background: var(--bg2);
    border-color: var(--border);
}

.menu-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}

.menu-btn-code {
    letter-spacing: 0.04em;
}

/* Small enough to read as punctuation rather than as a second icon. */
.menu-caret {
    opacity: 0.65;
}

.menu-list {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 60;
    min-width: 178px;
    margin: 0;
    padding: 5px;
    list-style: none;
    background: var(--bg2);
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text2);
    font-family: var(--fw);
    font-size: 0.82rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s;
}

/* The tick sits at the far edge whether or not the row has a leading icon. */
.menu-item-mark {
    margin-left: auto;
    flex-shrink: 0;
}

.menu-item-icon {
    flex-shrink: 0;
    opacity: 0.8;
}

.menu-item:hover {
    background: var(--bg4);
    color: var(--text);
}

.menu-item.is-on {
    color: var(--accent-ink);
}

.menu-item.is-on .menu-item-icon {
    opacity: 1;
}

/* ── Mobile language switcher ─────────────────────────────────────────── */
.mobile-lang {
    padding: 16px 20px;
    border-top: 1px solid var(--border);
}

.mobile-lang-label {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 10px;
    color: var(--text2);
    font-family: var(--fw);
    font-weight: 700;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.mobile-lang-opts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}

/* Three across is narrow, and "Как в системе" does not fit beside an icon. */
.mobile-lang-opts.is-three {
    grid-template-columns: repeat(3, 1fr);
}

.mobile-lang-opts.is-three .mobile-lang-opt {
    flex-direction: column;
    gap: 5px;
    padding: 10px 6px;
    font-size: 0.72rem;
    line-height: 1.25;
    text-align: center;
}

.mobile-lang-opt {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 9px 10px;
    border: 1px solid var(--border2);
    border-radius: var(--radius-sm);
    background: var(--bg2);
    color: var(--text2);
    font-family: var(--fw);
    font-weight: 700;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s;
}

.mobile-lang-opt.is-active {
    background: var(--amber);
    border-color: var(--amber);
    color: var(--on-accent);
}

/* ── Mobile Toggle ────────────────────────────────────────────────────── */
.menu-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: transparent;
    border: none;
    color: var(--text);
    cursor: pointer;
    z-index: 1002;
}

@media (min-width: 860px) {
    .menu-toggle {
        display: none;
    }
}

/* ── Mobile Panel ─────────────────────────────────────────────────────── */
.mobile-overlay {
    position: fixed;
    inset: 0;
    background: light-dark(rgb(40 36 30 / 0.4), rgb(0 0 0 / 0.6));
    backdrop-filter: blur(4px);
    z-index: 1001;
}

.mobile-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 280px;
    height: 100vh;
    background: var(--bg2);
    border-left: 1px solid var(--border);
    z-index: 1002;
    padding: 80px 20px 20px;
    display: flex;
    flex-direction: column;
    box-shadow: -10px 0 40px rgba(0, 0, 0, 0.5);
}

.mobile-head {
    margin-bottom: 20px;
    padding-left: 12px;
}

.mobile-title {
    font-family: var(--fu);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text3);
}

.mobile-links {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
}

.mobile-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
    border-radius: 12px;
    color: var(--text2);
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s;
    background: rgba(255, 255, 255, 0.02);
}

.mobile-item:hover,
.mobile-item.is-active {
    background: rgb(var(--accent-rgb) / 0.08);
    color: var(--accent-ink);
}

.mobile-item-icon {
    opacity: 0.7;
}

.mobile-item.is-active .mobile-item-icon {
    opacity: 1;
    color: var(--accent-ink);
}

.mobile-item-arrow {
    margin-left: auto;
    opacity: 0.3;
}

.mobile-footer {
    margin-top: auto;
    border-top: 1px solid var(--border2);
    padding-top: 20px;
}

.mobile-gh {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 12px;
    border-radius: 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 0.9rem;
    font-weight: 600;
}

/* ── Transitions ──────────────────────────────────────────────────────── */
.slide-enter-active,
.slide-leave-active {
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-enter-from,
.slide-leave-to {
    transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
