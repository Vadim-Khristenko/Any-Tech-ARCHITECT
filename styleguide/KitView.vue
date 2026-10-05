<script setup lang="ts">
/**
 * Every primitive in the kit, on one page, across every accent and both
 * schemes.
 *
 * The point is the combinations. A component that works on the amber page in
 * the dark scheme is not evidence about the purple one in the light scheme,
 * and the only way to know is to be able to flip both axes over a page that
 * has one of everything on it.
 *
 * Not part of the production build — see styleguide/index.html.
 */

import { ref, computed, onMounted, onUnmounted } from "vue";
import { typeLines, type TypingHandle } from "@/utils/typing";
/*
 * The project's own icon set. Nothing here draws a glyph by hand: the app
 * already ships lucide everywhere, and a styleguide that demonstrates
 * primitives with typed characters is demonstrating something the app never
 * renders.
 */
import {
    Info,
    CheckCircle2,
    AlertTriangle,
    HelpCircle,
    Copy,
    Download,
    RefreshCw,
    Trash2,
    Sparkles,
    ChevronRight,
    Monitor,
    Sun,
    Moon,
    RotateCcw,
} from "lucide-vue-next";

type Accent = "amber" | "gold" | "teal" | "green" | "blue" | "purple";
type Scheme = "system" | "light" | "dark";

const ACCENTS: Accent[] = ["amber", "gold", "teal", "green", "blue", "purple"];
const SCHEMES: Scheme[] = ["system", "light", "dark"];

const accent = ref<Accent>("amber");
const scheme = ref<Scheme>("dark");

function applyAccent(next: Accent) {
    accent.value = next;
    document.documentElement.dataset.accent = next;
}

function applyScheme(next: Scheme) {
    scheme.value = next;
    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
}

const typedLine = ref<HTMLElement | null>(null);
let typing: TypingHandle | null = null;

onMounted(() => {
    applyAccent(accent.value);
    applyScheme(scheme.value);

    if (typedLine.value) {
        typing = typeLines(typedLine.value, [
            "профиль: QUIC Initial",
            "маскируемся под RFC 9000",
            "ничего не уходит из браузера",
        ]);
    }
});

onUnmounted(() => typing?.stop());

/* ── Live state for the interactive primitives ───────────────────────────── */

/*
 * A real tri-state, because that is the only way to demonstrate one.
 *
 * `indeterminate` is a DOM property with no attribute behind it, and the
 * browser clears it the moment the box is clicked. Binding a constant to it
 * therefore produces a checkbox that shows a dash once and then never again —
 * which is what the first version of this page did. Deriving it from children
 * is both the honest demonstration and the only use the state has.
 */
const tags = ref([
    { id: "c", label: "<c>", on: true },
    { id: "r", label: "<r>", on: true },
    { id: "rd", label: "<rd>", on: false },
]);

const allTags = computed(() => tags.value.every((t) => t.on));
const someTags = computed(() => tags.value.some((t) => t.on) && !allTags.value);

function toggleAllTags(event: Event) {
    const on = (event.target as HTMLInputElement).checked;
    for (const t of tags.value) t.on = on;
}

/*
 * An animation you cannot replay is an animation you cannot judge: entrances
 * run once, on load, and are gone before you have scrolled to them. Bumping a
 * key tears the elements down and rebuilds them, which is the only honest way
 * to watch an entrance a second time.
 */
const motionKey = ref(0);
const replayMotion = () => (motionKey.value += 1);

/** Whether the demo header is showing its collapsed state. */
const headerScrolled = ref(true);

/** The disclosure demo, and the value that re-arrives when it is bumped. */
const disclosed = ref(true);
const swapKey = ref(0);
const swapValues = ["422", "509", "377", "641"];
const swapValue = computed(() => swapValues[swapKey.value % swapValues.length]);
const nudged = ref(false);

/** Entrances and exits share the demo panels; this says which is running. */
const shown = ref(true);

function nudgeField() {
    nudged.value = false;
    // Restart the animation: a class that is already there does not replay.
    window.setTimeout(() => (nudged.value = true), 20);
}

const radio = ref("b");
const switched = ref(true);
const range = ref(62);
const segment = ref("med");
const tab = ref("params");
const openItem = ref<number | null>(0);
const loading = ref(false);
const progress = ref(38);
const dialog = ref<HTMLDialogElement | null>(null);

function fakeWork() {
    loading.value = true;
    window.setTimeout(() => (loading.value = false), 1400);
}

/* ── Sample data, taken from what the generator really produces ──────────── */

const RANGES = [
    { key: "H1", lo: 404_731_556, hi: 404_774_416 },
    { key: "H2", lo: 1_917_908_238, hi: 1_917_941_084 },
    { key: "H3", lo: 3_180_395_130, hi: 3_180_396_917 },
    { key: "H4", lo: 3_844_219_877, hi: 3_844_241_616 },
];

const nf = new Intl.NumberFormat("ru-RU");
const span = (lo: number, hi: number) => nf.format(hi - lo);

/** A QUIC Initial long header, as the mimicry profile builds it. */
const PACKET = [
    { name: "Flags", bytes: 1, ours: false },
    { name: "Version", bytes: 4, ours: false },
    { name: "DCID", bytes: 8, ours: true },
    { name: "SCID", bytes: 4, ours: true },
    { name: "Token", bytes: 0, ours: false, void: true },
    { name: "Length", bytes: 2, ours: true },
    { name: "Packet No.", bytes: 2, ours: true },
    { name: "Payload", bytes: 27, ours: true },
];

const totalBytes = computed(() => PACKET.reduce((n, f) => n + Math.max(f.bytes, 1), 0));

const ticks = Array.from({ length: 32 }, (_, i) => i);

const PROFILE_ROWS = [
    { name: "QUIC Initial", spec: "RFC 9000", fields: 8 },
    { name: "TLS ClientHello", spec: "RFC 8446", fields: 6 },
    { name: "DNS", spec: "RFC 1035", fields: 5 },
    { name: "STUN", spec: "RFC 5389", fields: 4 },
];
</script>

<template>
    <div class="kit">
        <!--
            The kit is shown on the ground it will actually live on. A
            primitive judged against a flat colour is judged against a page
            that does not exist.
        -->
        <div class="sheet-bg" aria-hidden="true">
            <div class="sheet-wash"></div>
            <div class="sheet-grid"></div>
            <div class="sheet-grain"></div>
        </div>

        <!-- ── The two axes ────────────────────────────────────────────── -->
        <header class="kit-bar">
            <div class="kit-bar-brand">
                <span class="kit-bar-name">Any&nbsp;Tech <b>ARCHITECT</b></span>
                <span class="note-label">kit</span>
            </div>

            <div class="row">
                <div class="segment">
                    <button
                        v-for="s in SCHEMES"
                        :key="s"
                        class="segment-opt"
                        :class="{ 'is-active': scheme === s }"
                        @click="applyScheme(s)"
                    >
                        {{ s }}
                    </button>
                </div>

                <div class="segment">
                    <button
                        v-for="a in ACCENTS"
                        :key="a"
                        class="segment-opt kit-swatch"
                        :class="{ 'is-active': accent === a }"
                        :data-accent="a"
                        @click="applyAccent(a)"
                    >
                        <i class="kit-swatch-dot"></i>
                        {{ a }}
                    </button>
                </div>
            </div>
        </header>

        <main class="kit-main">
            <!-- ══ Foundations ═════════════════════════════════════════ -->
            <section class="kit-section">
                <h2 class="h2">Основания</h2>
                <p class="lede">
                    Всё ниже строится из этих величин. Меняется только акцент
                    и схема — сами шкалы не зависят ни от страницы, ни от
                    читателя.
                </p>

                <h3 class="h3">Фон и цвета бренда</h3>
                <div class="kit-swatches">
                    <div
                        v-for="t in [
                            '--ground',
                            '--ground-2',
                            '--ground-3',
                            '--ground-4',
                            '--ground-5',
                            '--surface',
                            '--accent',
                            '--accent-ink',
                            '--ink',
                            '--ink-2',
                            '--ink-3',
                            '--line',
                        ]"
                        :key="t"
                        class="kit-chip"
                    >
                        <span
                            class="kit-chip-fill"
                            :style="{ background: `var(${t})` }"
                        ></span>
                        <code class="note-label">{{ t }}</code>
                    </div>
                </div>

                <h3 class="h3">Типографика</h3>
                <div class="stack">
                    <span class="display display--lg">Architect</span>
                    <span class="display">Конфигурация</span>
                    <span class="h2">Заголовок раздела</span>
                    <span class="h3">Подзаголовок</span>
                    <p class="prose">
                        Основной текст держится в пределах комфортной меры и
                        никогда не растягивается на всю ширину экрана: строка
                        длиннее семидесяти знаков теряет читателя на переносе.
                    </p>
                    <span class="mono">0xc2000000011487e88c53715e896f8bce</span>
                </div>

                <h3 class="h3">Отступы</h3>
                <div class="kit-spaces">
                    <div
                        v-for="n in 10"
                        :key="n"
                        class="kit-space"
                        :style="{ width: `var(--sp-${n})` }"
                        :title="`--sp-${n}`"
                    ></div>
                </div>
            </section>

            <!-- ══ Drawing motifs ══════════════════════════════════════ -->
            <section class="kit-section">
                <h2 class="h2">Чертёжные мотивы</h2>
                <p class="lede">
                    Правило одно: каждый мотив несёт данные. Размерная линия —
                    это диапазон, потому что диапазон и есть размер. Штриховка
                    означает, что клиент этого не поддерживает. Литера ревизии —
                    версия протокола.
                </p>

                <h3 class="h3">Размерные линии — диапазоны заголовков</h3>
                <div class="panel">
                    <div class="panel-body stack">
                        <div v-for="r in RANGES" :key="r.key" class="kit-dimrow">
                            <span class="rev">{{ r.key }}</span>
                            <div class="dim">
                                <span class="dim-end">{{ nf.format(r.lo) }}</span>
                                <span class="dim-line">
                                    <span class="dim-span">
                                        ширина {{ span(r.lo, r.hi) }}
                                    </span>
                                </span>
                                <span class="dim-end">{{ nf.format(r.hi) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <h3 class="h3">Октетная линейка и карта полей</h3>
                <div class="panel">
                    <div class="panel-body stack">
                        <div class="ruler">
                            <span
                                v-for="i in ticks"
                                :key="i"
                                class="ruler-tick"
                                :class="{ 'ruler-tick--major': i % 8 === 7 }"
                            >
                                <span v-if="i % 8 === 0">{{ i }}</span>
                            </span>
                        </div>

                        <div class="fieldmap">
                            <div
                                v-for="f in PACKET"
                                :key="f.name"
                                class="fieldmap-field"
                                :class="{
                                    'fieldmap-field--ours': f.ours,
                                    'fieldmap-field--void': f.void,
                                }"
                                :style="{
                                    /*
                                     * Grow carries the proportion, basis is
                                     * zero. As a percentage it competed with
                                     * the min-width each field needs to keep
                                     * its label, and the widest field came out
                                     * among the narrowest.
                                     */
                                    flexGrow: Math.max(f.bytes, 1),
                                    flexBasis: 0,
                                }"
                            >
                                <span class="fieldmap-name">{{ f.name }}</span>
                                <span class="fieldmap-size">
                                    {{ f.bytes ? `${f.bytes} B` : "—" }}
                                </span>
                            </div>
                        </div>

                        <div class="row">
                            <span class="leader">заполняется генератором</span>
                            <span class="leader">штриховка — поля нет</span>
                        </div>
                    </div>
                </div>

                <h3 class="h3">Штамп основной надписи</h3>
                <div class="titleblock">
                    <div class="titleblock-cell">
                        <span class="titleblock-key">Лист</span>
                        <span class="titleblock-val">AWG-3.0</span>
                    </div>
                    <div class="titleblock-cell">
                        <span class="titleblock-key">Профиль</span>
                        <span class="titleblock-val">QUIC Initial</span>
                    </div>
                    <div class="titleblock-cell">
                        <span class="titleblock-key">Клиент</span>
                        <span class="titleblock-val">Amnezia VPN</span>
                    </div>
                    <div class="titleblock-cell">
                        <span class="titleblock-key">MTU</span>
                        <span class="titleblock-val">1500</span>
                    </div>
                </div>

                <h3 class="h3">Разделители и пустоты</h3>
                <div class="stack">
                    <span class="rule">экспорт</span>
                    <hr class="divider" />
                    <div class="void" style="height: 56px"></div>
                </div>
            </section>

            <!-- ══ Buttons ═════════════════════════════════════════════ -->
            <section class="kit-section">
                <h2 class="h2">Кнопки</h2>

                <div class="row">
                    <button class="btn btn--primary">
                        <Sparkles :size="15" /> Сгенерировать
                    </button>
                    <button class="btn btn--secondary">
                        <Download :size="15" /> Скачать .conf
                    </button>
                    <button class="btn btn--ghost">
                        <Copy :size="15" /> Копировать
                    </button>
                    <button class="btn btn--danger">
                        <Trash2 :size="15" /> Очистить историю
                    </button>
                </div>

                <div class="row">
                    <button class="btn btn--primary btn--sm">Мелкая</button>
                    <button class="btn btn--primary">Обычная</button>
                    <button class="btn btn--primary btn--lg">Крупная</button>
                    <button class="btn btn--secondary btn--icon" aria-label="Обновить">
                        <RefreshCw :size="15" />
                    </button>
                </div>

                <div class="row">
                    <button class="btn btn--primary" disabled>Недоступно</button>
                    <button class="btn btn--secondary" disabled>Недоступно</button>
                    <button
                        class="btn btn--primary"
                        :class="{ 'is-loading': loading }"
                        @click="fakeWork"
                    >
                        Нажми — покажу загрузку
                    </button>
                </div>

                <div class="btngroup">
                    <button
                        v-for="v in ['1.0', '1.5', '2.0', '3.0']"
                        :key="v"
                        class="btn"
                        :class="{ 'is-active': v === '3.0' }"
                    >
                        AWG {{ v }}
                    </button>
                </div>
            </section>

            <!-- ══ Form controls ═══════════════════════════════════════ -->
            <section class="kit-section">
                <h2 class="h2">Поля ввода</h2>

                <div class="grid">
                    <label class="field">
                        <span class="label">Хост мимикрии</span>
                        <input class="input" placeholder="например, do.co" />
                        <span class="hint">
                            Хост с HTTP/3. Примеры из базы: do.co, ya.ru, dns.sb
                        </span>
                    </label>

                    <label class="field">
                        <span class="label">
                            Приватный ключ<span class="label-req">*</span>
                        </span>
                        <input
                            class="input input--mono is-invalid"
                            value="8Jd2kQ…"
                        />
                        <span class="error">Не base64 длиной 44 символа.</span>
                    </label>

                    <label class="field">
                        <span class="label">Целевой клиент</span>
                        <select class="select">
                            <option>Amnezia VPN</option>
                            <option>AmneziaWG Android</option>
                            <option>Keenetic (native)</option>
                        </select>
                    </label>

                    <div class="field">
                        <span class="label">MTU интерфейса</span>
                        <div class="inputgroup">
                            <input class="input" value="1500" />
                            <span class="affix">байт</span>
                        </div>
                    </div>

                    <label class="field">
                        <span class="label">Отключённое поле</span>
                        <input class="input" value="недоступно" disabled />
                    </label>

                    <label class="field">
                        <span class="label">Конфигурация</span>
                        <textarea
                            class="textarea textarea--mono"
                            placeholder="Вставьте vpn:// ключ или .conf"
                        ></textarea>
                    </label>
                </div>

                <h3 class="h3">Переключатели</h3>
                <div class="grid">
                    <div class="stack">
                        <!--
                            Родитель показывает три состояния: все, ни одного,
                            часть. Третье — та самая «неопределённость», и
                            смысл она имеет только здесь.
                        -->
                        <label class="check">
                            <input
                                type="checkbox"
                                :checked="allTags"
                                :indeterminate="someTags"
                                @change="toggleAllTags"
                            />
                            <span>Теги в цепочке CPS</span>
                        </label>
                        <label
                            v-for="t in tags"
                            :key="t.id"
                            class="check"
                            style="padding-left: 28px"
                        >
                            <input v-model="t.on" type="checkbox" />
                            <span><code class="code">{{ t.label }}</code></span>
                        </label>
                        <label class="check">
                            <input type="checkbox" disabled />
                            <span>Не поддерживается клиентом</span>
                        </label>
                    </div>

                    <div class="stack">
                        <label
                            v-for="o in [
                                { v: 'a', l: 'Низкая энтропия' },
                                { v: 'b', l: 'Средняя' },
                                { v: 'c', l: 'Высокая' },
                            ]"
                            :key="o.v"
                            class="check"
                        >
                            <input v-model="radio" type="radio" :value="o.v" />
                            <span>{{ o.l }}</span>
                        </label>
                    </div>

                    <div class="stack">
                        <label class="switch">
                            <input v-model="switched" type="checkbox" />
                            <span class="switch-track"></span>
                            <span>Режим роутера</span>
                        </label>
                        <label class="switch">
                            <input type="checkbox" disabled />
                            <span class="switch-track"></span>
                            <span>Недоступно на этом клиенте</span>
                        </label>
                        <label class="field">
                            <span class="label">
                                Интенсивность — {{ range }}
                            </span>
                            <input
                                v-model.number="range"
                                class="range"
                                type="range"
                            />
                        </label>
                        <div class="segment">
                            <button
                                v-for="s in ['low', 'med', 'high']"
                                :key="s"
                                class="segment-opt"
                                :class="{ 'is-active': segment === s }"
                                @click="segment = s"
                            >
                                {{ s }}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ══ Marks ═══════════════════════════════════════════════ -->
            <section class="kit-section">
                <h2 class="h2">Метки</h2>
                <div class="row">
                    <span class="badge">AWG 3.0</span>
                    <span class="badge badge--ok">работает</span>
                    <span class="badge badge--warn">проверьте</span>
                    <span class="badge badge--bad">ошибка</span>
                    <span class="badge badge--info">.conf</span>
                    <span class="badge badge--quiet">черновик</span>
                </div>
                <div class="row">
                    <span class="rev">A</span>
                    <span class="rev is-active">B</span>
                    <span class="rev">H1</span>
                    <kbd class="kbd">Ctrl</kbd>
                    <kbd class="kbd">C</kbd>
                    <code class="code">Jmin</code>
                    <span class="row" style="gap: 6px">
                        <i class="dot dot--ok"></i> готово
                    </span>
                    <span class="row" style="gap: 6px">
                        <i class="dot dot--live"></i> идёт проверка
                    </span>
                </div>
            </section>

            <!-- ══ Readouts ════════════════════════════════════════════ -->
            <section class="kit-section">
                <h2 class="h2">Отсчёты</h2>
                <div class="readout-row">
                    <div class="readout">
                        <span class="readout-key">Jc</span>
                        <span class="readout-val">4</span>
                    </div>
                    <div class="readout">
                        <span class="readout-key">Jmin</span>
                        <span class="readout-val">422</span>
                    </div>
                    <div class="readout">
                        <span class="readout-key">Jmax</span>
                        <span class="readout-val">722</span>
                    </div>
                    <div class="readout">
                        <span class="readout-key">S1</span>
                        <span class="readout-val">77</span>
                    </div>
                    <div class="readout">
                        <span class="readout-key">S2</span>
                        <span class="readout-val">72</span>
                    </div>
                </div>
                <div class="readout readout--wide">
                    <span class="readout-key">I1</span>
                    <span class="readout-val">
                        &lt;b 0xc3000000011487e88c53715e896f8bce25178d35e22fcf&gt;&lt;rc
                        19&gt;&lt;t&gt;&lt;r 54&gt;
                    </span>
                </div>
            </section>

            <!-- ══ Messages ════════════════════════════════════════════ -->
            <section class="kit-section">
                <h2 class="h2">Сообщения</h2>
                <div class="stack">
                    <div class="note">
                        <Info :size="16" class="note-icon" />
                        <span>
                            <b class="note-title">Тег &lt;c&gt; проблемный</b>
                            Не работает в старых версиях AWG-go. Разработчики
                            Amnezia позднее отказались от него.
                        </span>
                    </div>
                    <div class="note note--ok">
                        <CheckCircle2 :size="16" class="note-icon" />
                        <span>Конфигурация прошла проверку без замечаний.</span>
                    </div>
                    <div class="note note--bad">
                        <AlertTriangle :size="16" class="note-icon" />
                        <span>H2 и H3 пересекаются — клиент отвергнет конфиг.</span>
                    </div>
                    <div class="note note--info">
                        <HelpCircle :size="16" class="note-icon" />
                        <span>Эти параметры должны совпадать на обоих концах.</span>
                    </div>

                    <div class="empty">
                        <span class="empty-title">Пока ничего не сгенерировано</span>
                        <span class="empty-desc">
                            Выберите версию и клиента, затем нажмите
                            «Сгенерировать». История хранится только в этом
                            браузере.
                        </span>
                        <button class="btn btn--primary">
                            <Sparkles :size="15" /> Сгенерировать
                        </button>
                    </div>
                </div>
            </section>

            <!-- ══ Progress ════════════════════════════════════════════ -->
            <section class="kit-section">
                <h2 class="h2">Ход работы</h2>
                <div class="stack">
                    <div class="progress">
                        <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
                    </div>
                    <div class="progress progress--indeterminate">
                        <div class="progress-bar"></div>
                    </div>
                    <div class="row">
                        <span class="spinner"></span>
                        <span class="note-label">проверяем домен</span>
                    </div>
                    <div class="stack" style="gap: 8px">
                        <div class="skeleton" style="height: 14px; width: 45%"></div>
                        <div class="skeleton" style="height: 14px; width: 80%"></div>
                        <div class="skeleton" style="height: 14px; width: 62%"></div>
                    </div>
                </div>
            </section>

            <!-- ══ Tables, tabs, accordion ═════════════════════════════ -->
            <section class="kit-section">
                <h2 class="h2">Данные и раскрытие</h2>

                <div class="tablewrap">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Параметр</th>
                                <th>1.0</th>
                                <th>1.5</th>
                                <th>2.0</th>
                                <th>3.0</th>
                                <th class="num">Предел</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code class="code">Jc</code></td>
                                <td>да</td>
                                <td>да</td>
                                <td>да</td>
                                <td>да</td>
                                <td class="num">15</td>
                            </tr>
                            <tr>
                                <td><code class="code">S3, S4</code></td>
                                <td>—</td>
                                <td>—</td>
                                <td>да</td>
                                <td>да</td>
                                <td class="num">1280</td>
                            </tr>
                            <tr>
                                <td><code class="code">H1–H4</code></td>
                                <td>одно</td>
                                <td>одно</td>
                                <td>диапазон</td>
                                <td>диапазон</td>
                                <td class="num">4294967295</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="tabs">
                    <button
                        v-for="t in [
                            { id: 'params', l: 'Параметры' },
                            { id: 'preview', l: 'Превью' },
                            { id: 'health', l: 'Проверка' },
                        ]"
                        :key="t.id"
                        class="tab"
                        :class="{ 'is-active': tab === t.id }"
                        @click="tab = t.id"
                    >
                        {{ t.l }}
                    </button>
                </div>

                <div class="accordion">
                    <div
                        v-for="(q, i) in [
                            'Что делают Jc, Jmin и Jmax?',
                            'Почему H1–H4 не должны пересекаться?',
                            'Какой MTU выставлять?',
                        ]"
                        :key="i"
                        class="accordion-item"
                    >
                        <button
                            class="accordion-head"
                            @click="openItem = openItem === i ? null : i"
                        >
                            {{ q }}
                        </button>
                        <div v-if="openItem === i" class="accordion-body">
                            Junk-поезд — это пакеты-пустышки перед рукопожатием.
                            Jc задаёт их количество, Jmin и Jmax — границы
                            размера каждого.
                        </div>
                    </div>
                </div>
            </section>

            <!-- ══ Overlays ════════════════════════════════════════════ -->
            <section class="kit-section">
                <h2 class="h2">Наложения</h2>
                <div class="row" style="align-items: flex-start">
                    <ul class="menu" style="position: static">
                        <li>
                            <button class="menu-item is-on">
                                <Monitor :size="15" /> Как в системе
                            </button>
                        </li>
                        <li>
                            <button class="menu-item">
                                <Sun :size="15" /> Светлая
                            </button>
                        </li>
                        <li>
                            <button class="menu-item">
                                <Moon :size="15" /> Тёмная
                            </button>
                        </li>
                        <li><span class="menu-sep"></span></li>
                        <li>
                            <button class="menu-item">
                                <RotateCcw :size="15" /> Сбросить
                            </button>
                        </li>
                    </ul>

                    <div class="toast">
                        <CheckCircle2 :size="16" class="toast-icon" />
                        <span>Конфигурация скопирована в буфер обмена.</span>
                    </div>

                    <button class="btn btn--secondary" @click="dialog?.showModal()">
                        Открыть диалог
                    </button>
                </div>

                <dialog ref="dialog" class="dialog">
                    <div class="dialog-head">
                        <span class="dialog-title">Очистить историю?</span>
                    </div>
                    <div class="dialog-body">
                        Будут удалены все записи, кроме закреплённых. История
                        хранится только в этом браузере — восстановить её будет
                        нечем.
                    </div>
                    <div class="dialog-foot">
                        <button class="btn btn--ghost" @click="dialog?.close()">
                            Отмена
                        </button>
                        <button class="btn btn--danger" @click="dialog?.close()">
                            Очистить
                        </button>
                    </div>
                </dialog>
            </section>

            <!-- ══ Surfaces ════════════════════════════════════════════ -->
            <section class="kit-section">
                <h2 class="h2">Поверхности</h2>
                <p class="lede">
                    Всё это лежит на клетчатом листе, поэтому у каждой
                    поверхности, которая может стоять прямо на странице, фон
                    непрозрачный. Полупрозрачная подложка на сетке подсвечивает
                    сетку, а не себя.
                </p>

                <div class="grid grid--wide">
                    <div class="panel">
                        <div class="panel-head">
                            <span class="panel-title">Конфигурация</span>
                            <span class="panel-aside">
                                <span class="badge">AWG 3.0</span>
                            </span>
                        </div>
                        <div class="panel-body prose">
                            Панель — обрамлённая область на листе. Голова, тело,
                            подвал.
                        </div>
                        <div class="panel-foot">
                            <button class="btn btn--ghost btn--sm">Сброс</button>
                            <button class="btn btn--primary btn--sm">
                                Применить
                            </button>
                        </div>
                    </div>

                    <a class="card lift press" href="#">
                        <span class="row" style="justify-content: space-between">
                            <span class="h3">Генератор AmneziaWG</span>
                            <ChevronRight :size="16" class="card-go" />
                        </span>
                        <p class="prose" style="margin-top: 8px">
                            Карточка — это панель, по которой можно кликнуть.
                            Поднимается на два пикселя и проседает при нажатии.
                        </p>
                    </a>

                    <div class="well">
                        <span class="note-label">колодец</span>
                        <pre style="margin-top: 8px; border: none; padding: 0">Jc = 4
Jmin = 422
Jmax = 722</pre>
                        <p class="prose" style="margin-top: 12px">
                            Утоплен, а не приподнят — для того, что выдала
                            машина: конфиг, лог, вывод.
                        </p>
                    </div>
                </div>

                <h3 class="h3">Лист, поле и плита</h3>
                <div class="sheet sheet--gridded" style="padding: 20px">
                    <div class="sheet-field">
                        <span class="note-label">поле листа</span>
                        <p class="prose" style="margin-top: 8px">
                            Сетка — это поля листа, а поле — то, на чём лежит
                            сам чертёж. Без него линейка и карта полей
                            накладываются на клетку, и клетка читается как
                            лишние засечки.
                        </p>
                    </div>
                </div>

                <figure style="margin: 0">
                    <div class="plate">
                        <div class="ruler">
                            <span
                                v-for="i in ticks"
                                :key="i"
                                class="ruler-tick"
                                :class="{ 'ruler-tick--major': i % 8 === 7 }"
                            >
                                <span v-if="i % 8 === 0">{{ i }}</span>
                            </span>
                        </div>
                    </div>
                    <figcaption class="plate-caption">
                        <span class="plate-caption-no">Рис. 1</span>
                        <span>
                            Плита — рамка для рисунка: внешняя линия, зазор,
                            внутренняя. Две линии говорят «это фигура, и она
                            закончена» так, как одна не может.
                        </span>
                    </figcaption>
                </figure>

                <div class="strip">
                    <div class="row" style="justify-content: space-between">
                        <span class="note-label">полоса — факты страницы</span>
                        <span class="row">
                            <span class="badge">11 профилей</span>
                            <span class="badge">10 клиентов</span>
                            <span class="badge">4 версии</span>
                        </span>
                    </div>
                </div>
            </section>

            <!-- ══ Motion ══════════════════════════════════════════════ -->
            <section class="kit-section">
                <h2 class="h2">Движение</h2>
                <p class="lede">
                    Всё выезжает по экспоненте и ничего не пружинит: прибор,
                    который подпрыгивает, читается как игрушка. Появления
                    заполнены назад — элемент уже на месте до того, как
                    анимация началась.
                </p>

                <div class="row">
                    <button class="btn btn--secondary" @click="replayMotion">
                        <RotateCcw :size="15" /> Проиграть заново
                    </button>
                    <span class="note-label">
                        появление видно один раз — иначе его нечем судить
                    </span>
                </div>

                <div class="row">
                    <button class="btn btn--secondary" @click="shown = !shown">
                        {{ shown ? "Показать уход" : "Показать появление" }}
                    </button>
                    <span class="note-label">
                        у каждого появления есть своя пара на уход
                    </span>
                </div>

                <div :key="motionKey" class="grid">
                    <div class="panel" :class="shown ? 'rise' : 'rise-out'">
                        <div class="panel-body">
                            <code class="code">.rise / .rise-out</code>
                            <p class="prose" style="margin-top: 8px">
                                Поднимается и проявляется. База для всего
                                остального.
                            </p>
                        </div>
                    </div>

                    <div class="panel" :class="shown ? 'settle' : 'settle-out'">
                        <div class="panel-body">
                            <code class="code">.settle / .settle-out</code>
                            <p class="prose" style="margin-top: 8px">
                                Оседает на место, а не прилетает.
                            </p>
                        </div>
                    </div>

                    <div class="panel" :class="shown ? 'sweep-in' : 'sweep-out'">
                        <div class="panel-body">
                            <code class="code">.sweep-in / .sweep-out</code>
                            <p class="prose" style="margin-top: 8px">
                                Раскрывается сверху вниз. Тяжелее — на страницу
                                один раз.
                            </p>
                        </div>
                    </div>
                </div>

                <div :key="`b${motionKey}`" class="panel">
                    <div class="panel-body stack">
                        <div class="row">
                            <code class="code">.trace</code>
                            <span class="note-label">линия чертит себя</span>
                        </div>
                        <div class="dim">
                            <span class="dim-end">404 731 556</span>
                            <span class="dim-line trace">
                                <span class="dim-span">42 860</span>
                            </span>
                            <span class="dim-end">404 774 416</span>
                        </div>

                        <div class="row">
                            <code class="code">.typing</code>
                            <span class="mono typing" style="--chars: 34">
                                0xc2000000011487e88c53715e896f8bce
                            </span>
                        </div>

                        <div class="row">
                            <code class="code">typeLines()</code>
                            <span ref="typedLine" class="mono typing-cursor"></span>
                        </div>

                        <div class="row">
                            <code class="code">.stagger</code>
                        </div>
                        <div class="readout-row stagger">
                            <div class="readout">
                                <span class="readout-key">Jc</span>
                                <span class="readout-val">4</span>
                            </div>
                            <div class="readout">
                                <span class="readout-key">Jmin</span>
                                <span class="readout-val">422</span>
                            </div>
                            <div class="readout">
                                <span class="readout-key">Jmax</span>
                                <span class="readout-val">722</span>
                            </div>
                            <div class="readout">
                                <span class="readout-key">S1</span>
                                <span class="readout-val">77</span>
                            </div>
                        </div>
                    </div>
                </div>

                <h3 class="h3">Раскрытие и замена</h3>
                <!--
                    grid--top: иначе панель держит высоту соседей по ряду, и
                    свёрнутый блок выглядит несвернувшимся.
                -->
                <div class="grid grid--wide grid--top">
                    <div class="panel">
                        <button
                            class="accordion-head"
                            @click="disclosed = !disclosed"
                        >
                            <ChevronRight
                                :size="15"
                                class="chevron"
                                :style="{
                                    transform: disclosed ? 'rotate(90deg)' : 'none',
                                }"
                            />
                            <code class="code">.disclose</code>
                        </button>
                        <div class="disclose" :class="{ 'is-open': disclosed }">
                            <div>
                                <p class="prose" style="padding: 0 20px 20px">
                                    Раскрывается по настоящей высоте
                                    содержимого: трек грида едет от 0fr к 1fr,
                                    и в CSS нет ни одного числа, которое
                                    кто-то угадал.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="panel">
                        <div class="panel-body stack">
                            <div class="row">
                                <code class="code">.fade-swap</code>
                                <button
                                    class="btn btn--secondary btn--sm"
                                    @click="swapKey += 1"
                                >
                                    Обновить
                                </button>
                            </div>
                            <div class="readout">
                                <span class="readout-key">Jmax</span>
                                <span :key="swapKey" class="readout-val fade-swap">
                                    {{ swapValue }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="panel">
                        <div class="panel-body stack">
                            <div class="row">
                                <code class="code">.nudge</code>
                                <button
                                    class="btn btn--secondary btn--sm"
                                    @click="nudgeField"
                                >
                                    Отклонить
                                </button>
                            </div>
                            <input
                                class="input input--mono is-invalid"
                                :class="{ nudge: nudged }"
                                value="8Jd2kQ…"
                            />
                            <span class="error">Не base64 длиной 44 символа.</span>
                        </div>
                    </div>
                </div>

                <div :key="`c${motionKey}`" class="grid grid--wide">
                    <div class="panel" :class="shown ? 'slide-in' : 'slide-out'">
                        <div class="panel-body">
                            <code class="code">.slide-in / .slide-out</code>
                            <p class="prose" style="margin-top: 8px">
                                Приезжает с того края, которому принадлежит.
                            </p>
                        </div>
                    </div>
                    <div class="panel">
                        <div class="panel-body row">
                            <span class="badge pop-in">.pop-in</span>
                            <span class="mono typing-cursor">ожидание ввода</span>
                        </div>
                    </div>
                </div>

                <div :key="`d${motionKey}`" class="tablewrap">
                    <table class="table table--striped">
                        <thead>
                            <tr>
                                <th>Профиль</th>
                                <th>Документ</th>
                                <th class="num">Полей</th>
                            </tr>
                        </thead>
                        <tbody class="reveal-rows">
                            <tr
                                v-for="(p, i) in PROFILE_ROWS"
                                :key="p.name"
                                :style="{ '--row': i }"
                                :class="{ 'is-active': i === 1 }"
                            >
                                <td>{{ p.name }}</td>
                                <td>{{ p.spec }}</td>
                                <td class="num">{{ p.fields }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <span class="note-label">
                    .reveal-rows — задержка берётся из индекса строки, а
                    активная строка подчёркнута акцентом и залита непрозрачно
                </span>

                <h3 class="h3">Состояние, а не появление</h3>
                <div class="grid">
                    <div class="marching" style="padding: 20px">
                        <code class="code">.marching</code>
                        <p class="prose" style="margin-top: 8px">
                            Штриховка, которая ползёт: внутри идёт работа.
                            Подвижная версия той штриховки, что означает
                            «недоступно».
                        </p>
                    </div>

                    <div class="panel">
                        <div class="panel-body row">
                            <button class="btn btn--primary glow-pulse">
                                <Sparkles :size="15" /> .glow-pulse
                            </button>
                            <span class="row" style="gap: 6px">
                                <i class="dot dot--live"></i>
                                <span class="note-label">.dot--live</span>
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ══ Shell ═══════════════════════════════════════════════ -->
            <section class="kit-section">
                <h2 class="h2">Оболочка</h2>
                <p class="lede">
                    Страница — это лист. Шапка — его верхнее поле, футер —
                    штамп основной надписи. У футера фон сплошной: клетка
                    зафиксирована к окну, и вторая клетка со своим смещением
                    дала бы клетку поверх клетки.
                </p>

                <div class="row">
                    <button
                        class="btn btn--secondary"
                        @click="headerScrolled = !headerScrolled"
                    >
                        {{ headerScrolled ? "Развернуть шапку" : "Свернуть шапку" }}
                    </button>
                    <span class="note-label">
                        свёрнутая: тень, светлая кромка, полоса прокрутки, и
                        квалификатор уходит из лого
                    </span>
                </div>

                <div class="kit-shelldemo sheet sheet--gridded">
                    <div class="header" :class="{ 'is-scrolled': headerScrolled }">
                        <div class="header-inner" style="padding: 0 20px">
                            <span class="kit-demo-lockup">
                                <span class="header-lockup">
                                    <span class="kit-demo-pre">Any Tech</span>
                                </span>
                                <span class="kit-demo-name">ARCHITECT</span>
                            </span>
                            <span class="row" style="margin-left: auto">
                                <span class="note-label">AmneziaWG</span>
                                <span class="note-label">XRay</span>
                                <span class="note-label">FAQ</span>
                            </span>
                            <span class="header-progress"></span>
                        </div>
                    </div>
                </div>

                <div class="footer kit-footerdemo">
                    <div class="footer-inner" style="padding: 0 24px">
                        <div class="footer-stamp">
                            <div class="footer-stamp-cell">
                                <span class="footer-stamp-key">Проект</span>
                                <span class="footer-stamp-val">
                                    Any Tech ARCHITECT
                                </span>
                            </div>
                            <div class="footer-stamp-cell">
                                <span class="footer-stamp-key">Сборка</span>
                                <span class="footer-stamp-val">03.08.2026</span>
                            </div>
                            <div class="footer-stamp-cell">
                                <span class="footer-stamp-key">Данные</span>
                                <span class="footer-stamp-val">
                                    не покидают браузер
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </main>
    </div>
</template>

<style>
.kit {
    min-height: 100vh;
    background: var(--ground);
    color: var(--ink);
    font-family: var(--fw);
}

.kit-bar {
    position: sticky;
    top: 0;
    z-index: var(--z-header);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--sp-4);
    padding: var(--sp-3) var(--sp-gutter);
    background: var(--ground-2);
    border-bottom: var(--rule) solid var(--line-soft);
}

.kit-bar-brand {
    display: flex;
    align-items: baseline;
    gap: var(--sp-3);
}

.kit-bar-name {
    font-family: var(--fu);
    font-size: var(--t-sm);
    letter-spacing: var(--track-tight);
    color: var(--ink-3);
}

.kit-bar-name b {
    color: var(--accent-ink);
    font-weight: 800;
}

/*
 * The accent buttons carry `data-accent` themselves, so each swatch shows the
 * colour it switches to rather than the colour currently selected.
 */
.kit-swatch {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.kit-swatch-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: rgb(var(--accent-rgb));
}

.kit-main {
    max-width: 1120px;
    margin: 0 auto;
    padding: var(--sp-8) var(--sp-gutter) var(--sp-10);
    display: flex;
    flex-direction: column;
    gap: calc(var(--sp-10) + var(--sp-5));
}

.kit-section {
    display: flex;
    flex-direction: column;
    gap: var(--sp-6);
    scroll-margin-top: 80px;
}

.kit-section > .h3 {
    margin-top: var(--sp-3);
    color: var(--ink-3);
}

.kit-swatches {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--sp-3);
}

.kit-chip {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
}

.kit-chip-fill {
    width: 34px;
    height: 34px;
    border-radius: var(--r-2);
    border: var(--rule) solid var(--line);
    flex-shrink: 0;
}

.kit-spaces {
    display: flex;
    align-items: flex-end;
    gap: var(--sp-2);
}

.kit-space {
    height: 34px;
    background: var(--surface-active);
    border: var(--rule) solid var(--line-soft);
    border-radius: var(--r-1);
}

/* ── The shell demo ───────────────────────────────────────────────────── */

/*
 * The header and footer are fixed and full-bleed in the app. Here they are
 * pinned inside a box so both states can be looked at side by side without
 * scrolling the page to reach them.
 */
.kit-shelldemo {
    position: relative;
    height: 150px;
    overflow: hidden;
    padding: 0;
}

.kit-shelldemo .header {
    position: absolute;
}

.kit-footerdemo {
    margin-top: 0;
    border-radius: var(--r-3);
    overflow: hidden;
}

.kit-demo-lockup {
    display: flex;
    flex-direction: column;
    gap: 3px;
    line-height: 1;
}

.kit-demo-pre {
    font-family: var(--fm);
    font-size: var(--t-2xs);
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--ink-3);
}

.kit-demo-name {
    font-family: var(--fu);
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: var(--track-tight);
    color: var(--ink);
}

.kit-dimrow {
    display: grid;
    grid-template-columns: 34px 1fr;
    align-items: center;
    gap: var(--sp-3);
}
</style>
