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
];
