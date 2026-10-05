# Any Tech ARCHITECT

## Register

`brand` for the landing at `/`, `product` for everything behind it.

The site is two surfaces sharing one shell. `/` has to make a stranger
understand what this is and trust it in about eight seconds — design is the
product there. `/amneziawg`, `/xray`, `/mergekeys`, `/simulator` are working
instruments where design serves the task and gets out of the way. When a task
touches the landing, read `brand.md`; when it touches a generator, read
`product.md`.

## Platform

`web`. Vue 3 + TypeScript + Vite, a client-only SPA on GitHub Pages at
architect.vai-rice.space. No server: every byte of a user's configuration is
generated and kept in their own browser, which is a product constraint as much
as a technical one.

## What it is

A configuration architect for censorship-resistant tunnels. It generates the
obfuscation parameters that make a VPN handshake stop looking like a VPN
handshake — AmneziaWG today, XRay/REALITY next — and it explains what each
number does instead of emitting a blob.

Two engines, one method. The AmneziaWG engine writes junk-packet trains,
header ranges, size padding and CPS signature chains, and can shape the traffic
to imitate a QUIC Initial, a TLS ClientHello, a DNS query, DTLS, SIP, NTP or
STUN — each built from the RFC rather than from a guess. The XRay engine covers
REALITY, the VLESS encryption DSL, XHTTP transports and fingerprints.

## Who uses it

Three people, in this order:

1. **Someone whose tunnel just stopped working**, in Russia, Belarus, Iran or
   China, tonight, on a laptop, probably annoyed. They do not want a tutorial.
   They want parameters that work with their client and a reason to believe
   these will survive longer than the last set.
2. **The person who runs the server for their friends and family.** They will
   generate ten configs at once, merge keys, and need to know which parameters
   must match on both ends and which are local.
3. **The engineer who wants to know how it works** and will read the FAQ, the
   packet simulator and the source before trusting any of it.

Nobody arrives here in a good mood. The product's job is to be quick, exact and
unpatronising.

## Purpose

Make obfuscation parameters *legible*. Anyone can output random numbers; the
value is in knowing that S1–S4 must be at least 12 when header protection is
on, that a router cannot afford a long junk train, that a range ending exactly
on the client's ceiling is a signature rather than a random number, and in the
tool refusing to emit a configuration it knows is wrong.

## Positioning

Against a forum post with a copy-pasted config: this one explains itself and
checks itself.

Against the client apps' own "generate" button: those emit one shape for
everybody, which is the opposite of what obfuscation needs. This varies by
version, by client, by intensity, by profile — and the variation is the point.

Against a hosted generator: nothing leaves the browser. There is no server to
subpoena, log or seize.

## Brand personality

**Measured. Wired. Unsentimental.**

The voice of a technical drawing: it states dimensions, it does not persuade.
It never says "military-grade" or "unbreakable"; it says what a parameter does
and where it fails. It is confident about mechanics and honest about limits —
the About page carries a legal warning and the FAQ has an answer titled "does
obfuscation give you anonymity" whose answer is no.

Russian first, English second. The audience is CIS-heavy and the source
catalogue is Russian.

## Anti-references

- **Neon-on-black hacker aesthetics.** Matrix rain, terminal green, glitch
  type, shield-and-padlock icons. The category reflex, and it reads as costume.
- **VPN marketing.** Speed dials, flag grids, "99.9% uptime", a hero of a
  smiling person on a sofa. This tool has no service to sell.
- **Editorial-magazine layout.** Display serif in italic, ruled three-column
  metadata, drop caps. The second-order reflex, one tier past the first.
- **Fear as a selling device.** No countdowns, no "they are watching you", no
  threat imagery.
- **Blueprint literalism.** Cyan lines on navy is the first thing anyone draws
  when they hear "architect", and it is a costume too.

## Design direction

**A working drawing of a packet.**

The name is the brief. This is a drawing sheet, not a dashboard: hairline
rules, dimension lines with tick terminators, leader lines to annotated points,
hatch fills for areas that are unavailable, revision letters, and a title block
in the corner. The background grid stops being decoration and starts meaning
scale.

The rule that keeps it from being costume: **every motif carries data.** A
dimension line is how a parameter range is drawn, because a range is what it
is. Hatching marks what a client does not support. A revision chip is a
protocol version. If a motif is only there to look technical, it comes out.

Colour is inherited, not invented: six accents, one per page, matching the link
previews the site has had for a year. A drawing sheet is neutral with one ink
colour, which is exactly that system.

## Accessibility

WCAG AA on both schemes, and it is checked mechanically rather than by eye — a
walk over every rendered text node resolving each run against its actual
backdrop. Both schemes currently pass on every page. Reduced motion is honoured
everywhere. The scheme follows the reader's system unless they say otherwise;
the accent follows the page and never the reader.

## Constraints

- No network calls for anything that touches a user's keys or configuration.
- The layering test forbids `engines/` importing from `composables/`; the
  hardcoded-string test forbids untranslated UI copy. Both are enforced in CI.
- Everything ships as static files. No SSR, no API.
