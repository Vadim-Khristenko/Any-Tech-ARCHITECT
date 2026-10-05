# Any Tech ARCHITECT — __TAG__

Русский · [English below](#english)

__NOTICE_RU__

Это собранный сайт. Ничего устанавливать не нужно, интернет для работы не
требуется — вся генерация идёт в браузере.

Внутри два движка: **AmneziaWG** — обфускация handshake и junk-трафика, и
**XRay** — REALITY поверх VLESS, где снаружи видно рукопожатие чужого сайта.
У каждого параметра написано, откуда взята его граница и обязан ли он совпасть
с сервером.

## Что здесь лежит

```
dist/            собранный сайт: HTML, CSS, JS, шрифты, изображения
scripts/
  awg-gen.sh     генератор конфигов AmneziaWG из терминала, без браузера
  serve.sh       запуск сайта — Linux / macOS
  serve.ps1      запуск сайта — Windows PowerShell
  serve.bat      запуск сайта — Windows CMD
bin/
  awg-serve*     готовый бинарник сервера, без зависимостей
README.md        этот файл
```

## Как запустить

**Самое простое — готовый бинарник.** Он ничего не требует и сам откроет
браузер:

```
bin/awg-serve-linux            # Linux
bin/awg-serve-macos            # macOS
bin\awg-serve-windows.exe      # Windows
```

На Linux и macOS может понадобиться разрешить запуск:
`chmod +x bin/awg-serve-*`

Порт по умолчанию 8080, можно задать свой: `awg-serve 3000`.
Не открывать браузер: `--no-open`.

**Если предпочитаете скрипты** — они найдут bun, npx или python, а если ничего
нет, предложат поставить bun:

```
./scripts/serve.sh             # Linux / macOS
.\scripts\serve.ps1            # Windows PowerShell
scripts\serve.bat              # Windows CMD
```

Проверить, что всё на месте, ничего не запуская: `./scripts/serve.sh --check`

**Совсем без сервера.** Откройте `dist/index.html` прямо в браузере. Работать
будет, но прямые ссылки на разделы — нет: браузер не умеет отдавать
`dist/faq/index.html` по адресу `/faq`.

Сайт откроется на русском; английская версия — по адресу `/en`.

## Генерация конфига AmneziaWG из терминала

Браузер не обязателен. `awg-gen.sh` применяет те же правила, что и страница.
Для XRay терминального аналога пока нет — он только в браузере:

```bash
./scripts/awg-gen.sh -v 3.0 -p quic          # один конфиг в stdout
./scripts/awg-gen.sh -v 3.0 -n 5 -d out/     # пять конфигов в каталог
./scripts/awg-gen.sh --help                  # все параметры
```

Скрипт выдаёт только параметры обфускации. Свои `PrivateKey`, `Address`, `DNS`
и секцию `[Peer]` добавьте сами — с ключами он не работает.

> **Важно.** Совпадать на клиенте и на сервере обязаны `H1`–`H4`, `S1`–`S4` и
> `HeaderProtectionKey` — ими принимающая сторона опознаёт пакет, и расхождение
> означает, что он будет отброшен молча. Клиентские — `Jc`, `Jmin`, `Jmax`,
> `I1`–`I5` и `ContentPaddingAddition`: у каждого устройства могут быть свои, и
> разные значения даже полезнее одинаковых. Таймеры 3.0 локальны для каждой
> стороны.

## Проверка подлинности

Рядом с архивом в релизе лежит `checksums-__TAG__.sha256`:

```bash
sha256sum -c checksums-__TAG__.sha256
```

---

<a name="english"></a>

# Any Tech ARCHITECT — __TAG__

[Русский выше](#any-tech-architect--__TAG__) · English

__NOTICE_EN__

This is the built site. Nothing to install, and no internet needed — all
generation happens in your browser.

There are two engines inside: **AmneziaWG** — handshake and junk-traffic
obfuscation — and **XRay**, REALITY over VLESS, where what shows on the wire is
someone else's handshake. Every parameter says where its bound came from and
whether it has to match on the server.

## What is in here

```
dist/            the built site: HTML, CSS, JS, fonts, images
scripts/
  awg-gen.sh     generate AmneziaWG configs from a terminal, no browser
  serve.sh       run the site — Linux / macOS
  serve.ps1      run the site — Windows PowerShell
  serve.bat      run the site — Windows CMD
bin/
  awg-serve*     prebuilt server binary, no dependencies
README.md        this file
```

## Running it

**Easiest — the prebuilt binary.** It needs nothing installed and opens a
browser for you:

```
bin/awg-serve-linux            # Linux
bin/awg-serve-macos            # macOS
bin\awg-serve-windows.exe      # Windows
```

On Linux and macOS you may need to make it executable first:
`chmod +x bin/awg-serve-*`

Default port is 8080; pass your own with `awg-serve 3000`, and `--no-open` to
skip launching a browser.

**If you prefer the scripts**, they look for bun, npx or python, and offer to
install bun if none is present:

```
./scripts/serve.sh             # Linux / macOS
.\scripts\serve.ps1            # Windows PowerShell
scripts\serve.bat              # Windows CMD
```

To check everything is in place without starting anything:
`./scripts/serve.sh --check`

**No server at all.** Open `dist/index.html` directly. It works, but deep links
to sections do not: a browser will not serve `dist/faq/index.html` for `/faq`.

The site opens in Russian; the English version lives at `/en`.

## Generating an AmneziaWG config from a terminal

No browser required — `awg-gen.sh` applies the same rules the page does. XRay
has no terminal equivalent yet; it is browser-only:

```bash
./scripts/awg-gen.sh -v 3.0 -p quic          # one config to stdout
./scripts/awg-gen.sh -v 3.0 -n 5 -d out/     # five configs into a directory
./scripts/awg-gen.sh --help                  # every option
```

It emits obfuscation parameters only. Add your own `PrivateKey`, `Address`,
`DNS` and `[Peer]` section — it never touches key material.

> **Important.** `H1`–`H4`, `S1`–`S4` and `HeaderProtectionKey` must match on
> the client and the server — they are what the receiving side uses to
> recognise a packet, and a mismatch means it is dropped silently. The
> client-side ones are `Jc`, `Jmin`, `Jmax`, `I1`–`I5` and
> `ContentPaddingAddition`: each device may set its own, and varied values are
> better than identical ones. The 3.0 timers are local to each side.

## Verifying the download

The release ships `checksums-__TAG__.sha256` next to the archives:

```bash
sha256sum -c checksums-__TAG__.sha256
```

---

MIT · https://architect.vai-rice.space
