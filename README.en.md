<div align="center">

<img src=".github/assets/github-preview.png" alt="Any Tech ARCHITECT" width="100%">

[Русский](README.md) · **English**

[![Open the generator](https://img.shields.io/badge/Open_the_generator-architect.vai--rice.space-e8a840?style=for-the-badge)](https://architect.vai-rice.space/en)
[![AmneziaWG 3.1](https://img.shields.io/badge/AmneziaWG-3.1-5fbf7f?style=for-the-badge)](#amneziawg)
[![XRay REALITY](https://img.shields.io/badge/XRay-REALITY-5b9bd5?style=for-the-badge)](#xray)
[![MIT](https://img.shields.io/badge/License-MIT-c49040?style=for-the-badge)](LICENSE)

Obfuscation configs, with every number in them explained. Everything is computed
in your browser — neither keys nor configs are sent anywhere.

</div>

---

## What this is

The tool assembles an obfuscation configuration and explains what it is made of.
Not press-and-hope, but a working drawing: every parameter says where its bound
came from, which side reads it, and what happens when the two sides disagree.

Clients can generate these parameters themselves, and that is fine right up
until the tunnel does not come up. Then it turns out the button explained
neither what it chose nor which of it has to match on the server.

There are two engines, doing the same job from opposite directions.

| | What it does | Parameters |
|:--|:--|:--:|
| **[AmneziaWG](#amneziawg)** | Hides the traffic type: junk packets ahead of the handshake, padded messages, a substituted type byte. What shows on the wire is QUIC, TLS or DNS rather than WireGuard. | 23 |
| **[XRay](#xray)** | REALITY over VLESS. Outside is a genuine handshake with someone else's site, carrying that site's own certificate; inside is your tunnel. | 74 |

> [!IMPORTANT]
> This project exists for research and educational purposes and was never built
> for use in Russia or the CIS. Using traffic obfuscation tools may violate the
> law where you live — responsibility for how you use it rests with you.

---

## AmneziaWG

Plain WireGuard is trivial to identify: a fixed message-type byte and
predictable packet sizes (148 bytes for a handshake initiation, 92 for a
response) let DPI classify the protocol from the very first packet and block it
wholesale.

AmneziaWG adds an obfuscation layer over the same cryptography. Architect picks
its parameters so they are valid, compatible with your client, and do not
accidentally recreate the very fingerprint you were escaping.

| | Junk `Jc/Jmin/Jmax` | `S1 S2` | `S3 S4` | CPS `I1–I5` | Headers `H1–H4` | 3.x block | 3.1 flags<br>`RandomTrailers` / `DisableCookies` |
|:--|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **1.0** | ✅ | ✅ | — | — | fixed | — | — |
| **1.5** | ✅ | ✅ | — | client only | fixed | — | — |
| **2.0** | ✅ | ✅ | ✅ | ✅ | ranges | — | — |
| **3.0** | ✅ | ✅ | ✅ | ✅ | ranges | ✅ | — |
| **3.1** | ✅ | ✅ | ✅ | ✅ | ranges | ✅ | ✅ |

### What 3.0 and 3.1 added

These parameters were derived **from the sources** — `amneziawg-go v3.0.1`, the
`feat/awg3` branch of `amneziawg-tools`, and the `v3.1.*` tags of both
repositories — rather than from the docs, which still describe 2.0 at the time
of writing.

| Parameter | What it does |
|:--|:--|
| `HeaderProtectionKey` | A shared 32-byte ChaCha20 key. Handshake and cookie messages are encrypted whole; transport packets only in their 16-byte header. Written as base64 in `.conf`, like `PrivateKey`; as hex over UAPI. |
| `ContentPaddingAddition` | Random extra padding on every transport packet, instead of aligning to 16 bytes. |
| `RekeyAfterTime`<br>`RekeyTimeout`<br>`RejectAfterTime`<br>`KeepaliveTimeout`<br>`MaxHandshakeAttempts` | Ranges instead of WireGuard's fixed constants, so a steady handshake rhythm stops being a fingerprint. |
| `RandomTrailers` <sub>3.1</sub> | A random-length trailer appended to every outgoing packet. Needs no agreement with the other side. |
| `DisableCookies` <sub>3.1</sub> | The device stays silent instead of sending a Cookie Reply. Breaks NAT keepalive under load, so the generator ships it off by default. |

> [!WARNING]
> **With header protection on, S1–S4 cannot go below 12.** The cipher nonce is
> never transmitted — it is taken from the first 12 bytes of the S-padding, and
> a padding shorter than twelve bytes has none to give. You will not have to
> find that out the hard way: both implementations refuse the configuration
> before the interface comes up — `amneziawg-go` returns `S%d must be more then
> %d to use headerProtection`, and the kernel module logs the same sentence and
> returns `-EINVAL`. The interface does not start, and the reason is named. The
> generator raises S to 12 automatically, and the validator rejects configs that
> break it.

The `<d>`, `<ds>` and `<dz>` tags parse in v3.0.1 but are not wired into the
send path — they are groundwork for AWG 4.0, so the generator does not emit them.

Plus **12 mimicry profiles** (QUIC Initial, QUIC 0-RTT, TLS 1.3, DTLS 1.2, DTLS 1.3,
HTTP/3, SIP, DNS, Noise_IK and composites) and a **compatibility matrix covering
13 clients** — each has its own ceilings, and the generator knows them. For
those who picked mihomo as their client, the generator emits a proxy block in
its YAML dialect alongside the `.conf`.

---

## XRay

REALITY solves the same problem the other way round: rather than disguising
traffic as another protocol, it borrows a whole handshake. An observer sees a
TLS session with a real donor site, carrying that site's real certificate —
because it *is* the donor's certificate, obtained from the donor.

Architect covers **74 Xray-core parameters**, laid out in sections:

| Section | What is in it |
|:--|:--|
| **REALITY** | `dest`, `serverNames`, the x25519 key pair, `shortIds`, `spiderX`, version limits and fallback caps |
| **Transport** | XHTTP in every mode, `xmux`, `sockopt`, TCP/WS/gRPC |
| **FinalMask** | Stream post-processing on top of the chosen transport |
| **VLESS** | `flow`, `encryption`, client identities |

Every parameter is marked: **generated** — chosen for you; **yours to set** —
you can, and the hint explains what to reason from; **not covered** — said
plainly, rather than left to look like an omission.

> [!NOTE]
> The donor domain and your server's address are different things, and they sit
> in different places in the interface. The donor is whose certificate you show;
> the server is where the connection actually goes. If `dest` points at one site
> while `serverNames` names another, an observer sees the mismatch from a single
> passive look — Architect warns about exactly that.

The donor database holds **over 1100 entries** with a regional filter, each
recording what is actually known about the site rather than an invented "status".

For hosting panels there is a separate export: their validators only know the
pre-rename vocabulary (`tcp` rather than `raw`), and the panel button renames
exactly those two places — the core takes both spellings.

---

## The tools

<table>
<tr>
<td width="50%" valign="top">
<img src="public/assets/og-mergekeys-en.png" alt="MergeKeys" width="100%">
<h3>MergeKeys</h3>
Edit and merge <code>vpn://</code> keys. Refresh the obfuscation on an existing
key, or collect containers from several keys into a single master key. All local.
</td>
<td width="50%" valign="top">
<img src="public/assets/og-simulator-en.png" alt="Packet Simulator" width="100%">
<h3>Packet Simulator</h3>
Shows what a session start looks like: the CPS chain, the junk train, the
handshake and data. Works for both engines, AmneziaWG and XRay, and is aware
of the version and the client — 1.0 and 1.5 are drawn without what they lack,
and WireSock without the chain it never sends.
</td>
</tr>
<tr>
<td width="50%" valign="top">
<img src="public/assets/og-faq-en.png" alt="FAQ" width="100%">
<h3>FAQ</h3>
Parameters, version differences and common failure modes. Searches both
languages at once, with categories and linkable answers.
</td>
<td width="50%" valign="top">
<img src="public/assets/og-vaiexia-en.png" alt="VAIEXIA" width="100%">
<h3>VAIEXIA</h3>
A web panel plus Telegram, Discord and Matrix bots: run a server or a cluster
from anywhere. Coming soon.
</td>
</tr>
</table>

Both generators do **batch generation** in a Web Worker, keep a **history** that
exports to a file, and **check configs** before anything reaches a client.

---

## How this is checked

Claiming and checking are different things, so:

- Configs are generated in thousands and tested against invariants — including
  that no key material repeats between generations.
- Packets are parsed as their own protocols: QUIC per RFC 9000, TLS per 8446,
  DNS per 1035.
- XRay configurations are handed to **real cores in Docker, one core per
  version**. A single core for all of them proves nothing: unknown keys are
  ignored, so a config naming a feature the core lacks passes anyway.

That last one found three mistakes the unit tests would have kept: VLESS
Encryption offered on v25.8.29, which has none; ML-DSA-65 treated as optional on
v25.7.23, which requires it; and an XHTTP mode v24.11.11 does not have.

---

## Privacy

There is no backend — nothing exists that could receive your data. No analytics,
no trackers, no cookies, no third-party scripts; fonts are served from the site's
own domain rather than Google Fonts. All randomness comes from
`crypto.getRandomValues()` with rejection sampling to eliminate modulo bias —
`Math.random()` appears nowhere in the generators.

Save the page with <kbd>Ctrl</kbd>+<kbd>S</kbd> and it works offline.

---

## Quick start

**Online:** [architect.vai-rice.space](https://architect.vai-rice.space/en)

```bash
git clone https://github.com/Vadim-Khristenko/Any-Tech-ARCHITECT.git
cd Any-Tech-ARCHITECT
bun install
bun run dev
```

| Command | What it does |
|:--|:--|
| `bun run dev` | Dev server with HMR |
| `bun run build` | Production build: crawler stubs, `sitemap.xml`, `robots.txt` |
| `bun run preview` | Preview the built site |
| `bun run test:run` | Run the tests |
| `bun run typecheck` | Type-check |
| `bun run og` | Rebuild the OG images and the GitHub preview |

### Running with nothing installed

Release archives ship `awg-serve` — a dependency-free static server written in
Rust, built for Linux, macOS and Windows:

```bash
bin/awg-serve-linux            # Linux
bin/awg-serve-macos            # macOS
bin\awg-serve-windows.exe      # Windows
```

Port defaults to 8080 (`awg-serve 3000` for another), `--no-open` skips
launching a browser. Source lives in [`tools/awg-serve`](tools/awg-serve).

The `scripts/serve.*` launchers remain as an alternative — they look for bun,
npx or python, and `--check` reports what they found without starting anything.

### Standalone generator

If a browser is not available, the same rules exist as a plain shell script —
no dependencies, no network. It covers AmneziaWG only; XRay lives in the browser
for now:

```bash
./scripts/awg-gen.sh -v 3.0 -p quic          # one config to stdout
./scripts/awg-gen.sh -v 3.0 -n 5 -d out/     # five configs into a directory
./scripts/awg-gen.sh --help                  # every option
```

### Installing on a server

A configuration is half the job; the other half is a server that accepts it.
That is a separate project:
**[awg-containers-and-tools](https://github.com/Vadim-Khristenko/awg-containers-and-tools)**
— AmneziaWG containers for all four protocol versions (1.0, 1.5, 2.0, 3.0) and
an `awg-tool` utility to deploy them.

```bash
awg-tool gen --version 3.0 --profile quic --client amneziavpn
awg-tool install --host 203.0.113.9 --user root --key ~/.ssh/id_ed25519
```

It matters most for 3.0: the official configuration pipeline cannot parse
configs of that version, so `awg-tool` bypasses the `.conf` parser and talks to
the daemon directly over its UAPI socket. Parameters are randomized per
deployment, so separate instances do not look alike to DPI.

The project is unofficial and community-maintained, same as Architect.

### If GitHub is blocked

A GitHub link inside the section about GitHub being blocked is not much help, so
here are mirrors on a self-hosted Forgejo. Feel free to share them:

| What | Mirror |
|:--|:--|
| Architect (this repository) | [git.vai-rice.space/vai_prog/Any-Tech-ARCHITECT](https://git.vai-rice.space/vai_prog/Any-Tech-ARCHITECT) |
| Server installer | [git.vai-rice.space/vai_prog/awg-containers-and-tools](https://git.vai-rice.space/vai_prog/awg-containers-and-tools) |
| Amnezia apps | [git.vai-rice.space/amnezia-vpn](https://git.vai-rice.space/amnezia-vpn) |

```bash
git clone https://git.vai-rice.space/vai_prog/Any-Tech-ARCHITECT.git
```

The first two mirror my own repositories. The third, for the Amnezia apps, is
independent and not Amnezia's official site — verify release checksums and
signatures before installing.

---

## Found a bug, or have an idea?

Please say so — it is the best way to fix what we do not know about. Open an
[issue](https://github.com/Vadim-Khristenko/Any-Tech-ARCHITECT/issues), join the
discussion in the chat, and soon on `git.vai-rice.space` too.

If the problem is a specific config, include the AmneziaWG or Xray version, the
client and its version, and the parameters themselves — **with private keys
removed**. That is almost always enough to reproduce it.

Reading the code against the upstream sources is the most useful kind of issue
there is here: three mistakes in the rules and in the text were found and fixed
that way, and nobody would have known about them otherwise.

See [CONTRIBUTING.en.md](CONTRIBUTING.en.md) for how development works.

---

## Support the project

This runs on enthusiasm: no ads, no sponsors, no monetisation.

[![YooMoney](https://img.shields.io/badge/YooMoney-one--off-8b3ffd?style=flat-square)](https://yoomoney.ru/fundraise/1GA2JV51324.260304)
[![Patreon](https://img.shields.io/badge/Patreon-recurring-f96854?style=flat-square)](https://patreon.com/VAI_PROG)
[![DaLink](https://img.shields.io/badge/DaLink-donate-4fb3c9?style=flat-square)](https://dalink.to/vai_prog)

<details>
<summary><b>Cryptocurrency</b> — BTC, ETH, TON, USDT, TRX, SOL</summary>

<br>

> [!CAUTION]
> Check the network before sending: funds sent on the wrong network are lost for
> good.

| Coin | Network | Address |
|:--|:--|:--|
| Bitcoin `BTC` | Bitcoin · Native SegWit | `bc1qwvfpdhjuzelw8s9vxcfjj6fatnq3cltf0d48jy` |
| Ethereum `ETH` | Ethereum · ERC-20 | `0x277195Ff068756F09683FAB523b2cdDf8Ef35B44` |
| Toncoin `TON` | The Open Network | `UQBVdcwKqy8lx_2plsf2YPbcBJdYbPtnKbddmFWZntqiAEME` |
| Tether `USDT` | JETTON · TON | `UQCaNScHxNbJsCi5Wc47rJqNpJPiDASUlMJ1nRwxq-hXSGoQ` |
| Tron `TRX` | Tron · TRC-20 | `TC8dYqkDYQkuCKe7A6PWXUgDRB8Rr2Xd9f` |
| Solana `SOL` | Solana | `4i2uWx82jhgVorPQyM2y47X2YvRgCVNNWPfNmVrGcCaE` |

</details>

---

<div align="center">

<img src="public/assets/og-about-en.png" alt="About" width="100%">

My other projects live at **[vai-rice.space](https://vai-rice.space)**

Built on ideas from [Special Junk Packet List](https://voidwaifu.github.io/Special-Junk-Packet-List/)
by [@VoidWaifu](https://github.com/VoidWaifu)

**[MIT](LICENSE)** · Made for the AmneziaVPN community

</div>
