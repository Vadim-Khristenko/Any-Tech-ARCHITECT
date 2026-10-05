<div align="center">

<img src=".github/assets/github-preview.png" alt="Any Tech ARCHITECT" width="100%">

# Any Tech ARCHITECT Lite

**Русский** · [English](README.en.md)

[![Полная версия](https://img.shields.io/badge/Полная_версия-architect.vai--rice.space-e8a840?style=for-the-badge)](https://architect.vai-rice.space/)
[![Lite](https://img.shields.io/badge/ветка-lite-7a6f5f?style=for-the-badge)](#что-это)
[![MIT](https://img.shields.io/badge/Лицензия-MIT-c49040?style=for-the-badge)](LICENSE)

</div>

> [!WARNING]
> **Эта ветка обновляется редко.** Lite догоняет основную версию время от
> времени, а не с каждым релизом, поэтому в ней может не быть свежих
> исправлений и новых профилей. Если у вас есть нормальный браузер и сеть,
> пользуйтесь полной версией: сайт
> **[architect.vai-rice.space](https://architect.vai-rice.space/)** или
> [основной релиз](https://github.com/Vadim-Khristenko/Any-Tech-ARCHITECT/releases/latest)
> из ветки [`main`](https://github.com/Vadim-Khristenko/Any-Tech-ARCHITECT/tree/main).

---

## Что это

Мега-облегчённая сборка Architect для слабых устройств, медленных каналов и
работы без сети. **Один HTML-файл примерно на 170 КБ**: скачали, открыли с
диска, и всё работает без интернета, без установки и без внешних запросов.

Сейчас ветка соответствует основной версии **4.4.0**.

| Что есть | Чего нет |
|:--|:--|
| Генератор AmneziaWG 1.0, 1.5, 2.0, 3.0 и 3.1 | XRay / REALITY |
| Все 12 профилей мимикрии, включая STUN / TURN | Симулятор пакетов |
| Все 14 клиентов с их потолками и сборками | MergeKeys и `vpn://` |
| Переключатели блока 3.x и флаги 3.1 | FAQ и страница «О проекте» |
| Проверка вставленного `.conf` | Batch-генерация и история |
| Русский и английский | Анимации, шрифты, иконки |

Генератор, правила проверки и тексты находок здесь те же, что в основной
версии, а не переписанные заново: lite собирается из того же кода движка.

## Как скачать

Готовый файл лежит в pre-release
[**lite-v4.4.0**](https://github.com/Vadim-Khristenko/Any-Tech-ARCHITECT/releases/tag/lite-v4.4.0):
`any-tech-architect-lite-v4.4.0.html`. Откройте его в любом браузере. Рядом
есть zip-архив и контрольные суммы.

## Как он устроен

Полная версия тянет за собой базу доменов на 818 КБ, реактивный Vue и
каталоги переводов всех страниц. Lite обходится без них:

- **Домены.** Генератору нужен не весь справочник, а случайный хост из
  нужного пула (регион, роль, тип DNS-запроса). `scripts/lite/prepare.ts`
  заранее раскладывает эти пулы по тем же правилам и с теми же запасными
  вариантами, что и `pickHost`, это около 64 КБ вместо 818. Распределение
  хостов такое же.
- **Тексты.** Из каталогов берутся только находки, заметки о клиентах и
  комментарии `.conf`.
- **Интерфейс.** Обычный TypeScript без фреймворка.
- **Один файл.** `vite.lite.config.ts` вписывает скрипт и стили прямо в HTML.

Тесты в `src/lite/__tests__` сверяют подготовленные данные с исходниками,
так что устаревшая копия не пройдёт CI.

## Сборка

```bash
git clone -b lite https://github.com/Vadim-Khristenko/Any-Tech-ARCHITECT.git
cd Any-Tech-ARCHITECT
bun install
bun run build:lite      # dist-lite/index.html
```

Нужен Bun 1.4 или новее. `bun run lite:prepare` отдельно пересобирает данные
в `src/lite/generated`.

## Как ветка обновляется

Ветка lite это `main` плюс файлы lite (`src/lite`, `scripts/lite`,
`vite.lite.config.ts`, `.github/workflows/build-lite.yml`, этот README).
Чтобы подтянуть новую версию, `main` вливается в `lite`, данные
пересобираются через `bun run lite:prepare`, и пуш в ветку запускает
[пайплайн](.github/workflows/build-lite.yml): тесты, сборка, проверка размера
(не больше 300 КБ) и pre-release `lite-vX.Y.Z`, который никогда не становится
«последним релизом».

---

<div align="center">

**[MIT](LICENSE)** · Сделано для сообщества AmneziaVPN

</div>
