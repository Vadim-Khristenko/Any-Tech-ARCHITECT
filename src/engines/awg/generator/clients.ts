/**
 * AmneziaWG Architect — AmneziaWG client compatibility matrix.
 *
 * Source data: upstream amneziawg-android, amneziawg-windows, amneziawg-go,
 * AmneziaVPN desktop/mobile, community firmware packages and user reports.
 *
 * The shape comes from `shared/clients`, so the same model can describe an
 * XRay core later. What it adds over a flat table is the second axis: a client
 * is not one set of limits forever. AmneziaWG for Windows refused H values
 * above 2^31-1 until v2.0.2 and takes the full range after it, and a single
 * entry could only describe one of those — so it described the broken one for
 * everybody, including people on a current build.
 */

import {
  clientTable,
  releaseOptions,
  resolveClient,
  type ClientProfile,
  type ResolvedClient,
} from "@/shared/clients";
import {
  engineTagSupport,
  ENGINE_GO,
  ENGINE_KMOD,
  ENGINE_KMOD_BSD,
  ENGINE_UNVERIFIED,
  ENGINE_WIRESOCK,
  type AwgEngine,
  type CpsTagSupport,
} from "./engines";
import type { ClientCapability } from "./types";

/** What an AmneziaWG client will and will not accept. */
export interface AwgClientLimits extends CpsTagSupport {
  /**
   * What reads the junk-packet chain underneath this client.
   *
   * It sits in `limits` rather than beside them so a release can override it:
   * a client that changed engines changed its tag vocabulary with it, and that
   * is the same kind of fact as a raised ceiling.
   */
  engine: AwgEngine;
  /** Largest H value the client accepts. */
  maxHValue: number;
  supportsS3S4: boolean;
  supportsI1I5: boolean;
  maxJc: number;
  maxS4: number;
  /**
   * The app manages HeaderProtectionKey itself (own toggle, own key):
   * the generator must not emit one for it.
   */
  managesHeaderProtection: boolean;
}

/** The protocol's own ceiling: H values are unsigned 32-bit. */
const UINT32_MAX = 4_294_967_295;

/** What amneziawg-windows accepted before v2.0.2. */
const INT32_MAX = 2_147_483_647;

/** Everything that is not the tag set, for the entries that differ little. */
const BASE = {
  maxHValue: UINT32_MAX,
  supportsS3S4: true,
  supportsI1I5: true,
  maxJc: 10,
  maxS4: 32,
  managesHeaderProtection: false,
} as const;

/**
 * Limits for a client running on a given engine.
 *
 * The tag flags are never written by hand here — they come off the engine, so
 * two clients naming one engine cannot disagree about what it parses. That
 * disagreement is what this replaced: four entries on `amneziawg-go/v3 v3.0.1`
 * held three different answers about `<c>` between them.
 */
function on(
  engine: AwgEngine,
  overrides: Partial<Omit<AwgClientLimits, "engine" | keyof CpsTagSupport>> = {},
): AwgClientLimits {
  return { ...BASE, engine, ...engineTagSupport(engine), ...overrides };
}

/*
 * Which engine each client ships, and how that was established. Every `go.mod`
 * below was read on 6 aug 2026; a manifest states a declared dependency, not
 * the bytes in a release artefact, which is the one gap in this evidence.
 *
 *   amneziawg-android   tunnel/tools/libwg-go/go.mod      amneziawg-go/v3 v3.0.1
 *   amneziawg-apple     Sources/WireGuardKitGo/go.mod     amneziawg-go/v3 v3.0.1
 *   amneziawg-windows   go.mod                            amneziawg-go/v3 v3.0.1
 *   amnezia-client      recipes/awg-go/conanfile.py       version = "3.0.1",
 *                       and the macOS and Linux daemons start the built
 *                       `amneziawg-go` binary by name
 *   amneziawg-openwrt   kmod-amneziawg/Makefile           the kernel module
 */
export const AWG_CLIENT_PROFILES: readonly ClientProfile<AwgClientLimits>[] = [
  {
    id: "amneziawg-android",
    name: "AmneziaWG Android",
    platforms: ["Android 5+"],
    limits: on(ENGINE_GO),
    notes: ["client.note.goNoTagC"],
  },
  {
    id: "amneziawg-ios",
    name: "AmneziaWG iOS",
    platforms: ["iOS 15+"],
    limits: on(ENGINE_GO),
    notes: ["client.note.goNoTagC"],
  },
  {
    id: "amneziawg-windows",
    name: "AmneziaWG Windows",
    platforms: ["Windows 10+"],
    // v2.0.2 raised the editor's H bound from 2^31-1 to the full uint32 the
    // protocol has always used (PR #87, commit c9740b17). Current builds are
    // like everything else, so that is the baseline.
    //
    // The H ceiling really was this client's own: `conf/parser.go` keeps I1–I5
    // as opaque strings and only checks them for emptiness, so the tags are
    // amneziawg-go's business and nothing here overrides them.
    limits: on(ENGINE_GO),
    notes: ["client.note.goNoTagC"],
    releases: [
      {
        id: "<2.0.2",
        label: "client.release.upTo",
        labelParams: { version: "2.0.2" },
        limits: { maxHValue: INT32_MAX },
        notes: ["client.note.windowsHCap"],
      },
    ],
  },
  {
    id: "amneziavpn",
    name: "Amnezia VPN",
    platforms: ["Android", "iOS", "Windows", "macOS", "Linux"],
    // The app carries its own header-protection toggle and generates the key
    // itself, so a key emitted here would be a second one nobody asked for.
    limits: on(ENGINE_GO, { managesHeaderProtection: true }),
    notes: ["client.note.goNoTagC", "client.note.amneziaVpnHpk"],
  },
  {
    id: "wg-tunnel",
    name: "WG Tunnel",
    platforms: ["Android"],
    /*
     * The manifest's `amneziawg-parser` reads a config rather than running
     * one, so it says nothing about the tunnel. What carries it is
     * `libam-go.so`, built from a vendored fork: `tunnel/tools/libwg-go/go.mod`
     * replaces `amnezia-vpn/amneziawg-go v0.2.16` with
     * `wgtunnel/amneziawg-go v0.0.0-20260618075902-e1b699b2104b`.
     *
     * A fork could have changed the vocabulary and did not: its `device/obf.go`
     * is the same blob as upstream's, `cf2275c5`. So the tag set is go's, `<c>`
     * included in what it does not have.
     *
     * It carries no AWG 3.0 block: `device/uapi.go` accepts jc, jmin, jmax,
     * s1-s4, h1-h4 and i1-i5 and rejects any other key outright.
     */
    limits: on(ENGINE_GO),
    notes: ["client.note.wgTunnelBattery", "client.note.goNoTagC"],
  },
  {
    id: "wiresock",
    name: "WireSock",
    platforms: ["Windows"],
    /*
     * It reads no signature chain at all, and does not say so when handed
     * one. See ./engines.ts — this is the entry `supportsI1I5` was added for
     * and then never consulted about.
     */
    limits: on(ENGINE_WIRESOCK, { supportsI1I5: false }),
    notes: ["client.note.wiresockNoI"],
  },
  {
    id: "mihomo",
    name: "mihomo / Clash.Meta",
    platforms: ["Windows", "macOS", "Linux", "Android"],
    /*
     * `adapter/outbound/wireguard.go` builds a real device from
     * `metacubex/amneziawg-go`, whose `device/obf.go` is upstream's blob
     * `cf2275c5` again, so the vocabulary is go's.
     *
     * It is also the only client here outside Amnezia's own that reaches
     * AWG 3.0: `genIpcConf` emits `header_protection_key` and
     * `content_padding_addition`. That needs `version: 3` in the outbound
     * options; below it the legacy `device_v1` runs instead.
     */
    limits: on(ENGINE_GO),
    notes: ["client.note.goNoTagC", "client.note.mihomoVersion3"],
  },
  {
    id: "opnsense",
    name: "OPNsense (os-amneziawg)",
    platforms: ["OPNsense 25.x+"],
    /*
     * Jmin and Jmax are bounded below at 1 by the plugin's own validator, not
     * at 0 as everywhere else: `Instance.xml` gives both `MinimumValue 1`.
     * Jc is 1..128 there, which is why maxJc is not the router 128 by
     * coincidence but by their number.
     */
    limits: on(ENGINE_KMOD_BSD, { maxJc: 128 }),
    notes: ["client.note.opnsenseBounds", "client.note.engineUnverified"],
  },
  {
    id: "keenetic-native",
    name: "Keenetic (native)",
    platforms: ["Keenetic OS 4.x"],
    limits: on(ENGINE_UNVERIFIED, { maxJc: 128 }),
    notes: ["client.note.keeneticI1", "client.note.engineUnverified"],
  },
  {
    id: "awg-go-legacy",
    name: "amneziawg-go (legacy)",
    platforms: ["Linux", "macOS"],
    limits: on(ENGINE_GO, { maxJc: 128 }),
    notes: ["client.note.goNoTagC"],
  },
  {
    id: "awg-kmod",
    name: "amneziawg-linux-kernel-module",
    platforms: ["Linux"],
    /*
     * The module on its own, for a server or a Linux box running awg-quick
     * rather than an app. It is the only engine with `<c>`, and the only one
     * without `<d>`, `<ds>` and `<dz>`.
     *
     * `jp_spec_setup` refuses a junk spec whose packet exceeds
     * MESSAGE_MAX_SIZE, which is the one hard bound its parser states, and
     * every value here stays far under it. Jc goes to the router ceiling
     * because nothing in `netlink.c` bounds the count.
     */
    limits: on(ENGINE_KMOD, { maxJc: 128 }),
    notes: ["client.note.kmodTags"],
  },
  {
    id: "openwrt",
    name: "OpenWRT",
    platforms: ["OpenWrt"],
    limits: on(ENGINE_KMOD, { maxJc: 128 }),
    notes: ["client.note.openwrtKmod"],
  },
  {
    id: "asus-merlin",
    name: "ASUS Merlin",
    platforms: ["Asuswrt-Merlin"],
    // Merlin itself carries no AmneziaWG; it arrives through Entware or a
    // third-party package, and which one decides the tag set.
    limits: on(ENGINE_UNVERIFIED, { maxJc: 128 }),
    notes: ["client.note.engineUnverified"],
  },
];

const { table: PROFILES, ids } = clientTable(AWG_CLIENT_PROFILES);

export const CLIENT_IDS = ids;

/** Default recommended client for new users. */
export const DEFAULT_CLIENT_ID = "amneziavpn";

/** The profile behind an id, falling back to the default. */
export function clientProfile(id: string): ClientProfile<AwgClientLimits> {
  return PROFILES[id] ?? PROFILES[DEFAULT_CLIENT_ID]!;
}

/**
 * Limits for a client, optionally for one of its older builds.
 *
 * This is what the generator and the validators call. Passing no release
 * means the current build, which is what someone who installed the client
 * today has.
 */
export function clientCaps(
  id: string,
  release?: string | null,
): ResolvedClient<AwgClientLimits> {
  return resolveClient(clientProfile(id), release);
}

/** Builds selectable for a client, current first. */
export function clientReleases(id: string) {
  return releaseOptions(clientProfile(id));
}

/**
 * The old flat table, still exported.
 *
 * Everything that only wants "the current build's limits" reads this and does
 * not need to know releases exist. It resolves at the newest behaviour, which
 * is what the flat table meant before releases were added — except for
 * Windows, where it now means the fixed build rather than the broken one.
 */
export const CLIENTS: Record<string, ClientCapability> = Object.fromEntries(
  AWG_CLIENT_PROFILES.map((profile) => {
    const resolved = resolveClient(profile);
    return [
      profile.id,
      {
        id: resolved.id,
        name: resolved.name,
        platforms: [...resolved.platforms],
        ...resolved.limits,
        knownIssues: [...resolved.notes],
      } satisfies ClientCapability,
    ];
  }),
);
