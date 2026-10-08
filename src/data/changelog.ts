/**
 * Project timeline / changelog, bilingual.
 *
 * Rendered on the About page, oldest first, in this order.
 *
 * `version` is the *app* version and renders with a `v` prefix. Several
 * entries also mention AmneziaWG 1.0/2.0/3.0 — that is the protocol, and the
 * two numbering schemes are unrelated. Keep the distinction explicit in the
 * text: "AWG 2.0" for the protocol, "v2.0" for a release of this tool.
 *
 * WHAT A NUMBER MEANS HERE
 *
 * Not semver: nothing imports this as a library, so "breaking change" has no
 * one to break. The number answers a different question — how much of the tool
 * a returning user has to re-learn.
 *
 *   major   it is a different tool than it was. A second engine, a rebrand,
 *           a redesign of how the thing is read.
 *   minor   it does something it could not do, inside what it already is.
 *   patch   something was wrong. The entry says what, not that it was fixed.
 *
 * Which is why the two engines are 4.0 and the FAQ growing from 33 answers to
 * 44 was not: more of the same is not a different tool.
 */

import type { Locale, Localised } from "@/i18n";

export type TimelineColor = "amber" | "green" | "red";

export interface TimelineEntry {
  version: string;
  date: Localised<string>;
  title: Localised<string>;
  desc: Localised<string>;
  /** Lucide icon name, resolved by the view. */
  icon: string;
  color: TimelineColor;
}

export const TIMELINE: TimelineEntry[] = [
  {
    version: "0.1",
    date: { ru: "Начало", en: "Start" },
    title: { ru: "Первый прототип", en: "First prototype" },
    icon: "Rocket",
    color: "amber",
    desc: {
      ru: "Чистый HTML/CSS/JS, один файл, базовая генерация параметров Jc, Jmin, Jmax и случайных H/S. Работающий PoC без дизайна.",
      en: "Plain HTML/CSS/JS in a single file: basic generation of Jc, Jmin, Jmax and random H/S values. A working proof of concept with no design to speak of.",
    },
  },
  {
    version: "0.2",
    date: { ru: "Фикс", en: "Fix" },
    title: { ru: "Исправление HEX-генерации", en: "HEX generation fix" },
    icon: "Bug",
    color: "red",
    desc: {
      ru: "Критическая ошибка: невалидный HEX вызывал краш клиента. Исправлено, добавлена валидация assertEvenHex.",
      en: "A critical bug: invalid HEX crashed the client. Fixed, with an assertEvenHex guard added.",
    },
  },
  {
    version: "0.3",
    date: { ru: "CPS-теги", en: "CPS tags" },
    title: { ru: "Селективные CPS-теги", en: "Selective CPS tags" },
    icon: "Code",
    color: "green",
    desc: {
      ru: "Поддержка тегов <c>, <t>, <r>, <rc>, <rd> с возможностью включать каждый отдельно. Синхронизация генераторов I1 с выбором пользователя.",
      en: "Support for the <c>, <t>, <r>, <rc> and <rd> tags, each toggleable on its own, with the I1 generators following the user's selection.",
    },
  },
  {
    version: "0.4",
    date: { ru: "AWG 1.0", en: "AWG 1.0" },
    title: {
      ru: "Оптимизация Junk для AWG 1.0",
      en: "Junk tuning for AWG 1.0",
    },
    icon: "Wrench",
    color: "amber",
    desc: {
      ru: "Требования официального клиента: Jc ≥ 4, Jmax > 81 для AWG 1.0. Генератор подстроен под ограничения протокола.",
      en: "The official client requires Jc ≥ 4 and Jmax > 81 on AWG 1.0; the generator now respects those protocol limits.",
    },
  },
  {
    version: "0.5",
    date: { ru: "Эволюция", en: "Evolution" },
    title: { ru: "MergeKeys и vpn://", en: "MergeKeys and vpn://" },
    icon: "GitMerge",
    color: "green",
    desc: {
      ru: "Модуль MergeKeys — декодирование, патчинг и объединение vpn://-ключей прямо в браузере. Поддержка pako/zlib, base64url-кодек с 4-байтным заголовком.",
      en: "The MergeKeys module: decoding, patching and merging vpn:// keys entirely in the browser, with pako/zlib support and a base64url codec carrying a 4-byte header.",
    },
  },
  {
    version: "0.6",
    date: { ru: "Browser FP", en: "Browser FP" },
    title: {
      ru: "Browser Fingerprint и QUIC/HTTP3",
      en: "Browser fingerprint and QUIC/HTTP3",
    },
    icon: "Eye",
    color: "amber",
    desc: {
      ru: "Профильные таблицы размеров пакетов по браузерам (Chrome, Firefox, Safari, Yandex). Адаптивный паддинг для QUIC Initial, 0-RTT и HTTP/3.",
      en: "Per-browser packet size tables (Chrome, Firefox, Safari, Yandex) and adaptive padding for QUIC Initial, 0-RTT and HTTP/3.",
    },
  },
  {
    version: "0.7",
    date: { ru: "Дизайн", en: "Design" },
    title: { ru: "Глобальный редизайн UI", en: "Full UI redesign" },
    icon: "Paintbrush",
    color: "green",
    desc: {
      ru: "Полная переработка интерфейса, MergeKeys в стиле основного генератора. Мобильная адаптивность, исправлен overflow CPS при малом MTU.",
      en: "The interface reworked from scratch, with MergeKeys matching the main generator. Mobile layouts, and a fix for CPS overflow at small MTU values.",
    },
  },
  {
    version: "1.0",
    date: { ru: "Перерождение", en: "Rebirth" },
    title: {
      ru: "Vue 3 + TypeScript + SPA",
      en: "Vue 3 + TypeScript + SPA",
    },
    icon: "Sparkles",
    color: "amber",
    desc: {
      ru: "Миграция на Vue 3, Vite и TypeScript. Компонентная архитектура, SPA-роутинг, статический хостинг с pre-render заглушками. Интерфейс переписан с нуля.",
      en: "Migration to Vue 3, Vite and TypeScript. Component architecture, SPA routing, static hosting with pre-rendered stubs, and an interface rewritten from scratch.",
    },
  },
  {
    version: "1.1",
    date: { ru: "Расширение", en: "Expansion" },
    title: {
      ru: "AWG 2.0, CPS и 7+ профилей",
      en: "AWG 2.0, CPS and 7+ profiles",
    },
    icon: "Layers",
    color: "green",
    desc: {
      ru: "AWG 2.0 с диапазонами H1–H4 и S3/S4, полная цепочка I1–I5. Семь профилей мимикрии. Система обратной связи с автоусилением и история генераций.",
      en: "AWG 2.0 with H1–H4 ranges and S3/S4, the full I1–I5 chain, seven mimicry profiles, a feedback loop that strengthens parameters automatically, and generation history.",
    },
  },
  {
    version: "1.2",
    date: { ru: "Инфра", en: "Infra" },
    title: {
      ru: "SPA-роутинг, донаты, деплой",
      en: "SPA routing, donations, deployment",
    },
    icon: "Globe",
    color: "amber",
    desc: {
      ru: "Относительные пути для file://, определение base path в рантайме, pre-render заглушки для поисковых ботов. CI/CD: сборка, деплой, релиз.",
      en: "Relative paths for file://, runtime base-path detection, pre-rendered stubs for crawlers, and a build → deploy → release pipeline.",
    },
  },
  {
    version: "2.0",
    date: { ru: "Релиз 2.0", en: "Release 2.0" },
    title: {
      ru: "Режим роутера, инспектор, композитные профили",
      en: "Router mode, inspector, composite profiles",
    },
    icon: "Star",
    color: "green",
    desc: {
      ru: "Режим роутера для NanoPi, Keenetic и OpenWrt. Инспектор и редактор vpn://-ключей. Композитные профили TLS→QUIC и QUIC Burst. Проверка доступности доменов и 133+ автотеста.",
      en: "Router mode for NanoPi, Keenetic and OpenWrt. A vpn:// key inspector and editor. Composite TLS→QUIC and QUIC Burst profiles. Domain reachability checks and 133+ automated tests.",
    },
  },
  {
    version: "2.1",
    date: { ru: "Инфра", en: "Infra" },
    title: {
      ru: "Исправление SPA-редиректов и умная 404",
      en: "SPA redirect fix and a smarter 404",
    },
    icon: "Bug",
    color: "red",
    desc: {
      ru: "Инцидент с маршрутизацией: из-за конфликта SPA-редиректов прямые ссылки открывались белым экраном. Починено. Добавлена умная 404 с ручным фолбэком и мульти-хостинг для GitLab, GitHub и Cloudflare.",
      en: "A routing incident: conflicting SPA redirects turned direct links into a blank page. Fixed, with a smarter 404 carrying a manual fallback and multi-host support for GitLab, GitHub and Cloudflare.",
    },
  },
  {
    version: "3.0",
    date: { ru: "Релиз 3.0", en: "Release 3.0" },
    title: { ru: "Архитектурный апгрейд", en: "Architecture upgrade" },
    icon: "Cpu",
    color: "green",
    desc: {
      ru: "Монолитный generator.ts разобран на модули. Math.random() заменён на crypto.getRandomValues(). Жёсткий лимит S4 ≤ 32 и матрица совместимости клиентов.",
      en: "The monolithic generator.ts split into modules. Math.random() replaced with crypto.getRandomValues(). A hard S4 ≤ 32 limit and a client compatibility matrix.",
    },
  },
  {
    version: "3.1",
    date: { ru: "Инструменты", en: "Tooling" },
    title: {
      ru: "Health Checker, Batch, Simulator, Worker",
      en: "Health checker, batch, simulator, worker",
    },
    icon: "ShieldCheck",
    color: "amber",
    desc: {
      ru: "Проверка конфигов с клиентской валидацией. Batch-генерация до 1000 конфигов в Web Worker. Симулятор пакетов с визуализацией handshake. Формальный JSON-экспорт Amnezia VpnConfig.",
      en: "Config health checking with client-aware validation. Batch generation of up to 1000 configs in a Web Worker. A packet simulator visualising the handshake. Formal Amnezia VpnConfig JSON export.",
    },
  },
  {
    version: "3.2.0",
    date: { ru: "Крупный релиз", en: "Major release" },
    title: {
      ru: "Протокол AWG 3.0, английская версия, FAQ",
      en: "AWG 3.0 protocol, English locale, FAQ",
    },
    icon: "ShieldCheck",
    color: "green",
    desc: {
      ru: "Поддержка протокола AmneziaWG 3.0, выверенная по исходникам amneziawg-go v3.0.1, а не по документации: она на тот момент описывала 2.0. HeaderProtectionKey (ChaCha20, base64 в .conf и hex по UAPI), ContentPaddingAddition и рандомизация таймеров протокола. Оттуда же правило, которого нет ни в одной документации: при защите заголовков S1–S4 должны быть не меньше 12, потому что nonce шифра берётся из первых 12 байт S-паддинга. Английская локализация: собственное дерево /en, hreflang и canonical, каталог EN типизирован по RU — пропущенный перевод ломает сборку. FAQ с поиском, категориями и разметкой FAQPage вместо прежней «Базы знаний». Симулятор пакетов научился 1.0, 1.5, 2.0 и 3.0. Страница VAIEXIA вместо IAA, крипто-донаты, страница «О проекте» с этой хронологией. Эмодзи заменены иконками Lucide, свои OG-изображения для каждой страницы, автономный shell-генератор scripts/awg-gen.sh. Починена история генераций: она переживает перезагрузку и восстанавливает конфиг, а не только копирует его.",
      en: "Support for the AmneziaWG 3.0 protocol, derived from the amneziawg-go v3.0.1 sources rather than the documentation, which still described 2.0 at the time. HeaderProtectionKey (ChaCha20, base64 in .conf and hex over UAPI), ContentPaddingAddition, and randomised protocol timers. The same sources yielded a rule no documentation carries: with header protection on, S1–S4 must be at least 12, because the cipher nonce is taken from the first 12 bytes of the S padding. English localisation on its own /en tree with hreflang and canonical tags; the EN catalogue is typed against RU, so a missing translation breaks the build. A searchable, categorised FAQ with FAQPage structured data, replacing the old knowledge base. The packet simulator learned 1.0, 1.5, 2.0 and 3.0. The VAIEXIA page replacing IAA, crypto donations, and an About page carrying this timeline. Emoji replaced with Lucide icons, per-page OG images, and a standalone shell generator in scripts/awg-gen.sh. Generation history fixed: it survives a reload and restores a config instead of only copying it.",
    },
  },
  {
    version: "3.2.1",
    date: { ru: "Инцидент CI", en: "CI incident" },
    title: {
      ru: "Внедрение кода в пайплайне",
      en: "Script injection in the pipeline",
    },
    icon: "Bug",
    color: "red",
    desc: {
      ru: "Релиз 3.2.0 упал на сборке. Причина оказалась серьёзнее самого падения: подстановки ${{ }} стояли прямо в теле run:, то есть содержимое подставлялось в shell до его запуска. Заголовок ветки или тега мог выполниться как команда на раннере. Переведено на передачу через env:, шаги ужесточены, разобраны места, где bash -e молча продолжал после ошибки.",
      en: "The 3.2.0 release failed to build, and the cause turned out to be worse than the failure: ${{ }} substitutions sat directly in run: bodies, so their contents were pasted into the shell before it ran. A branch or tag name could execute as a command on the runner. Moved to env: passing, with steps hardened and the places where bash -e silently continued after an error cleaned up.",
    },
  },
  {
    version: "3.2.2",
    date: { ru: "Автономность", en: "Self-contained" },
    title: {
      ru: "Гайд по полям, awg-serve, README в архиве",
      en: "Field guide, awg-serve, archive README",
    },
    icon: "Cpu",
    color: "amber",
    desc: {
      ru: "Три вещи, которых людям не хватало. В FAQ появилась рекреация формы параметров клиента Amnezia — шестнадцать полей в том же порядке, заполненных вашими сгенерированными значениями, с копированием по клику. Названия полей остаются английскими в обеих локалях: клиент подписывает их по-английски независимо от языка интерфейса, и перевод отправил бы читателя искать текст, которого нет на экране. awg-serve — статический сервер на Rust без зависимостей, около 230 КБ, только std, собирается нативно под каждую ОС и кладётся в релизный архив, чтобы скачанный проект запускался без установки чего-либо. Обход каталога отклоняется посегментно, сырой и percent-encoded; проверено через сырые сокеты, потому что curl нормализует такие пути на своей стороне и скрыл бы дырявую реализацию. В архив добавлен двуязычный README, а лаунчеры serve.sh и serve.ps1 научились находить dist где угодно.",
      en: "Three things people kept needing. The FAQ gained a recreation of the Amnezia client's parameter form — sixteen fields in the app's own order, filled with your generated values, click to copy. Field names stay in English in both locales: the client labels them in English whatever its interface language, and translating them would send a reader looking for text that is not on their screen. awg-serve is a dependency-free static server in Rust, roughly 230 KB, std only, built natively per OS and bundled into the release archive so a download runs with nothing installed. Path traversal is refused component by component, raw or percent-encoded, verified over raw sockets because curl normalises such paths client-side and would have hidden a broken implementation. The archive also ships a bilingual README, and the serve.sh / serve.ps1 launchers learned to find dist wherever they are.",
    },
  },
  {
    version: "3.2.3",
    date: { ru: "Разбор параметров", en: "Parameter classes" },
    title: {
      ru: "Одна таблица версий и разбор параметров по классам",
      en: "One version table, and parameters sorted by class",
    },
    icon: "Layers",
    color: "green",
    desc: {
      ru: "**Панель параметров при выбранной 3.0 рисовала форму 1.x:** пропадали `S3/S4`, а `H1–H4` показывались одним числом вместо диапазона — при том что сам `.conf` был верным.\n\n## Одна таблица версий\n\nПричина оказалась не в опечатке: «современную» версию каждый из шести файлов определял своей парой литералов, и один из них про 3.0 не знал. Теперь возможности версии объявлены один раз в `generator/versions.ts`, и генератор, рендер, симулятор, валидатор, гайд по полям и вкладки читают их оттуда — AmneziaWG 4.0 добавляется одной записью, *а неизвестная версия отрисовывается по самой полной форме вместо пустой панели*.\n\nЗаодно `S3/S4` перестали генерироваться там, где версия их не использует: раньше они создавались всегда и лишь прятались рендером.\n\n## Какие параметры обязаны совпадать\n\nПриёмная сторона опознаёт пакет своими S и H — проверено по исходникам [`amneziawg-go`](https://github.com/amnezia-vpn/amneziawg-go/blob/master/device/receive.go), а не по документации. Совпадать обязаны `S1–S4`, `H1–H4` и `HeaderProtectionKey`. Клиентские — `Jc`, `Jmin`, `Jmax`, цепочка `I1–I5` и `ContentPaddingAddition`: у каждого устройства могут быть свои, и **разные значения лучше одинаковых** — одинаковый у сотни клиентов мусорный поезд даёт DPI готовый шаблон.\n\nПрежняя формулировка «все параметры 3.0 должны совпадать» была неверной и жила в трёх ответах FAQ, в README релизного архива и в шапке каждого конфига из `awg-gen.sh`.\n\n## Читаемость и мелочи\n\nFAQ вырос с 33 до 44 ответов. Длинные имена 3.0 больше не сливаются — *у них был uppercase, стиравший границы слов*. История генераций пишется сразу, а не через таймер, и открывается под своей кнопкой.\n\nРелизный пайплайн наконец читает сообщение аннотированного тега: раньше релиз описывался только списком коммитов. Устаревшие команды запуска из заметок убраны.",
      en: "**With 3.0 selected, the parameter panel rendered a 1.x shape:** `S3/S4` disappeared and `H1–H4` showed a single value instead of a range, even though the `.conf` underneath was correct.\n\n## One version table\n\nThe cause was not a typo: each of six files decided what a modern version was with its own pair of literals, and one of them had never heard of 3.0. Version capabilities are now declared once in `generator/versions.ts`, and the generator, renderer, simulator, validator, field guide and version tabs all read from it — AmneziaWG 4.0 becomes a single entry, *and an unknown version renders with the richest shape instead of a blank panel*.\n\n`S3/S4` also stopped being generated for versions that do not use them; they used to be drawn every time and merely hidden at render.\n\n## Which parameters must match\n\nThe receiving side identifies a packet using its own S and H values — checked against the [`amneziawg-go`](https://github.com/amnezia-vpn/amneziawg-go/blob/master/device/receive.go) sources rather than the documentation. `S1–S4`, `H1–H4` and `HeaderProtectionKey` have to be identical. The client-side ones are `Jc`, `Jmin`, `Jmax`, the `I1–I5` chain and `ContentPaddingAddition`: they may differ per device, and **varied values beat identical ones** — one junk train shared by a hundred clients hands DPI a template.\n\nThe old claim that every 3.0 parameter must match was wrong and had spread to three FAQ answers, the release archive README and the header of every config `awg-gen.sh` emits.\n\n## Readability and smaller things\n\nThe FAQ grew from 33 answers to 44. Long 3.0 names no longer run together — *they were uppercased, which erased every word boundary*. Generation history is written immediately rather than behind a timer, and opens under its own button.\n\nThe release pipeline finally reads the annotated tag message; releases used to be described by a list of commits alone. Stale run instructions are gone from the notes.",
    },
  },
  {
    version: "3.2.4",
    date: { ru: "Текст", en: "Text" },
    title: {
      ru: "Текст, который можно читать",
      en: "Text you can actually read",
    },
    icon: "Paintbrush",
    color: "amber",
    desc: {
      ru: "**44 ответа FAQ и вся эта хронология были сплошными абзацами без единого выделения.** Формально верно, читать невозможно: правило и оговорка выглядели одинаково, а имя параметра терялось в прозе.\n\n## Почему не просто HTML\n\nОтветы используются дважды: рендерятся на странице и уходят в разметку `FAQPage` JSON-LD, где разметки быть не должно. Хранить HTML значило бы сломать второе применение, хранить плоский текст — первое.\n\nПоэтому источник несёт минимальный набор знаков: пустая строка на абзац, `##` и `###` на подзаголовки, `**жирный**` для того, что нельзя пропустить, `*курсив*` для оговорок, бэктики для имён, которые пишутся точно, и ссылки на исходники. Страница рендерит их элементами, а структурированные данные и поисковый индекс получают текст очищенным. *HTML не появляется нигде, поэтому экранировать нечего и внедрять некуда*; схемы ссылок проверяются по списку разрешённых при разборе.\n\n## Проверка\n\nПереформатирование не имело права изменить ни слова, и это проверено машинно: очищенный текст всех 88 строк совпал с исходным побайтово. Тесты держат инвариант дальше — парность знаков, отсутствие разметки в JSON-LD и запрет на ответ длиннее экрана без единого абзаца.",
      en: "**Forty-four FAQ answers and this whole timeline were solid paragraphs with no emphasis anywhere.** Technically correct and unreadable: a rule and an aside looked identical, and a parameter name vanished into the prose.\n\n## Why not just HTML\n\nAnswers are used twice: rendered into the page, and emitted into `FAQPage` JSON-LD, which must not carry markup. Storing HTML would break the second use; storing flat text broke the first.\n\nSo the source carries a minimal set of marks: a blank line for a paragraph, `##` and `###` for subheadings, `**bold**` for what must not be missed, `*italic*` for caveats, backticks for names spelled exactly, and links to sources. The page renders them as elements, while the structured data and the search index get the text stripped. *No HTML exists anywhere in the pipeline, so there is nothing to escape and nothing to inject*; link schemes are checked against an allowlist at parse time.\n\n## Verification\n\nReformatting was not allowed to change a single word, and that was checked mechanically: the stripped text of all 88 strings matched the original exactly. Tests hold the invariant from here — balanced marks, no markup reaching JSON-LD, and no answer longer than a screenful left as one unbroken block.",
    },
  },
  {
    version: "4.0",
    date: { ru: "23.08.2026", en: "Aug 23, 2026" },
    title: {
      ru: "Два движка, один инструмент",
      en: "Two engines, one tool",
    },
    icon: "Rocket",
    color: "amber",
    desc: {
      ru: "**Самое большое изменение с первого прототипа: инструмент перестал быть генератором для одного протокола.**\n\n## XRay встал рядом с AmneziaWG\n\nДвижок написан и проверен против выпущенных ядер в Docker — по одному ядру на версию. К нему появился интерфейс: девяносто семь параметров каталога на двух страницах, каждый со своим состоянием — *подбирается сам, задаётся вами, или пока не выражается*. Секции появляются и исчезают по составу конфига: на `raw` нет XHTTP, на `tls` нет REALITY, и грид смыкается сам.\n\n## Форма вместо списка\n\nГенератор AmneziaWG перерисован: каждая группа параметров нарисована как то, чем она управляет. Junk-поезд — поездом, паддинг — полосами в масштабе, заголовки — четырьмя отрезками на одной оси. Последнее и оправдывает подход: единственное правило `H1–H4` в том, что диапазоны не пересекаются, и четыре пары десятизначных чисел в списке проверить глазом нельзя, а на общей оси это единственное, что видно.\n\n## Что нашлось по дороге\n\nПроверка обнаружила, что **рассогласование донора REALITY и SNI не ловилось вообще**: сертификат приходит от одного сайта, имя запрошено от другого, и это видно на проводе. Теперь есть правило с тестами.\n\nРазвёртка на шестистах генерациях подтвердила обратное про сам генератор: ни ключи, ни идентификаторы, ни shortId не повторяются — инструмент не подписывает свою работу.\n\n## Внешность\n\nБренд-кит: токены, примитивы и оболочка в `assets/kit/`, светлая схема, которой раньше не было, шесть акцентов по страницам. Обе схемы проходят WCAG AA на каждой странице — измерено обходом всех текстовых узлов, а не на глаз.\n\n## Клиент и движок — разные вещи\n\n**Набор тегов в `I1–I5` разбирает не приложение, а туннель внутри него, и матрица этого не знала.** Четыре записи объявляли один и тот же `amneziawg-go/v3 v3.0.1` и держали три разных ответа про `<c>` — при том что в go этого тега нет ни в одной версии, он есть только в модуле ядра Linux. Обратно работало так же: `<rc>` и `<rd>` были запрещены клиентам, у которых они есть с самого появления тегов.\n\nТеперь движок — отдельная сущность, клиент его называет, флаги выводятся. Расходиться больше нечему. Заодно тег перестал пропадать молча: если движок его не примет, галка гаснет и панель говорит, что снято и почему.\n\nКлиентов стало тринадцать, и почти для каждого движок установлен по манифесту: добавились mihomo / Clash.Meta, OPNsense и сам модуль ядра отдельной строкой. Нашлось и то, чего не искали: **WireSock цепочку I1–I5 не отправляет вовсе**, а поля принимает и молча выбрасывает — туннель поднимается, теряется ровно маскировка. Флаг `supportsI1I5` при этом был объявлен и никем не читался.\n\n## Кузня ключей\n\nMergeKeys разобран на движок `engines/keys/` и по компоненту на режим: разбор, слияние, обфускация, сборка. Читает `vpn://`, `vless://`, `.json` и `.conf`, показывает конфиг в любом из трёх видов с подсветкой по смыслу значений, и в этих же видах даёт его править.\n\n## После пре-релиза\n\n**Симулятор перестал знать протоколы, чтобы показывать любой из них.** Страница резолвит движок по имени и читает виды пакетов, легенду и сами пакеты из его симулятора; что означает приватное поле пакета, описывает тот движок, который его породил. Заодно вскрылось, что *эстафета конфига была сломана с рефакторинга MergeKeys*: запись в sessionStorage потерялась, и симулятор с гайдом по полям всё это время показывали пустоту за полностью рабочим видом. XRay дождался своей кнопки.\n\n## Экспорт для mihomo и панелей\n\nmihomo (Clash.Meta) говорит на собственном YAML-диалекте, и генератор выдаёт прокси-блок рядом с `.conf` — сверено с исходником `wireguard.go`, а не только с вики: H1–H4 и таймеры там строки, так что наши диапазоны проходят без преобразований, а `version: 3` ставится только для 3.0, потому что в mihomo это переключатель реализации устройства. Кнопки видят те, кто выбрал mihomo клиентом.\n\nПричина «input error» в x3-ui нашлась и оказалась гонкой имён: ядро переименовало tcp в raw, панель знает только старое имя и отвергает блок целиком. Ядро принимает оба написания, поэтому **отдельная кнопка «для панели» переименовывает ровно эти два места и больше ничего**.\n\n## AWG 3.1\n\nRandomTrailers и DisableCookies — по тегам amneziawg-go v3.1 и master amneziawg-tools, не по документации: она всё ещё описывает 2.0. Оба ключа — новый словарь, устройство 3.0 отвергнет их на парсе, поэтому рендер пишет их только там, где версия их читает, а конфиг 3.1 с выключенными флагами парсится обратно как 3.0 — *на проводе он и есть 3.0*. DisableCookies по умолчанию выключен осознанно: без cookie ответов ломается keepalive за NAT под нагрузкой.",
      en: "**The largest change since the first prototype: the tool stopped being a generator for one protocol.**\n\n## XRay stands beside AmneziaWG\n\nThe engine was written and tested against released cores in Docker, one core per version. It has an interface now: ninety-seven catalogued parameters across two pages, each showing its state — *chosen for you, set by you, or not yet expressible*. Sections appear and disappear with the shape of the config: no XHTTP on `raw`, no REALITY on `tls`, and the grid closes its own gaps.\n\n## Drawn rather than listed\n\nThe AmneziaWG generator was redrawn so that each group of parameters is drawn as the thing it controls. The junk train as a train, the padding as bars to scale, the headers as four spans on one axis. That last one justifies the approach: the only rule `H1–H4` have is that their ranges must not overlap, and four pairs of ten-digit numbers in a list make that impossible to check by eye — on a shared axis it is the only thing you can see.\n\n## What turned up on the way\n\nA review found that **a mismatch between the REALITY donor and the SNI was not caught at all**: the certificate comes from one site while the name asked for is another, and that is visible on the wire. There is a rule for it now, with tests.\n\nA sweep over six hundred generations confirmed the opposite about the generator itself: no key, identity or shortId repeats. The tool does not sign its own work.\n\n## The look\n\nA brand kit — tokens, primitives and the shell in `assets/kit/` — a light scheme that did not exist before, and six accents, one per page. Both schemes clear WCAG AA on every page, measured by walking every rendered text node rather than by eye.\n\n## A client and an engine are different things\n\n**What parses the tags in `I1–I5` is not the app but the tunnel inside it, and the matrix did not know that.** Four entries declared the same `amneziawg-go/v3 v3.0.1` and held three different answers about `<c>` between them — while go has that tag in no version at all; it exists only in the Linux kernel module. The reverse ran too: `<rc>` and `<rd>` were denied to clients that have had both since the tags existed.\n\nThe engine is its own thing now, a client names it, and the flags follow. There is nothing left to disagree. A tag also stopped disappearing quietly: where the engine will not take it, the box goes dark and the panel says what was withdrawn and why.\n\nThere are thirteen clients, and for nearly all of them the engine is established from a manifest: mihomo / Clash.Meta, OPNsense and the kernel module itself have been added. Something turned up that nobody was looking for: **WireSock does not send an I1–I5 chain at all**, and accepts the fields only to throw them away — the tunnel comes up and exactly the mimicry is missing. `supportsI1I5` had been declared all along and read by nothing.\n\n## The key workbench\n\nMergeKeys was split into an `engines/keys/` engine and one component per mode: inspect, merge, refresh, build. It reads `vpn://`, `vless://`, `.json` and `.conf`, shows a config in any of three views coloured by what the values mean, and lets you edit it in those same views.\n\n## After the pre-release\n\n**The simulator stopped knowing protocols so it can show any of them.** The page resolves an engine by name and reads packet kinds, legend and packets from its simulator; what a packet's private fields mean is described by the engine that produced them. Along the way the hand-off turned out to have been broken since the MergeKeys rework: a sessionStorage write had been lost, and the simulator and the field guide showed empty states behind a fully working view. XRay got a button of its own.\n\n## Exports for mihomo and panels\n\nmihomo (Clash.Meta) speaks a YAML dialect of its own, and the generator now emits a proxy block beside the .conf — checked against the wireguard.go source rather than the wiki alone: H1–H4 and the timers are strings there, so our ranges pass through untouched, and version: 3 is written for 3.0 only, because in mihomo that field is the device implementation switch. The buttons appear for those who picked mihomo as their client.\n\nThe x3-ui input error turned out to be a naming race: the core renamed tcp to raw, the panel knows only the old name and rejects the block whole. The core takes both spellings, so **a separate panel download renames exactly those two places and nothing else**.\n\n## AWG 3.1\n\nRandomTrailers and DisableCookies — from the amneziawg-go v3.1 tags and amneziawg-tools master rather than the docs, which still describe 2.0. Both keys are new vocabulary that a 3.0 device refuses at parse, so the renderer writes them only where the version reads them, and a 3.1 config with both switches off parses back as 3.0 — *on the wire it is one*. DisableCookies defaults off on purpose: without cookie replies, keepalive behind NAT breaks under load.",
    },
  },
  {
    version: "4.1.0",
    date: { ru: "05.09.2026", en: "Sep 05, 2026" },
    title: { ru: "Всё вставилось без танцев", en: "Paste without dancing" },
    icon: "Wrench",
    color: "green",
    desc: {
      ru: "**Патч-релиз, который закрыл всё, что мешало «вставилось без танцев».**\n\n## MergeKeys — .conf снова в синхроне (4.0 regression)\n\nКонтейнер хранит один конфиг трижды — `awg.Jc`, `last_config` JSON и wg-quick текст, причём последний дважды. `applyObfPatchToAwg` (`src/engines/keys/patch.ts:140`) трогал только три места, поэтому после refresh `vpn://` и `json` обновлялись, а `.conf` оставался старым. Теперь один `JSON.parse` на `last_config` зеркалит все 4 копии. Добавлены `randomAwgKey` 3.0/3.1 и 11 регресс-тестов.\n\n## XRay — панель для 3x-ui\n\n`inboundSettings` писала только `id`+`flow`, 3x-ui 3.6.0 требовал `email` (`VlessClientSchema`). `buildPanelInbound` теперь добавляет `email=id.slice(0,8)` с `-n` при коллизии в batch — только панельная ветка, на провод не влияет. Поправлена подсказка `needAddress` — была «Донор REALITY», стала «Ваш сервер».\n\n## 3.1 — инструменты понимают `1/0`\n\nGo читает `true|1|on`, `awg-tools` — только `1/0`. Писали `true` — tools падали. `render.ts:230` теперь пишет `1`/`0`, причём если один из `RandomTrailers`/`DisableCookies` вкл. — обе строки, если оба выкл. — ничего.\n\n## Узкие H1-H4\n\nШирокие `H1-H4` (до 100M) в `amneziawg-go 3.1` дают всплеск CPU на классификации заголовков и misclassify при `HeaderProtection`. Добавлен `useNarrowH` — `DrawContext.narrowH`, `headerZones` `~20k/30k`, UI тумблер «Уменьшить разброс H1–H4» только для `3.1 && HeaderProtection` с подробным описанием (`gen.narrowH.*`).\n\n## Прибрано\n\nБуквальный дубликат `extractWgQuick` vs `extractConf` вынесен в `keys/wgQuick.ts:1` `getAwgWgQuick`. 69 файлов, 1015 тестов — зелёные.",
      en: "**A patch that finally makes “paste without dancing” true.**\n\n## MergeKeys — .conf back in sync (4.0 regression)\n\nA container stores the same config three times — `awg.Jc`, `last_config` JSON and wg-quick, the last twice. `applyObfPatchToAwg` touched only three, so refresh updated `vpn://` and `json` but `.conf` stayed stale. Now one `JSON.parse` on `last_config` mirrors all 4 copies. Added `randomAwgKey` 3.0/3.1 and 11 regression tests.\n\n## XRay — 3x-ui panel\n\n`inboundSettings` wrote only `id`+`flow`, 3x-ui 3.6.0 requires `email`. `buildPanelInbound` now adds `email=id.slice(0,8)` with `-n` on collision — panel branch only, nothing on the wire. Fixed `needAddress` hint — was “donor”, now “Your server”.\n\n## 3.1 — tools understand `1/0`\n\nGo reads `true|1|on`, tools only `1/0`. Wrote `true` — tools failed. `render.ts:230` now writes `1`/`0`, both when one is on, none when both off.\n\n## Narrow H1-H4\n\nWide `H1-H4` (100M) in `amneziawg-go 3.1` spike CPU and misclassify with HeaderProtection. Added `useNarrowH` — `DrawContext.narrowH`, `headerZones` ~20k/30k, UI toggle “Reduce H1–H4 spread” only for `3.1 && HeaderProtection` with full note (`gen.narrowH.*`).\n\n## Tidied\n\nLiteral duplicate `extractWgQuick` vs `extractConf` pulled into `keys/wgQuick.ts:1`. 69 files, 1015 tests green.",
    },
  },
  {
    version: "4.1.1",
    date: { ru: "06.09.2026", en: "Sep 06, 2026" },
    title: { ru: "Кэш, debounce и тишина в простое", en: "Cache, debounce and idle silence" },
    icon: "Activity",
    color: "amber",
    desc: {
      ru: "**Производительность в фокусе — чтобы вкладка не жгла 90% на 8 ядрах в простое.**\n\n## Кэш\n\nШрифты (`*.woff2`) и `favicon.*` теперь год (`max-age=31536000, immutable`) — фавикон редко меняется, сброс через ключ кэша. `/_headers` и `deploy-mirror.yml` обновлены, `assets/*` уже был год. Повторный визит в неделю экономит ~100 КБ.\n\n## Дебаунс\n\n`customHost` (`AmneziaWgView.vue:1116`) был `@input=\"generate()\"` — быстрый набор `ya.ru` =5 `genCfg` подряд. Теперь `onCustomHostInput` 300ms debounce с `onUnmounted` очисткой. `useKeyWorkbench` — `FIELD_RE` предкомпиляция, `debouncedRef 180ms` + `READ_CACHE 50` для `inspect`/`merge`/`refresh`/`build`, `XRay batch` чанками 10 с `setTimeout 0`, AWG порог `50→20` в воркер.\n\n## Тишина в простое\n\nПростой 90% — `MainHeader scroll` без `throttle`, `tooltip capture:scroll`, `history visible sort` на каждый `query`, `CodeView` `expandNested`+`tokenise` 2000 `<span>` без виртуализации. На очереди `rAF` throttle, `v-memo`, `history` throttle.\n\n## Страница о проекте\n\nСчётчик тестов `900+ → 1000+` (факт 1015, floor), `4.0` `Готовится → 23.08.2026 Выпущено`, добавлены `4.1.0` и `4.1.1` секции. `package.json` `4.1.0 → 4.1.1`.",
      en: "**Performance in focus — so an idle tab no longer burns 90% on 8 cores.**\n\n## Cache\n\nFonts (`*.woff2`) and `favicon.*` now a year (`max-age=31536000, immutable`) — favicon rarely changes, bust via key. `/_headers` and `deploy-mirror.yml` updated, `assets/*` already a year. A weekly repeat saves ~100 kB.\n\n## Debounce\n\n`customHost` was `@input=\"generate()\"` — typing `ya.ru` fired 5 `genCfg`. Now `onCustomHostInput` 300ms debounce. `useKeyWorkbench` — `FIELD_RE` precompile, `debouncedRef 180ms` + `READ_CACHE 50`, `XRay batch` chunked 10, AWG threshold `50→20`.\n\n## Idle silence\n\nIdle 90% — `MainHeader scroll` no throttle, `tooltip capture`, `history visible sort` per `query`, `CodeView` 2000 spans. Next: `rAF` throttle, `v-memo`, `history` throttle.\n\n## About\n\nTests `900+ → 1000+` (actual 1015), `4.0` `In preparation → Aug 23, 2026 Released`, added `4.1.0` and `4.1.1`. `package.json` `4.1.0 → 4.1.1`.",
    },
  },
  {
    version: "4.2.0",
    date: { ru: "06.09.2026", en: "Sep 06, 2026" },
    title: {
      ru: "Что на самом деле жгло процессор",
      en: "What was actually burning the CPU",
    },
    icon: "Bug",
    color: "red",
    desc: {
      ru: "**Тишина в простое, вторая половина: то, что 4.1.1 оставила на потом.**\n\n## DTLS 1.3\n\nПрофиль мимикрии говорил `DTLS 1.3`, а по проводу слал 1.2 (`0xFEFD`, RFC 6347). Теперь профилей два: `DTLS 1.2` шлёт то же, что раньше, а новый `DTLS 1.3` собран по RFC 9147 — framing тот же, версия заявляется расширением `supported_versions` (`0xFEFC`). Старый id `dtls` в сохранённых конфигах и ссылках молча читается как 1.2.\n\n## Amnezia VPN и HeaderProtectionKey\n\nПриложение управляет ключом само — переключателем у себя, ключ генерирует само. Поэтому для клиента Amnezia VPN генератор ключ больше не выдаёт (галка в 3.x-зоне прячется, рядом пишется причина), а S-флор уходит вместе с ключом.\n\n## Виновник был в таблице стилей\n\nПрофиль JavaScript показал бы пустоту: ни опроса, ни интервала, ни живого observer. Жгла `.sheet-grain` — слой в **четыре вьюпорта** (`inset: -50%; width/height: 200%`) с маской из SVG `feTurbulence` и бесконечной анимацией. Маскированный слой композитор не умеет просто двигать: каждый тик анимации — перерисовка целиком на главном потоке. Четыре вьюпорта шума шестьдесят раз в секунду — это и есть ядро в простое. Теперь слой размером в вьюпорт плюс ход анимации, `translate3d` и `will-change`: трансформ стал работой композитора, а не отрисовки.\n\n## Анимации, которые красят\n\n`.dot--live` и `.glow-pulse` анимировали `box-shadow`. Тень — это отрисовка, а не свойство, которое композитор умеет интерполировать, поэтому каждый кадр вечной петли просил главный поток перерисовать элемент. Китовский комментарий про `.badge-glow` это уже объяснял двумястами строками выше — просто не про эти два правила. Ореол переехал на псевдоэлемент и двигает только `transform` и `opacity`.\n\n## Главный поток\n\n`MainHeader` слушал `scroll` без `passive` и без троттлинга: браузер ждал обработчик, прежде чем скроллить, и вызывал его по несколько раз за кадр. Теперь `rafThrottle` (`src/utils/raf.ts`) — один вызов на кадр и `passive`, а присваивание только когда порог реально перейдён.\n\n`tooltip` слушал `scroll` с `capture: true`, то есть видел скролл каждого скроллящегося элемента в документе, и на каждый писал два атрибута в DOM — даже когда подсказка ни разу не показывалась. Теперь `hide()` выходит сразу, если прятать нечего.\n\n## Мелочи, которые не мелочи\n\n`CodeView`: сканер JSON компилировал `RegExp` на каждый символ и дважды классифицировал каждое значение, выбирая между двумя одинаковыми ветками. Оба вынесены в `src/utils/codeTokens.ts`. `useHistory` больше не пересобирает поисковую строку каждой записи на каждое нажатие. Воркер, умерший до ответа, больше не оставляет `isRunning` включённым — а с ним и вечный спиннер.\n\n## Баннер зеркала\n\nПеределан: `nowrap` и обрезка ушли, а на узком экране текст больше не прячется. Именно `display: none` на тексте и был главной косой старой версии — оставался бейдж «зеркало» без адреса, то есть ровно без того, зачем баннер нужен. Чип теперь китовский `.badge`, высота через `--mirror-h` меняется на брейкпоинте вместе со смещением хедера.\n\n## Тесты\n\n139 новых, всего 1154. Главный из них — `src/__tests__/idle-cost.test.ts`: он читает таблицы стилей и падает на бесконечную анимацию, которая красит главный поток, на петлю внутри `.vue` и на слушатель скролла без `passive`. Это ровно тот класс бага, с которого всё началось, и теперь он не вернётся молча.",
      en: "**Idle silence, second half: what 4.1.1 left for later.**\n\n## DTLS 1.3\n\nThe mimicry profile said `DTLS 1.3` while sending 1.2 on the wire (`0xFEFD`, RFC 6347). There are two profiles now: `DTLS 1.2` sends what it used to, and the new `DTLS 1.3` follows RFC 9147 — same framing, version announced in the `supported_versions` extension (`0xFEFC`). The old `dtls` id in saved configs and links silently reads as 1.2.\n\n## Amnezia VPN and HeaderProtectionKey\n\nThe app manages the key itself — its own toggle, its own generated key. So for the Amnezia VPN client the generator no longer emits one (the switch in the 3.x zone hides, the reason shown next to it), and the S-floor goes with the key.\n\n## The culprit was in the stylesheet\n\nA JavaScript profile would have shown nothing: no polling, no interval, no observer left alive. `.sheet-grain` was the one — a layer **four viewports** across (`inset: -50%; width/height: 200%`), masked with an SVG `feTurbulence`, animated forever. A masked layer is not one a compositor can simply move, so every tick of the animation repainted the whole thing on the main thread. Four viewports of noise sixty times a second is what a core at idle looks like. The layer is now the viewport plus the distance the animation travels, with `translate3d` and `will-change`, so the transform is the compositor's job rather than the paint's.\n\n## Animations that paint\n\n`.dot--live` and `.glow-pulse` animated `box-shadow`. A shadow is a paint, not a property a compositor can interpolate, so every frame of a loop that never ends asked the main thread to redraw the element. The kit's own comment on `.badge-glow` had already made that argument two hundred lines up — just not about these two rules. The halo moved to a pseudo-element and now animates only `transform` and `opacity`.\n\n## The main thread\n\n`MainHeader` listened to `scroll` with neither `passive` nor a throttle: the browser waited for the handler before it could scroll, and called it several times per frame. `rafThrottle` (`src/utils/raf.ts`) makes it one call per frame and registers it `passive`, and the ref is only assigned when the threshold is genuinely crossed.\n\n`tooltip` listened to `scroll` with `capture: true`, so it saw every scroll from every scrolling element in the document and wrote two attributes into the DOM for each one — even when no tooltip had ever been shown. `hide()` now returns immediately when there is nothing to hide.\n\n## Small things that were not small\n\n`CodeView`: the JSON scanner compiled a `RegExp` per character and classified every value twice to choose between two identical branches. Both are gone, in `src/utils/codeTokens.ts`. `useHistory` no longer rebuilds every entry's haystack on every keystroke. A worker that died before answering no longer leaves `isRunning` set — and a spinner spinning forever with it.\n\n## The mirror banner\n\nRebuilt. `nowrap` and the clipping are gone, and the text is no longer hidden on a narrow screen — that `display: none` was the worst of it: a badge saying “mirror” with no address under it, which is precisely the thing the strip exists to say. The chip is the kit's `.badge` now, and the height moves with the breakpoint through `--mirror-h`, the same variable the header reads.\n\n## Tests\n\n139 new, 1154 in total. The one that matters is `src/__tests__/idle-cost.test.ts`: it reads the stylesheets and fails on an infinite animation that repaints the main thread, on a loop declared inside a `.vue`, and on a scroll listener that is not `passive`. That is exactly the class of bug this release started from, and it can no longer come back quietly.",
    },
  },
  {
    version: "4.2.1",
    date: { ru: "13.09.2026", en: "Sep 13, 2026" },
    title: { ru: "S3 = 3 не поднимал интерфейс", en: "S3 = 3 kept the interface down" },
    icon: "Bug",
    color: "red",
    desc: {
      ru: "**Патч по жалобе: конфиг с S3 = 3 и HeaderProtectionKey отклонялся устройством.**\n\n## Что случилось\n\n`awg setconf` отвечал `Invalid argument`, интерфейс не поднимался. Виновник связка из двух условий сразу: HeaderProtectionKey в конфиге и S3 меньше 12. Без ключа тот же S3 = 3 валиден, проверка это учитывает.\n\n## Какое правило настоящее\n\nСверено с исходниками обеих реализаций, а не с документацией: `amneziawg-go device/uapi.go` и модуль ядра `src/netlink.c` сверяют все четыре S с 12 только когда защита заголовков активна, во всех сборках 3.0 и 3.1. До 3.0 минимума нет вовсе. Граница именно 12, а не больше 12: в коде сравнение `value < 12`, и 12 устройство принимает.\n\n## Что теперь проверяет инструмент\n\nПроверка вставленного конфига и редактор не знали про минимум вообще, поэтому битый конфиг читался как чистый. Теперь `rules.ts` подсвечивает каждый S ниже 12 ошибкой, когда в конфиге есть HeaderProtectionKey, а проверка целого файла этот ключ тоже читает. Свежая генерация была прикрыта и раньше: генератор держит S не ниже 12 при включённой защите. Текст находки поправлен: раньше он говорил про молчаливое ослабление шифрования, а устройство на самом деле отвергает конфиг.\n\n## Тесты\n\n12 новых, всего 1181. Граница 11/12, каждый из четырёх S, конфиг из жалобы целиком и замок в обе стороны: без ключа маленький S по-прежнему рисуется и валиден.",
      en: "**A patch from a user report: a config with S3 = 3 and HeaderProtectionKey was rejected by the device.**\n\n## What happened\n\n`awg setconf` answered `Invalid argument` and the interface never came up. The culprit is two conditions at once: HeaderProtectionKey in the config and S3 under 12. Without the key the same S3 = 3 is valid, and the check knows it.\n\n## The actual rule\n\nVerified against both implementations, not the docs: `amneziawg-go device/uapi.go` and the kernel module `src/netlink.c` compare all four S values against 12 only while header protection is active, in every 3.0 and 3.1 build. Before 3.0 there is no minimum at all. The bound is 12 itself, not above 12: the code compares `value < 12`, and 12 is accepted.\n\n## What the tool checks now\n\nThe pasted-config check and the editor knew nothing about the minimum, so a broken config read as clean. Now `rules.ts` flags every S under 12 as an error when the config carries HeaderProtectionKey, and the whole-file check reads that key too. Fresh generation was already covered: the generator keeps S at 12 or above while protection is on. The finding text is fixed as well: it used to claim silent cipher weakening, while the device actually rejects the config.\n\n## Tests\n\n12 new, 1181 in total. The 11/12 boundary, each of the four S values, the reported config end to end, and the lock in both directions: without the key a small S is still drawn and still valid.",
    },
  },
  {
    version: "4.3.0",
    date: { ru: "13.09.2026", en: "Sep 13, 2026" },
    title: { ru: "Ключ, который живёт в приложении", en: "The key that lives in the app" },
    icon: "KeyRound",
    color: "green",
    desc: {
      ru: "**Защита заголовков для Amnezia VPN и режим одинаковых S из рекомендаций.**\n\n## Пол больше не смотрит на выданный ключ\n\nНашлось и закрыто продолжение жалобы #16: Amnezia VPN управляет HeaderProtectionKey сам, поэтому генератор ключ не выдавал, а вместе с ним снимал и порог S1–S4 в 12. Замер: 164 из 300 конфигов по умолчанию несли S ниже 12 прямо в шифр, который такие отвергает. Теперь порог читает включённый переключатель, а не выданную строку: ключ не пишется, sizes держатся.\n\n## Переключатель возвращён\n\nГалка HeaderProtectionKey больше не прячется для Amnezia VPN. Раз ключ живёт в приложении, в выводе вместо строки ключа пишется комментарий: включается переключателем в приложении и подхватывается при импорте .conf. Проверка вставленного конфига тоже в курсе: маленькие S без строки ключа у такого клиента это предупреждение, а не тишина.\n\n## Одинаковые S1–S4\n\nНовый переключатель для 3.1 при включённых защите и случайных хвостах: одно значение на все четыре S, как советуют рекомендации. Показывается только в этой связке осознанно: одинаковые S у всех последовавших совету это общий отпечаток, и именно случайный хвост его размывает. Мы не рекомендуем, в интерфейсе так и написано.\n\n## Тесты\n\n19 новых, всего 1200. Управляемый порог в обе стороны на 3.0 и 3.1, записка в рендере, матрица предупреждений, матрица одинаковых S.",
      en: "**Header protection for Amnezia VPN, and the identical-S mode from the recommendations.**\n\n## The floor no longer reads the emitted key\n\nA follow-up to report #16, found and closed: Amnezia VPN manages HeaderProtectionKey itself, so the generator emitted no key — and lifted the S1–S4 floor of 12 along with it. Measured: 164 of 300 default configs carried an S under 12 into a cipher that refuses them. The floor now reads the switched-on toggle rather than the emitted line: no key written, sizes held.\n\n## The switch is back\n\nThe HeaderProtectionKey checkbox no longer hides for Amnezia VPN. Since the key lives in the app, the output carries a comment instead of a key line: enabled by the in-app toggle and picked up on config import. The pasted-config check knows too: small S without a key line on such a client is a warning rather than silence.\n\n## Identical S1–S4\n\nA new switch for 3.1 with protection and random trailers on: one value for all four S, as the recommendations advise. Shown only in that combination on purpose: identical S on everyone who followed the advice is a shared fingerprint, and the random tail is what smears it. We do not recommend it, and the UI says so.\n\n## Tests\n\n19 new, 1200 in total. The managed floor both ways on 3.0 and 3.1, the render note, the warning matrix, the identical-S matrix.",
    },
  },
  {
    version: "4.3.1",
    date: { ru: "13.09.2026", en: "Sep 13, 2026" },
    title: { ru: "Тихие пояснения и свежие ответы", en: "Quieter hints, fresher answers" },
    icon: "MessageCircleQuestion",
    color: "amber",
    desc: {
      ru: "**Патч про интерфейс: переключатели заговорили по-русски, пояснения переехали под вопросик, FAQ прошёл полный аудит.**\n\n## Переключатели на русском\n\nЗащита заголовков, добавочный паддинг, случайные хвосты, отключение cookie: у каждого тумблера теперь русское название, ключ протокола остался рядом моноширинным. Рандомизация таймеров, узкие H и одинаковые S уже были именованными. Форма приложения в FAQ пополнилась недостающими полями 3.x в порядке приложения (тумблер ключа, паддинг, таймеры, хвосты, cookie) со значениями генератора, сам генератор складывает свежий конфиг туда, где форма его читает (раньше она видела только симуляторные), а внизу вкладки появилась ссылка «Не знаете, куда вставлять параметры…» прямо на форму. Поля-галки (ключ, хвосты, cookie) рисуются китовыми чекбоксами как в приложении: состояние видно, менять нечего.\n\n## Пояснения только по запросу\n\nЗаписка про управляемый ключ больше не плодится под переключателем: она живёт в «?» зоны 3.x и показывается по нажатию. Варнинг узких H, наоборот, остался видимым всегда, как положено важному: текст переработан, важность для 3.1 идёт первым предложением. Ноту про управляемый ключ список варнов клиента показывает только на 3.0+, на 1.x/2.0 там ключа нет вообще. Фильтр покрыт тестом, остальные варны не задеты.\n\n## FAQ: восемь новых, пять правок, все семьдесят одна запись проверена\n\nНовое: управляемый ключ, одинаковые S, ошибка Invalid argument, значимость H на 3.x, хвосты и cookie, экран приложения Amnezia VPN, куда задавать вопросы, когда включать узкие H. Тег AmneziaWG 3.1 собрал своё: туда переехали хвосты с cookie и одинаковые S. Правки: поддержка 3.x без ветки feat/awg3, порог в s-params, лестница 2.0/3.0/3.1, ссылки на Telegram и issues в report-problem, EINVAL в not-connecting. Остальные записи прочитаны целиком: устаревшего не осталось.\n\n## Тесты\n\n8 новых, всего 1208. Фильтр нот по версии в обе стороны и хендофф свежего конфига в форму.",
      en: "**A UI patch: Russian switch labels, hints behind the question mark, a full FAQ audit.**\n\n## Switches in Russian\n\nHeader protection, extra padding, random trailers, disabling cookies: every toggle now carries a Russian name, with the protocol key next to it in mono. Timer randomisation, narrow H and identical S already had names. The in-FAQ app form gained the missing 3.x fields in the app order (key toggle, padding, timers, trailers, cookies) filled with the generated values, the generator parks every fresh config where the form reads it (simulator hand-offs only before), and the tab bottom links “Don't know where to enter the parameters…” straight to the form. Tick-box fields (key, trailers, cookies) render as kit checkboxes like in the app: state visible, nothing to change.\n\n## Explanations on request\n\nThe managed-key note no longer multiplies under the switch: it lives behind the 3.x zone's “?” and shows on press. The narrow-H warning itself stays always visible, as an important one should: the text is reworked, 3.1 importance first. The client warning list shows the managed-key note on 3.0+ only; below that the key does not exist at all. The filter is tested, other warnings untouched.\n\n## FAQ: eight new, five fixed, all seventy-one checked\n\nNew: the managed key, identical S, the Invalid argument error, H relevance on 3.x, trailers and cookies, the Amnezia VPN app screen, where to ask, when to narrow H. The AmneziaWG 3.1 tag gathered its own: trailers with cookies and identical S moved there. Fixed: 3.x support without the feat/awg3 branch, the floor pointer in s-params, the 2.0/3.0/3.1 ladder, Telegram and issues links in report-problem, EINVAL in not-connecting. Every remaining entry was read in full: nothing stale left.\n\n## Tests\n\n8 new, 1208 in total. The per-version note filter both ways, and the fresh-config hand-off into the form.",
    },
  },
  {
    version: "4.4.0",
    date: { ru: "05.10.2026", en: "Oct 05, 2026" },
    title: {
      ru: "Разговор перед звонком",
      en: "The talk before the call",
    },
    icon: "Sparkles",
    color: "green",
    desc: {
      ru: "**Минорный релиз из ваших репортов: мимикрия под STUN / TURN, цепочки, которые принимает модуль ядра, wg-easy в списке клиентов и цена ширины H.**\n\n## STUN / TURN\n\nОбещанный профиль, который на главной висел с пометкой «скоро». Он повторяет то, что WebRTC отправляет до начала звонка: Binding к STUN-серверу (один заголовок, как у браузера), первый Allocate к TURN-релею, тот же Allocate с учётными данными и проверки связности ICE. С галкой «применять к I2-I5» цепочка проходит этот путь целиком, без неё в I1 стоит Allocate с учётными данными: единственный пакет потока, где есть хост, он идёт в REALM.\n\nИмя пользователя в формате TURN REST API, которым пользуются coturn и большинство релеев: `срок:пользователь`. ICE-проверка несёт ufrag по четыре буквы, как Chromium, или по восемь, как Firefox, PRIORITY кандидата peer-reflexive и случайный tie-breaker. Transaction ID, HMAC и tie-breaker берутся из `<r>`, то есть новые на каждую отправку. FINGERPRINT ставится только когда все байты известны заранее: CRC от байтов, которые тег допишет при отправке, посчитать нельзя, а неверный FINGERPRINT выдаёт хуже, чем отсутствующий.\n\n## I1-I5 и модуль ядра (#17)\n\nМодуль ядра принимает все атрибуты устройства одним netlink-сообщением размером в страницу: `amneziawg-tools` пишет их в буфер без проверки, а модуль при чтении отвечает `-EMSGSIZE`. На I1-I5 из этого остаётся около 3.4 КБ. Пять пакетов SIP REGISTER из репорта занимали 3820 байт, собственный полный SIP генератора доходил до 4.3 КБ. Интерфейс поднимался, `awg show` отвечал «Message too long», трафик не шёл.\n\nГенератор теперь держит цепочку в бюджете 3200 байт для любого клиента, потому что тот же блок уходит на сервер. Сначала полная форма профиля, потом компактная (у SIP это однобуквенные заголовки RFC 3261 §7.3.3, которыми телефоны пользуются ровно затем, чтобы влезть в датаграмму), потом энтропия в хвостовых слотах. I1 не трогается никогда. Проверка конфига предупреждает о вставленных цепочках, которые не влезут.\n\n## wg-easy (#18)\n\nНовый клиент в матрице. Валидатор панели пропускает H1-H4 только от 5 до 2 147 483 647, хотя протокол и оба движка берут весь uint32, и конфиги по умолчанию он не сохранял. Под этот потолок диапазоны теперь раскладываются целиком, а не обрезаются. Внутри wg-easy работает awg-quick: модуль ядра, если он есть на хосте, и amneziawg-go, если нет. Поэтому в цепочке только теги, которые понимают оба движка, и это сверено с исходниками обоих, а не угадано.\n\n## Цена ширины H1-H3 (#14)\n\nС `RandomTrailers` приёмник `amneziawg-go` перестаёт сверять размер рукопожатий и примеряет каждый транспортный пакет к H1, H2 и H3. Байты там шифротекст, так что пакет попадает в диапазон с вероятностью «ширина делить на 2³²» и молча умирает на проверке MAC. У автора репорта так терялось 16% трафика при чистых счётчиках.\n\nПроверка конфига считает долю `1 − Π(1 − Wᵢ / 2³²)` и предупреждает выше одной десятитысячной, с процентом и «одним пакетом из N». Генератор и так держит ширину до 50 000, а переключатель «Уменьшить разброс H1–H4» теперь действительно сужает сами диапазоны до 20 000: раньше он двигал только их начало. Его описание переписано, прежнее называло причиной нагрузку на CPU. `RandomTrailers` помечен как параметр обеих сторон: приёмник без него отбрасывает удлинённые рукопожатия. Предупреждение о зоне 1-4 больше не срабатывает при HeaderProtectionKey: там заголовки зашифрованы, и Amnezia VPN сама пишет H1-H4 = 1-4. FAQ про ширину диапазонов получил формулу и замечание, что H4 можно делать широким бесплатно.\n\n## Сайт\n\nНа главной вместо несуществующих NTP и DNS-over-HTTPS теперь реальные профили, SIP назван REGISTER, как он и генерируется. Подсказка про число параметров на странице «О проекте» считается, а не пишется руками: там стояло 23 у AmneziaWG после того, как 3.1 сделал их 25. README переписан под 4.4.0.\n\n## Тесты\n\n60 новых, всего 1268: разбор каждого STUN-пакета по RFC 8489 с проверкой CRC, бюджет цепочки на всех профилях и интенсивностях, точные цепочки из #17, H в пределах wg-easy на всех версиях, 16.1% на цифрах из #14.",
      en: "**A minor release built from your reports: STUN / TURN mimicry, chains the kernel module accepts, wg-easy in the client list, and what H width costs.**\n\n## STUN / TURN\n\nThe promised profile, the one the home page carried as “soon”. It replays what WebRTC sends before a call starts: a Binding to a STUN server (the bare header, the way browsers send it), a first Allocate to a TURN relay, the same Allocate with credentials, and ICE connectivity checks. With “apply to I2-I5” the chain walks that whole path; without it, I1 is the authenticated Allocate, the one packet of the flow that names a host, which goes into REALM.\n\nThe username follows the TURN REST API that coturn and most relays use: `expiry:user`. An ICE check carries four-letter ufrags like Chromium or eight like Firefox, a peer-reflexive PRIORITY and a random tie-breaker. The transaction ID, the HMAC and the tie-breaker come from `<r>`, so they are fresh on every send. FINGERPRINT goes in only when every byte is known in advance: a CRC over bytes a tag writes at send time cannot be computed now, and a wrong FINGERPRINT gives more away than a missing one.\n\n## I1-I5 and the kernel module (#17)\n\nThe kernel module takes every device attribute in one netlink message of a page: `amneziawg-tools` writes them into the buffer unchecked, and the module answers `-EMSGSIZE` when reading them back. That leaves about 3.4 KB for I1-I5. The five SIP REGISTER packets in the report came to 3820 bytes, and the generator's own full SIP reached 4.3 KB. The interface came up, `awg show` said “Message too long”, and nothing got through.\n\nThe generator now keeps the chain within 3200 bytes for every client, since the same block goes onto the server. First the profile's full form, then its compact one (for SIP, the one-letter headers of RFC 3261 §7.3.3 that phones use for exactly this, to fit a datagram), then entropy in the trailing slots. I1 is never touched. The config check warns about pasted chains that will not fit.\n\n## wg-easy (#18)\n\nA new client in the matrix. The panel's validator lets H1-H4 through only from 5 to 2,147,483,647, though the protocol and both engines take the full uint32, and it would not save the default configs. Ranges are now laid out whole under that cap rather than clipped. Underneath wg-easy is awg-quick: the kernel module when the host has it, amneziawg-go when it does not. So the chain carries only the tags both engines understand, checked against the sources of both rather than guessed.\n\n## What H1-H3 width costs (#14)\n\nWith `RandomTrailers`, the `amneziawg-go` receiver stops checking handshake sizes and tests every transport packet against H1, H2 and H3. The bytes there are ciphertext, so a packet lands inside a range with probability width over 2³² and dies quietly at the MAC check. The reporter lost 16% of the traffic this way with every counter reading clean.\n\nThe config check works out `1 − Π(1 − Wᵢ / 2³²)` and warns above one in ten thousand, with the percentage and a “one packet in N”. The generator keeps widths under 50,000 anyway, and the “Reduce H1–H4 spread” switch now really narrows the ranges themselves to 20,000: before, it only moved where they start. Its description is rewritten, since the old one blamed CPU load. `RandomTrailers` is marked as a value both ends share: a receiver without it drops the lengthened handshakes. The 1-4 zone warning no longer fires under HeaderProtectionKey, where headers are encrypted and Amnezia VPN itself writes H1-H4 = 1-4. The FAQ answer on range width gained the formula and a note that H4 can be wide for free.\n\n## The site\n\nThe home page lists real profiles instead of NTP and DNS-over-HTTPS, which never existed, and calls SIP REGISTER, which is what gets generated. The parameter count hint on the About page is counted rather than typed: it said 23 for AmneziaWG after 3.1 had made it 25. The README is rewritten for 4.4.0.\n\n## Tests\n\n60 new, 1268 in total: every STUN packet parsed per RFC 8489 with its CRC checked, the chain budget across every profile and intensity, the exact chains from #17, H within wg-easy's bounds on every version, and 16.1% on the numbers from #14.",
    },
  },
  {
    version: "4.5.0",
    date: { ru: "08.10.2026", en: "Oct 08, 2026" },
    title: {
      ru: "Переключатели в одну линию",
      en: "The switches, lined up",
    },
    icon: "Sparkles",
    color: "green",
    desc: {
      ru: "**Переключатели протокола стали одной группой, следуют за версией, и у 3.1 появились «Отключить H1-H4» и «Объединить S1-S4».**\n\n## Одна группа вместо трёх мест\n\nПереключатели 3.x жили в трёх местах: в зоне защиты транспорта, одиночной галкой под полосками паддинга и тумблером узких H с абзацем после него. Теперь это один лист, нарисованный по ревизиям: что добавила 3.0, что добавила 3.1, и на выносной линии от двух родителей 3.1 то, что имеет смысл только при обоих включённых. У каждого переключателя новое название, ключ из `.conf` рядом и подпись, должен ли он совпадать на обеих сторонах. На 3.0 колонка 3.1 заштрихована и перечисляет, что в ней появится.\n\n## Переключатели следуют за версией\n\nВыбор версии это выбор набора механизмов, поэтому при смене версии переключатели встают в рекомендуемое для неё положение, а при загрузке страницы в положение запомненной версии. Кнопка «Рекомендуемые для 3.x» возвращает его после ручных правок, а повторный выбор той же версии ничего не сбрасывает. Пресеты живут в одном месте, `generator/presets.ts`, и им же пользуется облегчённая сборка.\n\n## Отключить H1-H4\n\nH1-H4 становятся стандартными 1, 2, 3, 4, как их пишет сама Amnezia VPN для контейнеров 3.x. Под шифрованием заголовков поле типа уходит зашифрованным, и диапазоны на проводе ничего не прячут, а со случайными хвостами их ширина превращается в потерянные пакеты (#14). Открывается только на 3.1 при включённых шифровании и хвостах, и генератор сам проверяет это условие: без шифрования 1-4 ушли бы в открытом виде как настоящие типы WireGuard. Предупреждение о зоне 1-4 теперь молчит, когда заголовки зашифрованы, в том числе у Amnezia VPN, которая держит ключ в приложении.\n\n## Объединить S1-S4\n\nЭто прежние «Одинаковые S1–S4» под новым именем, переехавшие в группу. Условие то же: 3.1, шифрование и хвосты.\n\n## 3.1 по умолчанию\n\nMTU 1280, случайные хвосты и отключённые H1-H4. С хвостами amneziawg-go дотягивает пакеты до самого большого размера, что уже приходил от пира (`peer.udpWindow`), так что много трафика уходит полного размера, а полный размер должен проходить любой путь без фрагментации. 1280 это то, что обязан пропускать любой путь IPv6.\n\n## FAQ\n\nСемь новых ответов: пресеты, MTU 1280, «Отключить H1-H4», RandomTrailers на обеих сторонах, «Message too long» от модуля ядра, wg-easy и профиль STUN. Ответ про одинаковые S переписан под «Объединить S1-S4», в список параметров, которые обязаны совпадать, добавлен RandomTrailers, ответ о том, влияют ли ещё H1-H4, больше не ссылается на несуществующий баг CPU. Всего 78.\n\n## Тесты\n\n20 новых, всего 1291: пресеты всех версий, условия «Отключить H1-H4» и связка с «Объединить S1-S4», Amnezia VPN без ключа в файле, проверка вставленного конфига и смена версии в самой странице.",
      en: "**The protocol switches are one group, they follow the version, and 3.1 gains “Disable H1-H4” and “Unite S1-S4”.**\n\n## One group instead of three places\n\nThe 3.x switches lived in three places: the transport zone, a lone checkbox under the padding bars, and a narrow-H toggle with a paragraph after it. They are one sheet now, drawn by revision: what 3.0 added, what 3.1 added, and on a leader line from the two 3.1 parents, what only means something with both on. Every switch has a new name, its `.conf` key beside it and a label saying whether both ends must match. On 3.0 the 3.1 column is hatched and lists what it will hold.\n\n## Switches follow the version\n\nPicking a version is picking a set of mechanisms, so changing it moves the switches to where that version recommends, and loading the page moves them to the remembered version's position. The “Recommended for 3.x” button puts them back after manual changes, and re-selecting the same version resets nothing. Presets live in one place, `generator/presets.ts`, which the lite build uses too.\n\n## Disable H1-H4\n\nH1-H4 become the standard 1, 2, 3, 4, as Amnezia VPN itself writes them for 3.x containers. Under header encryption the type field leaves encrypted and the ranges hide nothing on the wire, while with random trailers their width turns into lost packets (#14). It opens only on 3.1 with encryption and trailers on, and the generator checks that condition itself: without encryption, 1-4 would go out in the clear as WireGuard's real message types. The 1-4 zone warning now stays quiet when headers are encrypted, Amnezia VPN's in-app key included.\n\n## Unite S1-S4\n\nThe former “Identical S1–S4” under a new name, moved into the group. Same condition: 3.1, encryption and trailers.\n\n## 3.1 defaults\n\nMTU 1280, random trailers and disabled H1-H4. With trailers, amneziawg-go lengthens packets up to the largest one already seen from the peer (`peer.udpWindow`), so much of the traffic goes out at full size, and full size has to cross any path without fragmenting. 1280 is what every IPv6 path is required to carry.\n\n## FAQ\n\nSeven new answers: presets, MTU 1280, “Disable H1-H4”, RandomTrailers on both ends, the kernel module's “Message too long”, wg-easy and the STUN profile. The identical-S answer is rewritten for “Unite S1-S4”, RandomTrailers joins the list of values both ends must share, and the answer on whether H1-H4 still matter no longer cites a CPU bug that never existed. 78 in total.\n\n## Tests\n\n20 new, 1291 in total: presets for every version, when “Disable H1-H4” acts and how it combines with “Unite S1-S4”, Amnezia VPN with no key in the file, the pasted-config check, and version changes on the page itself.",
    },
  },
  {
    version: "4.5.1",
    date: { ru: "08.10.2026", en: "Oct 08, 2026" },
    title: {
      ru: "Галочка, которую ставят в приложении",
      en: "The box you tick in the app",
    },
    icon: "Bug",
    color: "red",
    desc: {
      ru: "**Патч: где на самом деле включается ключ Amnezia VPN, и две длины, которые не сходились.**\n\n## HeaderProtectionKey в Amnezia VPN\n\nКонфиг для Amnezia VPN обещал, что ключ «подхватывается при импорте .conf». По исходникам приложения это не так. Ключ генерирует галочка HeaderProtectionKey в настройках протокола сервера: приложение пишет его в конфиг сервера и в конфиги клиентов, которые выдаёт само. На клиентской стороне та же галочка только показывает состояние, и для конфига, импортированного без ключа, защиту не включить.\n\nКлюч в файл по-прежнему не пишется, а подсказка у переключателя, комментарий в `.conf`, заметка о клиенте и ответ в FAQ теперь говорят, куда ставить галочку. На 3.1 это важно: без неё отключённые H1-H4 ушли бы в открытом виде. Для сервера, поднятого не через приложение, подсказка советует клиент AmneziaWG, у которого ключ попадает в файл.\n\n## DTLS 1.3: длина расширений\n\nClientHello объявлял 9 байт расширений, а за ними было 7: supported_versions это 4 байта заголовка и 3 данных. Строгий разборщик читал два байта за концом блока. Теперь длину пишет общая обвязка DTLS, а байты тегов и паддинга, которые раньше висели после расширений, уезжают в GREASE-расширение (RFC 8701): получатель обязан его игнорировать, и ClientHello разбирается до последнего байта.\n\n## DNS: теги внутри OPT\n\n`<t>` и `<c>` дописывались после опции Padding, но её длина считала только `<r>`, так что восемь байт висели за записью OPT. А с выключенным `<r>` и включённым `<t>` запрос объявлял ARCOUNT 0 и всё равно тащил хвост. Теперь данные опции это паддинг вместе с тегами, и OPT объявляется, как только после вопроса есть хоть один байт.\n\nОба бага нашла Акане из awg-containers-and-tools при переносе генератора на Rust.\n\n## Тесты\n\n12 новых, всего 1303: DTLS 1.3 и DNS разбираются до последнего байта при каждом сочетании тегов. На коде 4.5.0 десять из них падают.",
      en: "**A patch: where Amnezia VPN's key is really switched on, and two lengths that did not add up.**\n\n## HeaderProtectionKey in Amnezia VPN\n\nThe config for Amnezia VPN promised the key was “picked up on config import”. The app's sources say otherwise. The key is generated by the HeaderProtectionKey box in the server's protocol settings: the app writes it into the server config and into the client configs it hands out. On the client side the same box only shows the state, and protection cannot be switched on for a config imported without a key.\n\nThe key is still not written to the file, but the hint by the switch, the `.conf` comment, the client note and the FAQ answer now say where to tick the box. On 3.1 that matters: without it disabled H1-H4 would go out in the clear. For a server not set up through the app, the hint points to the AmneziaWG client, which writes the key into the file.\n\n## DTLS 1.3: extensions length\n\nThe ClientHello declared 9 bytes of extensions over the 7 that followed: supported_versions is 4 bytes of header and 3 of data. A strict parser read two bytes past the end of the block. The shared DTLS framing now writes the length, and the tag and padding bytes that used to hang after the extensions go into a GREASE extension (RFC 8701), which a receiver must ignore, so the ClientHello parses to its last byte.\n\n## DNS: tags inside OPT\n\n`<t>` and `<c>` were appended after the Padding option, whose length counted only `<r>`, so eight bytes trailed the OPT record. With `<r>` off and `<t>` on the query declared ARCOUNT 0 and still carried the tail. The option data is now the padding with the tags, and OPT is declared as soon as any byte follows the question.\n\nBoth bugs were found by the awg-containers-and-tools port of the generator to Rust.\n\n## Tests\n\n12 new, 1303 in total: DTLS 1.3 and DNS parsed to their last byte under every tag combination. On the 4.5.0 code ten of them fail.",
    },
  },
];
