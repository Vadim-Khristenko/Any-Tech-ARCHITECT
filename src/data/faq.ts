/**
 * FAQ content, bilingual.
 *
 * Answers about protocol behaviour are written from the AmneziaWG source
 * (amneziawg-go v3.0.1, amneziawg-tools) rather than from the published docs,
 * which currently describe 2.0. Where a claim is version-specific it says so,
 * because getting this wrong costs someone a working tunnel.
 *
 * `answer` is plain text on purpose: it renders into the page *and* into the
 * FAQPage JSON-LD, and structured data must not carry markup.
 */

import type { Locale, Localised } from "@/i18n";

export type FaqCategoryId =
  | "basics"
  | "keys"
  | "xray"
  | "params"
  | "awg2"
  | "awg3"
  | "clients"
  | "tuning"
  | "warnings"
  | "troubleshooting"
  | "privacy";

export interface FaqCategory {
  id: FaqCategoryId;
  label: Localised<string>;
}

export interface FaqEntry {
  id: string;
  category: FaqCategoryId;
  question: Localised<string>;
  answer: Localised<string>;
  /** Extra search terms that do not appear verbatim in the text. */
  keywords?: string[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  { id: "basics", label: { ru: "Основы", en: "Basics" } },
  { id: "keys", label: { ru: "Ключи и форматы", en: "Keys and formats" } },
  { id: "xray", label: { ru: "XRay и REALITY", en: "XRay and REALITY" } },
  /*
   * "Параметры" on its own stopped being enough the moment a second engine
   * arrived: these are AmneziaWG's, and XRay's live under their own heading.
   */
  { id: "params", label: { ru: "Параметры AWG", en: "AWG parameters" } },
  { id: "awg2", label: { ru: "AmneziaWG 2.0", en: "AmneziaWG 2.0" } },
  { id: "awg3", label: { ru: "AmneziaWG 3.0", en: "AmneziaWG 3.0" } },
  { id: "clients", label: { ru: "Клиенты", en: "Clients" } },
  { id: "tuning", label: { ru: "Настройка", en: "Tuning" } },
  { id: "warnings", label: { ru: "Предупреждения", en: "Warnings" } },
  {
    id: "troubleshooting",
    label: { ru: "Проблемы", en: "Troubleshooting" },
  },
  { id: "privacy", label: { ru: "Приватность", en: "Privacy" } },
];

export const FAQ_ENTRIES: FaqEntry[] = [
  /* ── Basics ───────────────────────────────────────────────────────────── */
  {
    id: "what-is-amneziawg",
    category: "basics",
    question: {
      ru: "Что такое AmneziaWG и чем он отличается от обычного WireGuard?",
      en: "What is AmneziaWG and how does it differ from plain WireGuard?",
    },
    answer: {
      ru: "AmneziaWG — форк WireGuard, который решает одну конкретную проблему: **обычный WireGuard слишком легко опознать**.\n\nЕго пакеты имеют фиксированный первый байт типа сообщения и предсказуемые размеры (148 байт на handshake initiation, 92 на response), поэтому DPI определяет протокол по первому же пакету и блокирует его целиком. AmneziaWG добавляет слой обфускации поверх той же криптографии: случайные заголовки вместо фиксированных, паддинг переменной длины, мусорные пакеты перед сессией и имитацию чужих протоколов. Криптография Noise при этом не трогается — меняется только то, как соединение выглядит снаружи.",
      en: "AmneziaWG is a WireGuard fork that solves one specific problem: **plain WireGuard is trivial to identify**.\n\nIts packets carry a fixed message-type byte and predictable sizes (148 bytes for a handshake initiation, 92 for a response), so DPI can classify the protocol from the very first packet and block it wholesale. AmneziaWG adds an obfuscation layer over the same cryptography: randomised headers instead of fixed ones, variable-length padding, junk packets before the session and mimicry of other protocols. The Noise cryptography is untouched — only what the connection looks like from outside changes.",
    },
    keywords: ["wireguard", "форк", "fork", "dpi", "noise"],
  },
  {
    id: "version-differences",
    category: "basics",
    question: {
      ru: "Чем отличаются версии 1.0, 1.5, 2.0 и 3.0?",
      en: "How do versions 1.0, 1.5, 2.0 and 3.0 differ?",
    },
    answer: {
      ru: "## AWG 1.0\n\n1.0 — базовая обфускация: junk-пакеты (`Jc`, `Jmin`, `Jmax`), паддинг `S1` и `S2`, фиксированные магические заголовки `H1–H4`.\n\n## AWG 1.5\n\n1.5 добавляет CPS-цепочки `I1–I5`, *но работают они только на стороне клиента*.\n\n## AWG 2.0\n\n2.0 расширяет набор: появляются `S3` и `S4` (паддинг cookie- и транспортных пакетов), а `H1–H4` задаются диапазонами, а не одним числом — **заголовок каждого пакета выбирается из диапазона случайно**.\n\n## AWG 3.0\n\n3.0 добавляет три вещи поверх 2.0: `HeaderProtectionKey` (шифрование заголовков ChaCha20), `ContentPaddingAddition` (случайный паддинг транспорта) и рандомизацию таймеров протокола.",
      en: "## AWG 1.0\n\n1.0 is the baseline: junk packets (`Jc`, `Jmin`, `Jmax`), `S1` and `S2` padding, and fixed magic headers `H1–H4`.\n\n## AWG 1.5\n\n1.5 adds the `I1–I5` CPS chains, *but they apply on the client side only*.\n\n## AWG 2.0\n\n2.0 widens the set: `S3` and `S4` arrive (padding for cookie and transport packets) and `H1–H4` become ranges rather than single values, so **each packet's header is drawn at random from its range**.\n\n## AWG 3.0\n\n3.0 adds three things on top of 2.0: `HeaderProtectionKey` (ChaCha20 header encryption), `ContentPaddingAddition` (random transport padding) and randomisation of the protocol timers.",
    },
    keywords: ["версии", "versions", "1.0", "1.5", "2.0", "3.0"],
  },
  {
    id: "both-sides",
    category: "basics",
    question: {
      ru: "Нужно ли настраивать одинаковые параметры на сервере и клиенте?",
      en: "Do the server and client need matching parameters?",
    },
    answer: {
      ru: "**Частично**, и это стоит разделить точно. **Совпадать обязаны `S1–S4`, `H1–H4` и `HeaderProtectionKey`**: именно ими принимающая сторона опознаёт пакет, и расхождение означает, что он будет отброшен молча, без ошибки.\n\nНе обязаны совпадать `Jc`, `Jmin`, `Jmax`, цепочка `I1–I5` и `ContentPaddingAddition` — это отправитель делает у себя, а получателю знать о них нечего. Таймеры 3.0 у каждой стороны свои.\n\n*Подробный разбор с тем, откуда это следует в коде, — в ответе про клиентские, общие и локальные параметры.*",
      en: "**Partly**, and the split is worth getting exact. **`S1–S4`, `H1–H4` and `HeaderProtectionKey` must match**: they are what the receiving side uses to recognise a packet, and a mismatch means it is dropped silently, with no error.\n\n`Jc`, `Jmin`, `Jmax`, the `I1–I5` chain and `ContentPaddingAddition` do not have to match — the sender does those locally and the receiver has no need to know about them. The 3.0 timers are per-side.\n\n*There is a fuller breakdown, with where this comes from in the code, in the answer on client-side, shared and local parameters.*",
    },
    keywords: ["сервер", "server", "клиент", "client", "симметрия"],
  },

  /* ── Key formats ──────────────────────────────────────────────────────── */
  {
    id: "vpn-key-format",
    category: "keys",
    question: {
      ru: "Что такое ключ `vpn://` и что у него внутри?",
      en: "What is a `vpn://` key and what is inside it?",
    },
    answer: {
      ru: "Это формат приложения Amnezia VPN, и он **не является шифрованием** — это упаковка.\n\n## Как он устроен\n\nСтрока после `vpn://` — это base64url от четырёх байт длины (big-endian) и сжатого zlib JSON. Распаковывается в обе стороны кем угодно: ни пароля, ни подписи в формате нет.\n\n## Что в JSON\n\nВерхний уровень описывает не протокол, а *набор* протоколов:\n\n```\ncontainers[]        список контейнеров, по одному на протокол\ndefaultContainer    какой из них открывается по умолчанию\nhostName            адрес сервера\ndns1, dns2          DNS, которые получит клиент\ndescription         подпись, которую вы видите в приложении\n```\n\nКонтейнер — это один протокол: `amnezia-awg`, `amnezia-openvpn`, `xray` и так далее. **Поэтому один ключ `vpn://` может нести сразу несколько способов подключения**, и приложение переключается между ними без новой ссылки.\n\n## Что внутри AWG-контейнера\n\nКлиентские параметры обфускации лежат прямо полями: `Jc`, `Jmin`, `Jmax`, `I1`–`I5`. Рядом лежит сам конфиг, причём дважды: `last_config` — JSON-строкой, `config` — текстом в формате wg-quick. Это важно для правки: **изменить параметр в одном месте и забыть про два других значит получить ключ, который противоречит сам себе**.",
      en: "It is the Amnezia VPN app's own format, and it is **not encryption** — it is packaging.\n\n## How it is built\n\nThe string after `vpn://` is base64url of four big-endian length bytes followed by zlib-compressed JSON. Anyone can unpack it, and pack it back: there is no password and no signature in the format.\n\n## What is in the JSON\n\nThe top level describes not a protocol but a *set* of them:\n\n```\ncontainers[]        one container per protocol\ndefaultContainer    which of them opens by default\nhostName            the server address\ndns1, dns2          the DNS the client will use\ndescription         the caption you see in the app\n```\n\nA container is one protocol: `amnezia-awg`, `amnezia-openvpn`, `xray` and so on. **So a single `vpn://` key can carry several ways to connect at once**, and the app switches between them without a new link.\n\n## Inside an AWG container\n\nThe client-side obfuscation parameters sit there as plain fields: `Jc`, `Jmin`, `Jmax`, `I1`–`I5`. Beside them the config itself appears twice: `last_config` as a JSON string and `config` as wg-quick text. That matters when editing: **changing a parameter in one place and forgetting the other two produces a key that contradicts itself**.",
    },
    keywords: ["vpn://", "amnezia", "base64", "zlib", "контейнер", "container"],
  },
  {
    id: "vless-key-format",
    category: "keys",
    question: {
      ru: "Что такое ссылка `vless://` и что означают её параметры?",
      en: "What is a `vless://` link and what do its parameters mean?",
    },
    answer: {
      ru: "Это текстовая ссылка на один сервер, стандарт которой описан в [обсуждении XTLS/Xray-core #716](https://github.com/XTLS/Xray-core/discussions/716). В отличие от `vpn://`, читается глазами.\n\n```\nvless://UUID@адрес:порт?параметры#подпись\n```\n\nUUID — идентификатор клиента. Адрес IPv6 берётся в квадратные скобки, подпись после `#` кодируется через `encodeURIComponent`.\n\n## Параметры, которые встречаются чаще всего\n\n`type` — транспорт: `tcp`, `ws`, `grpc`, `xhttp` и другие.\n\n`security` — `none`, `tls` или `reality`.\n\n`sni` — имя, которое клиент называет в TLS. При REALITY это имя сайта-донора.\n\n`pbk` — публичная половина ключевой пары REALITY. Она **и должна быть видна**: приватная остаётся на сервере.\n\n`sid` — shortId, короткая метка, по которой сервер узнаёт своего клиента.\n\n`fp` — под какой браузер подделывается TLS-рукопожатие: `chrome`, `firefox`, `safari` и прочие.\n\n`flow` — `xtls-rprx-vision`, если включён Vision.\n\n`spx` — путь, по которому REALITY ходит к донору (spiderX).\n\n`path`, `host`, `mode` — для транспортов, у которых есть HTTP-часть.\n\n`encryption` — `none` или строка post-quantum шифрования.\n\n**Порядок параметров значения не имеет, регистр имён — имеет.**",
      en: "It is a plain-text link to one server, standardised in [XTLS/Xray-core discussion #716](https://github.com/XTLS/Xray-core/discussions/716). Unlike `vpn://`, you can read it with your eyes.\n\n```\nvless://UUID@host:port?parameters#remark\n```\n\nThe UUID identifies the client. An IPv6 host goes in square brackets, and the remark after `#` is `encodeURIComponent`-escaped.\n\n## The parameters you will meet most\n\n`type` — the transport: `tcp`, `ws`, `grpc`, `xhttp` and others.\n\n`security` — `none`, `tls` or `reality`.\n\n`sni` — the name the client presents in TLS. Under REALITY it is the donor site's name.\n\n`pbk` — the public half of the REALITY key pair. It **is meant to be visible**: the private half stays on the server.\n\n`sid` — the shortId, a small label by which the server recognises its own client.\n\n`fp` — which browser the TLS handshake imitates: `chrome`, `firefox`, `safari` and so on.\n\n`flow` — `xtls-rprx-vision` when Vision is on.\n\n`spx` — the path REALITY uses when it visits the donor (spiderX).\n\n`path`, `host`, `mode` — for transports with an HTTP part.\n\n`encryption` — `none`, or a post-quantum encryption string.\n\n**Parameter order does not matter; the case of their names does.**",
    },
    keywords: ["vless://", "uuid", "pbk", "sid", "sni", "fp", "spx", "ссылка", "link"],
  },
  {
    id: "vpn-vs-vless",
    category: "keys",
    question: {
      ru: "Чем `vpn://` отличается от `vless://` — это одно и то же?",
      en: "How does `vpn://` differ from `vless://` — are they the same thing?",
    },
    answer: {
      ru: "Нет. Это вещи разного уровня, и путать их легко, потому что оба называют «ключом».\n\n## `vless://` — один сервер, один протокол\n\nСсылка описывает ровно одно подключение по VLESS. Её понимает почти любой клиент Xray. Она текстовая, её можно прочитать и поправить руками.\n\n## `vpn://` — контейнер приложения Amnezia\n\nЭто набор подключений, упакованный в одну строку. Внутри может лежать AmneziaWG, OpenVPN и Xray одновременно, и приложение переключается между ними. Читать глазами нельзя — сначала распаковать.\n\n## Отсюда практическое следствие\n\n**`vless://` кладётся внутрь `vpn://`, а не наоборот.** Контейнер `xray` внутри ключа Amnezia несёт по сути ту же конфигурацию, что и ссылка `vless://`, только полями JSON, а не параметрами запроса.\n\nЕсли ваш клиент — приложение Amnezia, вам нужен `vpn://`. Если это v2rayN, Hiddify, sing-box, Streisand и подобные — `vless://`.",
      en: "No. They live at different levels, and mixing them up is easy because both are called \"a key\".\n\n## `vless://` — one server, one protocol\n\nThe link describes exactly one VLESS connection. Almost any Xray client understands it. It is text: you can read it and edit it by hand.\n\n## `vpn://` — the Amnezia app's container\n\nThis is a set of connections packed into one string. It can hold AmneziaWG, OpenVPN and Xray at the same time, and the app switches between them. You cannot read it directly — it has to be unpacked first.\n\n## Which gives the practical rule\n\n**`vless://` goes inside `vpn://`, not the other way round.** An `xray` container inside an Amnezia key carries essentially the same configuration a `vless://` link does, only as JSON fields rather than query parameters.\n\nIf your client is the Amnezia app, you want `vpn://`. If it is v2rayN, Hiddify, sing-box, Streisand or similar, you want `vless://`.",
    },
    keywords: ["разница", "difference", "vpn://", "vless://", "контейнер"],
  },
  {
    id: "key-secrets",
    category: "keys",
    question: {
      ru: "Что в ключе секретно и чем нельзя делиться?",
      en: "What in a key is secret, and what must not be shared?",
    },
    answer: {
      ru: "**Ключ целиком — это доступ.** Оба формата хранят учётные данные открытым текстом; base64 и zlib ничего не скрывают, они только делают строку компактной.\n\n## В `vpn://`\n\nСекретны `PrivateKey`, `PresharedKey` и `HeaderProtectionKey`. Первый — это и есть ваша личность в туннеле; второй и третий общие с сервером, и по ним опознаются пакеты.\n\n## В `vless://`\n\nСекретен UUID. Он стоит в ссылке до знака `@` и работает как пароль: кто его знает, тот подключается.\n\n`pbk` секретным не является — это публичная половина пары. Приватная половина никогда не покидает сервер и в ссылке отсутствовать обязана.\n\n## Что делать\n\nПередавайте ключи по приватному каналу, а не в чате и не в issue. **Если ключ попал в публичное место — считайте его скомпрометированным и перевыпустите**, даже если «вроде никто не заметил».\n\nКогда прикладываете конфиг к сообщению об ошибке, вырезайте секреты: для воспроизведения проблемы они не нужны. Параметры обфускации при этом можно оставлять целиком — они не дают доступа.",
      en: "**A key in full is access.** Both formats hold credentials in the clear; base64 and zlib hide nothing, they only make the string compact.\n\n## In `vpn://`\n\n`PrivateKey`, `PresharedKey` and `HeaderProtectionKey` are secret. The first is your identity in the tunnel; the other two are shared with the server and are what packets are recognised by.\n\n## In `vless://`\n\nThe UUID is secret. It sits in the link before the `@` and works as a password: whoever knows it connects.\n\n`pbk` is not secret — it is the public half of a pair. The private half never leaves the server and must not appear in a link at all.\n\n## What to do\n\nHand keys over through a private channel, not a group chat and not an issue. **If a key reaches a public place, treat it as compromised and reissue it**, even if nobody appears to have noticed.\n\nWhen attaching a config to a bug report, cut the secrets out: reproducing a problem never needs them. The obfuscation parameters can stay in full — they grant no access.",
    },
    keywords: ["секрет", "secret", "privatekey", "uuid", "утечка", "leak", "безопасность"],
  },
  {
    id: "merge-keys-why",
    category: "keys",
    question: {
      ru: "Зачем сливать несколько ключей в один и что при этом происходит?",
      en: "Why merge several keys into one, and what happens when you do?",
    },
    answer: {
      ru: "Затем, что подключений обычно больше одного: другой протокол на том же сервере, запасной сервер, отдельный ключ для телефона. Держать их четырьмя ссылками неудобно, и в приложении они выглядят четырьмя не связанными записями.\n\n## Что делает слияние\n\nБерутся списки `containers[]` из всех ключей и складываются в один. Получается ключ, внутри которого лежат все способы подключения, а приложение показывает их как варианты одной записи.\n\n## Что происходит с одинаковыми\n\nКонтейнеры совпадают по имени — например, два `amnezia-awg` из двух разных ключей. **Берётся первый, второй отбрасывается**, и об этом сообщается. Молча склеить два разных сервера в один контейнер нельзя: получилась бы конфигурация, которая не соответствует ни одному из них.\n\n## Что не меняется\n\nСлияние не трогает содержимое контейнеров. Ключи, адреса и параметры остаются ровно теми, какими были — переставляется только оболочка.\n\nВсё это делается в вашей вкладке: ключи никуда не отправляются, потому что отправлять их некуда.",
      en: "Because there is usually more than one connection: another protocol on the same server, a spare server, a separate key for a phone. Four links are awkward to keep, and in the app they show up as four unrelated entries.\n\n## What merging does\n\nThe `containers[]` lists from every key are gathered into one. The result is a key holding every way to connect, which the app presents as options on a single entry.\n\n## What happens to duplicates\n\nContainers collide by name — two `amnezia-awg` from two different keys, say. **The first is kept and the second dropped**, and you are told so. Silently fusing two different servers into one container is not on offer: the result would match neither of them.\n\n## What does not change\n\nMerging does not touch container contents. Keys, addresses and parameters stay exactly as they were — only the wrapper is rebuilt.\n\nAll of it happens in your tab: the keys go nowhere, because there is nowhere to send them.",
    },
    keywords: ["слияние", "merge", "mergekeys", "контейнеры", "containers"],
  },
  {
    id: "update-obfuscation-in-key",
    category: "keys",
    question: {
      ru: "Можно ли обновить обфускацию в уже готовом ключе, не выпуская новый?",
      en: "Can the obfuscation in an existing key be refreshed without issuing a new one?",
    },
    answer: {
      ru: "Да, и это безопаснее, чем кажется, потому что менять разрешено не всё.\n\n## Что меняется\n\nТолько клиентские параметры: `Jc`, `Jmin`, `Jmax` и цепочка `I1`–`I5`. Их сервер не читает — мусорные пакеты и CPS-цепочка уходят до handshake и на приёме попадают в ветку «неизвестный пакет», для того и сделаны. **Поэтому их можно менять на одном устройстве, не трогая сервер и остальные устройства.**\n\n## Что не меняется\n\n`H1`–`H4`, `S1`–`S4`, `HeaderProtectionKey`, ключи, адрес и порт остаются нетронутыми. Правка любого из них в ключе без такой же правки на сервере даёт туннель, который не поднимется, — приёмная сторона просто не опознает пакеты.\n\n## Почему это не одна замена в тексте\n\nВ AWG-контейнере конфигурация лежит в трёх видах: полями контейнера, JSON-строкой в `last_config` и текстом wg-quick в `config`. Правку нужно внести во все три, иначе ключ начинает противоречить сам себе, и какая версия победит — зависит от клиента.\n\n**Практическая польза:** дать двум своим устройствам разные `Jc`/`Jmin`/`Jmax` полезнее, чем одинаковые. Один и тот же мусорный поезд у сотни клиентов — готовый шаблон для DPI.",
      en: "Yes, and it is safer than it sounds, because not everything is allowed to change.\n\n## What changes\n\nThe client-side parameters only: `Jc`, `Jmin`, `Jmax` and the `I1`–`I5` chain. The server never reads them — junk packets and the CPS chain go out before the handshake and land in the \"unknown packet\" branch on arrival, which is their whole purpose. **So they can be changed on one device without touching the server or the other devices.**\n\n## What does not change\n\n`H1`–`H4`, `S1`–`S4`, `HeaderProtectionKey`, the keys, the address and the port are left alone. Editing any of those in a key without the same edit on the server gives a tunnel that will not come up — the receiving side simply fails to recognise the packets.\n\n## Why it is not one find-and-replace\n\nAn AWG container holds the configuration three times over: as container fields, as a JSON string in `last_config`, and as wg-quick text in `config`. The edit has to reach all three, or the key starts contradicting itself and which copy wins depends on the client.\n\n**Worth doing:** giving two of your own devices different `Jc`/`Jmin`/`Jmax` beats giving them the same. One junk train shared by a hundred clients is a ready-made template for DPI.",
    },
    keywords: ["обновить", "refresh", "jc", "jmin", "jmax", "i1", "cps", "патч", "patch"],
  },
  /* ── XRay and REALITY ─────────────────────────────────────────────────── */
  {
    id: "what-is-xray-reality",
    category: "xray",
    question: {
      ru: "Что такое XRay и REALITY, и чем это отличается от AmneziaWG?",
      en: "What are XRay and REALITY, and how do they differ from AmneziaWG?",
    },
    answer: {
      ru: "Оба решают одну задачу — не дать опознать соединение — и решают её противоположными способами.\n\n## AmneziaWG подделывает\n\nОн меняет форму своих пакетов: добавляет мусор, паддинг, подменяет байт типа сообщения. Снаружи это *похоже* на QUIC, TLS или DNS. Похоже — но сделано нами.\n\n## REALITY заимствует\n\nОн не изображает чужое рукопожатие, а берёт настоящее. Сервер при подключении сам ходит к выбранному сайту-донору и отдаёт клиенту его подлинный сертификат. Наблюдатель видит TLS-сессию с реальным сайтом, потому что она **и есть** сессия с реальным сайтом — до того момента, когда сервер узнаёт своего по ключу и перехватывает соединение на себя.\n\nСледствие важное: активная проверка не помогает. Если DPI сам подключится к вашему серверу и посмотрит на сертификат, он увидит сертификат донора, выданный настоящим удостоверяющим центром.\n\n## Что из этого выбрать\n\nЗависит от того, что блокируют. Против блокировки по типу трафика работают оба. Против блокировки адреса — ни один. REALITY выигрывает там, где есть активное зондирование; AmneziaWG проще развернуть и он живёт поверх UDP, что иногда решает.",
      en: "Both solve the same problem — do not let the connection be identified — and they solve it in opposite ways.\n\n## AmneziaWG imitates\n\nIt reshapes its own packets: adds junk, adds padding, substitutes the message-type byte. From outside it *looks like* QUIC, TLS or DNS. Looks like — but we made it.\n\n## REALITY borrows\n\nIt does not act out somebody else's handshake, it takes a real one. On connection the server visits the chosen donor site itself and hands the client that site's genuine certificate. An observer sees a TLS session with a real site, because it **is** a session with a real site — right up to the moment the server recognises its own client by key and takes the connection over.\n\nThe consequence matters: active probing does not help. If DPI connects to your server itself and inspects the certificate, it sees the donor's certificate, issued by a real certificate authority.\n\n## Which to choose\n\nIt depends on what is being blocked. Against blocking by traffic type, both work. Against blocking by address, neither does. REALITY wins where there is active probing; AmneziaWG is simpler to deploy and lives over UDP, which sometimes settles it.",
    },
    keywords: ["xray", "reality", "vless", "донор", "donor", "зондирование", "probing"],
  },
  {
    id: "reality-dest-vs-sni",
    category: "xray",
    question: {
      ru: "Почему `dest` и `serverNames` должны указывать на один и тот же сайт?",
      en: "Why must `dest` and `serverNames` point at the same site?",
    },
    answer: {
      ru: "Потому что иначе сертификат и имя расходятся, и это видно с одного пассивного взгляда.\n\n`dest` — куда сервер ходит за настоящим рукопожатием. `serverNames` — какие имена он готов принять в SNI от клиента. Если `dest` ведёт на один сайт, а `serverNames` называет другой, наблюдатель получает TLS-сессию, где клиент попросил `example.com`, а в ответ пришёл сертификат, выписанный на `microsoft.com`.\n\n**Настоящий сайт так себя не ведёт никогда.** Это не подозрительный признак — это ошибка, которой в природе не бывает: несовпадение имени и сертификата означает либо неверную конфигурацию, либо подмену.\n\n## Как проверить\n\nПравило простое: имена в `serverNames` должны обслуживаться тем сертификатом, который отдаёт `dest`. Обычно это тот же домен, иногда — имя из SAN того же сертификата.\n\nArchitect предупреждает, если `dest` и `serverNames` называют разные сайты. Раньше эта проверка отсутствовала вовсе, и конфигурация с таким расхождением выглядела совершенно нормальной.",
      en: "Because otherwise the certificate and the name disagree, and that is visible from a single passive look.\n\n`dest` is where the server goes for a genuine handshake. `serverNames` is which names it will accept from a client in SNI. If `dest` leads to one site while `serverNames` names another, an observer gets a TLS session in which the client asked for `example.com` and the certificate that came back was issued for `microsoft.com`.\n\n**No real site ever behaves that way.** It is not a suspicious sign, it is an error that does not occur in nature: a mismatch between name and certificate means either a misconfiguration or an interception.\n\n## How to check it\n\nThe rule is short: the names in `serverNames` must be served by the certificate `dest` returns. Usually that is the same domain, sometimes a name from the same certificate's SAN list.\n\nArchitect warns when `dest` and `serverNames` name different sites. That check did not exist at all until recently, and a configuration with this mismatch looked perfectly normal.",
    },
    keywords: ["dest", "servernames", "sni", "сертификат", "certificate", "донор"],
  },
  {
    id: "choose-donor",
    category: "xray",
    question: {
      ru: "Как выбрать домен-донор для REALITY?",
      en: "How do I choose a donor domain for REALITY?",
    },
    answer: {
      ru: "Донор должен быть таким, чтобы обращение к нему с вашего адреса выглядело обычным делом.\n\n## Что действительно требуется\n\nСайт обязан поддерживать **TLS 1.3 и HTTP/2**, отдавать сертификат от настоящего удостоверяющего центра и быть доступен с вашего сервера. Без первого REALITY не заработает вовсе.\n\n## Что стоит учесть\n\nГеография. Донор в другом полушарии выглядит странно ровно настолько, насколько странно, что вы к нему постоянно ходите. Для российского сервера логичнее донор, к которому оттуда обращаются часто.\n\nПопулярность. Слишком редкий домен даёт всплеск трафика, заметный на общем фоне; слишком очевидные вроде `www.microsoft.com` берут все подряд, и это тоже след.\n\nСтабильность. Донор, который завтра сменит CDN или отключит TLS 1.3, унесёт с собой ваш туннель.\n\n## База в Architect\n\nБольше 1100 доменов с фильтром по регионам. Для каждого записано, **что про него известно** — где хостится, какие TLS и HTTP, — а не выдуманный статус вроде «хороший донор». Такие оценки устаревают быстрее, чем их успевают править, и создают ложную уверенность.\n\nПроверить конкретный домен всё равно стоит самому, с того сервера, где он будет работать.",
      en: "The donor should be one that makes a visit from your address look ordinary.\n\n## What is actually required\n\nThe site must support **TLS 1.3 and HTTP/2**, present a certificate from a real authority, and be reachable from your server. Without the first, REALITY does not work at all.\n\n## What is worth weighing\n\nGeography. A donor on the other side of the planet looks odd in exactly the way that your visiting it constantly is odd. For a Russian server, a donor that is reached from there routinely makes more sense.\n\nPopularity. Too obscure a domain produces a traffic spike that stands out against the background; the too-obvious ones like `www.microsoft.com` are used by everybody, which is a trail of its own.\n\nStability. A donor that changes CDN tomorrow, or turns TLS 1.3 off, takes your tunnel with it.\n\n## The database in Architect\n\nOver 1100 domains with a regional filter. For each one it records **what is known about it** — where it is hosted, what its TLS and HTTP look like — rather than an invented status like \"good donor\". Such verdicts go stale faster than anyone can maintain them, and they manufacture false confidence.\n\nChecking a particular domain yourself, from the server it will run on, is still worth the minute.",
    },
    keywords: ["донор", "donor", "dest", "tls 1.3", "http/2", "домен", "domain", "регион"],
  },
  {
    id: "reality-keys-shortids",
    category: "xray",
    question: {
      ru: "Что такое ключевая пара REALITY, `shortIds` и `spiderX`?",
      en: "What are the REALITY key pair, `shortIds` and `spiderX`?",
    },
    answer: {
      ru: "Три разные вещи, которые часто путают.\n\n## Ключевая пара\n\nx25519. Приватная половина живёт на сервере и не покидает его никогда. Публичная попадает в клиентскую ссылку как `pbk`. По ней сервер отличает своего клиента от случайного посетителя — и решает, отдать ему туннель или спокойно проксировать его к настоящему донору.\n\n**Именно поэтому активное зондирование бесполезно**: у зондирующего нет приватной пары к `pbk`, и он получает ровно то, что получил бы любой прохожий — настоящий сайт.\n\n## shortIds\n\nКороткие метки в hex, до шестнадцати символов. Их несколько, и каждому клиенту можно выдать свой. Секретом они не являются — секрет в ключевой паре, — но разные `shortId` позволяют различать клиентов и отзывать доступ по одному, не трогая остальных.\n\nПустая строка в списке разрешает подключение без `sid`.\n\n## spiderX\n\nПуть, по которому сервер обращается к донору: `/` по умолчанию. Смысл в правдоподобии — обращение к главной странице выглядит иначе, чем обращение к странице раздела. Секретности он не добавляет.",
      en: "Three different things, and they get mixed up constantly.\n\n## The key pair\n\nx25519. The private half lives on the server and never leaves it. The public half goes into the client link as `pbk`. It is what lets the server tell its own client from a passer-by — and decide whether to hand over a tunnel or quietly proxy them on to the real donor.\n\n**That is exactly why active probing gets nowhere**: a prober holds no private counterpart to `pbk`, so it receives what any passer-by receives — the real site.\n\n## shortIds\n\nShort hex labels, up to sixteen characters. There can be several, and each client can be given its own. They are not secrets — the secret is the key pair — but distinct `shortId`s let you tell clients apart and revoke one without disturbing the rest.\n\nAn empty string in the list permits connecting with no `sid` at all.\n\n## spiderX\n\nThe path the server uses when it visits the donor; `/` by default. The point is plausibility — fetching a front page looks different from fetching a section page. It adds no secrecy.",
    },
    keywords: ["x25519", "pbk", "shortid", "sid", "spiderx", "ключи", "keys"],
  },
  {
    id: "vless-flow-vision",
    category: "xray",
    question: {
      ru: "Что такое `flow` и `xtls-rprx-vision`, и откуда берётся суффикс `-udp443`?",
      en: "What is `flow` and `xtls-rprx-vision`, and where does the `-udp443` suffix come from?",
    },
    answer: {
      ru: "`flow` включает Vision — режим, в котором XTLS перестаёт шифровать уже зашифрованное.\n\nБез него трафик внутри TLS шифруется дважды: один раз протоколом, один раз внешним TLS. Vision после установления сессии передаёт часть данных напрямую, снимая второй слой. Это и быстрее, и — что важнее — **избавляет от характерного рисунка длин пакетов**, по которому двойное шифрование опознаётся.\n\nВ текущих исходниках ядра допустимое значение одно: `xtls-rprx-vision`.\n\n## Про `-udp443`\n\nСуффикс `xtls-rprx-vision-udp443` разрешает пропускать UDP на порт 443 — то есть QUIC — вместо того, чтобы его блокировать. Полезно, когда браузеры на клиенте ходят по HTTP/3.\n\n**Ключевая деталь: этот суффикс существует только на стороне клиента.** Серверный inbound его не принимает и должен получить `xtls-rprx-vision` без хвоста. Architect срезает суффикс сам, когда собирает серверную часть, — иначе ядро отказалось бы поднимать конфигурацию.",
      en: "`flow` turns on Vision — the mode in which XTLS stops encrypting what is already encrypted.\n\nWithout it, traffic inside TLS is encrypted twice: once by the protocol and once by the outer TLS. After the session is established, Vision passes some data through directly, dropping the second layer. That is faster and, more importantly, **removes the distinctive packet-length pattern** by which double encryption is recognised.\n\nIn the current core sources the only accepted value is `xtls-rprx-vision`.\n\n## About `-udp443`\n\nThe `xtls-rprx-vision-udp443` suffix allows UDP to port 443 — that is, QUIC — through instead of blocking it. Useful when the browsers on the client speak HTTP/3.\n\n**The detail that catches people: the suffix exists on the client side only.** A server inbound does not accept it and must be given `xtls-rprx-vision` with nothing after it. Architect strips the suffix itself when it builds the server side — otherwise the core would refuse to start the configuration.",
    },
    keywords: ["flow", "vision", "xtls", "udp443", "quic", "http/3"],
  },
  {
    id: "xhttp-modes",
    category: "xray",
    question: {
      ru: "Что такое XHTTP и чем отличаются его режимы?",
      en: "What is XHTTP and how do its modes differ?",
    },
    answer: {
      ru: "XHTTP — транспорт, который заворачивает трафик в обычные HTTP-запросы. Для наблюдателя это переписка браузера с веб-сервером, а не туннель.\n\n## Режимы\n\n`packet-up` — каждая порция данных уходит отдельным запросом. Больше всего похоже на обычный веб-трафик и лучше всех проходит через посредников, которые не любят долгих соединений. Платится накладными расходами.\n\n`stream-up` — данные вверх идут одним длинным запросом, который сервер держит открытым. Экономнее, но долгоживущий POST сам по себе заметен.\n\n`stream-one` — запрос и ответ в одном соединении в обе стороны. Наименее накладный.\n\n`auto` — выбор оставлен ядру. Оно берёт `packet-up` обычно, `stream-one` под REALITY и `stream-up`, если для скачивания задан отдельный транспорт.\n\n## Что стоит знать\n\nЧасть параметров работает не во всех режимах. Размещение данных в cookie или заголовке допустимо только в `packet-up`; метод `GET` — тоже. Ядро на несовместимой паре откажется стартовать, поэтому Architect такие сочетания не выдаёт.",
      en: "XHTTP is a transport that wraps traffic in ordinary HTTP requests. To an observer it is a browser talking to a web server, not a tunnel.\n\n## The modes\n\n`packet-up` — each chunk of data goes as its own request. It resembles ordinary web traffic most closely and passes best through middleboxes that dislike long-lived connections. You pay in overhead.\n\n`stream-up` — upstream data goes as one long request the server holds open. Cheaper, though a long-lived POST is conspicuous in itself.\n\n`stream-one` — request and response share one connection in both directions. The least overhead of the three.\n\n`auto` — the choice is left to the core, which takes `packet-up` normally, `stream-one` under REALITY, and `stream-up` when a separate download transport is configured.\n\n## Worth knowing\n\nSome settings do not work in every mode. Placing data in a cookie or a header is legal only in `packet-up`, and so is the `GET` method. The core refuses to start on an incompatible pair, so Architect does not emit those combinations.",
    },
    keywords: ["xhttp", "packet-up", "stream-up", "stream-one", "транспорт", "transport"],
  },
  {
    id: "fingerprint-choice",
    category: "xray",
    question: {
      ru: "Зачем выбирать `fp` — под какой браузер маскироваться?",
      en: "Why choose an `fp` — which browser to imitate?",
    },
    answer: {
      ru: "Потому что TLS-рукопожатие само по себе — отпечаток. Порядок расширений, набор шифров, длины полей у каждой библиотеки свои, и по ним клиент опознаётся ещё до того, как что-то передал.\n\nБиблиотека Go, на которой написано ядро, оставляет отпечаток Go, а не браузера. Через REALITY при этом идёт то, что должно выглядеть браузером. `fp` заставляет клиента повторить рукопожатие выбранного браузера — `chrome`, `firefox`, `safari`, `edge` и другие.\n\n## Что выбирать\n\nТо, что не выделяется в вашей сети. Chrome — самый распространённый и потому самый скучный выбор, а скучный здесь значит хороший. В сетях, где заметная доля пользователей сидит на региональном браузере, разумнее взять его.\n\n## Оговорка\n\nОтпечатки в Architect собраны по измерениям, а не по названиям: для части браузеров размеры полей унаследованы от родственного движка, и там, где это так, сказано прямо. Отпечаток движется вместе с версиями браузера — совпадение никогда не бывает вечным.",
      en: "Because a TLS handshake is a fingerprint in itself. The order of extensions, the cipher list and the field lengths differ per library, and they identify a client before it has sent anything.\n\nThe Go library the core is written in leaves a Go fingerprint, not a browser's. Meanwhile what travels through REALITY is supposed to look like a browser. `fp` makes the client reproduce a chosen browser's handshake — `chrome`, `firefox`, `safari`, `edge` and others.\n\n## What to choose\n\nWhatever does not stand out on your network. Chrome is the most common and therefore the most boring choice, and boring is the right property here. On networks where a noticeable share of users run a regional browser, that one is the better pick.\n\n## One caveat\n\nThe fingerprints in Architect come from measurements rather than from names: for some browsers the field sizes are inherited from a related engine, and where that is so it is stated outright. A fingerprint moves with browser versions — the match is never permanent.",
    },
    keywords: ["fingerprint", "fp", "chrome", "firefox", "safari", "utls", "отпечаток"],
  },
  {
    id: "finalmask-what",
    category: "xray",
    question: {
      ru: "Что такое FinalMask и зачем он, если уже есть REALITY?",
      en: "What is FinalMask, and why have it when REALITY is already there?",
    },
    answer: {
      ru: "REALITY прячет соединение *внутри* чужого протокола. FinalMask работает ниже и меняет саму форму байтов на проводе — это ближайший аналог того, что делает AmneziaWG.\n\nОн лежит под транспортом, поэтому действует независимо от того, что настроено выше.\n\n## Что он умеет\n\n`noise` — шлёт мусорные пакеты перед настоящими. Ровно тот же приём, что junk-поезд AmneziaWG.\n\n`fragment` — режет первые пакеты на части, чтобы TLS ClientHello никогда не приходил целиком. Посредник, который читает SNI, не видит его полностью.\n\n`sudoku` — обфускация с паддингом на общем пароле, поверх TCP или UDP.\n\n`salamander` — UDP-обфускация из Hysteria.\n\n`mkcp-legacy` — старые маскировки заголовков mKCP: DNS, DTLS, SRTP, uTP, WeChat, WireGuard.\n\n## Чего Architect не выдаёт\n\nЯдро предлагает двенадцать типов, генерируются шесть. Остальные описывают инфраструктуру, а не настройки: `header-custom` — это язык описания пакетов, `xmc` нужен хост Minecraft, `xdns` — резолверы, `xicmp` — адреса, `realm` — URL и STUN-серверы. **Сгенерировать за вас то, чего у вас нет, значит выдать конфигурацию, которая не заработает.**",
      en: "REALITY hides a connection *inside* someone else's protocol. FinalMask works lower down and changes the shape of the bytes on the wire — the closest analogue to what AmneziaWG does.\n\nIt sits beneath the transport, so it applies whatever is configured above it.\n\n## What it offers\n\n`noise` — sends junk packets ahead of the real ones. Exactly the device AmneziaWG's junk train uses.\n\n`fragment` — splits the first packets so a TLS ClientHello never arrives whole. A middlebox reading SNI never sees all of it.\n\n`sudoku` — password-keyed obfuscation with padding, over TCP or UDP.\n\n`salamander` — Hysteria's UDP obfuscation.\n\n`mkcp-legacy` — mKCP's old header disguises: DNS, DTLS, SRTP, uTP, WeChat, WireGuard.\n\n## What Architect will not emit\n\nThe core offers twelve types; six are generated. The rest describe infrastructure rather than settings: `header-custom` is a packet-scripting language, `xmc` needs a Minecraft host, `xdns` needs resolvers, `xicmp` needs addresses, `realm` needs a URL and STUN servers. **Inventing what you do not have would mean handing you a configuration that cannot work.**",
    },
    keywords: ["finalmask", "noise", "fragment", "sudoku", "salamander", "mkcp", "обфускация"],
  },
  {
    id: "xray-version-matters",
    category: "xray",
    question: {
      ru: "Почему набор параметров зависит от версии ядра Xray?",
      en: "Why does the set of parameters depend on the Xray core version?",
    },
    answer: {
      ru: "Потому что ядро меняется быстро, а неизвестный ключ оно **молча игнорирует**. Конфигурация с параметром, которого в этой версии нет, стартует как ни в чём не бывало — просто без него.\n\nЭто худший вид ошибки: ничего не сломалось, но настройки, на которую вы рассчитывали, нет.\n\n## Как это проверяется\n\nЮнит-тесты тут бессильны — они проверяют генератор против нашего представления о версии, а представление может быть неверным. Поэтому конфигурации гоняются против настоящих ядер в Docker, **по ядру на каждую версию**. Одно ядро на всех не доказывает ничего ровно из-за молчаливого игнорирования.\n\nТак нашлись три ошибки, которые тесты пропустили: VLESS Encryption, предложенное для версии, где его нет; ML-DSA-65 как необязательный там, где он обязателен; и режим XHTTP, которого в старой версии не существует.\n\n## Что это значит для вас\n\nВыбирайте в генераторе ту версию, которая стоит на сервере, а не самую новую. Конфигурация, собранная под более новое ядро, на старом потеряет часть настроек и не скажет об этом.",
      en: "Because the core moves fast, and an unknown key is **silently ignored**. A configuration carrying a parameter this version does not have starts as though nothing were wrong — just without it.\n\nThat is the worst kind of failure: nothing broke, and the setting you were relying on is not there.\n\n## How it is checked\n\nUnit tests are no use here — they test the generator against our idea of a version, and that idea can be wrong. So configurations are run against real cores in Docker, **one core per version**. A single core for all of them proves nothing, precisely because of the silent ignoring.\n\nThat is how three mistakes were found that the tests had kept: VLESS Encryption offered for a version that has none; ML-DSA-65 treated as optional where it is required; and an XHTTP mode that does not exist in an older release.\n\n## What it means for you\n\nPick the version your server actually runs, not the newest one in the list. A configuration built for a newer core will quietly lose settings on an older one and say nothing about it.",
    },
    keywords: ["версия", "version", "docker", "ядро", "core", "совместимость"],
  },
  {
    id: "awg-or-xray",
    category: "basics",
    question: {
      ru: "У инструмента два движка — какой мне нужен?",
      en: "The tool has two engines — which one do I need?",
    },
    answer: {
      ru: "Первым делом смотрите не на протокол, а на то, **что у вас уже стоит на сервере**. Генератор собирает конфигурацию для той стороны, которая её примет; выбрать движок, которого на сервере нет, значит получить красивый файл ни для чего.\n\n## AmneziaWG\n\nЕсли сервер поднят через приложение Amnezia или через контейнеры AmneziaWG. Работает поверх UDP, ставится проще, параметров меньше — двадцать три. Клиентские параметры можно менять на каждом устройстве отдельно.\n\n## XRay\n\nЕсли на сервере Xray-core. Работает поверх TCP и выглядит как TLS-сессия с настоящим сайтом. Параметров семьдесят четыре, и часть из них зависит от версии ядра. Лучше держится там, где применяют активное зондирование.\n\n## Если можно и то и другое\n\nБерите оба и положите в один ключ `vpn://`: контейнеров в нём может быть несколько, и приложение переключится между ними без новой ссылки. Когда один способ перестаёт проходить, второй уже настроен.",
      en: "Look first not at the protocol but at **what your server already runs**. The generator builds a configuration for the side that has to accept it; picking an engine the server does not have gives you a tidy file for nothing.\n\n## AmneziaWG\n\nIf the server was set up through the Amnezia app or with AmneziaWG containers. It runs over UDP, is simpler to deploy, and has fewer parameters — twenty-three. The client-side ones can differ per device.\n\n## XRay\n\nIf the server runs Xray-core. It runs over TCP and looks like a TLS session with a real site. Seventy-four parameters, some of which depend on the core version. It holds up better where active probing is in use.\n\n## If you can have both\n\nTake both and put them in one `vpn://` key: it can hold several containers, and the app switches between them without a new link. When one route stops getting through, the other is already configured.",
    },
    keywords: ["выбор", "choice", "движок", "engine", "amneziawg", "xray", "сравнение"],
  },
  /* ── Parameters ───────────────────────────────────────────────────────── */
  {
    id: "param-classes",
    category: "params",
    question: {
      ru: "Какие параметры клиентские, какие общие, а какие локальные?",
      en: "Which parameters are client-side, which are shared, and which are local?",
    },
    answer: {
      ru: "Разделение следует из того, как принимающая сторона разбирает пакет. В `amneziawg-go` функция `DeterminePacketTypeAndPadding` ([`device/receive.go`](https://github.com/amnezia-vpn/amneziawg-go/blob/master/device/receive.go)) пробует опознать входящий пакет по двум признакам: длина должна быть равна собственному S плюс известный размер сообщения, а четыре байта на позиции S должны попадать в собственный диапазон H. **Не совпало — пакет получает тип Unknown и молча отбрасывается.** Отсюда три группы.\n\n## Общие\n\nПервая, общие: `S1–S4`, `H1–H4` и `HeaderProtectionKey`. Они обязаны быть одинаковыми, потому что получатель разбирает чужие пакеты своими значениями; ключ защиты заголовков попадает сюда же, так как шифр строится из своего ключа и nonce, взятого из S-паддинга пришедшего пакета.\n\n## Клиентские\n\nВторая, клиентские: `Jc`, `Jmin`, `Jmax`, цепочка `I1–I5` и `ContentPaddingAddition`. Мусорные пакеты и I-цепочка уходят перед handshake initiation и на приёме не разбираются вовсе — *они как раз и попадают в ветку Unknown, для того и сделаны*. `ContentPaddingAddition` добавляет паддинг внутрь шифрованной нагрузки, а получатель отрезает лишнее по длине из IP-заголовка, поэтому знать величину ему не нужно.\n\n## Локальные\n\nТретья, локальные: таймеры 3.0 — `RekeyAfterTime`, `RekeyTimeout`, `RejectAfterTime`, `KeepaliveTimeout`, `MaxHandshakeAttempts`. Каждая сторона живёт по своим; договорённости они не требуют, *но разводить их до крайностей не стоит, иначе одна сторона начнёт переустанавливать сессию, которую другая ещё считает живой*.\n\n**Практический вывод**: разным устройствам полезно давать разные `Jc`, `Jmin`, `Jmax` и `I1–I5`. Одинаковый у сотни клиентов мусорный поезд — готовый шаблон для DPI, разный такого шаблона не даёт.",
      en: "The split follows from how the receiving side parses a packet. In `amneziawg-go`, `DeterminePacketTypeAndPadding` ([`device/receive.go`](https://github.com/amnezia-vpn/amneziawg-go/blob/master/device/receive.go)) tries to identify an incoming packet by two things: its length must equal the receiver's own S plus a known message size, and the four bytes at offset S must fall inside the receiver's own H range. **No match means the packet is typed Unknown and silently dropped.** That gives three groups.\n\n## Shared\n\nFirst, the shared ones: `S1–S4`, `H1–H4` and `HeaderProtectionKey`. They must be identical, because the receiver parses the other side's packets using its own values; the header protection key belongs here too, since the cipher is built from the local key and a nonce taken from the arriving packet's S padding.\n\n## Client-side\n\nSecond, the client-side ones: `Jc`, `Jmin`, `Jmax`, the `I1–I5` chain and `ContentPaddingAddition`. Junk packets and the I chain are sent before the handshake initiation and are never parsed on receipt — *falling into the Unknown branch is precisely their purpose*. `ContentPaddingAddition` adds padding inside the encrypted payload, and the receiver truncates to the length in the IP header, so it has no need to know the amount.\n\n## Local\n\nThird, the local ones: the 3.0 timers — `RekeyAfterTime`, `RekeyTimeout`, `RejectAfterTime`, `KeepaliveTimeout`, `MaxHandshakeAttempts`. Each side runs on its own; they need no agreement, *though pushing them to opposite extremes invites one side to rebuild a session the other still considers live*.\n\n**The practical consequence**: giving different devices different `Jc`, `Jmin`, `Jmax` and `I1–I5` is worth doing. One junk train shared by a hundred clients is a ready-made template for DPI; varied ones offer no such template.",
    },
    keywords: [
      "клиентские",
      "серверные",
      "общие",
      "client-side",
      "server-side",
      "shared",
      "симметрия",
      "какие совпадать",
    ],
  },
  {
    id: "jc-jmin-jmax",
    category: "params",
    question: {
      ru: "Что делают Jc, Jmin и Jmax?",
      en: "What do Jc, Jmin and Jmax do?",
    },
    answer: {
      ru: "Перед началом сессии клиент отправляет `Jc` мусорных UDP-пакетов случайной длины между `Jmin` и `Jmax` байт.\n\n**Смысл в том, чтобы размазать временной и размерный профиль старта соединения**: вместо чистого «148 байт, затем 92» DPI видит очередь пакетов разного размера, среди которых настоящий handshake не выделяется. *Платой идёт трафик и время на старте — каждый junk-пакет реально уходит в сеть.* **`Jc` от 3 до 7 обычно достаточно**; большие значения заметно замедляют подключение, особенно на мобильной сети.",
      en: "Before a session starts, the client sends `Jc` junk UDP packets of random length between `Jmin` and `Jmax` bytes.\n\n**The point is to smear the timing and size profile of connection setup**: instead of a clean \"148 bytes, then 92\", DPI sees a queue of differently sized packets in which the real handshake does not stand out. *The cost is bandwidth and setup latency — every junk packet genuinely goes out on the wire.* **`Jc` between 3 and 7 is usually enough**; larger values noticeably slow connection setup, especially on mobile networks.",
    },
    keywords: ["junk", "мусорные пакеты", "jc", "jmin", "jmax"],
  },
  {
    id: "s-params",
    category: "params",
    question: {
      ru: "Что означают S1, S2, S3 и S4?",
      en: "What do S1, S2, S3 and S4 mean?",
    },
    answer: {
      ru: "**Это количество случайных байт, дописываемых перед пакетом, чтобы сбить его характерный размер.** `S1` — для handshake initiation, `S2` — для handshake response, `S3` — для cookie reply, `S4` — для транспортных пакетов.\n\nИтоговые размеры становятся 148 + `S1` и 92 + `S2` вместо фиксированных. **Важное следствие: если `S1` + 56 окажется равным `S2`, initiation и response снова станут одного размера и вы вернёте ровно тот отпечаток, от которого уходили.** *Генератор такие совпадения отслеживает и не выпускает.* `S4` ограничен 32 байтами протоколом.",
      en: "**They are counts of random bytes prepended to a packet to break its characteristic size.** `S1` covers the handshake initiation, `S2` the handshake response, `S3` the cookie reply and `S4` transport packets. The resulting sizes become 148 + `S1` and 92 + `S2` instead of fixed values.\n\n**One consequence matters: if `S1` + 56 happens to equal `S2`, the initiation and response end up the same size again and you have recreated exactly the fingerprint you were escaping.** *The generator watches for these collisions and refuses to emit them.* `S4` is capped at 32 bytes by the protocol.",
    },
    keywords: ["s1", "s2", "s3", "s4", "паддинг", "padding", "размер"],
  },
  {
    id: "h-params",
    category: "params",
    question: {
      ru: "Что такое H1–H4 и почему они не должны пересекаться?",
      en: "What are H1–H4 and why must they not overlap?",
    },
    answer: {
      ru: "**`H1–H4` заменяют предсказуемые идентификаторы типа сообщения WireGuard (1, 2, 3, 4) на произвольные 32-битные значения**: H1 — initiation, H2 — response, H3 — cookie reply, H4 — транспорт. В версии 2.0 и выше это диапазоны, и для каждого пакета значение берётся из диапазона случайно.\n\n**Пересекаться они не должны** по простой причине: получатель определяет тип пакета именно по этому числу. Если диапазоны H1 и H4 накладываются, пакет из зоны перекрытия невозможно однозначно классифицировать, и он будет отброшен. *Генератор разносит все четыре диапазона и проверяет это перед выдачей.*",
      en: "**`H1–H4` replace WireGuard's predictable message-type identifiers (1, 2, 3, 4) with arbitrary 32-bit values**: H1 for the initiation, H2 for the response, H3 for the cookie reply, H4 for transport. From 2.0 onward these are ranges, and each packet draws its value at random from within one.\n\n**They must not overlap** for a simple reason: the receiver identifies a packet's type by exactly this number. If the H1 and H4 ranges intersect, a packet landing in the overlap cannot be classified unambiguously and gets dropped. *The generator spaces all four ranges apart and verifies it before emitting.*",
    },
    keywords: ["h1", "h2", "h3", "h4", "магические заголовки", "magic headers"],
  },
  {
    id: "cps-tags",
    category: "params",
    question: {
      ru: "Как устроены I1–I5 и какие теги в них доступны?",
      en: "How do I1–I5 work and which tags are available?",
    },
    answer: {
      ru: "**`I1–I5` — это до пяти пакетов, которые клиент отправляет перед handshake, чтобы начало сессии выглядело как чужой протокол.**\n\nСодержимое описывается тегами: `<b hex>` — статические байты (например, шапка QUIC Initial), `<t>` — 32-битная метка времени в сетевом порядке байт, `<r N>` — N криптослучайных байт, `<rc N>` — N случайных латинских букв, `<rd N>` — N случайных цифр. **Обычно I1 несёт узнаваемую сигнатуру реального протокола, а I2–I5 добавляют энтропию**, чтобы пачка не выглядела одинаково от сессии к сессии.\n\n**Какие теги доступны, решает движок, а не приложение.** Пять перечисленных выше понимают оба: и `amneziawg-go`, и модуль ядра Linux. Сверх них у go есть `d`, `ds`, `dz`, а у модуля ядра `<c>` — счётчик пакетов, которого в go нет вовсе. Поэтому генератор гасит тег, если движок выбранного клиента его не знает: незнакомый тег отвергается вместе со всем пакетом.",
      en: "**`I1–I5` are up to five packets the client sends before the handshake so that session start resembles some other protocol.**\n\nTheir contents are described with tags: `<b hex>` for static bytes (a QUIC Initial header, say), `<t>` for a 32-bit timestamp in network byte order, `<r N>` for N cryptographically random bytes, `<rc N>` for N random Latin letters and `<rd N>` for N random digits. **Typically I1 carries a recognisable signature of a real protocol while I2–I5 add entropy**, so the burst does not look identical from session to session.\n\n**Which tags you get is decided by the engine, not by the app.** The five above are understood by both `amneziawg-go` and the Linux kernel module. Beyond them go has `d`, `ds`, `dz`, and the kernel module has `<c>`, a packet counter that go does not have at all. So the generator switches a tag off when the selected client's engine does not know it: an unfamiliar tag is rejected along with the whole packet.",
    },
    keywords: ["i1", "i2", "cps", "теги", "tags", "мимикрия", "mimicry"],
  },
  {
    id: "d-tags",
    category: "params",
    question: {
      ru: "Почему генератор не выдаёт теги <d>, <ds> и <dz>?",
      en: "Why does the generator never emit the <d>, <ds> and <dz> tags?",
    },
    answer: {
      ru: "**Потому что в текущем релизе они ничего не делают.**\n\nВ `amneziawg-go` v3.0.1 эти теги действительно разбираются парсером, но цепочки `I1–I5` вызываются в коде отправки только с пустой полезной нагрузкой, так что теги, работающие с данными пакета, не получают ничего. *Судя по ветке feature/awg4 в `amneziawg-tools`, где эти семь ключей 3.0 заменены на DI, DR, DC и DT, это задел под маскировку транспортных пакетов в AmneziaWG 4.0.* Пока фича не собрана целиком, выдавать её в конфиге — значит выдать неработающий конфиг.",
      en: "**Because in the current release they do nothing.** In `amneziawg-go` v3.0.1 the parser does accept these tags, but the send path only ever invokes the `I1–I5` chains with an empty payload, so the tags that operate on packet data receive nothing.\n\n*Judging by the feature/awg4 branch of `amneziawg-tools`, where the seven 3.0 keys are replaced by DI, DR, DC and DT, this is groundwork for transport-packet mimicry in AmneziaWG 4.0.* Until the feature is wired up end to end, emitting it would mean handing you a config that does not work.",
    },
    keywords: ["d", "ds", "dz", "awg4", "4.0"],
  },

  /* ── AWG 2.0 ──────────────────────────────────────────────────────────── */
  {
    id: "awg2-what-changed",
    category: "awg2",
    question: {
      ru: "Что именно 2.0 добавила по сравнению с 1.x?",
      en: "What exactly did 2.0 add over 1.x?",
    },
    answer: {
      ru: "Два принципиальных изменения. **Первое: появились `S3` и `S4`** — паддинг для cookie reply и транспортных пакетов. До этого обфусцировался только handshake, а весь последующий поток данных шёл с узнаваемой структурой.\n\n**Второе: `H1–H4` стали диапазонами** вместо одиночных значений. В 1.x магический заголовок был хоть и произвольным, но постоянным числом, то есть сам по себе становился стабильным отпечатком конкретного сервера. В 2.0 значение выбирается заново для каждого пакета из заданного диапазона.",
      en: "Two changes of substance. **First, `S3` and `S4` arrived** — padding for cookie replies and transport packets. Before that only the handshake was obfuscated while the entire subsequent data stream kept a recognisable shape.\n\n**Second, `H1–H4` became ranges** instead of single values. In 1.x the magic header was arbitrary but constant, which made it a stable fingerprint of that particular server. In 2.0 the value is redrawn from its range for every packet.",
    },
    keywords: ["2.0", "s3", "s4", "диапазоны", "ranges"],
  },
  {
    id: "awg2-vs-awg3-choice",
    category: "awg2",
    question: {
      ru: "Стоит ли переходить на 3.0 или 2.0 всё ещё достаточно?",
      en: "Should I move to 3.0, or is 2.0 still enough?",
    },
    answer: {
      ru: "**2.0 остаётся полностью рабочей и на сегодня наиболее совместимой версией**: её понимают все актуальные клиенты.\n\n3.0 сильнее там, где против вас работает статистический анализ, а не сигнатурный — **шифрование заголовков и рандомизация таймеров закрывают именно те каналы утечки, которые 2.0 оставляет открытыми**. Но за это приходится платить совместимостью: обе стороны должны быть собраны с поддержкой 3.0. **Разумный порядок такой: если 2.0 у вас работает и не блокируется, переходить незачем; если начались блокировки, которые 2.0 не переживает, — 3.0 даёт следующий уровень.**",
      en: "**2.0 remains fully functional and is currently the most compatible version** — every current client understands it.\n\n3.0 is stronger where statistical analysis rather than signature matching is being used against you: **header encryption and timer randomisation close exactly the leaks 2.0 leaves open**. The price is compatibility, since both ends must be built with 3.0 support. **A sensible rule: if 2.0 works and is not being blocked, there is no reason to move; if blocking starts and 2.0 cannot survive it, 3.0 is the next step.**",
    },
    keywords: ["2.0", "3.0", "переход", "upgrade", "migration"],
  },
  {
    id: "awg2-h-ranges-width",
    category: "awg2",
    question: {
      ru: "Насколько широкими делать диапазоны H1–H4 в 2.0?",
      en: "How wide should the H1–H4 ranges be in 2.0?",
    },
    answer: {
      ru: "Достаточно широкими, чтобы значения не повторялись слишком часто, но это не тот параметр, который стоит выкручивать до предела.\n\n**Важнее два других условия**: диапазоны не должны пересекаться между собой и не должны попадать в зону 1–4, зарезервированную оригинальным WireGuard, — иначе пакет можно спутать с немодифицированным протоколом. *Генератор разносит диапазоны по разным зонам 32-битного пространства и проверяет оба условия, так что вручную это подбирать не нужно.*",
      en: "Wide enough that values do not repeat too often, but this is not a parameter worth maxing out.\n\n**Two other conditions matter more**: the ranges must not overlap each other, and must not fall in the 1–4 zone reserved by upstream WireGuard, or a packet could be confused with the unmodified protocol. *The generator spreads the ranges across separate zones of the 32-bit space and checks both conditions, so there is nothing to tune by hand.*",
    },
    keywords: ["h1", "диапазон", "range", "2.0", "ширина"],
  },

  /* ── Clients ──────────────────────────────────────────────────────────── */
  {
    id: "client-vs-engine",
    category: "clients",
    question: {
      ru: "Чем клиент отличается от движка и почему это важно?",
      en: "What is the difference between a client and an engine, and why does it matter?",
    },
    answer: {
      ru: "**Клиент — это приложение, движок — то, что внутри него ведёт туннель.** Разные приложения часто несут один и тот же движок, и тогда всё, что решает движок, у них совпадает, как бы по-разному они ни выглядели.\n\nAmneziaWG для Android, для iOS, для Windows и Amnezia VPN объявляют один и тот же `amneziawg-go/v3 v3.0.1`. WG Tunnel несёт его форк, у которого `device/obf.go` побайтово тот же файл. Пакеты OpenWrt собирают другой движок — `amneziawg-linux-kernel-module`. WireSock не использует ни один из двух: у него форк BoringTun. OPNsense ставит третий, FreeBSD-шный `amnezia-kmod`, выведенный из `if_wg`.\n\n**Практическая разница вот в чём.** Потолки значений обычно принадлежат приложению: это его редактор решает, сохранять ли H выше INT32_MAX. А словарь тегов в `I1–I5` принадлежит движку, и приложение тут ни при чём. Поэтому четыре приложения Amnezia не могут расходиться в том, какие теги работают, а два приложения на разных движках расходятся обязательно.",
      en: "**A client is the app; the engine is what runs the tunnel inside it.** Different apps often carry the same engine, and then everything the engine decides is identical between them, however different they look.\n\nAmneziaWG for Android, for iOS, for Windows and Amnezia VPN all declare the same `amneziawg-go/v3 v3.0.1`. WG Tunnel carries a fork whose `device/obf.go` is byte for byte the same file. OpenWrt packages build a different engine, `amneziawg-linux-kernel-module`. WireSock uses neither: it has a BoringTun fork. OPNsense installs a third, the FreeBSD `amnezia-kmod` derived from `if_wg`.\n\n**The practical difference is this.** Value ceilings usually belong to the app: it is its editor that decides whether to save an H above INT32_MAX. The tag vocabulary in `I1–I5` belongs to the engine, and the app has no say in it. So four Amnezia apps cannot disagree about which tags work, while two apps on different engines are bound to.",
    },
    keywords: [
      "движок",
      "engine",
      "amneziawg-go",
      "kernel module",
      "модуль ядра",
      "boringtun",
    ],
  },
  {
    id: "wiresock-no-chain",
    category: "clients",
    question: {
      ru: "Почему для WireSock не генерируются I1–I5?",
      en: "Why are I1–I5 not generated for WireSock?",
    },
    answer: {
      ru: "**Потому что он их не отправляет, и молчит об этом.**\n\nВ его собственных release notes к 3.4.4.1 сказано прямо: «Standard AWG 1.5 `I1`–`I5` parameters are not supported». Вместо цепочки у него свой набор `Id`/`Ip`/`Ib` — домен, протокол и профиль браузера, — который больше нигде не понимают. А в 3.4.5.1 добавлено, что поля `I1`–`I5` теперь «silently ignored instead of being flagged as errors».\n\n**Самое неприятное здесь то, что ничего не ломается.** Туннель поднимается как ни в чём не бывало: эти пакеты в любом случае отбрасываются на стороне сервера, никто их не ждёт. Теряется ровно маскировка, и об этом не сообщает никто. Поэтому мы не пишем в конфиг пять полей, которые клиент не отправит: они создавали бы видимость защиты, которой нет. Если мимикрия нужна, выберите другой клиент.",
      en: "**Because it does not send them, and says nothing about it.**\n\nIts own release notes for 3.4.4.1 put it plainly: \"Standard AWG 1.5 `I1`–`I5` parameters are not supported\". Instead of the chain it has its own `Id`/`Ip`/`Ib` set — domain, protocol and browser profile — which nothing else understands. And 3.4.5.1 adds that `I1`–`I5` fields are now \"silently ignored instead of being flagged as errors\".\n\n**The awkward part is that nothing breaks.** The tunnel comes up as if all were well: those packets are discarded at the server end anyway, nobody is waiting for them. What is lost is exactly the mimicry, and nothing reports it. So we do not write five fields the client will not send: they would give the appearance of a protection that is not there. If you need the mimicry, pick a different client.",
    },
    keywords: ["wiresock", "i1", "boringtun", "id", "ip", "ib"],
  },
  {
    id: "which-client",
    category: "clients",
    question: {
      ru: "Какой клиент лучше использовать?",
      en: "Which client should I use?",
    },
    answer: {
      ru: "**Лучший выбор на сегодня — клиенты, которые выпускают сами разработчики Amnezia**: приложения Amnezia VPN и официальные сборки AmneziaWG для Android, iOS и Windows.\n\nГенератор в первую очередь гарантирует работу именно с ними — на них проверяются диапазоны параметров и ограничения, и именно они раньше всех получают поддержку новых версий протокола. Сторонние клиенты и прошивки поддерживаются во вторую очередь: они учтены в матрице совместимости, генератор подстраивает под них параметры, но их поведение зависит от чужого графика обновлений, а не от нашего.",
      en: "**The best choice today is whatever the Amnezia developers ship themselves**: the Amnezia VPN apps and the official AmneziaWG builds for Android, iOS and Windows.\n\nThe generator guarantees compatibility with those first — parameter ranges and limits are validated against them, and they are the first to receive support for new protocol versions. Third-party clients and firmware are supported second: they are covered by the compatibility matrix and the generator adapts parameters to them, but their behaviour depends on someone else's release schedule rather than ours.",
    },
    keywords: [
      "клиент",
      "client",
      "amnezia vpn",
      "официальный",
      "official",
      "выбор",
    ],
  },
  {
    id: "which-clients-covered",
    category: "clients",
    question: {
      ru: "Какие клиенты есть в матрице и откуда взяты их ограничения?",
      en: "Which clients are in the matrix, and where do their limits come from?",
    },
    answer: {
      ru: "**Тринадцать записей, и почти для каждой движок установлен по манифесту, а не по описанию.**\n\nНа `amneziawg-go`: AmneziaWG для Android, iOS и Windows, Amnezia VPN, WG Tunnel, отдельный CLI `amneziawg-go` и mihomo / Clash.Meta. На модуле ядра Linux: сам модуль отдельной строкой и пакеты OpenWrt. Своим движком: WireSock и OPNsense.\n\n**Что стоит знать про отдельные записи.** mihomo — единственный клиент вне экосистемы Amnezia, который дотягивается до AWG 3.0, но только при `version: 3` в настройках outbound; ниже включается старая реализация. У OPNsense плагин задаёт свои границы: `Jc` от 1 до 128, `Jmin` и `Jmax` начинаются с единицы, а не с нуля. Модуль ядра — единственное место, где работает `<c>`, и единственное, где нет `d`, `ds`, `dz`.\n\n**Три записи честно помечены как неустановленные**: Keenetic, ASUS Merlin и OPNsense. Для первых двух прошивка закрыта, у третьего движок известен, но его разбор тегов мы не читали. Им оставлены только теги, которые понимают оба известных движка, а `<c>` не выдаётся: гадать здесь дороже, чем недодать один тег.",
      en: "**Thirteen entries, and for nearly all of them the engine is established from a manifest rather than from a description.**\n\nOn `amneziawg-go`: AmneziaWG for Android, iOS and Windows, Amnezia VPN, WG Tunnel, the standalone `amneziawg-go` CLI, and mihomo / Clash.Meta. On the Linux kernel module: the module itself as its own entry, and the OpenWrt packages. On an engine of their own: WireSock and OPNsense.\n\n**Things worth knowing about particular entries.** mihomo is the only client outside Amnezia's ecosystem that reaches AWG 3.0, and only with `version: 3` in the outbound options; below that it runs the older implementation. The OPNsense plugin sets its own bounds: `Jc` from 1 to 128, and `Jmin` and `Jmax` starting at one rather than zero. The kernel module is the only place `<c>` works, and the only one without `d`, `ds`, `dz`.\n\n**Three entries are honestly marked as unestablished**: Keenetic, ASUS Merlin and OPNsense. The first two are closed firmware; for the third the engine is known but we have not read its tag parser. They get only the tags both known engines understand, and `<c>` is withheld: guessing costs more here than withholding one tag.",
    },
    keywords: [
      "матрица",
      "matrix",
      "mihomo",
      "clash",
      "opnsense",
      "openwrt",
      "keenetic",
      "merlin",
    ],
  },
  {
    id: "server-installer",
    category: "clients",
    question: {
      ru: "Как поставить AmneziaWG на свой сервер?",
      en: "How do I install AmneziaWG on my own server?",
    },
    answer: {
      ru: "Помимо установки через приложение Amnezia VPN, у Architect есть свой установщик: `awg-containers-and-tools`.\n\nОн работает на Windows, macOS и Linux, ставит все версии протоколов, умеет генерировать конфигурации и берёт на себя часть рутины по развёртыванию. **Это альтернатива клиентскому способу установки, а не замена**: если вам привычнее ставить через приложение — пользуйтесь приложением, оба пути ведут к рабочему серверу.\n\nРепозиторий: [github.com/Vadim-Khristenko/awg-containers-and-tools](https://github.com/Vadim-Khristenko/awg-containers-and-tools)",
      en: "Besides installing through the Amnezia VPN app, Architect has its own installer: `awg-containers-and-tools`.\n\nIt runs on Windows, macOS and Linux, installs every protocol version, can generate configurations and takes care of much of the deployment legwork. **It is an alternative to the client-side install path rather than a replacement** — if the app suits you better, use the app; both get you a working server.\n\nRepository: [github.com/Vadim-Khristenko/awg-containers-and-tools](https://github.com/Vadim-Khristenko/awg-containers-and-tools)",
    },
    keywords: [
      "установка",
      "install",
      "installer",
      "сервер",
      "server",
      "containers",
      "docker",
      "развернуть",
      "deploy",
    ],
  },
  {
    id: "client-limits",
    category: "clients",
    question: {
      ru: "Почему при выборе клиента часть параметров меняется?",
      en: "Why do some parameters change when I pick a client?",
    },
    answer: {
      ru: "**Потому что ограничения приходят с двух разных сторон, и путать их дорого.**\n\nЧасть из них принадлежит самому приложению. Клиент AmneziaWG для Windows до версии 2.0.2 отказывался сохранять H выше INT32_MAX, хотя на сервере такие значения работали всегда: это была проверка в редакторе, и её починили в PR #87.\n\nОстальное принадлежит движку под приложением, а не приложению. Набор тегов в `I1–I5` разбирает не клиент, а туннель: `amneziawg-go` знает `b`, `t`, `r`, `rc`, `rd`, `d`, `ds`, `dz`, модуль ядра Linux знает `b`, `c`, `t`, `r`, `rc`, `rd`. Наборы расходятся в обе стороны, и незнакомый тег отвергает весь пакет, а не сам себя.\n\n*Генератор знает и то и другое: клиент называет свой движок, теги выводятся из движка, а потолки остаются за клиентом. Поэтому конфиг подрезается под выбранную связку, а не выдаётся красивым и нерабочим.*",
      en: "**Because the limits come from two different places, and confusing them is expensive.**\n\nSome belong to the app itself. The AmneziaWG client for Windows refused to save an H above INT32_MAX until 2.0.2, even though the server always accepted such values: that was a check in the editor, fixed in PR #87.\n\nThe rest belong to the engine under the app rather than to the app. What parses the tags in `I1–I5` is the tunnel, not the client: `amneziawg-go` knows `b`, `t`, `r`, `rc`, `rd`, `d`, `ds`, `dz`, and the Linux kernel module knows `b`, `c`, `t`, `r`, `rc`, `rd`. The sets differ in both directions, and an unfamiliar tag rejects the whole packet rather than itself.\n\n*The generator holds both: a client names its engine, the tags follow from the engine, and the ceilings stay with the client. So the config is trimmed to the pairing you picked instead of being handed to you elegant and broken.*",
    },
    keywords: ["совместимость", "compatibility", "int32", "windows", "лимиты"],
  },
  {
    id: "report-problem",
    category: "clients",
    question: {
      ru: "Нашёл ошибку или что-то не работает — куда написать?",
      en: "I found a bug or something does not work — where do I report it?",
    },
    answer: {
      ru: "**Пожалуйста, напишите** — это лучший способ починить то, о чём мы не знаем. Можно присоединиться к обсуждению в чате, завести issue на GitHub в репозитории проекта.\n\n*Если GitHub недоступен, исходный код продублирован на git.vai-rice.space — там же лежит зеркало установщика для сервера.* Если проблема в конкретном конфиге, **приложите версию AmneziaWG, клиент и его версию, а также сами параметры без приватных ключей** — этого почти всегда достаточно, чтобы воспроизвести. Замечания по формулировкам и переводу тоже приветствуются.",
      en: "**Please do** — it is the best way to fix things we do not know about. You can join the discussion in the chat, open an issue on the project's GitHub repository.\n\n*If GitHub is blocked for you, the source is mirrored on git.vai-rice.space, along with the server installer.* If the problem is a specific config, **include the AmneziaWG version, the client and its version, and the parameters themselves with private keys removed** — that is almost always enough to reproduce it. Notes on wording and translation are welcome too.",
    },
    keywords: [
      "баг",
      "bug",
      "issue",
      "сообщить",
      "report",
      "github",
      "чат",
      "обратная связь",
      "feedback",
    ],
  },

  /* ── Warnings ─────────────────────────────────────────────────────────── */
  {
    id: "warn-tag-c",
    category: "warnings",
    question: {
      ru: "Почему тег <c> помечен как проблемный?",
      en: "Why is the <c> tag flagged as problematic?",
    },
    answer: {
      ru: "**Он существует ровно в одном движке из двух.**\n\nСчётчик пакетов реализован в `amneziawg-linux-kernel-module`: в `src/junk.c`, функция `jp_parse_tags`, есть ветка `strcmp(key, \"c\")`. В `amneziawg-go` его нет ни в одной версии — карта `obfBuilders` в `device/obf.go` знает `b`, `t`, `r`, `rc`, `rd`, `d`, `ds`, `dz`, и это всё. А на `amneziawg-go` работают все приложения Amnezia: Android, iOS, Windows и Amnezia VPN.\n\n**Незнакомый тег не игнорируется, а отвергает весь джанк-пакет.** `newObfChain` в go собирает ошибки и возвращает их через `errors.Join`, модуль ядра отдаёт `-EINVAL`. Поэтому цена ошибки здесь не «одним тегом меньше», а неработающая маскировка целиком.\n\nГенератор смотрит на движок выбранного клиента и просто не даёт включить `<c>` там, где его не примут. Раньше здесь было написано, что тег сломан в старых сборках AWG-go: это неверно, его там не было никогда.",
      en: "**It exists in exactly one of the two engines.**\n\nThe packet counter is implemented in `amneziawg-linux-kernel-module`: `src/junk.c`, function `jp_parse_tags`, has a `strcmp(key, \"c\")` branch. `amneziawg-go` has it in no version at all — the `obfBuilders` map in `device/obf.go` knows `b`, `t`, `r`, `rc`, `rd`, `d`, `ds`, `dz`, and that is the whole vocabulary. And `amneziawg-go` is what every Amnezia app runs on: Android, iOS, Windows and Amnezia VPN.\n\n**An unfamiliar tag is not ignored, it rejects the whole junk packet.** `newObfChain` in go collects the errors and returns them through `errors.Join`; the kernel module returns `-EINVAL`. So the cost of getting this wrong is not one tag fewer, it is the mimicry gone entirely.\n\nThe generator looks at the engine behind the selected client and will not let you switch `<c>` on where it would not be accepted. This answer used to say the tag was broken in older AWG-go builds. That was wrong: it was never there.",
    },
    keywords: ["<c>", "errorcode 1000", "тег", "предупреждение", "warning"],
  },
  {
    id: "warn-extreme",
    category: "warnings",
    question: {
      ru: "Чем рискуют «экстремальные максимумы»?",
      en: "What is the risk of the \"extreme maximums\" option?",
    },
    answer: {
      ru: "Она снимает разумные потолки: `Jc` поднимается до 128, `S3` выходит за 64 байта, разбросы H увеличиваются. **Формально это допустимо, но практических проблем от этого обычно больше, чем пользы.**\n\nСотня мусорных пакетов перед каждым handshake **заметно тормозит подключение и сама по себе выглядит аномально** — очередь UDP такой длины встречается редко, и это уже отдельный признак. Плюс не все клиенты и прошивки корректно переваривают предельные значения. **Режим полезен для экспериментов, а не как настройка по умолчанию.**",
      en: "It removes the sensible ceilings: `Jc` rises to 128, `S3` goes past 64 bytes, the H spreads widen. **This is formally valid, but usually causes more practical trouble than it solves.**\n\n**A hundred junk packets before every handshake noticeably slows connection setup and looks anomalous in itself** — UDP bursts that long are rare, which is a signal of its own. On top of that, not every client and firmware digests extreme values correctly. **Treat it as an experiment, not a default.**",
    },
    keywords: ["экстремальные", "extreme", "максимумы", "jc 128", "риск"],
  },
  {
    id: "warn-yandex-fp",
    category: "warnings",
    question: {
      ru: "Почему некоторые браузерные отпечатки помечены как нестабильные?",
      en: "Why are some browser fingerprints marked unstable?",
    },
    answer: {
      ru: "Браузерный отпечаток подгоняет размеры пакетов под характерные для конкретного браузера.\n\n**Проблема в том, что эти размеры меняются от версии к версии**, и профили, привязанные к быстро обновляющимся браузерам, устаревают быстрее остальных: сегодня они имитируют реальный трафик, а через пару релизов — трафик, которого в сети уже нет. **Такой профиль хуже, чем никакой**, потому что редкий отпечаток заметнее обычного. *Помеченные варианты не сломаны, но требуют более частой перегенерации.*",
      en: "A browser fingerprint shapes packet sizes to match a particular browser.\n\n**The catch is that those sizes shift between versions**, and profiles tied to fast-moving browsers go stale sooner than the rest: today they imitate real traffic, and a couple of releases later they imitate traffic that no longer exists on the network. **Such a profile is worse than none**, because a rare fingerprint stands out more than an ordinary one. *The flagged options are not broken, but they need regenerating more often.*",
    },
    keywords: [
      "отпечаток",
      "fingerprint",
      "браузер",
      "нестабильный",
      "unstable",
    ],
  },
  {
    id: "warn-ip-blocking",
    category: "warnings",
    question: {
      ru: "Когда обфускация не поможет вообще?",
      en: "When will obfuscation not help at all?",
    },
    answer: {
      ru: "**Когда блокируют не протокол, а адрес.** Обфускация прячет тип трафика от DPI: система видит QUIC, TLS или SIP вместо WireGuard и пропускает пакет.\n\nНо если провайдер блокирует диапазоны IP-адресов датацентров целиком или работает по белому списку разрешённых адресов, разбирать содержимое пакетов ему не нужно — **соединение не установится независимо от того, насколько хороша обфускация**.\n\nПризнак именно этого случая: туннель не поднимается ни с какими параметрами, а сам сервер недоступен даже по обычному пингу. *Лечится это сменой адреса или хостинга, а не настройками AmneziaWG.*\n\n**Обратный случай — туннель поднимается, а трафика нет.** Причина у такого симптома не одна: MTU, маршрутизация и NAT на сервере, DNS, `AllowedIPs`, путь до хостинга, репутация самого адреса — и обфускация среди них лишь одна из многих: DPI умеет пропустить рукопожатие и взяться за поток позже. Прежде чем перебирать `Jc`, `Jmin`, `Jmax` и `I1`, стоит исключить транспорт: проверьте тот же конфиг в другой сети, а если есть возможность — у другого хостера.\n\nОговорка: переезд к другому хостеру ничего не доказывает про адрес — там разом меняются сеть, маршрут и защита. Но как первый разделяющий шаг он дешевле перебора вслепую.",
      en: "**When the address is being blocked rather than the protocol.** Obfuscation hides traffic type from DPI: the system sees QUIC, TLS or SIP instead of WireGuard and lets the packet through.\n\nBut if your provider blocks entire datacentre IP ranges, or operates an allowlist, it never needs to inspect packet contents — **the connection fails no matter how good the obfuscation is**.\n\nThe tell is specific: the tunnel refuses to come up whatever parameters you give it, and the server is unreachable even by plain ping. *The fix is a different address or host, not different AmneziaWG settings.*\n\n**The opposite case — the tunnel comes up and no traffic flows.** That symptom has many causes: MTU, routing and NAT on the server, DNS, `AllowedIPs`, the path to the host, the reputation of the address itself — and obfuscation is only one of them, since DPI can let a handshake through and take an interest in the stream later. Before working through `Jc`, `Jmin`, `Jmax` and `I1`, rule out the transport: try the same config on a different network, and on a different host if you can.\n\nOne caveat: moving to another host proves nothing about the address, because the network, the route and the filtering all change at once. As a first step that splits the problem in two, though, it is cheaper than guessing.",
    },
    keywords: [
      "подключается но не работает",
      "нет трафика",
      "no traffic",
      "connects but nothing loads",
      "mtu",
      "ip",
      "блокировка по ip",
      "белый список",
      "allowlist",
      "датацентр",
      "не помогает",
    ],
  },
  {
    id: "mimicry-profiles",
    category: "tuning",
    question: {
      ru: "Чем отличаются профили мимикрии между собой?",
      en: "How do the mimicry profiles differ from each other?",
    },
    answer: {
      ru: "Каждый профиль подделывает начало соединения под конкретный протокол. **QUIC Initial имитирует старт HTTP/3-сессии — самый универсальный вариант** там, где есть браузерный UDP-трафик. QUIC 0-RTT изображает возобновление сессии с ранними данными. TLS 1.3 Client Hello выглядит как начало HTTPS-соединения.\n\nDTLS 1.2 изображает рукопожатие WebRTC поверх UDP — вариант для сетей с видеозвонками. DTLS 1.3 — то же рукопожатие по RFC 9147: на проводе отличается только расширением supported_versions, поэтому уместен там же, а выбирается там, где стек уже обновился. HTTP/3 использует расширенный набор QUIC-типов. SIP имитирует сигнализацию VoIP. DNS Query маскируется под обычный запрос к 53-му порту. Вариант Noise_IK не подделывает ничего — он оставляет структуру WireGuard, добавляя только паддинг.",
      en: "Each profile disguises the start of a connection as a specific protocol. **QUIC Initial imitates the start of an HTTP/3 session — the most universal option** wherever browser UDP traffic exists. QUIC 0-RTT poses as a session resumption with early data.\n\nTLS 1.3 Client Hello looks like the opening of an HTTPS connection. DTLS 1.2 poses as a WebRTC handshake over UDP and suits networks full of video calls. DTLS 1.3 is the same handshake per RFC 9147 — on the wire it differs only in the supported_versions extension, so it fits the same networks and is picked where the stack has moved on. HTTP/3 uses a wider set of QUIC types. SIP imitates VoIP signalling. DNS Query passes as an ordinary port 53 lookup. The Noise_IK option imitates nothing — it keeps WireGuard's own structure and only adds padding.",
    },
    keywords: [
      "профили",
      "profiles",
      "quic",
      "dtls",
      "dtls_1_2",
      "dtls_1_3",
      "sip",
      "http3",
      "noise_ik",
    ],
  },
  {
    id: "warn-not-anonymity",
    category: "warnings",
    question: {
      ru: "Даёт ли обфускация анонимность?",
      en: "Does obfuscation give me anonymity?",
    },
    answer: {
      ru: "**Нет**, и это важно не перепутать. **Обфускация решает ровно одну задачу — сделать так, чтобы трафик не опознали как VPN и не заблокировали.**\n\n*Она не скрывает факт соединения с конкретным IP, не защищает от анализа объёмов и времени активности, и уж точно ничего не делает с тем, что вы сами сообщаете сайтам, куда заходите.* Ваш провайдер по-прежнему видит, что вы обмениваетесь данными с некоторым сервером. Если ваша модель угроз — это анонимность, а не доступ, вам нужны другие инструменты.",
      en: "**No**, and the distinction matters. **Obfuscation solves exactly one problem: keeping traffic from being identified as VPN and blocked.**\n\n*It does not hide that you are connected to a particular IP, does not protect against volume or timing analysis, and certainly does nothing about what you tell the sites you visit.* Your provider still sees that you are exchanging data with some server. If your threat model is anonymity rather than access, you need different tools.",
    },
    keywords: [
      "анонимность",
      "anonymity",
      "безопасность",
      "security",
      "модель угроз",
    ],
  },

  /* ── AWG 3.0 ──────────────────────────────────────────────────────────── */
  {
    id: "header-protection",
    category: "awg3",
    question: {
      ru: "Что даёт HeaderProtectionKey?",
      en: "What does HeaderProtectionKey give you?",
    },
    answer: {
      ru: "До версии 3.0 поле типа пакета всего лишь случайно выбиралось из диапазона `H1–H4`. Наблюдатель не видел фиксированной сигнатуры, но в принципе мог копить статистику и оценивать границы диапазонов.\n\n**В 3.0 появляется общий 32-байтный ключ, которым заголовок шифруется потоковым шифром ChaCha20.** **Разница качественная: без ключа гипотезу о типе пакета невозможно даже проверить** — считать попросту нечего. У handshake-пакетов и cookie reply шифруется всё сообщение целиком, у транспортных — только 16-байтный заголовок.",
      en: "Before 3.0 the packet-type field was merely drawn at random from the `H1–H4` ranges. An observer saw no fixed signature, but could in principle accumulate statistics and estimate where the range boundaries sat.\n\n**3.0 introduces a shared 32-byte key that encrypts the header with the ChaCha20 stream cipher.** **The difference is qualitative: without the key a hypothesis about packet type cannot even be tested** — there is nothing to compute against. Handshake packets and cookie replies are encrypted whole; transport packets only in their 16-byte header.",
    },
    keywords: ["headerprotectionkey", "chacha20", "3.0", "заголовки"],
  },
  {
    id: "s-floor-12",
    category: "awg3",
    question: {
      ru: "Почему при включённом HeaderProtectionKey S1–S4 не могут быть меньше 12?",
      en: "Why can't S1–S4 go below 12 when HeaderProtectionKey is set?",
    },
    answer: {
      ru: "Потому что nonce шифра нигде не передаётся отдельно — он берётся из первых 12 байт того самого случайного паддинга, который задают `S1–S4`. Это видно в коде отправки: буфер паддинга режется на 12 байт и используется как nonce.\n\nПаддинг короче двенадцати байт просто нечего дать шифру.\n\nДо этого места, впрочем, дело не доходит. **Обе реализации проверяют границу до подъёма интерфейса и отказываются принимать такой конфиг, назвав параметр по имени.** `amneziawg-go` в `device/uapi.go` возвращает `S%d must be more then %d to use headerProtection`; модуль ядра в `src/netlink.c` пишет ту же фразу в лог и возвращает `-EINVAL`.\n\nТо есть симптом — интерфейс не поднимается, и в логе лежит внятная причина. Не «работает, но слабее». Здесь было написано обратное, и это отправляло человека искать проблему где угодно, кроме той строки, которую ему уже показали.\n\nГенератор поднимает все четыре S до 12 байт, а валидатор отклоняет конфиги, где это нарушено.",
      en: "Because the cipher nonce is never transmitted separately — it is taken from the first 12 bytes of the same random padding that `S1–S4` define. You can see it in the [send path](https://github.com/amnezia-vpn/amneziawg-go/blob/master/device/send.go): the padding buffer is sliced to 12 bytes and used as the nonce.\n\nA padding shorter than twelve bytes has no nonce to give it.\n\nYou never get that far, though. **Both implementations check the bound before the interface comes up and refuse the configuration, naming the parameter.** `amneziawg-go` returns `S%d must be more then %d to use headerProtection` from `device/uapi.go`; the kernel module logs the same sentence in `src/netlink.c` and returns `-EINVAL`.\n\nSo the symptom is an interface that will not start, with the reason spelled out in the log — not something that runs but weaker. This answer used to say the opposite, which sent people looking anywhere except at the line they had already been shown.\n\nThe generator raises all four S values to 12 bytes, and the validator rejects configs that break it.",
    },
    keywords: ["nonce", "12", "s1", "паддинг", "chacha20"],
  },
  {
    id: "random-timings",
    category: "awg3",
    question: {
      ru: "Зачем рандомизировать таймеры и можно ли этим сломать туннель?",
      en: "Why randomise the timers, and can it break the tunnel?",
    },
    answer: {
      ru: "WireGuard использует фиксированные константы: рекей через 120 секунд, таймаут 5, отбраковка через 180, keepalive 10. **Это ровный ритм, по которому соединение опознаётся статистически**, даже если каждый отдельный пакет неотличим. В 3.0 все они задаются диапазонами.\n\n**Сломать этим туннель можно, и легко**: `RejectAfterTime` обязан оставаться заметно выше суммы `KeepaliveTimeout` и `RekeyTimeout`, иначе окно обновления ключей на приёме схлопывается в ноль и сессия умрёт по истечении срока. `RekeyAfterTime`, соответственно, должен успевать сработать до `RejectAfterTime`. *Генератор соблюдает оба условия и проверяет их перед выдачей.*",
      en: "WireGuard uses fixed constants: rekey after 120 seconds, a 5-second timeout, rejection at 180, keepalive at 10. **That steady rhythm identifies a connection statistically** even when individual packets are indistinguishable. In 3.0 all of them become ranges.\n\n**It is entirely possible to break a tunnel this way**: `RejectAfterTime` must stay well above the sum of `KeepaliveTimeout` and `RekeyTimeout`, otherwise the receiving side's key-refresh window collapses to zero and the session dies when the deadline passes. `RekeyAfterTime` must likewise fire before `RejectAfterTime`. *The generator honours both constraints and verifies them before emitting.*",
    },
    keywords: ["rekey", "таймеры", "timers", "rejectaftertime", "keepalive"],
  },
  {
    id: "content-padding",
    category: "awg3",
    question: {
      ru: "Что делает ContentPaddingAddition?",
      en: "What does ContentPaddingAddition do?",
    },
    answer: {
      ru: "До 3.0 транспортные пакеты дополнялись до кратного 16 байтам. Это скрывает точный размер полезной нагрузки, но само по себе является приметой: **длины пакетов ложатся на сетку с шагом 16**, и такое распределение хорошо заметно со стороны. **`ContentPaddingAddition` добавляет сверху ещё случайную величину**, выбираемую для каждого пакета из заданного диапазона, — сетка размывается.\n\n*Платой становится трафик*: средний прирост равен середине диапазона, умноженной на число пакетов, поэтому широкий диапазон на мобильном тарифе ощущается. Совпадать с другой стороной параметр не обязан: паддинг уходит внутрь шифрованной нагрузки, а получатель отрезает лишнее по длине из заголовка самого IP-пакета, сколько бы его ни было. **Это клиентский параметр** — нужен только 3.0 на той стороне, которая его использует.",
      en: "Before 3.0, transport packets were padded to a multiple of 16 bytes. That hides the exact payload size, but is a signature in itself: **packet lengths land on a 16-byte grid**, and that distribution is easy to spot from outside. **`ContentPaddingAddition` adds a further random amount on top**, drawn per packet from the configured range, which smears the grid out.\n\n*The cost is bandwidth*: the average increase is the middle of the range times the number of packets, so a wide range is noticeable on a metered mobile plan. It does not have to match the other side: the padding goes inside the encrypted payload, and the receiver truncates to the length carried in the IP header itself, however much padding follows. **It is a client-side parameter** — only the side using it needs 3.0.",
    },
    keywords: [
      "contentpaddingaddition",
      "паддинг",
      "padding",
      "3.0",
      "размер пакета",
    ],
  },
  {
    id: "awg3-support",
    category: "awg3",
    question: {
      ru: "Какие клиенты уже поддерживают параметры 3.0?",
      en: "Which clients already support the 3.0 parameters?",
    },
    answer: {
      ru: "**Поддержка на стороне ядра появилась в `amneziawg-go` начиная с версии 3.0.1.**\n\nС пользовательскими утилитами ситуация сложнее: разбор новых ключей в `.conf` на момент написания живёт в ветке feat/awg3 репозитория `amneziawg-tools`, а не в master. **Практический вывод: прежде чем разворачивать конфиг 3.0, убедитесь, что и клиент, и сервер собраны с поддержкой этих параметров.** Если сомневаетесь — 2.0 остаётся полностью рабочим вариантом, и генератор его никуда не убирал.",
      en: "**Kernel-side support landed in `amneziawg-go` from version 3.0.1.**\n\nThe userspace tooling is messier: at the time of writing, parsing the new `.conf` keys lives on the feat/awg3 branch of `amneziawg-tools` rather than on master. **The practical takeaway is to confirm that both your client and your server are built with these parameters before deploying a 3.0 config.** If in doubt, 2.0 remains fully functional and the generator still offers it.",
    },
    keywords: ["поддержка", "support", "amneziawg-go", "tools", "клиенты"],
  },

  /* ── Tuning ───────────────────────────────────────────────────────────── */
  {
    id: "which-profile",
    category: "tuning",
    question: {
      ru: "Какой профиль мимикрии выбрать?",
      en: "Which mimicry profile should I choose?",
    },
    answer: {
      ru: "Универсального ответа нет — **выбирать стоит по тому, что в вашей сети выглядит обычно.** QUIC Initial и HTTP/3 хороши там, где браузерный трафик по UDP/443 привычен, то есть в большинстве домашних и мобильных сетей.\n\nDNS Query подходит для сетей, где UDP-трафик жёстко фильтруется, но 53-й порт открыт. TLS Client Hello уместен, если в вашей сети UDP редкость и правдоподобнее выглядит TCP-подобная сигнатура. **Если непонятно, с чего начать — QUIC Initial разумный выбор по умолчанию.**",
      en: "There is no universal answer — **pick whatever looks unremarkable on your network.** QUIC Initial and HTTP/3 work well where browser traffic over UDP/443 is routine, which covers most home and mobile networks.\n\nDNS Query suits networks that filter UDP aggressively but leave port 53 open. TLS Client Hello fits when UDP is rare on your network and a TCP-shaped signature is the more plausible cover. **If you have no idea where to start, QUIC Initial is a reasonable default.**",
    },
    keywords: ["профиль", "profile", "quic", "tls", "dns", "мимикрия"],
  },
  {
    id: "router-mode",
    category: "tuning",
    question: {
      ru: "Что делает режим роутера?",
      en: "What does router mode do?",
    },
    answer: {
      ru: "Он урезает всё, что стоит процессорного времени и памяти: ограничивает `Jc`, уменьшает `Jmin` и `Jmax`, зажимает `S1` и `S2` и оставляет только цепочку I1, обнуляя I2–I5. **Это осознанный размен: обфускация становится слабее, зато конфиг переваривает слабое железо** вроде домашних роутеров и одноплатников. Если ваш клиент — обычный компьютер или телефон, режим лучше не включать.",
      en: "It trims everything that costs CPU time and memory: it caps `Jc`, lowers `Jmin` and `Jmax`, clamps `S1` and `S2` and keeps only the I1 chain, clearing I2–I5. **This is a deliberate trade: obfuscation gets weaker, but the config becomes digestible for weak hardware** such as home routers and single-board devices. If your client is an ordinary computer or phone, leave it off.",
    },
    keywords: ["роутер", "router", "openwrt", "keenetic", "слабое железо"],
  },
  {
    id: "mtu",
    category: "tuning",
    question: {
      ru: "Какой MTU выставлять?",
      en: "What MTU should I set?",
    },
    answer: {
      ru: "**1500 — стандартный Ethernet** и подходит для большинства проводных подключений. **1420 стоит выбрать для PPPoE и мобильных сетей**, где часть пакета съедает инкапсуляция. **1280 — минимальный MTU, гарантированный IPv6**: вариант на случай, когда соединение устанавливается, но крупные пакеты теряются. *Симптом последнего узнаваемый: пинг проходит, лёгкие страницы открываются, а тяжёлые сайты и загрузки зависают.*",
      en: "**1500 is standard Ethernet** and fits most wired links. **Choose 1420 for PPPoE and mobile networks**, where encapsulation eats part of the packet. **1280 is the minimum MTU IPv6 guarantees** — the option to reach for when a connection establishes but large packets vanish. *That last failure has a recognisable signature: pings succeed and light pages load, but heavy sites and downloads hang.*",
    },
    keywords: ["mtu", "1500", "1420", "1280", "фрагментация"],
  },

  /* ── Troubleshooting ──────────────────────────────────────────────────── */
  {
    id: "not-connecting",
    category: "troubleshooting",
    question: {
      ru: "Конфиг сгенерирован, но соединение не поднимается. С чего начать?",
      en: "The config is generated but the tunnel will not come up. Where do I start?",
    },
    answer: {
      ru: "**Сначала проверьте симметрию, но именно тех параметров, которые обязаны совпадать**: `H1–H4`, `S1–S4` и `HeaderProtectionKey`. **Это причина большинства случаев.** `Jc`, `Jmin`, `Jmax`, `I1–I5` и `ContentPaddingAddition` сюда не относятся — их расхождение подключению не мешает, и искать ошибку там не нужно.\n\nЗатем убедитесь, что версия совпадает с тем, что реально поддерживает ваш клиент: конфиг 2.0 на клиенте, знающем только 1.0, не заработает, а параметры 3.0 требуют `amneziawg-go` 3.0.1 или новее. Если с этим порядок, попробуйте уменьшить `Jc` до 2–3: некоторые провайдеры режут длинные очереди UDP-пакетов на старте. Наконец, проверьте, что H-диапазоны не пересекаются — генератор это гарантирует, но если конфиг правился руками, пересечение легко внести.",
      en: "**Start with symmetry, but only of the parameters that actually require it**: `H1–H4`, `S1–S4` and `HeaderProtectionKey`. **That accounts for most cases.** `Jc`, `Jmin`, `Jmax`, `I1–I5` and `ContentPaddingAddition` are not in that group — a mismatch there does not prevent a connection, so there is no point looking for the fault in them.\n\nNext confirm the version matches what your client actually supports: a 2.0 config will not work against a client that only knows 1.0, and the 3.0 parameters need `amneziawg-go` 3.0.1 or newer. If that all checks out, try lowering `Jc` to 2 or 3, since some providers throttle long UDP bursts at connection start. Finally verify the H ranges do not overlap — the generator guarantees this, but a hand-edited config can easily reintroduce it.",
    },
    keywords: ["не работает", "not working", "handshake", "отладка", "debug"],
  },
  {
    id: "slow-connect",
    category: "troubleshooting",
    question: {
      ru: "Соединение работает, но подключается очень долго.",
      en: "It connects, but setup takes far too long.",
    },
    answer: {
      ru: "**Скорее всего дело в junk-пакетах.** Каждый из `Jc` пакетов реально уходит в сеть перед handshake, и на мобильной сети с высокой задержкой это ощутимо. **Попробуйте снизить `Jc` и уменьшить `Jmax`.** Если используются все пять цепочек `I1–I5`, они тоже отправляются перед каждым handshake — оставьте только I1 и посмотрите, изменится ли ощущение.",
      en: "**Junk packets are the usual culprit.** Each of the `Jc` packets genuinely goes out before the handshake, and on a high-latency mobile link that adds up. **Try lowering `Jc` and reducing `Jmax`.** If all five `I1–I5` chains are in use they are also sent ahead of every handshake — keep only I1 and see whether it feels different.",
    },
    keywords: ["медленно", "slow", "задержка", "latency", "долго"],
  },
  {
    id: "worked-then-stopped",
    category: "troubleshooting",
    question: {
      ru: "Конфиг работал, а через какое-то время перестал.",
      en: "The config worked, then stopped after a while.",
    },
    answer: {
      ru: "Если разрыв происходит примерно через одинаковые промежутки, дело может быть в таймерах: при некорректных диапазонах в 3.0 сессия обновляет ключи не вовремя и умирает по `RejectAfterTime`. Сгенерируйте конфиг заново — *валидатор такие сочетания не пропускает*.\n\nЕсли же конфиг перестал работать после периода нормальной работы и заново не поднимается, вероятнее, что **провайдер начал блокировать конкретную сигнатуру**: смените профиль мимикрии и перегенерируйте параметры, кнопка «Не работает» усиливает обфускацию с каждой попыткой.",
      en: "If the drops come at roughly regular intervals, the timers may be to blame: with badly chosen 3.0 ranges the session rekeys out of step and dies at `RejectAfterTime`. Regenerate the config — *the validator does not let those combinations through*.\n\nIf instead it worked for a while and now refuses to come up at all, it is more likely **your provider started blocking that particular signature**: change the mimicry profile and regenerate, and note that the \"not working\" button strengthens obfuscation with each attempt.",
    },
    keywords: ["перестал", "stopped", "разрыв", "drops", "блокировка"],
  },

  {
    id: "keys-not-generated",
    category: "basics",
    question: {
      ru: "Генерирует ли Architect приватные ключи?",
      en: "Does Architect generate private keys?",
    },
    answer: {
      ru: "**Нет**, и это важное разграничение. Architect создаёт только параметры обфускации — `Jc`, `Jmin`, `Jmax`, `S1–S4`, `H1–H4`, цепочку `I1–I5` и блок 3.0.\n\nКлючи WireGuard — `PrivateKey`, `PublicKey`, `PresharedKey` — выпускает ваш сервер или клиент, и в сгенерированном конфиге они остаются заготовками, которые вы подставляете сами.\n\nОтсюда же следует правило для обращений: приватные ключи не нужны для воспроизведения ни одной проблемы, поэтому **вырезайте их из всего, что публикуете**. *Ключ, попавший в issue, придётся перевыпускать.*",
      en: "**No**, and the distinction matters. Architect produces obfuscation parameters only — `Jc`, `Jmin`, `Jmax`, `S1–S4`, `H1–H4`, the `I1–I5` chain and the 3.0 block.\n\nWireGuard keys, meaning `PrivateKey`, `PublicKey` and `PresharedKey`, are issued by your server or client, and the generated config leaves them as placeholders for you to fill in.\n\nThe same split gives the rule for bug reports: no private key is ever needed to reproduce a problem, so **strip them from anything you publish**. *A key posted in an issue has to be reissued.*",
    },
    keywords: ["ключи", "keys", "privatekey", "presharedkey", "wireguard"],
  },
  {
    id: "run-offline",
    category: "basics",
    question: {
      ru: "Можно ли пользоваться генератором без интернета?",
      en: "Can I use the generator without internet access?",
    },
    answer: {
      ru: "**Да**, и способов три.\n\nПервый: скачать релизный архив — внутри лежит собранный сайт и бинарник `awg-serve` под Linux, macOS и Windows, который поднимает его локально и не требует ничего установленного.\n\nВторой: запустить `scripts/serve.sh` или `serve.ps1`, если у вас уже есть bun, npx или python; *флаг `--check` покажет, что нашлось, ничего не запуская*.\n\nТретий, если браузера нет вовсе: `scripts/awg-gen.sh` — те же правила генерации в виде обычного shell-скрипта без зависимостей и без сети.\n\nСама страница и в онлайне работает целиком на вашем устройстве, так что офлайн ничего не отнимает.",
      en: "**Yes**, in three ways.\n\nFirst, download a release archive: it contains the built site and an `awg-serve` binary for Linux, macOS and Windows that serves it locally with nothing installed.\n\nSecond, run `scripts/serve.sh` or `serve.ps1` if you already have bun, npx or python; *the `--check` flag reports what it found without starting anything*.\n\nThird, if there is no browser at all: `scripts/awg-gen.sh` carries the same generation rules as a plain shell script with no dependencies and no network.\n\nThe page runs entirely on your device online too, so going offline costs you nothing.",
    },
    keywords: ["офлайн", "offline", "awg-serve", "локально", "архив", "release"],
  },
  {
    id: "simulator-what",
    category: "basics",
    question: {
      ru: "Что показывает симулятор пакетов?",
      en: "What does the packet simulator show?",
    },
    answer: {
      ru: "**Он рисует, как выглядит подключение с вашими параметрами**: сначала цепочка CPS `I1–I5`, затем мусорный поезд из `Jc` пакетов размером от `Jmin` до `Jmax`, затем рукопожатие, где к каждому пакету добавлены свои H и S.\n\n*Это модель, а не перехват*: значения берутся из вашего конфига, но реальная сеть добавит задержки, повторы и фрагментацию, которых здесь нет. **Смысл в том, чтобы увидеть порядок величин** — сколько пакетов уйдёт до первого полезного и насколько распухнет каждый, — и понять, откуда берётся задержка при подключении, если поставить `Jc` побольше.",
      en: "**It draws what a connection looks like with your parameters**: first the `I1–I5` CPS chain, then the junk train of `Jc` packets sized between `Jmin` and `Jmax`, then the handshake, with each packet carrying its own H and S.\n\n*It is a model, not a capture*: the values come from your config, but a real network adds latency, retransmits and fragmentation that are not shown here. **The point is to see the orders of magnitude** — how many packets go out before the first useful one, and how much each one swells — and to understand where the connection delay comes from when `Jc` is set high.",
    },
    keywords: ["симулятор", "simulator", "пакеты", "handshake", "визуализация"],
  },
  {
    id: "same-params-many-clients",
    category: "clients",
    question: {
      ru: "Нужны ли отдельные параметры для каждого устройства?",
      en: "Does each device need its own parameters?",
    },
    answer: {
      ru: "**Совпадать обязаны только общие параметры**: `S1–S4`, `H1–H4` и `HeaderProtectionKey`. Их все клиенты одного сервера делят с ним и между собой.\n\n**А вот клиентские** — `Jc`, `Jmin`, `Jmax`, цепочка `I1–I5` и `ContentPaddingAddition` — у каждого устройства могут быть свои, **и это не просто допустимо, а полезно**: если сто клиентов шлют одинаковый по счёту и размерам мусорный поезд, DPI получает готовый шаблон и учится по нему быстрее. Разные значения такого шаблона не дают. Единственная причина держать их одинаковыми — удобство раздачи одного конфига. Если конфиг у вас один на всех и он работает, менять ничего не нужно.",
      en: "**Only the shared parameters have to match**: `S1–S4`, `H1–H4` and `HeaderProtectionKey`. Every client of a server shares those with it and with each other.\n\n**The client-side ones** — `Jc`, `Jmin`, `Jmax`, the `I1–I5` chain and `ContentPaddingAddition` — can differ per device, **and that is not merely allowed but useful**: if a hundred clients emit an identically sized and counted junk train, DPI gets a ready-made template and learns from it faster. Varied values give it no such template. The only reason to keep them identical is the convenience of handing out one config. If you have one config for everyone and it works, there is nothing to change.",
    },
    keywords: [
      "несколько устройств",
      "multiple devices",
      "пиры",
      "peers",
      "разные параметры",
    ],
  },
  {
    id: "vpn-keys-mergekeys",
    category: "clients",
    question: {
      ru: "Что такое ключ vpn:// и зачем нужен MergeKeys?",
      en: "What is a vpn:// key, and what is MergeKeys for?",
    },
    answer: {
      ru: "Приложения Amnezia делятся настройками одной строкой вида `vpn://`…: это сжатый zlib JSON в кодировке base64url с четырёхбайтным заголовком длины. Внутри лежит всё подключение целиком, включая параметры обфускации.\n\n`MergeKeys` открывает такую строку прямо в браузере, показывает содержимое, позволяет подставить в неё новые параметры и собрать обратно, а также объединить несколько ключей в один.\n\nЭто удобнее, чем просить всех пользователей вручную править шестнадцать полей в клиенте: **вы обновляете обфускацию и рассылаете новую строку**. *Декодирование и сборка происходят на вашем устройстве, ключ никуда не отправляется.*",
      en: "The Amnezia apps share a setup as a single `vpn://`… string: zlib-compressed JSON in base64url with a four-byte length header. It carries the whole connection, obfuscation parameters included.\n\n`MergeKeys` opens such a string in the browser, shows what is inside, lets you patch new parameters into it and pack it back up, and can merge several keys into one.\n\nThat beats asking every user to edit sixteen fields by hand in the client: **you update the obfuscation and hand out a new string**. *Decoding and packing happen on your device; the key is never sent anywhere.*",
    },
    keywords: ["vpn://", "mergekeys", "ключ", "base64", "zlib", "обмен"],
  },
  {
    id: "obfuscation-cost",
    category: "tuning",
    question: {
      ru: "Насколько обфускация замедляет соединение?",
      en: "How much does obfuscation slow the connection down?",
    },
    answer: {
      ru: "Расходы делятся на разовые и постоянные, и путать их не стоит.\n\n## Разовые\n\nРазовые платятся при подключении: цепочка CPS и мусорный поезд уходят один раз, но их объём равен примерно `Jc`, умноженному на середину диапазона `Jmin`–`Jmax`, поэтому `Jc` 15 при `Jmax` 1000 заметно растягивает установку туннеля.\n\n## Постоянные\n\nПостоянные платятся с каждого пакета: `S1–S4` добавляют байты ко всему трафику, а в 3.0 к ним прибавляются ChaCha20 на заголовок и `ContentPaddingAddition`.\n\nНа современном процессоре шифрование не заметно, а вот **лишние байты съедают полезный `MTU`**. *Если устройство слабое — роутер, одноплатник, — включите режим роутера: он держит шумы на минимуме.*",
      en: "The costs split into one-off and per-packet, and the two should not be confused.\n\n## One-off\n\nOne-off costs are paid at connect: the CPS chain and the junk train go out once, but their volume is roughly `Jc` times the middle of the `Jmin`–`Jmax` range, so `Jc` 15 with `Jmax` 1000 visibly stretches how long a tunnel takes to come up.\n\n## Per-packet\n\nPer-packet costs apply to everything: `S1–S4` add bytes to all traffic, and 3.0 adds ChaCha20 over the header plus `ContentPaddingAddition` on top.\n\nOn a modern CPU the encryption is not noticeable, but **the extra bytes eat into usable `MTU`**. *On weak hardware — a router, a single-board computer — turn on router mode, which keeps the noise minimal.*",
    },
    keywords: ["скорость", "speed", "производительность", "performance", "cpu"],
  },
  {
    id: "batch-generation",
    category: "tuning",
    question: {
      ru: "Зачем нужна массовая генерация?",
      en: "What is batch generation for?",
    },
    answer: {
      ru: "**Она нужна тем, кто держит несколько серверов.** Одному серверу нужен ровно один набор параметров на всех его клиентов, но два сервера с одинаковой обфускацией теряют смысл: заблокировав сигнатуру, отсекут оба сразу.\n\n**Массовая генерация выдаёт нужное количество независимых наборов** за раз и складывает их в один файл, откуда их удобно разложить по серверам. Больше пятидесяти конфигов считаются в Web Worker, чтобы страница не подвисала; максимум — тысяча за проход.",
      en: "**It is for people running several servers.** One server needs exactly one parameter set for all of its clients, but two servers sharing the same obfuscation defeat the point: block the signature and both go down together.\n\n**Batch generation produces the requested number of independent sets** at once and writes them to a single file, ready to be distributed across servers. Above fifty configs the work moves into a Web Worker so the page stays responsive; the ceiling is a thousand per run.",
    },
    keywords: ["batch", "массовая", "несколько серверов", "worker"],
  },
  {
    id: "changed-params-one-side",
    category: "troubleshooting",
    question: {
      ru: "Я поменял параметры на сервере — почему всё отвалилось?",
      en: "I changed the parameters on the server and everything dropped. Why?",
    },
    answer: {
      ru: "**Потому что согласования этих параметров не существует.** **Обфускация — это правила, по которым сторона узнаёт пакет собеседника**: сколько мусора игнорировать, сколько байт отрезать, какой заголовок считать своим.\n\nКлиент со старыми значениями шлёт то, что сервер уже не опознаёт, и его трафик отбрасывается молча — *ошибки вы не увидите, будет просто тишина.* **Поэтому смену параметров планируют как миграцию**: сначала раздайте всем новый конфиг или новый ключ `vpn://`, и только потом переключайте сервер. Если пользователей много, проще поднять второй сервер с новыми параметрами и переводить людей постепенно.",
      en: "**Because there is no negotiation for these parameters.** **Obfuscation is the set of rules by which each side recognises the other's packets**: how much junk to ignore, how many bytes to strip, which header counts as its own.\n\nA client with the old values sends something the server no longer recognises, and that traffic is dropped silently — *you get no error, just silence.* **So treat a parameter change as a migration**: hand out the new config or the new `vpn://` key first, and switch the server only afterwards. With many users it is easier to stand up a second server with the new parameters and move people over gradually.",
    },
    keywords: ["отвалилось", "dropped", "миграция", "migration", "рассинхрон"],
  },
  /* ── Privacy ──────────────────────────────────────────────────────────── */
  {
    id: "data-leaves",
    category: "privacy",
    question: {
      ru: "Отправляются ли мои ключи или конфиги куда-либо?",
      en: "Are my keys or configs sent anywhere?",
    },
    answer: {
      ru: "**Нет.** **Вся генерация происходит в браузере на вашем устройстве**: у проекта нет бэкенда, который мог бы что-то принять. Шрифты тоже загружаются со своего домена, а не из Google Fonts, поэтому сторонних запросов при работе страницы не возникает. *Проверить это проще всего самому — откройте вкладку «Сеть» в инструментах разработчика и посмотрите, что уходит во время генерации.*",
      en: "**No.** **All generation happens in your browser on your device**: the project has no backend that could receive anything. Fonts are served from the site's own domain rather than Google Fonts, so no third-party requests occur while the page is in use. *The easiest way to confirm this is to check yourself — open the Network tab in your developer tools and watch what leaves during generation.*",
    },
    keywords: ["приватность", "privacy", "данные", "телеметрия", "offline"],
  },
  {
    id: "randomness",
    category: "privacy",
    question: {
      ru: "Насколько случайны генерируемые значения?",
      en: "How random are the generated values?",
    },
    answer: {
      ru: "**Все параметры берутся из `crypto.getRandomValues()`** — криптографического источника случайности браузера, того же, что используется для генерации ключей. `Math.random()` в генераторе не используется нигде. **Дополнительно выборка сделана с отбраковкой**, чтобы исключить смещение при делении по модулю: без этого некоторые значения выпадали бы чаще других, что для параметров обфускации нежелательно.",
      en: "**Every parameter comes from `crypto.getRandomValues()`**, the browser's cryptographic randomness source — the same one used for key generation. `Math.random()` appears nowhere in the generator. **Sampling additionally uses rejection** to eliminate modulo bias: without it some values would come up more often than others, which is undesirable for obfuscation parameters.",
    },
    keywords: ["случайность", "randomness", "crypto", "энтропия", "entropy"],
  },
  {
    id: "history-storage",
    category: "privacy",
    question: {
      ru: "Где хранится история генераций?",
      en: "Where is the generation history stored?",
    },
    answer: {
      ru: "**В localStorage вашего браузера**, то есть на вашем устройстве и больше нигде. Хранится ограниченное число последних генераций, и каждая запись содержит только параметры обфускации — приватных ключей там нет, потому что генератор их и не создаёт.\n\nКнопка очистки в панели истории удаляет всё сразу, а удаление данных сайта в браузере даёт тот же результат. **На чужом или общем компьютере имеет смысл почистить историю после работы**: сами по себе параметры не секрет, но они указывают на то, что вы настраивали.",
      en: "**In your browser's localStorage**, meaning on your device and nowhere else. A limited number of recent generations is kept, and each entry holds obfuscation parameters only — no private keys, because the generator never creates any.\n\nThe clear button in the history panel removes everything at once, and clearing site data in the browser does the same. **On a shared or borrowed computer it is worth clearing the history afterwards**: the parameters are not secret in themselves, but they do show what you were setting up.",
    },
    keywords: [
      "история",
      "history",
      "localstorage",
      "хранение",
      "storage",
      "очистить",
    ],
  },
];
