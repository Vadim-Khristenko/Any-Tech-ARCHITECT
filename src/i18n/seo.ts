/**
 * Per-locale page metadata.
 *
 * Kept apart from the UI catalog because these strings are consumed by the
 * router and by the build-time stub generator rather than by components, and
 * because search engines read them — they are prose, not labels.
 *
 * NAMING, OLD AND NEW
 *
 * The project was renamed: it started as "AmneziaWG Architect", grew a second
 * engine, and became "Any Tech ARCHITECT". People search for both names, and
 * for neither plus the word "generator" — so every page carries both spellings
 * somewhere in its title or keywords, and the home page names the rename
 * explicitly. A crawler meeting only the new name must still connect the page
 * to everything written about the old one.
 */

import type { Locale , Localised } from "./types";

export interface RouteSeo {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  /** Filename inside /assets, resolved against the deploy base at runtime. */
  ogImage: string;
  /** Keywords are a weak ranking signal but still parsed by some engines. */
  keywords?: string;
}

/** Route name → locale → metadata. */
export type SeoTable = Record<string, Localised<RouteSeo>>;

export const ROUTE_SEO: SeoTable = {
  /*
   * The root is the landing, so its metadata names the whole tool — both
   * engines, both names the project has had, and the word people actually
   * type: "генератор" / "generator".
   */
  home: {
    ru: {
      title: "Any Tech ARCHITECT — генератор конфигов AmneziaWG и XRay REALITY",
      description:
        "Any Tech ARCHITECT (ранее AmneziaWG Architect) — генератор параметров обфускации для AmneziaWG 1.0–3.1 и XRay/REALITY. Junk-поезда, диапазоны заголовков H1–H4, CPS-подписи I1–I5 и двенадцать профилей мимикрии по RFC. Всё считается в браузере — ключи и параметры не покидают устройство.",
      ogTitle: "Any Tech ARCHITECT — генератор конфигов AmneziaWG и XRay",
      ogDescription:
        "Собирает параметры обфускации и объясняет каждое число. AmneziaWG 1.0–3.1 и XRay/REALITY. Ничего не уходит из браузера.",
      ogImage: "og-image.png",
      keywords:
        "Any Tech Architect, AmneziaWG Architect, AmneziaWG generator, генератор AmneziaWG, генератор конфигов AmneziaWG, AWG генератор, XRay Architect, XRay REALITY generator, генератор XRay, обфускация WireGuard, обход блокировок, DPI, VPN, VLESS, REALITY",
    },
    en: {
      title: "Any Tech ARCHITECT — AmneziaWG & XRay REALITY config generator",
      description:
        "Any Tech ARCHITECT (formerly AmneziaWG Architect) — an obfuscation parameter generator for AmneziaWG 1.0–3.1 and XRay/REALITY. Junk trains, header ranges H1–H4, CPS signature chains I1–I5 and twelve mimicry profiles built from the RFCs. Everything is computed in your browser — keys and parameters never leave the device.",
      ogTitle: "Any Tech ARCHITECT — AmneziaWG & XRay generator",
      ogDescription:
        "Builds obfuscation parameters and explains every number in them. AmneziaWG 1.0–3.1 and XRay/REALITY. Nothing leaves the browser.",
      ogImage: "og-image-en.png",
      keywords:
        "Any Tech Architect, AmneziaWG Architect, AmneziaWG generator, AWG generator, XRay Architect, XRay REALITY generator, WireGuard obfuscation, censorship circumvention, DPI bypass, config generator, VPN, VLESS, REALITY",
    },
  },
  amneziawg: {
    ru: {
      title: "AmneziaWG Architect — генератор конфигураций AmneziaWG 3.1",
      description:
        "Генератор конфигураций AmneziaWG с поддержкой версий до 3.1: HeaderProtectionKey, ContentPaddingAddition, рандомизация таймеров и флаги RandomTrailers / DisableCookies. Тонкая настройка Jc, Jmin, Jmax, S1–S4, H1–H4 и CPS-цепочек I1–I5. Всё считается в браузере — ключи и параметры не покидают устройство.",
      ogTitle: "AmneziaWG Architect — генератор конфигураций",
      ogDescription:
        "Обфускация AmneziaWG 1.0–3.1: junk-пакеты, магические заголовки, профили мимикрии QUIC/TLS/DTLS/SIP и защита заголовков ChaCha20.",
      ogImage: "og-amneziawg.png",
      keywords:
        "AmneziaWG, AmneziaWG Architect, AmneziaWG generator, генератор AmneziaWG, AmneziaWG 3.1, AmneziaWG 3.0, RandomTrailers, DisableCookies, HeaderProtectionKey, Jc, Jmin, Jmax, обход блокировок, DPI, WireGuard, обфускация, генератор конфигов, VPN",
    },
    en: {
      title: "AmneziaWG Architect — AmneziaWG 3.1 config generator",
      description:
        "AmneziaWG configuration generator with support up to 3.1: HeaderProtectionKey, ContentPaddingAddition, randomised protocol timers and the RandomTrailers / DisableCookies switches. Tune Jc, Jmin, Jmax, S1–S4, H1–H4 and the I1–I5 CPS chains. Everything is computed in your browser — keys and parameters never leave your device.",
      ogTitle: "AmneziaWG Architect — config generator",
      ogDescription:
        "AmneziaWG 1.0–3.1 obfuscation: junk packets, magic headers, QUIC/TLS/DTLS/SIP mimicry profiles and ChaCha20 header protection.",
      ogImage: "og-amneziawg-en.png",
      keywords:
        "AmneziaWG, AmneziaWG Architect, AmneziaWG generator, AWG generator, AmneziaWG 3.1, AmneziaWG 3.0, RandomTrailers, DisableCookies, HeaderProtectionKey, DPI bypass, WireGuard, obfuscation, config generator, VPN, censorship circumvention",
    },
  },
  xray: {
    ru: {
      title: "XRay Architect — генератор конфигураций XRay / REALITY / VLESS",
      description:
        "Генератор конфигураций XRay с REALITY: ключи X25519 и shortIds, ML-DSA-65, DSL шифрования VLESS, транспорты XHTTP/WS/gRPC, отпечатки браузеров и FinalMask. Проверен против выпущенных ядер Xray. Отдельная выгрузка inbound для панелей 3x-ui.",
      ogTitle: "XRay Architect — генератор конфигураций XRay / REALITY",
      ogDescription:
        "Ключи REALITY, shortIds, VLESS Encryption, XHTTP и FinalMask — против выпущенных ядер Xray, с экспортом для панелей.",
      ogImage: "og-xray.png",
      keywords:
        "XRay, XRay Architect, XRay generator, генератор XRay, REALITY, VLESS, VLESS generator, XHTTP, ML-DSA-65, fingerprint, FinalMask, 3x-ui, обход блокировок",
    },
    en: {
      title: "XRay Architect — XRay / REALITY / VLESS config generator",
      description:
        "An XRay configuration generator with REALITY: X25519 keys and shortIds, ML-DSA-65, the VLESS encryption DSL, XHTTP/WS/gRPC transports, browser fingerprints and FinalMask. Tested against released Xray cores. A separate inbound export for 3x-ui panels.",
      ogTitle: "XRay Architect — XRay / REALITY config generator",
      ogDescription:
        "REALITY keys, shortIds, VLESS Encryption, XHTTP and FinalMask — against released Xray cores, with a panel export.",
      ogImage: "og-xray-en.png",
      keywords:
        "XRay, XRay Architect, XRay generator, REALITY, VLESS, VLESS generator, XHTTP, ML-DSA-65, fingerprint, FinalMask, 3x-ui, censorship circumvention",
    },
  },

  mergekeys: {
    ru: {
      title: "MergeKeys — объединение и редактирование ключей Amnezia VPN",
      description:
        "Обновите обфускацию AWG-ключа или объедините несколько ключей Amnezia VPN в один контейнер. Читает vpn://, vless://, .conf и .json. Обработка идёт локально в браузере — ключи никуда не отправляются.",
      ogTitle: "MergeKeys — Any Tech ARCHITECT",
      ogDescription:
        "Объединяйте ключи Amnezia VPN и обновляйте обфускацию — всё локально в браузере.",
      ogImage: "og-mergekeys.png",
      keywords:
        "MergeKeys, Amnezia VPN, AmneziaWG Architect, vpn://, vless://, объединение ключей, редактор ключей, merge keys, AmneziaWG, обфускация",
    },
    en: {
      title: "MergeKeys — merge and edit Amnezia VPN keys",
      description:
        "Refresh the obfuscation on an AWG key or merge several Amnezia VPN keys into a single container. Reads vpn://, vless://, .conf and .json. Everything is processed locally in your browser — keys are never uploaded.",
      ogTitle: "MergeKeys — Any Tech ARCHITECT",
      ogDescription:
        "Merge Amnezia VPN keys and refresh obfuscation — entirely in your browser.",
      ogImage: "og-mergekeys-en.png",
      keywords:
        "MergeKeys, Amnezia VPN, AmneziaWG Architect, vpn://, vless://, merge keys, key editor, AmneziaWG, obfuscation",
    },
  },

  simulator: {
    ru: {
      title: "Packet Simulator — визуализация handshake AmneziaWG и XRay",
      description:
        "Посмотрите, как выглядит старт сессии AmneziaWG или XRay: CPS-сигнатуры, junk-train, handshake и передача данных. Наглядная симуляция того, что увидит DPI, с учётом версии протокола и клиента.",
      ogTitle: "Packet Simulator — Any Tech ARCHITECT",
      ogDescription:
        "Симуляция пакетов AmneziaWG и XRay: CPS, junk-train, handshake, data.",
      ogImage: "og-simulator.png",
      keywords:
        "Packet Simulator, симулятор пакетов, симулятор handshake, AmneziaWG, XRay, WireGuard handshake, DPI, обфускация",
    },
    en: {
      title: "Packet Simulator — visualise the AmneziaWG and XRay handshake",
      description:
        "See what an AmneziaWG or XRay session start actually looks like: CPS signatures, the junk train, the handshake and data transfer — a visual model of what DPI observes, aware of the protocol version and the client.",
      ogTitle: "Packet Simulator — Any Tech ARCHITECT",
      ogDescription:
        "Simulate AmneziaWG and XRay packets: CPS, junk train, handshake, data.",
      ogImage: "og-simulator-en.png",
      keywords:
        "packet simulator, handshake simulator, AmneziaWG, XRay, WireGuard handshake, DPI, obfuscation",
    },
  },

  about: {
    ru: {
      title: "О проекте — Any Tech ARCHITECT",
      description:
        "Что такое Any Tech ARCHITECT (ранее AmneziaWG Architect), как устроены генераторы AmneziaWG и XRay, почему всё работает офлайн и на чём основаны параметры. Разбор архитектуры, безопасности и принципов работы.",
      ogTitle: "О проекте — Any Tech ARCHITECT",
      ogDescription:
        "Твой протокол — твои правила. Разбор архитектуры, безопасности и принципов работы генераторов.",
      ogImage: "og-about.png",
      keywords:
        "Any Tech Architect, AmneziaWG Architect, о проекте, приватность, открытый код, open source",
    },
    en: {
      title: "About — Any Tech ARCHITECT",
      description:
        "What Any Tech ARCHITECT (formerly AmneziaWG Architect) is, how the AmneziaWG and XRay generators work, why everything runs offline and where the parameters come from. A walkthrough of the architecture, security model and design principles.",
      ogTitle: "About — Any Tech ARCHITECT",
      ogDescription:
        "Your protocol, your rules. A walkthrough of the generators' architecture, security and principles.",
      ogImage: "og-about-en.png",
      keywords:
        "Any Tech Architect, AmneziaWG Architect, about, privacy, open source",
    },
  },

  faq: {
    ru: {
      title: "FAQ — вопросы по AmneziaWG, XRay и обходу блокировок",
      description:
        "Ответы на вопросы про AmneziaWG и XRay: чем версии 1.0, 1.5, 2.0, 3.0 и 3.1 отличаются, что значат Jc, Jmin, Jmax, S1–S4, H1–H4 и I1–I5, как подобрать параметры под свой канал и что делать, если соединение не поднимается.",
      ogTitle: "FAQ — Any Tech ARCHITECT",
      ogDescription:
        "Параметры AmneziaWG, различия версий, подбор конфигурации и разбор типичных проблем.",
      ogImage: "og-faq.png",
      keywords:
        "AmneziaWG FAQ, AmneziaWG вопросы, XRay FAQ, Jc, Jmin, Jmax, S1, S2, S3, S4, H1, H2, H3, H4, I1, CPS, не подключается, tunnel not connecting",
    },
    en: {
      title: "FAQ — AmneziaWG, XRay and censorship circumvention questions",
      description:
        "Answers about AmneziaWG and XRay: how versions 1.0, 1.5, 2.0, 3.0 and 3.1 differ, what Jc, Jmin, Jmax, S1–S4, H1–H4 and I1–I5 actually do, how to tune them for your link, and what to check when the tunnel will not come up.",
      ogTitle: "FAQ — Any Tech ARCHITECT",
      ogDescription:
        "AmneziaWG parameters, version differences, tuning guidance and common failure modes.",
      ogImage: "og-faq-en.png",
      keywords:
        "AmneziaWG FAQ, XRay FAQ, Jc, Jmin, Jmax, S1, S2, S3, S4, H1, H2, H3, H4, I1, CPS, not connecting",
    },
  },

  vaiexia: {
    ru: {
      title: "VAIEXIA — что уже написано, а что пока пустой репозиторий",
      description:
        "Управление сервером и VPN на Rust и WASM. Разрез по слоям: криптографическая рама, транспорт, контракт и агент написаны; панель, клиент, бот и плагины — пока пустые репозитории. Со ссылками на исходники.",
      ogTitle: "VAIEXIA — отчёт о состоянии, а не анонс",
      ogDescription:
        "Десять репозиториев, пять с кодом. Что написано и что нет — с размерами и датами.",
      ogImage: "og-vaiexia.png",
      keywords:
        "VAIEXIA, управление сервером, Rust, WASM, Noise XK, обфускация, VPN панель, открытый код",
    },
    en: {
      title: "VAIEXIA — what is written, and what is still an empty repository",
      description:
        "Server and VPN management in Rust and WASM. A section through the layers: cryptographic framing, transport, contract and agent are written; panel, client, bot and plugins are still empty repositories. With links to the sources.",
      ogTitle: "VAIEXIA — a status report, not an announcement",
      ogDescription:
        "Ten repositories, five with code. What is written and what is not, with sizes and dates.",
      ogImage: "og-vaiexia-en.png",
      keywords:
        "VAIEXIA, server management, Rust, WASM, Noise XK, obfuscation, VPN panel, open source",
    },
  },

  "not-found": {
    ru: {
      title: "Страница не найдена — Any Tech ARCHITECT",
      description:
        "Кажется, вы перешли по неверной ссылке или страница была удалена.",
      ogTitle: "Страница не найдена — Any Tech ARCHITECT",
      ogDescription: "Такой страницы нет.",
      ogImage: "og-image.png",
    },
    en: {
      title: "Page not found — Any Tech ARCHITECT",
      description: "That link looks wrong, or the page has been removed.",
      ogTitle: "Page not found — Any Tech ARCHITECT",
      ogDescription: "No such page.",
      ogImage: "og-image-en.png",
    },
  },
};

/** Look up metadata, falling back to the home page rather than rendering blank. */
export function seoFor(routeName: string, loc: Locale): RouteSeo {
  const entry = ROUTE_SEO[routeName] ?? ROUTE_SEO.home;
  return entry[loc] ?? entry.ru;
}
