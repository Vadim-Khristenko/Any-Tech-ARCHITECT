/**
 * English catalog.
 *
 * Typed as `Catalog`, which is derived from the Russian source — omitting a key
 * or misspelling one is a build error, so translations cannot silently drift.
 */

import type { Catalog } from "./ru";

export const en: Catalog = {
  /* ── Navigation ───────────────────────────────────────────────────────── */
  "nav.awg": "AmneziaWG",
  "nav.xray": "XRay",
  "nav.mergekeys": "MergeKeys",
  "nav.simulator": "Simulator",
  "nav.about": "About",
  "nav.vaiexia": "VAIEXIA",
  "nav.faq": "FAQ",
  "nav.menu": "Menu",
  "nav.github": "GitHub repository",

  /* ── Language switcher ────────────────────────────────────────────────── */
  "lang.label": "Language",
  "lang.switch": "Change language",

  /* ── Landing ──────────────────────────────────────────────────────────── */
  "brand.pre": "Any Tech",
  "brand.main": "ARCHITECT",

  "landing.lede":
    "A tool that just does its job. Free, with nothing to sell you, no ads and no subscriptions. Simply because it can be.",
  "landing.trust": "Hundreds of people rely on this, and we are not about to let them down.",

  "landing.sheet": "Sheet",
  "landing.drawing": "QUIC Initial · RFC 9000 §17.2.2",
  "landing.scale": "Scale",
  "landing.scale.value": "1 square = 1 byte",
  "landing.rev": "Rev.",

  "landing.hero.cta": "Pick a tool",
  "landing.hero.second": "What this actually is",

  /* What it does and what it does not: two columns of one thought. */
  "landing.can.title": "What this tool does",
  "landing.can.1":
    "Builds a configuration that fits you: your protocol version, your client, your link.",
  "landing.can.2":
    "Gives you a config that simply works under normal conditions, and stays out of your way while you build it.",
  "landing.can.3":
    "Explains every number: what it does, what has to match on the server, and where it breaks.",

  "landing.cant.title": "What it will not give you",
  "landing.cant.1":
    "A one-click VPN. The server and the keys stay yours, and neither of them is here.",
  "landing.cant.2":
    "A guarantee against whitelists. Obfuscation helps against some kinds of them, but promising it will work for you specifically would be a lie.",
  "landing.cant.3":
    "Anonymity. Obfuscation hides that this is a tunnel, not who you are.",

  /* The tools themselves. */
  "landing.tools.title": "The tools themselves",
  "landing.tools.lede":
    "Two engines, one method: every number is derived from the text of a standard rather than picked by eye. Everything is computed in this tab and sent nowhere.",

  "landing.awg.name": "AmneziaWG",
  "landing.awg.tag": "from the start",
  "landing.awg.desc":
    "Our first project, and still going. Where all of this started, and what it still does best.",
  "landing.awg.status": "Working",
  "landing.awg.go": "To the generator",

  "landing.xray.name": "XRay",
  "landing.xray.tag": "the second engine",
  "landing.xray.desc":
    "Sees through, and lets nobody see where they should not. From outside it is a real handshake from someone else's site — their certificate, their name — with your tunnel inside it. Seventy-six parameters: REALITY, VLESS, XHTTP, browser fingerprints, FinalMask.",
  "landing.xray.status": "Working",
  "landing.xray.go": "To the generator",

  /* The profile dial: the one place the page plays. */
  "landing.fun.title": "Who shall we be today?",
  "landing.fun.lede":
    "Every profile is built from the text of the standard rather than by eye. Press it and see what the tunnel can pass for.",
  "landing.fun.again": "Again",
  "landing.fun.inside": "Inside",
  "landing.fun.insideValue": "your tunnel",
  "landing.fun.outside": "From outside it looks like",
  "landing.fun.spec": "built from",
  "landing.fun.count": "profiles to choose from",

  "landing.more.title": "What else is here",
  "landing.more.mergekeys":
    "Refresh the obfuscation in an existing vpn:// key, or merge several keys into one container.",
  "landing.more.simulator":
    "Walk through what the handshake looks like with the parameters you chose.",
  "landing.more.faq":
    "{n} answers: what each parameter does, and what to check when the tunnel will not come up.",
  "landing.more.about": "How this differs from the generate button in your client.",
  "landing.more.vaiexia":
    "The same author's other project: server management in Rust. What is written, and what is not yet.",

  /* ── Generator, new layout ────────────────────────────────────────────── */
  "gen.zone.junk": "Junk train",
  "gen.zone.sizes": "Packet sizes",
  "gen.zone.headers": "Headers",
  "gen.zone.cps": "CPS chain",
  "gen.zone.mimic": "Mimicry profile",
  "gen.junk.handshake": "handshake",
  "gen.junk.none": "no train",
  "gen.junk.count": "packets before the handshake",
  "gen.junk.ask": "Asked for",
  "gen.section.setup": "Setup",
  "gen.section.result": "What came out",
  "gen.zone.fp": "Browser fingerprint",
  "gen.params.copyHint": "Copy the value",
  "gen.region.label": "Host region",
  "gen.region.any": "Any",
  "gen.scope.shared": "both ends",
  "gen.scope.sender": "sender only",
  "gen.scope.local": "local",
  "gen.scope.hint.shared": "The value has to match on the client and the server.",
  "gen.scope.hint.sender": "Applied by whoever sends. The other end need not know.",
  "gen.scope.hint.local": "A local setting; nothing to agree on.",
  "gen.since": "since {v}",
  "gen.endpoint.label": "Server address",
  "gen.endpoint.hint": "host:port. Leave empty and nothing is added to the file.",
  "gen.host.label": "Host to mimic",
  "gen.zone.protocol": "Protocol",
  "gen.zone.protocol.note": "The version decides which parameters exist at all. 1.0 has no S3, S4 or CPS chain; header ranges arrived in 2.0; transport protection in 3.0.",
  "gen.zone.client.note": "This is where the ceilings come from. Clients differ, and the generator builds for the build the config is going to.",
  "gen.zone.net": "Network",
  "gen.zone.net.note": "The tunnel interface MTU. Too large and packets fragment, which breaks the link on some routes.",
  "gen.zone.modes": "Modes",
  "gen.zone.modes.note": "Two ceilings. Router mode keeps the load low for weak hardware; extreme lifts the limits and takes the maximum values.",
  "gen.zone.junk.note": "Empty packets sent before the handshake, so the handshake is not the first thing an observer sees. How many is Jc; how large is Jmin and Jmax.",
  "gen.zone.sizes.note": "Random padding in front of each kind of packet, so the lengths cannot be used to recognise the protocol.",
  "gen.zone.headers.note": "Four magic numbers the receiver reads to tell packet types apart. They must match the server and must not overlap each other.",
  "gen.zone.mimic.note": "What the junk packets will look like. Each profile is built from the text of the standard rather than by eye.",
  "gen.zone.fp.note": "Packet sizes taken from a real browser, so the lengths match what usually leaves this device.",
  "gen.zone.cps.note": "Fake packets sent before the handshake. The receiver never parses them — they exist only for the observer.",
  "gen.zone.transport": "Transport protection",
  "gen.zone.transport.note": "Everything else on this page hides the handshake. This hides the established tunnel: headers are encrypted, transport packets are padded, and the timers stop being constants.",
  "gen.narrowH.label": "Reduce H1–H4 spread",
  "gen.narrowH.detail": "In AmneziaWG 3.1 wide H1–H4 ranges (up to 100M) make amneziawg-go 3.1 spend noticeably more CPU classifying packets and can misclassify when HeaderProtection is on due to interval overlap. Enabling clamps each H range to ~20k (H4 ~30k) — fixes the bug at the cost of slightly less header obfuscation. Shown only for 3.1 when HeaderProtection is on (the bug trigger). Off by default.",
  "gen.narrowH.help": "Wide H1–H4 in 3.1 is a bug: the Go client scans large header intervals, causing CPU spikes and rare handshake failures with HeaderProtection. Narrow ranges (~20k) remove the issue but make headers slightly less diverse.",
  "gen.junk.size": "Packet size",
  "gen.junk.sizeNote": "Jmin and Jmax come from here. On 3.0 the same choice sets the padding and timer spread.",
  "gen.junk.recommendedMark": "recommended",
  "gen.fp.willUse": "For the selected profile: {range} B",
  "gen.fp.family.chromium": "Chromium",
  "gen.fp.family.gecko": "Gecko",
  "gen.fp.family.webkit": "WebKit",
  "gen.fp.family.other": "Other",
  "gen.view.one": "One by one",
  "gen.view.whole": "Whole",
  "gen.fp.derived": "Sizes taken from {from} — the same network stack.",
  "gen.headers.rule": "The ranges must not overlap. Here you can see it.",
  "gen.headers.clash": "Overlapping",
  "gen.headers.ok": "No overlap",
  "gen.sizes.floor": "12-byte floor with header protection on",

  "gen.help.open": "What these parameters are",
  "gen.act.generate": "Generate",
  "gen.act.regenerate": "Generate again",
  "gen.act.batch": "Several at once",
  "gen.act.history": "History",
  "gen.act.simulator": "Open in the simulator",

  "gen.out.title": "The configuration",
  "gen.out.empty": "Nothing yet. Pick a version and press Generate.",
  "gen.out.copyConf": "Copy .conf",
  "gen.out.downloadConf": "Download .conf",
  "gen.out.copyJson": "Copy JSON",
  "gen.out.downloadJson": "Download JSON",
  "gen.out.copyYaml": "Copy YAML (mihomo)",
  "gen.out.downloadYaml": "Download YAML (mihomo)",

  "gen.forge.send": "Open in the key workbench",
  "gen.links.title": "If something does not add up",
  "gen.links.faq": "What each parameter does",
  "gen.links.about": "How this differs from the button in your client",

  /* ── XRay generator ───────────────────────────────────────────────────── */
  "xg.section.setup": "Setup",
  "xg.section.params": "Parameters",
  "xg.section.result": "What came out",

  "xg.zone.server": "Your server",
  "xg.zone.server.note": "Where the tunnel actually is. This address goes into the client link — the donor below has nothing to do with it.",
  "xg.field.address": "Address or domain",
  "xg.field.pinFingerprint": "Pin the fingerprint version",
  "xg.field.port": "Port",
  "xg.donor.checking": "checking",
  "xg.donor.ok": "answers",
  "xg.donor.blocked": "no answer",
  "xg.result.group.server": "Inbound",
  "xg.result.group.stream": "Transport and security",
  "xg.result.group.socket": "Socket",
  "xg.result.group.link": "Link",
  "xg.result.group.query": "Link parameters",
  "xg.zone.core": "Core",
  "xg.zone.core.note": "The Xray-core version decides which parameters exist at all: VLESS Encryption, the XHTTP modes, ML-DSA-65, Hysteria.",
  "xg.zone.donor": "REALITY donor",
  "xg.zone.donor.note": "The site whose handshake the server is dressed as. It has to be on TLS 1.3, answer without a redirect, and not share a CDN with you.",
  "xg.zone.layers": "Layers",
  "xg.zone.layers.note": "Transport, security and flow. Three decisions everything else in the config follows from.",
  "xg.zone.ids": "Keys and shortIds",
  "xg.zone.ids.note": "The X25519 pair and the shortId set. Generated here and sent nowhere.",

  "xg.group.inbound": "Inbound",
  "xg.group.vless": "VLESS",
  "xg.group.reality": "REALITY",
  "xg.group.tls": "TLS",
  "xg.group.xhttp": "XHTTP",
  "xg.group.xmux": "xmux",
  "xg.group.transport": "Transport",
  "xg.group.sockopt": "Socket",
  "xg.group.finalmask": "FinalMask",

  "xg.ph.int": "a number",
  "xg.ph.range": "lo—hi",
  "xg.ph.between": "{min}–{max}",
  "xg.ph.text": "text",
  "xg.ph.key": "base64, {n} bytes",
  "xg.ph.hex": "hex, {n} characters",
  "xg.state.generated": "chosen for you",
  "xg.state.manual": "you set it",
  "xg.state.missing": "not covered",
  "xg.state.generated.hint": "Architect picks a value itself.",
  "xg.state.manual.hint": "You supply this; inventing it for you would make a worse tool.",
  "xg.state.missing.hint": "Not yet expressible in the current config model.",

  "xg.coverage": "{done} of {total}",
  "xg.out.server": "Server",
  "xg.out.client": "Client",
  "xg.out.copyJson": "Copy JSON",
  "xg.out.downloadJson": "Download inbound.json",
  "xg.out.downloadPanel": "Download for panels (3x-ui)",
  "xg.out.copyLinks": "Copy the links",
  "xg.out.downloadLinks": "Download the links",
  "xg.out.empty": "Press Generate.",
  "xg.out.needAddress": "To build the client link, set the server address in the Your server section.",
  "xg.clients.emailNote": "Email for 3x-ui panel export is added automatically — first 8 chars of id, unique per inbound. No manual input needed.",
  "xg.side.server": "server",
  "xg.side.both": "server + client",
  "xg.side.server.hint": "The value lives only in the server config.",
  "xg.side.both.hint": "The value goes into the server config and the client link — it has to match on both sides.",
  "xg.group.inbound.note": "The port the server listens on, and what to do with traffic that failed authentication.",
  "xg.group.vless.note": "Who connects and how: the client identity, the flow, and the VLESS encryption mode.",
  "xg.group.reality.note": "Wearing someone else's handshake. Donor, names, keys and shortIds — the section where a mistake costs the most.",
  "xg.group.tls.note": "Ordinary TLS instead of REALITY: the certificate, ALPN and the client fingerprint.",
  "xg.group.xhttp.note": "Transport over HTTP. Path, mode, padding, and everything that makes the stream look like an ordinary site.",
  "xg.group.xmux.note": "Multiplexing: how many streams share one connection, and for how long.",
  "xg.group.transport.note": "Settings for the specific transport — gRPC, WebSocket, HTTPUpgrade.",
  "xg.group.sockopt.note": "How the socket underneath behaves: congestion control, keepalive, MPTCP.",
  "xg.group.finalmask.note": "An extra masking layer on top of QUIC.",
  "xg.act.generate": "Generate",
  "xg.act.regenerate": "Generate again",

  /* ── Theme switcher ───────────────────────────────────────────────────── */
  "theme.label": "Theme",
  "theme.system": "Match system",
  "theme.light": "Light",
  "theme.dark": "Dark",

  /* ── Home / hero ──────────────────────────────────────────────────────── */
  "home.badge": "AWG 3.0 READY",
  "home.title.brand": "AmneziaWG",
  "home.title.accent": "Architect",
  "home.desc":
    "Advanced obfuscation generator for defeating DPI. Everything runs in your browser — nothing leaves your device.",

  /* ── Versions ─────────────────────────────────────────────────────────── */
  /* ── AWG 3.0 panel ────────────────────────────────────────────────────── */
  "awg3.panel.title": "AmneziaWG 3.0 parameters",
  "awg3.hpk.title": "HeaderProtectionKey",
  "awg3.hpk.desc":
    "ChaCha20 over packet headers. Handshake and cookie messages are encrypted whole; transport packets only in the header. The nonce is taken from the padding, so S1–S4 cannot go below 12 bytes: anything drawn under the floor is redrawn from the rest of its range rather than pinned to 12.",
  "awg3.cpa.title": "ContentPaddingAddition",
  "awg3.cpa.desc":
    "Random extra padding on every transport packet instead of aligning to 16 bytes — it blurs the packet-size histogram.",
  "awg3.timings.title": "Randomised timers",
  "awg3.timings.desc":
    "RekeyAfterTime, RekeyTimeout, RejectAfterTime, KeepaliveTimeout and MaxHandshakeAttempts become ranges, so a fixed handshake cadence stops being a fingerprint.",
  "awg3.groundwork.lead": "The",
  "awg3.groundwork.note":
    "tags parse in v3.0.1 but are not wired into the send path yet — they are groundwork for AWG 4.0, so the generator does not emit them.",

  /* ── Generator controls ───────────────────────────────────────────────── */
  "gen.client.label": "Target client",
  "client.note.windowsHCap":
    "Before 2.0.2 the editor underlines H values above 2,147,483,647 in red and will not save the config. Those values work fine on the server — the limit was only in the client-side check (PR #85, fixed in #87).",
  "client.note.wgTunnelBattery":
    "Large S3/S4 may drain battery or behave inconsistently; keep S4 modest.",
  "client.note.keeneticI1":
    "Sensitive to I1: prefer a simple <r 64> or a DNS mimicry profile.",
  "client.note.goNoTagC":
    "The tunnel here is amneziawg-go, and it has no <c> at all: its vocabulary is <b>, <t>, <r>, <rc>, <rd>, <d>, <ds>, <dz>. The packet counter exists only in the Linux kernel module.",
  "client.engine.unverified": "an unconfirmed engine",
  "client.note.kmodTags":
    "The only engine where <c> works: the packet counter is implemented here and nowhere else. It does not know <d>, <ds> or <dz>, which exist only in amneziawg-go. An unfamiliar tag takes the whole junk packet down with it.",
  "client.note.openwrtKmod":
    "OpenWrt packages build the kernel module rather than amneziawg-go. So <c> does work here, while <d>, <ds> and <dz> do not.",
    "client.note.wiresockNoI":
    "It does not send the I1-I5 chain at all: it has its own Id/Ip/Ib set on top of a BoringTun fork. It accepts I1-I5 fields silently and throws them away, and the tunnel comes up as if nothing happened, because those packets are discarded at the far end anyway. All that is lost is the mimicry, and nothing says so. Configs for it are generated without I1-I5.",
  "client.note.mihomoVersion3":
    "The only client outside Amnezia's own ecosystem that reaches AWG 3.0, and only with version: 3 in the outbound options. Below that it runs the older implementation, without header protection.",
  "client.note.opnsenseBounds":
    "The plugin bounds Jc to 1-128 and starts Jmin and Jmax at 1 rather than 0. It takes H values as either a number or a range.",
  "client.note.engineUnverified":
    "What this client uses to read the I1–I5 chain could not be established from source. It keeps the tags both known engines understand; <c> is withheld, because an unfamiliar tag rejects not itself but the whole packet.",
  "gen.client.releaseCurrent": "Current client version",
  "gen.profile.label": "Mimicry profile",
  "gen.profile.random": "Random choice",
  "gen.host.check": "Check domain availability",
  "gen.mimicAll": "Apply the profile to I2–I5",
  "gen.tags.label": "Tags in the CPS chain",
  "gen.tags.warnC":
    "The packet counter exists only in the Linux kernel module. amneziawg-go, which every Amnezia app runs on, has no <c> in any version — and an unfamiliar tag there rejects the whole junk packet, not just itself.",
  "gen.tags.unavailable": "{engine} does not parse this tag",
  "gen.tags.noChain":
    "The selected client does not send an I1-I5 chain at all, so the tags here change nothing. The tunnel will come up, but without the mimicry. If you need that, pick a different client.",
  "gen.tags.engineDrops":
    "The selected client runs on {engine}, which does not know {tags}. Those tags are switched off rather than handed over in a config the client would reject whole.",
  "gen.tags.engineUnknownDrops":
    "This client has {engine}: what it reads the chain with could not be established from source. So {tags} are withheld, because an engine that does not know them rejects the whole junk packet rather than the one tag.",
  "gen.fp.toggle": "Imitate packet sizes",
  "gen.junk.label": "Junk train (Jc)",
  "gen.junk.off": "0 — Off",
  "gen.junk.optimal": "3 — Optimal",
  "gen.junk.recommended": "5 — Recommended",
  "gen.junk.strong": "7 — Strong",
  "gen.junk.max": "10 — Maximum",
  "gen.extreme.title": "Extreme maximums",
  "gen.router.title": "Router mode",
  "gen.batch.download": "Download {n} configs",
  "gen.merge.title": "Key management",
  /* ── Generator log ────────────────────────────────────────────────────── */
  "log.generated": "Generated — {profile}",
  "log.routerMode": "Router mode: minimal noise",
  "log.batchRange": "The count must be between 1 and 1000",
  "log.batchDone": "Configs generated: {n}",
  "log.batchError": "Batch error: {error}",
  "log.batchFirst": "Generate a batch first",
  "log.confirmed": "Configuration confirmed",
  "log.retry": "Attempt {n}: regenerating with stronger parameters",
  "log.retryHigh": "Attempt {n}: HIGH mode, maximum obfuscation",
  "log.generateFirst": "Generate a config first",
  "log.copyFailed": "Could not copy to the clipboard",
  "log.saved": "Config saved to a file",
  "log.hostRequired": "Enter a host to check",
  "log.hostBlockedList": "{host} — on the known-blocked list",
  "log.hostOk": "{host} — reachable",
  "log.hostUnreachable": "{host} — unreachable ({error})",
  "log.copiedConf": "Config copied to the clipboard",
  "log.copiedJson": "JSON copied to the clipboard",
  "log.copiedYaml": "mihomo YAML copied to the clipboard",

  /* ── Generated .conf comments ─────────────────────────────────────────── */
  "conf.privateKey": "PrivateKey = <your private key>",
  "conf.address": "Address = 10.0.0.2/32",
  "conf.cpsClientOnly": "I1-I5 are client-side only in AWG 1.5:",
  "conf.noCps": "I1-I5 are not supported in AWG 1.0",
  "conf.noCpsClient":
    "The chosen client does not send I1-I5, so there is no chain here. The tunnel works without it: what it adds is the mimicry, and fields the client will not send would only give the appearance of it",
  "conf.awg3Hpk":
    "AWG 3.0 — shared header protection key (identical on both ends)",
  "conf.awg3Cpa": "AWG 3.0 — random transport packet padding",
  "conf.blockHeaders": "Packet type markers. Must match the server and must not overlap",
  "conf.blockSizes": "Random padding in front of each kind of packet",
  "conf.blockJunk": "Empty packets sent before the handshake",
  "conf.peerKey": "PublicKey = <the server public key>",
  "conf.endpoint": "The server this config connects to",
  "conf.blockCps": "Fake packets sent before the handshake. The receiver never parses them",
  "conf.mustMatch": "Everything above must be identical on the server",
  "conf.awg3Timers": "AWG 3.0 — protocol timer randomisation",

  /* ── History ──────────────────────────────────────────────────────────── */
  "history.title": "Generation history",
  "history.empty": "No generations yet. Press Generate to start.",
  "history.clear": "Clear history",
  "history.restore": "Restore config",
  "history.restored": "Restored AWG {version} config from {time}",
  "history.copy": "Copy config",
  "history.delete": "Delete",
  "history.legacy": "Legacy entry — copy only",

  /* ── Knowledge base CTA ───────────────────────────────────────────────── */
  /* ── Parameter groups ─────────────────────────────────────────────────── */
  "params.group.junk": "Junk Train",
  "params.group.sizes": "Packet sizes",
  "params.group.headers": "Headers",
  "params.group.cps": "CPS Signatures",
  /* ── Actions ──────────────────────────────────────────────────────────── */
  /* ── 404 ──────────────────────────────────────────────────────────────── */
  "nf.badge": "PACKET LOST",
  "nf.title": "Page not found",
  "nf.desc":
    "There is no route here — the link may be out of date, or the address mistyped. Your keys and configs are unaffected either way: they only ever lived in your browser.",
  "nf.requested": "Requested address",
  "nf.home": "Go home",
  "nf.back": "Go back",
  "nf.elsewhere": "Perhaps you were looking for",
  "nf.link.generator": "Configuration generator",
  "nf.link.faq": "Answers to common questions",
  "nf.link.mergekeys": "Working with Amnezia keys",

  /* ── Packet simulator ─────────────────────────────────────────────────── */
  "sim.noData": "Nothing to simulate yet. First",
  "sim.noData.link": "generate a config",
  "sim.restart": "Restart",
  "sim.stat.packets": "packets",
  "sim.stat.bytes": "bytes total",
  "sim.stat.payload": "payload",
  "sim.stat.overhead": "overhead",
  "sim.stat.at10mbit": "at 10 Mbit/s",
  "sim.diagram.title": "Packet exchange diagram",
  "sim.client": "Client",
  "sim.server": "Server",
  "sim.legend.title": "Legend",
  "sim.packet": "Packet",
  "sim.detail.direction": "Direction",
  "sim.detail.size": "Size",
  "sim.detail.header": "Header (H)",
  "sim.detail.crypto": "Encryption",
  "sim.detail.frame": "Frame",
  "sim.detail.framing": "Framing",
  "sim.detail.realityAuth": "REALITY authentication",
  "sim.detail.realityAuth.carried": "carried by this packet",
  "sim.detail.payload": "Payload",
  "sim.bytes": "B",
  "sim.table.title": "Packet table",
  "sim.table.type": "Type",
  "sim.table.direction": "Direction",
  "sim.table.size": "Size",
  "sim.table.desc": "Description",
  "sim.desc.cps": "CPS packet I{n}: {profile}",
  "sim.desc.junk": "Junk train {i}/{total} — traffic cover",
  "sim.desc.init": "WG Handshake Initiation, H1={h1}, S1={s1}",
  "sim.desc.response": "WG Handshake Response, H2={h2}, S2={s2}",
  "sim.desc.cookie": "Cookie Reply, H3={h3}, S3={s3}",
  "sim.desc.data": "Data transfer, H4={h4}, S4={s4}",
  "sim.desc.data3": "Data transfer, H4={h4}, S4={s4}, padding +{pad} B",
  "sim.hp.badge": "Header encrypted",
  "sim.hp.whole": "Whole message encrypted",
  "sim.hp.note":
    "AWG 3.0: a HeaderProtectionKey is set, so headers are encrypted with ChaCha20. Handshake and cookie messages are encrypted whole; transport packets only in their header.",
  "sim.version.note.10":
    "AWG 1.0: no CPS chains and no padded cookie reply; H1–H4 are fixed values.",
  "sim.version.note.15":
    "AWG 1.5: CPS chains are client-side only, S3/S4 are absent, and H1–H4 are fixed values.",
  "sim.legend.cps":
    "The signature chain that makes traffic resemble the chosen protocol.",
  "sim.legend.junk":
    "Decoy packets that confuse DPI ahead of the real handshake.",
  "sim.legend.init":
    "WireGuard Handshake Initiation — the first genuine WG packet.",
  "sim.legend.response": "WireGuard Handshake Response — the server's reply.",
  "sim.legend.cookie": "Cookie Reply — DDoS and amplification protection.",
  "sim.legend.data": "Encrypted VPN tunnel data.",
  /* XRay: the same roles, in a different protocol. */
  "sim.legend.clientHello":
    "TLS ClientHello. Under REALITY this is what carries the authentication — indistinguishable by size or extension list from a real browser.",
  "sim.legend.serverHello":
    "ServerHello and the certificate chain. Under REALITY they come from the real target site, which is also what sets their size.",
  "sim.legend.handshakeFinish": "Finished — the TLS handshake closes.",
  "sim.legend.vlessRequest":
    "The VLESS request header: version, UUID, flow, destination address and port. It rides inside the first application record.",
  "sim.legend.appData": "The payload — what everything else is for.",
  "sim.legend.padding": "Padding and the VLESS Encryption key exchange.",
  "sim.desc.xrayHelloReality":
    "ClientHello, SNI={sni}, fingerprint {fp}. The REALITY authentication is hidden in the hello's own fields.",
  "sim.desc.xrayHelloTls": "ClientHello, fingerprint {fp}.",
  "sim.desc.xrayServerHelloReality":
    "The answer from {dest}: the certificate is genuine, because it is the genuine one.",
  "sim.desc.xrayServerHelloTls": "ServerHello and the server certificate.",
  "sim.desc.xrayFinished": "Finished — the handshake is closed and application traffic follows.",
  "sim.desc.xrayVlessRequest": "VLESS header, {bytes} B, flow={flow}",
  "sim.desc.xrayEncryption": "VLESS Encryption key exchange: ML-KEM-768 plus X25519.",
  "sim.desc.xrayAppData": "Application data over {transport}, +{overhead} B of framing",
  "sim.note.plain":
    "No encryption: the session opens straight onto application data, everything visible as it is.",

  /* ── MergeKeys ────────────────────────────────────────────────────────── */
  "mk.err.notBase64":
    "That does not look like a key: the string holds characters base64 never contains. Usually that means a key copied only in part, or copied along with something else.",
  "mk.act.copyGroup": "Copy",
  "mk.act.saveGroup": "Download as a file",
  "mk.view.indent": "Indent",
  "mk.view.confWraps": "Long lines wrap",
  "mk.act.copyKey": "Copy the vpn:// key",
  "mk.act.copyJson": "Copy the JSON",
  "mk.act.copyConf": "Copy the .conf",
  "mk.act.copyVless": "Copy the vless:// link",
  "mk.act.saveKey": "Download the key",
  "mk.act.saveJson": "Download the JSON",
  "mk.act.saveConf": "Download the .conf",
  "mk.edit.start": "Edit",
  "mk.edit.apply": "Apply",
  "mk.edit.cancel": "Cancel",
  "mk.edit.unreadable": "Could not read that back: check the syntax.",
  "mk.build.templateLabel":
    "Start from a template",
  "mk.tpl.awg3":
    "Header protection and timers",
  "mk.tpl.awg2":
    "S3, S4 and header ranges",
  "mk.tpl.awg15":
    "The I1–I5 chain on top of the basics",
  "mk.tpl.awg1":
    "Basic obfuscation: junk, S1 and S2",
  "mk.tpl.wg":
    "No obfuscation, a plain tunnel",
  "mk.tpl.xray":
    "REALITY over VLESS",
  "find.vpn.no_endpoint":
    "The configuration does not say where to connect: there is no Endpoint line giving a server address and port. The config itself is fine — the obfuscation parameters are all there — but nothing can connect with it yet. Add the server address.",
  "mk.build.addLabel":
    "Or paste something you have",
  "mk.build.add":
    "Add to the key",
  "mk.err.noContainerToAdd":
    "That key holds no containers to add. A subscription key carries no tunnel.",
  "mk.refresh.keyLabel":
    "The key being rewritten",
  "mk.refresh.paramsLabel":
    "The new obfuscation parameters",
  "mk.refresh.paramsPlaceholder":
    "Paste a .conf from a generator, or lines like Jc = 4",
  "mk.refresh.run":
    "Apply to the key",
  "mk.refresh.done":
    "Done. Fields updated: {fields}",
  "mk.err.needKey":
    "Paste the key you want to update first.",
  "mk.err.needParams":
    "No client-side field was found in those parameters: Jc, Jmin, Jmax or I1–I5 are expected.",
  "mk.result.service.premium.title":
    "An Amnezia Premium key",
  "mk.result.service.premium.desc":
    "This is Amnezia's paid subscription. What it holds is not a tunnel but access to a service: the app asks that service for a configuration when it connects. So there is nothing here to merge and no obfuscation to rewrite — the parameters arrive on the device later.",
  "mk.result.service.free.title":
    "An Amnezia Free key",
  "mk.result.service.free.desc":
    "This is Amnezia's free access. As with the paid subscription, what it holds is a key to a service rather than a tunnel: the app requests the configuration itself. There is nothing to edit here — but the key does say which protocol and region it will ask for.",
  "mk.result.service.other.title":
    "A subscription key",
  "mk.result.service.other.desc":
    "The key points at a service that issues a configuration on connection rather than carrying one. It holds no containers, so merging and rewriting obfuscation do not apply to it.",
  "mk.result.service.protocol":
    "Protocol",
  "mk.result.service.region":
    "Region",
  "mk.err.confUnreadable":
    "That .conf could not be read: it has no Endpoint line giving an address and a port.",
  "mk.hero.pre":
    "Key workbench",
  "mk.hero.lede":
    "Read a key, fold several into one, refresh the obfuscation, or assemble your own.",
  "mk.hero.desc":
    "It reads Amnezia's `vpn://` format, `vless://` links, `.json` exports and `.conf` files, shows what is inside, and says what is wrong with it. One key can carry several protocols at once — WireGuard, AmneziaWG, XRay, OpenVPN — and every one of them is listed.",
  "mk.hero.privacy":
    "Everything is computed in your tab. Keys go nowhere, because there is nowhere to send them: this project has no server. The private keys inside are access — treat them accordingly.",
  "mk.modes.label":
    "Modes",
  "mk.mode.inspect.title":
    "Read",
  "mk.mode.inspect.hint":
    "What this key is, and what is wrong with it",
  "mk.mode.inspect.lede":
    "Paste a `vpn://` key, a `vless://` link, a `.json` export or a `.conf` file. It is decoded, identified and checked, and you can read it back in any of the formats — nothing is sent anywhere.",
  "mk.mode.merge.title":
    "Merge",
  "mk.mode.merge.hint":
    "Several keys into one",
  "mk.mode.merge.lede":
    "Containers from every key are gathered into one. Ones that collide by name are not fused: the first is kept and the second reported.",
  "mk.mode.refresh.title":
    "Obfuscation",
  "mk.mode.refresh.hint":
    "Refresh the parameters in a key you have",
  "mk.mode.refresh.lede":
    "Reissue the client-side obfuscation in a key you already hold.",
  "mk.mode.build.title":
    "Build",
  "mk.mode.build.hint":
    "Assemble a key from parts",
  "mk.mode.build.lede":
    "Your own key from ready parts. Paste a key or a link and its containers become parts of the new one — as many ways to connect as you like, in a single key.",
  "mk.input.placeholder":
    "vpn://… · vless://… · JSON · .conf",
  "mk.slot.unreadable":
    "unreadable",
  "mk.merge.run":
    "Merge",
  "mk.merge.total":
    "containers",
  "mk.merge.unique":
    "unique",
  "mk.merge.dupes":
    "collided",
  "mk.refresh.handoff":
    "The parameters arrived from the generator and are filled in already. Paste the key you want them written into.",
  "mk.refresh.scope":
    "Only the client-side parameters change: Jc, Jmin, Jmax and the I1–I5 chain. H1–H4, S1–S4, the keys and the address stay as they were, or the tunnel will not come up. The edit reaches all three copies of the configuration at once.",
  "mk.build.name":
    "Name",
  "mk.build.description":
    "Description",
  "mk.build.parts":
    "The parts of the key",
  "mk.build.empty":
    "Nothing yet. Paste a key or a link above and press \\u201cAdd to the key\\u201d.",
  "mk.build.removePart":
    "Remove this part",
  "mk.result.noContainers":
    "No containers at all",
  "mk.result.inferred":
    "worked out from the fields",
  "mk.result.rename":
    "Apply",
  "mk.slot.remove":
    "Remove this box",
  "mk.slot.add":
    "Another key",
  "mk.result.title":
    "What is inside",
  /* ── About page ───────────────────────────────────────────────────────── */
  /* ── About ────────────────────────────────────────────────────────────── */
  "about.hero.tagline": "A next-generation generator)",
  "about.hero.motto": "Your protocol → your rules",

  "about.legal.title": "A little legal preamble",
  "about.legal.lede":
    "This tool exists for research and for learning how obfuscation actually works. Whether to use it is your decision, and nobody who had a hand in it answers for that decision.",
  "about.legal.asis":
    "The project is given as it is: no promise that it suits you, and no liability for what happens while you use it. That is not a dodge — it is the literal text of the MIT licence, which is short and worth reading in full.",
  "about.legal.licenseLink": "The MIT licence, in full",

  "about.legal.forTitle": "What it is certainly for",
  "about.legal.for.1": "Competitions — CTF and everything around it.",
  "about.legal.for.2": "Academic work and teaching how protocols are built.",
  "about.legal.for.3": "Security research.",
  "about.legal.for.4":
    "Setting up and testing your own local networks — yours, not someone else's.",

  "about.legal.warnTitle": "Said plainly",
  "about.legal.warn":
    "Traffic obfuscation may break the law where you are. Nothing here encourages that — check what is allowed where you are before you run anything. It is your responsibility, and there is nobody to pass it to.",

  "about.chip.protocols.value": "AmneziaWG and XRay",
  "about.chip.protocols.label": "Two protocols",
  "about.chip.params.label": "Generated parameters",
  "about.chip.params.hint": "23 for AmneziaWG and 74 for XRay",
  "about.chip.tests.label": "Automated tests",
  "about.chip.tests.hint": "Run on every build",
  "about.chip.clients.label": "Supported clients",
  "about.chip.clients.hint": "Each with its own ceilings",
  "about.chip.people.value": "1500+",
  "about.chip.people.label": "Came to look",
  "about.chip.people.hint":
    "We collect no statistics at all. This number comes from GitHub's public traffic report for the project page, and we have no other way of knowing it.",
  "about.chip.days.label": "Days in the making",
  "about.chip.days.hint": "Since 1 March 2026, without a pause",

  "about.what.title": "What Any Tech ARCHITECT is",
  "about.what.lede":
    "A tool that assembles an obfuscation configuration and explains every number in it. Not press-and-hope, but a working drawing: you can see what the packet is made of and why it looks the way it does.",
  "about.what.p1":
    "Clients can generate these parameters themselves, and that is fine right up until the tunnel does not come up. Then it turns out the button explained neither what it chose nor which of it has to match on the server. This explains: every parameter says where its bound came from, which side reads it, and what happens when the two sides disagree.",
  "about.what.p2":
    "Everything is computed in your tab. Keys, identities, shortIds — all of it is born in the browser and goes nowhere, because there is nowhere to go: this project has no server.",

  "about.what.card.1.title": "From the text of the standard",
  "about.what.card.1.desc":
    "Mimicry profiles are built from the RFCs rather than by eye: QUIC from 9000, TLS from 8446, DNS from 1035. Where a bound is stated, the file in the protocol's own source is named beside it.",
  "about.what.card.2.title": "Checked, not claimed",
  "about.what.card.2.desc":
    "Configs are generated in thousands and tested against invariants, packets are parsed as their own protocols, and XRay runs against released cores in Docker — one core per version.",
  "about.what.card.3.title": "Nothing leaves",
  "about.what.card.3.desc":
    "No analytics, no counters, no server side. The page is static files, and once loaded it works with the network off.",
  "about.what.card.4.title": "Explains, not only emits",
  "about.what.card.4.desc":
    "Every parameter carries a note: what it does, whether it has to match the server, and which version introduced it. The {n} FAQ answers are the same thing at length.",

  "about.timeline.title": "How it grew",
  "about.timeline.lede":
    "Each entry says what changed and why. The number answers one question: how much of the tool you have to learn again.",
  "about.timeline.scheme.major": "major — it is a different tool",
  "about.timeline.scheme.minor": "minor — it does something it could not",
  "about.timeline.scheme.patch": "patch — something was wrong",

  "about.privacy.title": "The privacy manifesto",
  "about.privacy.lede":
    "A short section, because there is not much to tell: we know nothing about you and have no plans to start.",
  "about.privacy.1.title": "No analytics",
  "about.privacy.1.desc":
    "No counters, no pixels, no \"anonymous telemetry that helps us improve\". We will improve some other way.",
  "about.privacy.2.title": "No server either",
  "about.privacy.2.desc":
    "There is nowhere to send your keys even if we wanted to: these are static files on a host. Nothing is listening.",
  "about.privacy.3.title": "It all happens on your side",
  "about.privacy.3.desc":
    "Keys, shortIds, client identities — all generated in your tab through the browser's own cryptographic source. Turn the network off after the page loads: it works exactly the same.",
  "about.privacy.4.title": "Your history is yours",
  "about.privacy.4.desc":
    "Saved configs live in your browser's localStorage. We cannot see them and cannot sync them between your devices — there is an export to a file, which is more honest than any cloud.",
  "about.privacy.5.title": "Check for yourself",
  "about.privacy.5.desc":
    "Open the Network tab in your developer tools and generate a config. There will be no outgoing requests. That is not a promise; it is ten seconds of looking.",

  "about.source.title": "Open source",
  "about.source.lede":
    "Everything this page does can be read. Two mirrors, in case one of them does not open where you are.",
  "about.source.github": "GitHub",
  "about.source.githubDesc": "The main repository, releases and discussions.",
  "about.source.mirror": "VIA GIT",
  "about.source.mirrorDesc":
    "Our own mirror. It opens where GitHub does not.",
  "about.source.bugs": "Found a bug?",
  "about.source.bugsDesc":
    "Open an issue on GitHub — with the version, the steps, and what you expected instead. Ideas and requests go there too: most of the list above started as somebody's message.",
  "about.source.bugsGo": "Report a problem",

  "about.author.title": "Who makes this",
  "about.author.p1":
    "The project has one author. He has kept at it for a long time without a break — everything on this page was written by one person in his spare time.",
  "about.author.p2":
    "There are other projects besides this one, and they are not small. If you liked how Architect is put together, go and have a look: the same hand made those.",
  "about.author.projects": "Other projects",
  "about.author.donate":
    "And if you would like to help — this is what helps most. Not a subscription and not adverts: just time for the author to keep going.",

  "donate.title": "Support the project",
  "donate.desc":
    "This project runs on enthusiasm and collects neither data nor money from its users. If it helped you, a coffee in crypto is welcome.",
  "donate.copyAddress": "Copy address",
  "donate.copied": "Address copied",
  "donate.network": "Network",
  "donate.warning":
    "Check the network before sending: funds sent on the wrong network are lost for good.",

  /* ── Footer ───────────────────────────────────────────────────────────── */
  "footer.slogan.lead": "Encrypting reality.",
  "footer.slogan.accent": "An architecture of freedom",
  "footer.slogan.tail": "— in every packet.",

  "mirror.badge": "Mirror",
  "mirror.text": "For the best availability use the main site, but this mirror works too.",
  "mirror.donate": "Runs on YooMoney donations — support the project",
  "footer.donate.title": "Support the project",
  "footer.donate.methods": "YooMoney · Patreon · DaLink · crypto",
  "footer.col.resources": "Resources",
  "footer.col.community": "Community",
  "footer.col.research": "Research",
  "footer.link.source": "Source code",
  "footer.link.sourceMirror": "Source code on VIA GIT",
  "footer.link.amneziaGithub": "Amnezia VPN on GitHub",
  "footer.link.telegram": "Telegram chat",
  "footer.link.author": "Project author",
  "footer.credits.basedOn": "Built on ideas from",
  "footer.credits.from": "by",
  "footer.madeWith": "Made with",
  "footer.forCommunity": "for the AmneziaVPN community",
  "footer.stamp.project": "Project",
  "footer.stamp.build": "Build",
  "footer.stamp.data": "Data",
  "footer.stamp.dataValue": "never leaves the browser",
  "footer.stamp.source": "Source",

  /* ── Common ───────────────────────────────────────────────────────────── */
  /* ── Находки валидаторов ────────────────────────────────────────────── */
  // Тексты живут здесь, а не в валидаторах: находка несёт код и значения,
  // а предложение собирается на языке читателя.
"find.awg3.version_mismatch":
"AWG 3.0 parameters are set, but the config version is {version}.",
"find.awg3.flags_version_mismatch":
"RandomTrailers/DisableCookies are understood by AWG 3.1 only; a device on {version} refuses these keys when reading the config.",
  "find.awg3.hpk_format":
    "HeaderProtectionKey must be {bytes} bytes in base64 ({chars} characters).",
  "find.awg3.s_below_nonce":
    "{name}={value} < {min}: with HeaderProtectionKey the cipher nonce is taken from the padding, and shorter padding quietly weakens the encryption.",
  "find.awg3.cpa_format":
    "ContentPaddingAddition must be a number or a min-max range.",
  "find.awg3.cpa_zero":
    "ContentPaddingAddition = 0 — the extra padding is switched off.",
  "find.awg3.timing_format":
    "{name} must be a number or a min-max range.",
  "find.awg3.timing_inverted":
    "{name}: the lower bound is above the upper one.",
  "find.awg3.reject_too_low":
    "RejectAfterTime ({reject}s) must exceed KeepaliveTimeout + RekeyTimeout ({floor}s), or the session dies before it can rekey.",
  "find.awg3.rekey_after_reject":
    "RekeyAfterTime (up to {rekey}s) must be below RejectAfterTime (from {reject}s).",
  "find.awg3.attempts_zero":
    "MaxHandshakeAttempts must be at least 1.",
  "find.parse.empty":
    "The config is empty.",
  "find.parse.not_awg":
    "This does not look like an AmneziaWG config: no parameters were found.",
  "find.parse.plain_wireguard":
    "No Jc found — this is a WireGuard config without AmneziaWG obfuscation.",
  "find.parse.missing":
    "Parameter {key} is missing.",
  "find.parse.not_a_number":
    "{key} must be a non-negative number, got “{value}”.",
  "find.parse.not_a_range":
    "{key} must be a start-end range on version {version}.",
  "find.parse.unsupported_for_version":
    "{key} is unused on version {version} and will be ignored.",
  "find.parse.unknown_version":
    "Version {version} is unknown to this build.",

  /* ── Находки движка XRay ────────────────────────────────────────────── */
  "find.vpn.subscription_key":
    "This is a subscription key: it carries access to a service rather than a tunnel. There is nothing here to merge or re-obfuscate — the service issues the configuration later, on connection.",
  "find.vpn.no_containers":
    "The key holds no containers at all. It may have been truncated when it was copied.",
  "find.vpn.empty_container":
    "Container \"{name}\" is empty: there are no settings inside it.",
  "find.vpn.container_inferred":
    "The container name \"{name}\" is not one we know, but its fields look like {guess}. Worked out from the contents rather than the name.",
  "find.vpn.container_unknown":
    "The container name \"{name}\" is not one we know, and its fields did not say what is inside either.",
  "find.vpn.container_mismatch":
    "The container is called {declared} while the fields inside look like {found}. A client reads the name and hands the body to the wrong protocol.",
  "find.vpn.last_config_unreadable":
    "In container \"{name}\", last_config does not parse as JSON.",
  "find.vpn.self_contradiction":
    "Container \"{name}\" contradicts itself: {field} is {a} in the fields and {b} in {where}. Which copy wins depends on the client.",
  "find.vpn.s_below_floor":
    "Container \"{name}\" sets HeaderProtectionKey while {field} is {value}, below {min}. Both implementations refuse to bring such an interface up, and name the reason in the log.",
  "find.vpn.duplicate_container":
    "Container \"{name}\" appears twice, at positions {first} and {at}. A client takes the first.",
  "find.vpn.default_missing":
    "defaultContainer points at \"{name}\", and no such container is in the key.",
  "find.vless.not_a_link":
    "This does not look like a vless:// link — it has to start with vless://.",
  "find.vless.no_identifier":
    "The link carries no client identifier. It sits before the @ and works as a password.",
  "find.vless.no_host":
    "The link carries no server address.",
  "find.vless.bad_port":
    "Port \"{port}\" is outside the range 1–65535.",
  "find.vless.id_not_uuid":
    "The identifier does not look like a UUID. Some panels issue their own format and the core accepts it — but a typo looks the same.",
  "find.vless.unknown_security":
    "Unknown security value: \"{value}\". The core expects none, tls or reality.",
  "find.vless.unknown_transport":
    "Unknown transport: \"{value}\".",
  "find.vless.reality_no_pbk":
    "security=reality requires pbk, the public half of the key pair. Without it the client cannot connect.",
  "find.vless.reality_no_sni":
    "REALITY is on and sni is unset. The client will use the server address, which shows up as a mismatch with the donor's certificate.",
  "find.vless.reality_no_fp":
    "REALITY is on and fp is unset. The client will present its own library's handshake rather than a browser's — the very thing REALITY avoids.",
  "find.vless.pbk_without_reality":
    "pbk is set but security is not reality. The link works; REALITY is simply off.",
  "find.vless.unknown_flow":
    "Unknown flow value: \"{value}\". The current core sources accept only xtls-rprx-vision.",
  "find.vless.flow_without_tls":
    "flow is set but security=none. Vision runs over TLS and will be ignored here.",
  "find.vless.odd_encryption":
    "The encryption value looks unusual: none, or a post-quantum encryption string, is expected.",
  "find.vless.unknown_param":
    "Parameter \"{name}\" is not part of the link standard. A client will most likely ignore it.",
  "find.xray.address_missing":
    "The server address is missing.",
  "find.xray.port_range":
    "Port {port} is outside the 1–65535 range.",
  "find.xray.vision_needs_tls":
    "xtls-rprx-vision works only over TLS or REALITY: “XTLS only supports TLS and REALITY directly for now”.",
  "find.xray.vision_no_udp":
    "xtls-rprx-vision does not support UDP and requires TLS 1.3 on the outer layer.",
  "find.xray.flow_mismatch":
    "The flow value must match on client and server: an empty flow against a vision account is rejected.",
  "find.xray.reality_transport":
    "REALITY does not work over the {transport} transport: only RAW, XHTTP and gRPC are supported.",
  "find.xray.hysteria_unsupported":
    "The Hysteria transport arrived in v26.1.13 — on {version} the core answers \"unknown transport protocol\" and refuses to start. The generator substitutes XHTTP.",
  "find.xray.transport_deprecated":
    "The {transport} transport is deprecated — the core recommends XHTTP instead.",
  "find.xray.reality_missing":
    "REALITY is selected but its parameter block is missing.",
  "find.xray.server_names_empty":
    "serverNames cannot be empty on the server side.",
  "find.xray.sni_dest_mismatch":
    "The donor {dest} does not match the names the client will ask for ({names}). The certificate comes from one site and the SNI names another — visible on the wire and confirmed by a single probe.",
  "find.xray.server_name_risky":
    "{name}: the core warns that this target raises the chance of the IP being blocked.",
  "find.xray.dest_missing":
    "The target is missing — the site the handshake is dressed as.",
  "find.xray.xver_range":
    "xver = {xver}: only 0, 1 and 2 are allowed.",
  "find.xray.key_length":
    "The key must be 32 bytes in unpadded base64 RawURL.",
  "find.xray.short_ids_empty":
    "shortIds cannot be empty on the server side.",
  "find.xray.short_id_long":
    "shortId “{id}” is longer than 16 characters.",
  "find.xray.short_id_odd":
    "shortId “{id}” has an odd length and will not decode as hex.",
  "find.xray.short_id_hex":
    "shortId “{id}” contains characters outside hex.",
  "find.xray.spider_x_slash":
    "spiderX must start with a slash.",
  /* Checks derived from a parameter's description rather than written per parameter. */
  /* .conf structure — what is about the file rather than the obfuscation. */
  /* Obfuscation parameter rules — engines/awg/rules.ts. */
  "find.awg.jc_range":
    "Jc must be between {min} and {max} — that is the kernel's limit.",
  "find.awg.jc_slow":
    "Jc = {jc}: every junk packet goes out before the handshake, so it will be noticeably slower.",
  "find.awg.jc_over_client":
    "Jc = {jc} is above the recommended maximum of {max} for {client}.",
  "find.awg.jmin_not_below_jmax":
    "Jmin must be strictly below Jmax.",
  "find.awg.jmax_over_mtu":
    "Jmax = {jmax} is at or above the MTU ({mtu}) — junk packets will fragment, and fragmentation is itself conspicuous.",
  "find.awg.size_max":
    "{key} = {value}: the maximum is {max}, above which the packet no longer fits in a UDP datagram.",
  "find.awg.s4_max":
    "S4 = {s4}: the protocol caps transport padding at {max} bytes.",
  "find.awg.s4_zero":
    "S4 = 0 — transport packet obfuscation is off.",
  "find.awg.s4_over_client":
    "S4 = {s4} is above the maximum of {max} for {client}.",
  "find.awg.size_collision":
    "{a} and {b} produce the same packet length — two message types become indistinguishable by size, which is exactly what the padding is there to prevent.",
  "find.awg.h_overlap":
    "The {a} and {b} ranges overlap: the receiver cannot tell one message type from the other.",
  "find.awg.h_reserved":
    "{key} falls in the 1–4 range, reserved for WireGuard's own message types.",
  "find.awg.h_over_client":
    "{key} goes above the maximum of {max} for {client}.",
  "find.awg.cps_syntax":
    "{key}: the CPS chain syntax is not valid.",
  "find.awg.cps_tag_unsupported":
    "The {tag} tag is not supported by {client}.",
  "find.awg.conf.not_obfuscated":
    "No AmneziaWG parameters (H/S/J/I) in this config — it looks like plain WireGuard.",
  "find.awg.conf.template":
    "This is a template: PrivateKey and Address are left commented out — fill in your own before using it.",
  "find.awg.conf.unparsable": "The .conf could not be parsed: {reason}",
  "find.awg.conf.no_interface": "No [Interface] section.",
  "find.awg.conf.no_peer": "No [Peer] sections — is this a server-only config?",
  "find.awg.conf.missing_field": "Required field {key} is missing.",
  "find.awg.conf.bad_key": "{key} does not look like a WireGuard key: 32 bytes in base64 (44 characters) expected.",
  "find.awg.conf.peer_missing_field": "Peer #{n}: {key} is missing.",
  "find.awg.conf.peer_bad_key": "Peer #{n}: {key} does not look like a WireGuard key.",
  "find.awg.conf.peer_bad_endpoint": "Peer #{n}: Endpoint has an unusual format — host:port expected.",
  "find.param.not_a_number": "{key}: expected a number.",
  "find.param.not_a_range": "{key}: expected a range written as “min-max”.",
  "find.param.range_inverted": "{key}: the lower bound {lo} is above the upper bound {hi}.",
  "find.param.below_min": "{key} = {actual}: below the minimum of {min}.",
  "find.param.above_max": "{key} = {actual}: above the maximum of {max}.",
  "find.param.not_encoded": "{key}: the value does not decode as {encoding}.",
  "find.param.wrong_length": "{key}: expected {expected} bytes once decoded, got {actual}.",
  "find.param.too_long": "{key}: {actual} characters, maximum {max}.",
  "find.param.not_allowed":
    "{key}: “{value}” is not one of the allowed values ({allowed}).",
  "find.validator.crashed":
    "The “{rule}” check crashed: {reason}. That is an Architect bug, not a config one.",
  "find.xray.fingerprint_refused":
    "The {fingerprint} fingerprint is refused by REALITY.",
  "find.xray.mldsa_unsupported":
    "ML-DSA-65 arrived in v25.7.23 and is unavailable on version {version}.",
  "find.xray.mldsa_required":
    "On v{version} a REALITY inbound will not start without mldsa65Seed — on that core the field is required, not optional.",
  "find.xray.mldsa_seed_length":
    "mldsa65Seed must be 32 bytes in base64 RawURL.",
  "find.xray.mldsa_seed_equals_key":
    "mldsa65Seed cannot equal privateKey — the core rejects that.",
  "find.xray.mldsa_verify_pending":
    "mldsa65Verify is derived by ML-DSA-65 itself: obtain it with xray mldsa65 from this seed.",
  "find.xray.mldsa_verify_length":
    "mldsa65Verify must be exactly 1952 bytes.",
  "find.xray.vless_enc_unsupported":
    "VLESS Encryption arrived in v25.8.29 and is unavailable on version {version}.",
  "find.xray.vless_enc_format":
    "The encryption string must start with mlkem768x25519plus and carry at least four elements.",
  "find.xray.vless_enc_mode":
    "Mode “{mode}” is unknown: native, xorpub and random are allowed.",
  "find.xray.xhttp_path_slash":
    "The XHTTP path must start with a slash.",
  "find.xray.xhttp_split_mode":
    "Split download is on, but the mode resolved to {mode} rather than stream-up.",
  "find.xray.xhttp_basic_only":
    "On v{version} XHTTP has only the basic knobs: the padding names, the session id, the sequence counter and the uplink placement all arrived in v26.6.22. They are not renamed there, they are absent — so the config is generated without them rather than with keys no core reads.",
  "find.xray.xhttp_session_names":
    "On version {version} the session keys are session* rather than sessionID* — the config uses the older spelling.",
  "find.xray.parse.not_vless":
    "The link must start with vless://.",
  "find.xray.parse.malformed_uri":
    "The link could not be parsed.",
  "find.xray.parse.no_uuid":
    "The link carries no client identifier.",
  "find.xray.parse.unknown_transport":
    "Unknown transport “{transport}”.",
  "find.xray.parse.version_assumed":
    "The config does not state a core version — {version} was assumed.",
  "find.xray.parse.no_public_key":
    "The link carries no public key (pbk).",
  "find.xray.parse.client_half_only":
    "This is the client half: the private key and the target are not part of a link.",
  "find.xray.parse.server_half_only":
    "This is the server half: the public key is derived from the private one and is not stored in the config.",
  "find.xray.parse.bad_json":
    "The JSON could not be parsed.",
  "find.xray.parse.not_vless_inbound":
    "Expected an inbound with protocol = vless, got “{protocol}”.",
  "find.xray.parse.no_clients":
    "The config carries no clients.",
  "find.xray.parse.unrecognised":
    "This looks like neither a vless:// link nor a JSON config.",
  /* ── Client field guide ───────────────────────────────────────────────── */
  "clientFields.toggle.title": "Where each parameter goes in the client",
  "clientFields.toggle.filled": "The Amnezia app’s form, filled with your values",
  "clientFields.toggle.empty": "The Amnezia app’s form, field by field",
  "clientFields.intro":
    "This is the parameter form as the Amnezia app lays it out, with field names exactly as the client shows them.",
  "clientFields.state.filled":
    "Showing your last generated config — click a field to copy it.",
  "clientFields.state.empty":
    "Generate a config on the home page and your own values will appear here.",
  "clientFields.group.junk": "Junk packets",
  "clientFields.group.sizes": "Junk sizes",
  "clientFields.group.headers": "Magic headers",
  "clientFields.group.cps": "Special junk",
  "clientFields.hint.jc": "how many junk packets",
  "clientFields.hint.jmin": "smallest junk packet",
  "clientFields.hint.jmax": "largest junk packet",
  "clientFields.hint.s1": "padding on the init packet",
  "clientFields.hint.s2": "padding on the response packet",
  "clientFields.hint.s3": "padding on the cookie reply",
  "clientFields.hint.s4": "padding on the transport packet",
  "clientFields.hint.h1": "header of the init packet",
  "clientFields.hint.h2": "header of the response packet",
  // The client calls this field "Underload"; the protocol calls the same
  // thing the cookie reply header. Both names, so the form and the docs meet.
  "clientFields.hint.h3": "cookie reply header",
  "clientFields.hint.h4": "header of the transport packet",
  "clientFields.hint.cps": "CPS chain {n}",

  /* ── MergeKeys: what the engine reports ───────────────────────────────── */
  "mk.err.decode": "The key could not be decoded: {error}",
  "mk.err.noConfig":
    "No config has been generated yet. Go back to the generator and press GENERATE.",
  "mk.err.noAwgContainer":
    "The key carries no AmneziaWG container. This tool only works with AmneziaWG keys.",
  "mk.err.noConfField":
    "The .conf could not be taken out of the AWG container: it has no config field.",
  "mk.err.needTwo": "Merging needs at least two keys.",
  "mk.warn.duplicateContainer":
    "Container “{name}” from key #{from} was skipped — key #{seen} already carries it.",

  /* ── Counted nouns ────────────────────────────────────────────────────── */
  /* ── Generator: the custom-host field ─────────────────────────────────── */
  "gen.host.hint.quic": "A host that speaks HTTP/3. From the database: {examples}",
  "gen.host.hint.tls": "Any host with TLS 1.3. From the database: {examples}",
  "gen.host.hint.dtls": "A host that answers DTLS — WebRTC or TURN: {examples}",
  "gen.host.hint.sip": "A host that really does answer SIP: {examples}",
  "gen.host.hint.stun": "A STUN server answering on 3478: {examples}",
  "gen.host.hint.dns": "A name that has an A record: {examples}",
  "gen.host.hint.random":
    "The profile is drawn at random and the name to match. Yours works too.",
  "gen.host.placeholder.quic": "for example {example}",
  "gen.host.placeholder.tls": "for example {example}",
  "gen.host.placeholder.dtls": "for example {example}",
  "gen.host.placeholder.sip": "for example {example}",
  "gen.host.placeholder.stun": "for example {example}",
  "gen.host.placeholder.dns": "for example {example}",
  "gen.host.placeholder.random": "your own host (optional)",

  /* ── VAIEXIA ──────────────────────────────────────────────────────────── */
  "vaiexia.badge": "IN DEVELOPMENT",
  "vaiexia.lede":
    "Server and VPN management you can host yourself. All of it in Rust and WASM.",
  "vaiexia.desc":
    "A panel, bots, and an agent on the managed host. It is being built from the bottom up: cryptography and transport first, then the things you press on top of them. Below is what has been written and what is still an empty repository.",

  "vaiexia.snapshot": "Snapshot of {date}",
  "vaiexia.stat.repos": "repositories",
  "vaiexia.stat.built": "with code",
  "vaiexia.stat.size": "KB of source",
  "vaiexia.stat.lang": "language",

  /* ── The section ──────────────────────────────────────────────────────── */
  "vaiexia.stack.title": "A section, bottom-up",
  "vaiexia.stack.lede":
    "Each layer is its own crate. What is written is drawn solid and what is not is drawn as an outline; the line between them is exactly where the project stands.",
  "vaiexia.stack.built": "written",
  "vaiexia.stack.planned": "empty",

  "vaiexia.stack.surface.title": "Surfaces",
  "vaiexia.stack.surface.1":
    "A panel in Rust with a WASM front end, a cross-platform client aimed at Android as well, a bot for Telegram, Discord and Matrix, and plugins.",
  "vaiexia.stack.surface.2":
    "The repositories exist and hold no code — that is a plain \"not yet\", not a \"soon\".",

  "vaiexia.stack.agent.title": "The agent",
  "vaiexia.stack.agent.1":
    "Privilege separation: the network-facing daemon runs as its own user with no capabilities at all, under a systemd syscall filter.",
  "vaiexia.stack.agent.2":
    "Root work goes to a separate process with a closed vocabulary: install packages, touch systemd units. It runs no arbitrary commands by construction rather than by agreement.",
  "vaiexia.stack.agent.3":
    "Scoped tokens compared in constant time, Argon2id against brute force, an audit trail chained with BLAKE3 hashes.",

  "vaiexia.stack.contract.title": "The contract",
  "vaiexia.stack.contract.1":
    "Versioned message envelopes, diagnostic tags, authentication types — what every part agrees on once.",
  "vaiexia.stack.contract.2":
    "Three layers: L0 is pure and compiles to WASM, L1 is the transport traits, L2 is client and server on top of them.",
  "vaiexia.stack.contract.3":
    "A MockTransport ships with it, so the upper layers can be tested without a network.",

  "vaiexia.stack.transport.title": "Transport",
  "vaiexia.stack.transport.1":
    "TCP and UDP over the same handshake. UDP adds client-driven retransmission, tolerance for reordering, and a cookie gate that switches itself on under load.",
  "vaiexia.stack.transport.2":
    "Proxy chains: SOCKS5 and HTTP CONNECT, with the handshake tunnelled whole.",
  "vaiexia.stack.transport.3":
    "The mimicry profile is agreed out of band. Negotiating it in band would make a fingerprint out of the negotiation itself.",

  "vaiexia.stack.wire.title": "The foundation",
  "vaiexia.stack.wire.1":
    "ChaCha20-Poly1305 records with an explicit 64-bit counter and a sliding anti-replay window — the same device WireGuard uses.",
  "vaiexia.stack.wire.2":
    "A Noise XK handshake: the initiator pins the server's static key in advance, and the server learns who came knocking only from the third message, which is already encrypted.",
  "vaiexia.stack.wire.3":
    "Mimicry profiles: Vanilla with no obfuscation, AmneziaJunk with a magic header and bucketed padding, and QuicMimic, which wraps records in fake QUIC long headers.",

  /* ── The ledger ───────────────────────────────────────────────────────── */
  "vaiexia.ledger.title": "The ledger",
  "vaiexia.ledger.lede":
    "Every repository in the organisation, empty ones included. The sizes and dates are what the forge itself reports.",
  "vaiexia.ledger.col.repo": "Repository",
  "vaiexia.ledger.col.what": "What it is",
  "vaiexia.ledger.col.state": "State",
  "vaiexia.ledger.col.touched": "Last commit",
  "vaiexia.ledger.size": "{n} KB",
  "vaiexia.ledger.empty": "empty",

  "vaiexia.repo.wire": "Cryptographic framing: records, handshake, mimicry.",
  "vaiexia.repo.obfs": "Transport over the framing — TCP, UDP, proxy chains.",
  "vaiexia.repo.core": "The contract: envelopes, auth, transport traits.",
  "vaiexia.repo.server": "The agent on a managed host, privilege-separated.",
  "vaiexia.repo.panel": "Server and cluster panel — Rust plus WASM.",
  "vaiexia.repo.client": "Cross-platform client: VPN and panel manager.",
  "vaiexia.repo.bot": "Control bot for Telegram, Discord and Matrix.",
  "vaiexia.repo.plugins": "Official plugins and extensions.",
  "vaiexia.repo.vgit": "The CLI it is committed with: GPG signing, mirrors.",
  "vaiexia.repo.website": "The project site, vaiexia.vai-rice.space.",

  /* ── Where it meets Architect ─────────────────────────────────────────── */
  "vaiexia.bridge.title": "Where this meets Architect",
  "vaiexia.bridge.lede":
    "VAIEXIA's foundation derives an obfuscation vocabulary from its own mimicry configuration, in order to hand the agent ready-made tunnel parameters. Those are the same quantities the AmneziaWG page assembles: the junk-packet count, their sizes, the S-padding. One of the profiles is called AmneziaJunk.",
  "vaiexia.bridge.note":
    "The overlap is not a coincidence, and it is not finished either: for now these are two separate projects by one author that speak the same parameter language. Nothing integrates them.",
  "vaiexia.bridge.go": "Open the AmneziaWG generator",

  /* ── Go and look ──────────────────────────────────────────────────────── */
  "vaiexia.go.title": "See for yourself",
  "vaiexia.go.lede":
    "The organisation is open. Every claim on this page comes from the README of the crate it describes — you can read them and disagree.",
  "vaiexia.go.open": "Open the organisation",
  "vaiexia.go.copy": "Copy the link",

  /* ── What is missing ──────────────────────────────────────────────────── */
  "vaiexia.caveat.title": "What is not there yet",
  "vaiexia.caveat.body":
    "No repository has a release, which means no binaries and no installer. What is written has gaps its own authors name: sockets over the framing, a rekey policy, a real QUIC stack in place of the imitation of one. It is too early to put this on a live server.",
  "vaiexia.caveat.snapshot":
    "The numbers above are a snapshot, not a live query. Architect has no server side and the forge is self-hosted, so a request from the browser would hit CORS in precisely the places its readers live.",

  /* ── FAQ page ─────────────────────────────────────────────────────────── */
  "faq.title": "Questions and answers",
  "faq.title.pre": "FAQ from",
  "faq.title.main": "ARCHITECT",
  "faq.stat.answers": "answers",
  "faq.stat.sections": "sections",
  "faq.stat.engines": "engines",
  "faq.stat.updated": "updated",
  "faq.stat.updated.value": "continuously",
  "faq.expand.all": "Expand all",
  "faq.collapse.all": "Collapse all",
  "faq.searching": "Found for your search",
  "faq.lede":
    "Answers gathered by the author of ARCHITECT and by the community. We keep adding to it and keep it current, so that things are simpler and clearer for you)",
  "faq.search.placeholder": "Search: Jc, nonce, will not connect…",
  "faq.search.label": "Search the FAQ",
  "faq.search.clear": "Clear",
  "faq.category.all": "All",
  "faq.found": "Found: {n}",
  "faq.link.copied": "Link copied",
  "faq.link.copy": "Link to this question",
  "faq.empty":
    "Nothing matched. Try a different query, or drop the category filter.",
  "faq.reset": "Reset",


  /* ── Donate section ───────────────────────────────────────────────────── */
  "donate.crypto": "Cryptocurrency",
  /* ── Client releases ──────────────────────────────────────────────────── */
  "client.release.upTo": "up to {version}",
  "client.releaseLabel": "Client build",
  "client.releaseCurrent": "Current",


  /* ── Parameter notes ──────────────────────────────────────────────────── */
  "awgParam.S1": "Random padding before the handshake initiation.",
  "awgParam.S2": "Padding before the handshake response.",
  "awgParam.S3": "Padding before the cookie reply.",
  "awgParam.S4": "Padding on transport packets. The protocol caps it at 32 bytes.",
  "awgParam.Jc": "How many junk packets go out before the handshake.",
  "awgParam.Jmin": "Lower bound on a junk packet's size.",
  "awgParam.Jmax": "Upper bound on a junk packet's size.",
  "awgParam.cpsChain": "A fabricated packet sent before the handshake. The far end never parses it.",
  "awgParam.HeaderProtectionKey": "ChaCha20 key for encrypting headers. The nonce comes from the first 12 bytes of the S padding.",
  "awgParam.ContentPaddingAddition": "Random padding inside the encrypted payload. The receiver does not need to know it.",
  "awgParam.timer": "A protocol timer. Each side keeps its own.",
"awgParam.RandomTrailers": "A random-length trailer appended to every outgoing packet. Needs no agreement with the other side.",
"awgParam.DisableCookies": "The device stays silent instead of sending a Cookie Reply. Breaks NAT keepalive under load, so turn it on knowingly.",
  "xrayParam.inbound.port": "The port the server listens on and the client connects to.",
  "xrayParam.vless.id": "The client UUID. A non-UUID string is accepted too — the core hashes it into one.",
  "xrayParam.vless.flow": "Vision only works over TLS or REALITY.",
  "xrayParam.vless.decryption": "VLESS Encryption. Arrived in v26.1.13 — v25.8.29 does not know it.",
  "xrayParam.inbound.fallbacks": "Where traffic that fails authentication goes.",
  "xrayParam.reality.target": "The donor site: traffic that fails REALITY authentication is handed to it.",
  "xrayParam.reality.serverNames": "The SNIs the server will answer for. The client sends one of them.",
  "xrayParam.reality.shortIds": "An even number of hex characters: an odd one will not decode.",
  "xrayParam.reality.minClientVer": "Written only where the core has no default of its own: from v26.7.11 it fills in 26.3.27 itself, so the field is left out.",
  "xrayParam.reality.maxClientVer": "Upper bound on the client version. The mirror of minClientVer.",
  "xrayParam.reality.maxTimeDiff": "How far the two clocks may differ, in milliseconds.",
  "xrayParam.reality.mldsa65Seed": "Required on v25.7.23: without it REALITY does not start.",
  "xrayParam.reality.mldsa65Verify": "The field is there and empty: the 1952 bytes are derived from the seed by ML-DSA-65 itself, and this page does not carry that algorithm. Fill it with the core's own mldsa65 command.",
  "xrayParam.reality.limitFallbackUpload": "Throttling for traffic handed to the donor site.",
  "xrayParam.reality.fingerprint": "Client side: which browser uTLS imitates.",
  "xrayParam.reality.spiderX": "The spider's path. The p/c/t/i/r parameters in the query set spiderY.",
  "xrayParam.reality.spiderY": "Fine tuning for the crawl: padding, concurrency, retries, interval, return.",
  "xrayParam.xhttp.path": "Client and server have to agree on the path, or the request lands in a 404.",
  "xrayParam.xhttp.host": "The Host header. Empty means the address is used.",
  "xrayParam.xhttp.mode": "v24.11.11 does not know stream-one.",
  "xrayParam.xhttp.xPaddingBytes": "Both bounds must be strictly above zero, or the core refuses the config.",
  "xrayParam.xhttp.xPaddingPlacement": "Where the padding rides. Both ends have to look for it there.",
  "xrayParam.xhttp.xPaddingKey": "Name of the padding parameter. The default is recognisable; your own is less so.",
  "xrayParam.xhttp.xPaddingMethod": "tokenish makes the padding look like a token rather than a run of the letter x.",
  "xrayParam.xhttp.sessionIDPlacement": "Before v26.6.22 the field is called sessionPlacement.",
  "xrayParam.xhttp.sessionIDLength": "Length of the session id. Together with the alphabet it decides how the id looks in a URL.",
  "xrayParam.xhttp.sessionIDKey": "Name of the session-id parameter, when the id is not in the path.",
  "xrayParam.xhttp.sessionIDTable": "Alphabet the session id is drawn from. It changes how the id looks in a URL.",
  "xrayParam.xhttp.seqPlacement": "Where the chunk counter rides. Both ends have to read it from the same place.",
  "xrayParam.xhttp.seqKey": "Name of the chunk-counter parameter, when it is not in the path.",
  "xrayParam.xhttp.uplinkDataKey": "Name of the parameter the uplink data rides in.",
  "xrayParam.xhttp.noGRPCHeader": "Drops the header that makes the stream read as gRPC.",
  "xrayParam.xhttp.noSSEHeader": "Drops the header that makes the stream read as SSE.",
  "xrayParam.xhttp.scMaxEachPostBytes": "How many bytes go out in one POST. It visibly shapes the traffic.",
  "xrayParam.xhttp.downloadSettings": "A separate transport for the downstream.",
  "xrayParam.transport.header": "An HTTP masquerade over RAW: its own mimicry, separate from REALITY.",
  "xrayParam.transport.multiMode": "Both ends have to agree: one-sided multiMode breaks the stream.",
  "xrayParam.transport.hysteria": "The Hysteria 2 transport, with its masquerade. Versions below v26.1.13 do not know it.",
  "xrayParam.sockopt.tcpcongestion": "Congestion control. It is visible from outside in the shape of the traffic, but the algorithm may not be built into the machine's kernel — so it is chosen by hand.",
  "xrayParam.sockopt.tcpKeepAliveIdle": "Seconds of idleness before the first keepalive probe.",
  "xrayParam.sockopt.tcpKeepAliveInterval": "Interval between probes. The same for everyone is a timing anyone can measure.",
  "xrayParam.sockopt.tcpFastOpen": "Data in the SYN. Middleboxes handle it inconsistently, so it is off unless asked.",
  "xrayParam.sockopt.tcpMptcp": "Multipath TCP. Needs kernel support at both ends; without it the connection does not come up at all.",
  "xrayParam.sockopt.mark": "Routing mark. It depends on the particular machine, so nothing is filled in.",
  "xrayParam.sockopt.interface": "The interface the socket binds to. A guessed name produces a config that does not start.",
  "xrayParam.finalmask.finalmask": "XRay's own obfuscation above the transport — the closest thing it has to what AmneziaWG does. Both ends must choose the same mask.",
  "xrayParam.finalmask.quicParams.congestion": "Congestion control for transports over QUIC. Each side keeps its own.",
  "xrayParam.finalmask.finalmask.infrastructure": "Masks that need infrastructure of their own: header-custom is a packet scripting language, xmc wants a Minecraft host, xdns resolvers, xicmp addresses, realm a URL and STUN servers. The generator cannot invent them.",
  "awgParam.header": "The packet's magic header. Identical on both ends.",
  "awgParam.headerRange":
    "A range of headers: the value is drawn afresh for each packet.",
  "history.search": "Search the history",
  "history.pin": "Pin — the limit will not push it out",
  "history.unpin": "Unpin",
  "history.export": "Save the history to a file",
  "history.import": "Load a history from a file",
  "history.imported": "Imported: {added} added, {skipped} skipped",
  "history.noMatch": "Nothing matched. Try a different query.",
  "history.note": "Note",
  "history.notePlaceholder": "What makes this one different",
  "gen.fp.yandexUnstable": "The Yandex Browser profile is unstable.",
  "log.generateFailed": "The config could not be built: {error}",
};

export default en;
