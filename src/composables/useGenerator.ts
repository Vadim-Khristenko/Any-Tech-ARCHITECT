/**
 * AmneziaWG Architect — useGenerator composable
 *
 * Содержит:
 *   - Реактивное состояние (version, intensity, config, currentAwg, iterCount, log)
 *   - generate() — главная точка входа (вызывает genCfg из generator.ts)
 *   - renderCfg / previewCode — вычисляемые представления конфига
 *   - copyConfig / downloadConfig — экспорт
 *   - feedback(ok) — подтверждение/отклонение конфига с автоусилением
 *   - setVersion / setIntensity — переключение режимов
 *   - addLog — журнал последних действий
 *   - hintMap / placeholderMap — help text for the custom-host field
 */

import { ref, reactive, computed, watch } from "vue";
import {
  genCfg,
  generateBatch,
  CLIENTS,
  DEFAULT_CLIENT_ID,
  type AWGConfig,
  type AWGVersion,
  type Intensity,
  type MimicProfile,
  type BrowserProfile,
  PROFILE_LABELS,
  renderConf,
  renderConfLines,
  type RenderLabels,
} from "@/engines/awg/generator";
import { translate } from "@/i18n";
import { hostsFor } from "@/shared/domains";
import type { DomainRegion, DomainRole } from "@/types/domain";
import { copyText } from "@/utils/clipboard";
import { downloadText } from "@/utils/download";
import { confToVpn, buildVpnConfig } from "@/engines/awg/awgFormat";
import type { VpnConfig } from "@/engines/awg/awgFormat";
import { renderMihomoProxy } from "@/engines/awg/mihomoFormat";
import type { AwgContainer } from "@/engines/keys";
import type { GeneratorInput } from "@/engines/awg/generator";
import { AWG_VERSIONS, capsFor } from "@/engines/awg/generator/versions";

// ─────────────────────────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────────────────────────

export type LogType = "info" | "ok" | "bad" | "warn";

export interface LogEntry {
  msg: string;
  type: LogType;
  ts: number;
}

import { useGeneratorWorker } from "./useGeneratorWorker";

// ─────────────────────────────────────────────────────────────────────────────
// Composable
// ─────────────────────────────────────────────────────────────────────────────

export function useGenerator() {
  // Worker instance for large batches
  const { isRunning: isWorkerRunning, generateInWorker } = useGeneratorWorker();

  // ── Версия и интенсивность ────────────────────────────────────────────────

  const VERSION_KEY = "awg-architect:version";
  const VERSIONS: AWGVersion[] = AWG_VERSIONS.map((v) => v.id);

  /**
   * Remember the chosen protocol version across navigations. Without this,
   * leaving for the simulator and coming back silently reset the generator to
   * 2.0 and threw away the user's selection.
   */
  function loadVersion(): AWGVersion {
    try {
      const raw = localStorage.getItem(VERSION_KEY);
      if (raw && (VERSIONS as string[]).includes(raw)) return raw as AWGVersion;
    } catch {
      // Storage blocked — fall through to the default.
    }
    return "2.0";
  }

  const version = ref<AWGVersion>(loadVersion());
  const intensity = ref<Intensity>("medium");

  watch(version, (v) => {
    try {
      localStorage.setItem(VERSION_KEY, v);
    } catch {
      // Nothing to do; the in-memory value still drives this session.
    }
  });

  // ── Настройки генератора ──────────────────────────────────────────────────

  const config = reactive({
    profile: "quic_initial" as MimicProfile,
    customHost: "",
    hostRegion: "any",
    mimicAll: false,

    // Теги CPS
    useTagC: false, // <c> — счётчик пакетов.
    // ⚠️ Не работает в старых версиях AWG-go (ErrorCode 1000).
    // Разработчики Amnezia позднее отказались от него; он может
    // перестать работать в новых релизах клиентов.
    useTagT: true,
    useTagR: true,
    useTagRC: true,
    useTagRD: true,

    // Browser Fingerprint
    useBrowserFp: false,
    browserProfile: "chrome" as BrowserProfile,

    // MTU (допустимый диапазон 576–9000; по умолчанию стандартный Ethernet)
    mtu: 1500,

    /*
     * Куда подключаться, как "host:port".
     *
     * Пусто по умолчанию, и тогда в файл ничего не добавляется: конфиг всегда
     * был одним блоком обфускации, который вставляют в уже готовый. Заполнено —
     * дописывается [Peer] с эндпоинтом и закомментированным ключом сервера.
     */
    endpoint: "",

    // Junk-train (0 = отключён, рекомендовано 3–7)
    junkLevel: 5,

    // Режим роутера (минимальные шумы для слабых устройств)
    routerMode: false,

    // Экстремальные максимумы (Jc до 128, S3 расширенный, H разброс 10M)
    useExtremeMax: false,

    // Целевой клиент для фильтрации совместимости
    clientId: DEFAULT_CLIENT_ID,

    // Конкретная сборка клиента. null — текущая: у клиента лимиты не одни
    // и те же навсегда, и генерировать надо под ту сборку, куда конфиг поедет.
    clientRelease: null as string | null,

    // ── AWG 3.0 ─────────────────────────────────────────────────────────────
    // Защита заголовков ChaCha20. Поднимает S1–S4 до 12 байт: из паддинга
    // берётся nonce шифра.
    useHeaderProtection: true,
    // Случайный паддинг транспортных пакетов (вместо выравнивания по 16).
    useContentPadding: true,
    // Рандомизация таймеров протокола вместо фиксированных констант.
    useRandomTimings: true,

    // ── AWG 3.1 ─────────────────────────────────────────────────────────────
    // Случайный хвост каждому исходящему пакету. Выключено по умолчанию:
    // фича свежая, а трафик растёт на каждый байт хвоста.
    useRandomTrailers: false,
    // Полный отказ от cookie-ответов. Выключено по умолчанию: без cookie
    // ломается keepalive за NAT при нагрузке.
    useDisableCookies: false,
  });

  // ── Состояние UI ──────────────────────────────────────────────────────────

  /** Результат последней генерации */
  const currentAwg = ref<AWGConfig | null>(null);

  /** Счётчик неудачных попыток (используется для автоусиления параметров) */
  const iterCount = ref(0);

  /** Журнал последних 4 действий */
  const log = ref<LogEntry[]>([]);

  /** Флаг анимации кнопки генерации */
  const isGenerating = ref(false);

  /** Batch generation state */
  const batchCount = ref(10);
  const batchResults = ref<AWGConfig[]>([]);

  // ── Генерация ─────────────────────────────────────────────────────────────

  function buildInput(): GeneratorInput {
    return {
      version: version.value,
      intensity: intensity.value,
      profile: config.profile,
      customHost: config.customHost,
      hostRegion: "any",
      mimicAll: config.mimicAll,
      useTagC: config.useTagC,
      useTagT: config.useTagT,
      useTagR: config.useTagR,
      useTagRC: config.useTagRC,
      useTagRD: config.useTagRD,
      useBrowserFp: config.useBrowserFp,
      browserProfile: config.browserProfile,
      mtu: config.mtu,
      junkLevel: config.junkLevel,
      iterCount: iterCount.value,
      routerMode: config.routerMode,
      useExtremeMax: config.useExtremeMax,
      clientId: config.clientId,
      clientRelease: config.clientRelease,
      useHeaderProtection: config.useHeaderProtection,
      useContentPadding: config.useContentPadding,
      useRandomTimings: config.useRandomTimings,
      useRandomTrailers: config.useRandomTrailers,
      useDisableCookies: config.useDisableCookies,
    };
  }

  /**
   * generate() — главная точка входа.
   */
  function generate() {
    isGenerating.value = true;

    setTimeout(() => {
      isGenerating.value = false;
    }, 650);

    // `genCfg` refuses a config it cannot make valid, and it refuses by
    // throwing. Unhandled, that left the previous config on screen with no
    // message: the user pressed Generate and nothing whatsoever happened.
    // Rare, but a button that silently does nothing is worse than one that
    // says why.
    try {
      currentAwg.value = genCfg(buildInput());
    } catch (error) {
      addLog(
        translate("log.generateFailed", {
          error: error instanceof Error ? error.message : String(error),
        }),
        "bad",
      );
      return;
    }

    const label = PROFILE_LABELS[config.profile] ?? config.profile;
    addLog(translate("log.generated", { profile: label }), "info");
    if (config.routerMode) {
      addLog(translate("log.routerMode"), "warn");
    }
  }

  /**
   * runBatch — generate `batchCount` independent configs.
   * Uses a Web Worker when count > 50 to keep the UI responsive.
   */
  async function runBatch() {
    const count = batchCount.value;
    if (count < 1 || count > 1000) {
      addLog(translate("log.batchRange"), "bad");
      return;
    }

    try {
      batchResults.value =
        count > 50
          ? await generateInWorker(buildInput(), count)
          : generateBatch(buildInput(), count);
      addLog(translate("log.batchDone", { n: count }), "ok");
    } catch (e) {
      addLog(
        translate("log.batchError", {
          error: e instanceof Error ? e.message : String(e),
        }),
        "bad",
      );
    }
  }

  /**
   * downloadBatch — download all batch configs as a single .txt file.
   */
  function downloadBatch() {
    if (!batchResults.value.length) {
      addLog(translate("log.batchFirst"), "bad");
      return;
    }

    const blocks = batchResults.value.map((p, idx) =>
      renderConf(p, {
        caption: `config ${idx + 1}/${batchResults.value.length}`,
        labels: confLabels.value,
      }),
    );

    downloadBlob(
      blocks.join("\n\n" + "=".repeat(40) + "\n\n"),
      `amneziawg-batch-${batchResults.value.length}-${Date.now()}.txt`,
      "text/plain",
    );
  }

  // ── Переключение версии / интенсивности ───────────────────────────────────

  function setVersion(v: AWGVersion) {
    version.value = v;
    generate();
  }

  /**
   * restoreConfig — put a previously generated config back on screen.
   *
   * Restores the version alongside it, because every downstream view (preview,
   * export, parameter groups) keys off `version`. Without that a restored 3.0
   * config would render through the 2.0 code path and quietly drop its
   * HeaderProtectionKey and timers.
   */
  function restoreConfig(cfg: AWGConfig) {
    version.value = cfg.version;
    config.profile = cfg.profile;
    currentAwg.value = cfg;
  }

  function setIntensity(level: Intensity) {
    intensity.value = level;
    generate();
  }

  // ── Фидбэк ────────────────────────────────────────────────────────────────

  /**
   * feedback(ok) — подтверждение или отклонение конфига.
   *
   * ok=true:  сбрасывает итерации, пишет успех в лог.
   * ok=false: наращивает iterCount (усиливает параметры при следующей генерации),
   *           автоматически перегенерирует конфиг.
   */
  function feedback(ok: boolean) {
    if (ok) {
      addLog(translate("log.confirmed"), "ok");
      iterCount.value = 0;
    } else {
      iterCount.value++;
      generate();
      addLog(
        iterCount.value > 3
          ? translate("log.retryHigh", { n: iterCount.value })
          : translate("log.retry", { n: iterCount.value }),
        "bad",
      );
    }
  }

  // ── Экспорт ───────────────────────────────────────────────────────────────

  /**
   * plainText — финальный текст конфигурационного файла .conf
   * Вычисляется по currentAwg и version.
   */
  /** Localised `.conf` comment text for the renderer, which has no i18n itself. */
  const confLabels = computed(
    (): Partial<RenderLabels> => ({
      privateKey: translate("conf.privateKey"),
      address: translate("conf.address"),
      cpsClientOnly: translate("conf.cpsClientOnly"),
      noCps: translate("conf.noCps"),
      noCpsClient: translate("conf.noCpsClient"),
      awg3Hpk: translate("conf.awg3Hpk"),
      awg3Cpa: translate("conf.awg3Cpa"),
      awg3Timers: translate("conf.awg3Timers"),
      blockHeaders: translate("conf.blockHeaders"),
      blockSizes: translate("conf.blockSizes"),
      blockJunk: translate("conf.blockJunk"),
      blockCps: translate("conf.blockCps"),
      peerKey: translate("conf.peerKey"),
      endpoint: translate("conf.endpoint"),
      mustMatch: translate("conf.mustMatch"),
    }),
  );

  const plainText = computed((): string => {
    const p = currentAwg.value;
    if (!p) return "";
    return renderConf(p, { labels: confLabels.value, endpoint: config.endpoint });
  });

  /**
   * previewLines — структурированные строки для отрисовки синтаксически-окрашенного превью.
   * Каждый элемент: { key: string, value: string, type: 'header'|'kv'|'comment' }
   */
  const previewLines = computed(() => {
    const p = currentAwg.value;
    if (!p) return [];
    return renderConfLines(p, { preview: true, labels: confLabels.value, endpoint: config.endpoint });
  });

  /**
   * jsonPayload — формальный Amnezia VpnConfig JSON (как в vpn://).
   */
  const jsonPayload = computed((): VpnConfig | null => {
    const text = plainText.value;
    if (!text) return null;
    try {
      return buildVpnConfig(text);
    } catch {
      return null;
    }
  });

  const jsonText = computed(() =>
    jsonPayload.value ? JSON.stringify(jsonPayload.value, null, 4) : "",
  );

  /**
   * copyConfig — копирует plainText в буфер обмена.
   * Возвращает Promise<boolean>: true = успех, false = ошибка.
   */
  async function copyConfig(): Promise<boolean> {
    return copyToClipboard(plainText.value, translate("log.copiedConf"));
  }

  /**
   * downloadConfig — скачивает конфиг как .conf файл.
   */
  function downloadConfig() {
    downloadBlob(
      plainText.value,
      `amneziawg-${version.value}-${Date.now()}.conf`,
      "text/plain",
    );
  }

  /**
   * copyJson — копирует JSON-представление конфигурации.
   */
  async function copyJson(): Promise<boolean> {
    return copyToClipboard(jsonText.value, translate("log.copiedJson"));
  }

  /**
   * downloadJson — скачивает JSON-представление конфигурации.
   */
  function downloadJson() {
    downloadBlob(
      jsonText.value,
      `amneziawg-${version.value}-${Date.now()}.json`,
      "application/json",
    );
  }

  /**
   * mihomoText — тот же параметр-сет, но в YAML-диалекте mihomo (Clash.Meta).
   * Пустая строка, пока нечего экспортировать, как и у jsonText.
   */
  const mihomoText = computed(() =>
    currentAwg.value ? renderMihomoProxy(currentAwg.value) : "",
  );

  /**
   * copyMihomo — копирует mihomo-прокси в буфер обмена.
   */
  async function copyMihomo(): Promise<boolean> {
    return copyToClipboard(mihomoText.value, translate("log.copiedYaml"));
  }

  /**
   * downloadMihomo — скачивает mihomo-прокси как .yaml файл.
   */
  function downloadMihomo() {
    downloadBlob(
      mihomoText.value,
      `amneziawg-${version.value}-${Date.now()}.yaml`,
      "application/yaml",
    );
  }

  async function copyToClipboard(text: string, okMsg: string): Promise<boolean> {
    if (!text) {
      addLog(translate("log.generateFirst"), "bad");
      return false;
    }
    // The selection fallback lives in the shared helper, which reports
    // whether it worked rather than swallowing a refusal.
    const ok = await copyText(text);
    addLog(ok ? okMsg : translate("log.copyFailed"), ok ? "ok" : "bad");
    return ok;
  }

  function downloadBlob(text: string, filename: string, mime: string) {
    if (!text) {
      addLog(translate("log.generateFirst"), "bad");
      return;
    }
    const saved = downloadText(text, filename, mime);
    addLog(
      saved ? translate("log.saved") : translate("log.copyFailed"),
      saved ? "info" : "bad",
    );
  }

  // ── Лог ───────────────────────────────────────────────────────────────────

  /**
   * addLog(msg, type) — добавляет запись в начало журнала.
   * Журнал ограничен 4 записями (старые удаляются).
   */
  function addLog(msg: string, type: LogType = "info") {
    log.value.unshift({ msg, type, ts: Date.now() });
    if (log.value.length > 4) log.value.pop();
  }

  // ── Проверка доступности доменов ──────────────────────────────────────────

  const domainStatus = ref<"idle" | "checking" | "ok" | "blocked" | "unknown">("idle");
  const domainCheckedHost = ref("");

  async function checkSelectedDomain() {
    const { isKnownBlocked, checkDomain } = await import("../utils/domainCheck");
    const host = config.customHost.trim();
    if (!host) {
      addLog(translate("log.hostRequired"), "warn");
      return;
    }
    domainStatus.value = "checking";
    domainCheckedHost.value = host;

    if (isKnownBlocked(host)) {
      domainStatus.value = "blocked";
      addLog(translate("log.hostBlockedList", { host }), "bad");
      return;
    }

    const result = await checkDomain(host);
    domainStatus.value = result.accessible ? "ok" : "blocked";
    addLog(
      result.accessible
        ? translate("log.hostOk", { host })
        : translate("log.hostUnreachable", {
            host,
            error: result.error ?? "blocked",
          }),
      result.accessible ? "ok" : "bad",
    );
  }

  /* ── The custom-host field ─────────────────────────────────────────────── */

  /**
   * Which role each profile's host has to fill.
   *
   * The same table the generator draws by, so the hint and the draw cannot
   * disagree — the previous version listed `vk.com` under DTLS and
   * `stun.yandex.net` as a STUN example, neither of which was true of what
   * the generator actually picked.
   */
  /** How many ranked examples to keep per role. Nothing asks for more. */
  const EXAMPLES_KEPT = 3;

  const PROFILE_ROLE: Record<MimicProfile, DomainRole | "none"> = {
    quic_initial: "quic",
    quic_0rtt: "quic",
    http3: "quic",
    quic_burst: "quic",
    tls_client_hello: "tls",
    tls_to_quic: "tls",
    dtls: "dtls",
    sip: "sip",
    dns_query: "dns",
    wireguard_noise: "none",
    random: "none",
  };

  /**
   * Examples taken from the database rather than written down.
   *
   * A hint naming hosts that were true in Q1 2026 ages exactly as badly as the
   * pools did, and for the same reason. These are hosts that qualify right
   * now, for the role this profile actually asks for.
   *
   * Worked out once per role and region and kept, because the two maps below
   * used to ask for the same thing twice — three examples for the hint, one
   * for the placeholder — and each ask sorted a several-hundred-entry array.
   * Eleven profiles came to twenty-two sorts on every recompute, and the
   * second of each pair re-derived a prefix of what the first had just built.
   */
  const exampleCache = new Map<string, string[]>();

  function examplesFor(role: DomainRole, count: number): string[] {
    const region = config.hostRegion;
    const key = `${role}|${region}`;

    let ranked = exampleCache.get(key);
    if (!ranked) {
      const regions =
        region === "any" ? undefined : [region as DomainRegion];
      const found = hostsFor({ regions, role });
      const pool = found.length ? found : hostsFor({ role, allowUnknown: true });

      // An example is meant to be recognised, so the shortest names win and
      // each has to come from a different site. Taking the head of the list
      // instead gave "00.img.avito.st, 01.img.avito.st, 05.img.avito.st" —
      // three shards of one CDN, alphabetically first and useless as examples.
      const seen = new Set<string>();
      ranked = [];
      for (const host of [...pool].sort((a, b) => a.length - b.length)) {
        const site = host.split(".").slice(-2).join(".");
        if (seen.has(site)) continue;
        seen.add(site);
        ranked.push(host);
        // Nothing asks for more than a handful, and ranking the whole pool to
        // show three of it is work nobody sees.
        if (ranked.length === EXAMPLES_KEPT) break;
      }
      exampleCache.set(key, ranked);
    }

    return ranked.slice(0, count);
  }

  /**
   * Both maps, built in one pass.
   *
   * They were two copies of the same loop over the same table, differing in
   * the catalogue key and in how many examples they wanted.
   */
  const hostHelp = computed(() => {
    const hints = {} as Record<MimicProfile, string>;
    const placeholders = {} as Record<MimicProfile, string>;

    for (const profile of Object.keys(PROFILE_ROLE) as MimicProfile[]) {
      const role = PROFILE_ROLE[profile];

      if (role === "none") {
        // Noise names no host at all and the field is hidden for it — see
        // showCustomHost. Nothing reads those, so nothing is written.
        const isRandom = profile === "random";
        hints[profile] = isRandom ? translate("gen.host.hint.random") : "";
        placeholders[profile] = isRandom
          ? translate("gen.host.placeholder.random")
          : "";
        continue;
      }

      const examples = examplesFor(role, 3);
      hints[profile] = translate(
        `gen.host.hint.${role}` as "gen.host.hint.tls",
        { examples: examples.join(", ") || "—" },
      );
      placeholders[profile] = translate(
        `gen.host.placeholder.${role}` as "gen.host.placeholder.tls",
        { example: examples[0] ?? "example.com" },
      );
    }

    return { hints, placeholders };
  });

  /** Help text under the custom-host field. */
  const hintMap = computed(() => hostHelp.value.hints);

  /** Placeholder inside the custom-host field. */
  const placeholderMap = computed(() => hostHelp.value.placeholders);

  // ── Вычисляемые свойства UI ───────────────────────────────────────────────

  /** true если для текущего профиля поле хоста актуально */
  const showCustomHost = computed(() => config.profile !== "wireguard_noise");

  /** true если включён режим роутера */
  const isRouterMode = computed(() => config.routerMode);

  /** Возможности выбранной версии — единственный источник истины о форме. */
  const caps = computed(() => capsFor(version.value));

  /** true если доступна цепочка CPS I1–I5 */
  const isCPSSupported = computed(() => caps.value.cps);

  /** true для версий с S3/S4 и H1–H4 диапазонами */
  const isFullObfuscation = computed(() => caps.value.extraSizes);

  /** true для версий с защитой заголовков, паддингом и таймингами */

  /** Метка режима интенсивности (для отображения в UI) */

  /** Dots прогресса итераций (5 точек) */
  const iterDots = computed(() =>
    Array.from({ length: 5 }, (_, i) => ({
      filled: i < iterCount.value,
      critical: iterCount.value > 3,
    })),
  );

  return {
    // Состояние
    version,
    intensity,
    config,
    currentAwg,
    iterCount,
    log,
    isGenerating,

    // Действия
    generate,
    runBatch,
    downloadBatch,
    setVersion,
    setIntensity,
    feedback,
    copyConfig,
    downloadConfig,
    copyJson,
    downloadJson,
    copyMihomo,
    downloadMihomo,
    addLog,

    // Вычисляемые
    plainText,
    previewLines,
    jsonPayload,
    jsonText,
    mihomoText,
    showCustomHost,
    isCPSSupported,
    isFullObfuscation,
    restoreConfig,
    isRouterMode,
    iterDots,
    hintMap,
    placeholderMap,

    // Batch
    batchCount,
    batchResults,

    // Worker
    isWorkerRunning,

    // Проверка доменов
    domainStatus,
    domainCheckedHost,
    checkSelectedDomain,
  };
}
