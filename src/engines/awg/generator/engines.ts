/**
 * What actually parses I1–I5.
 *
 * The junk-packet tags were written into the client matrix, one row per app,
 * and the rows disagreed: `amneziawg-android`, `amneziawg-ios` and Amnezia VPN
 * claimed `<c>` while `amneziawg-windows` denied it — and all four ship the
 * same `amneziawg-go/v3 v3.0.1`. A tag is not a property of the app around the
 * tunnel. It is a property of the thing that reads the chain, and there are
 * only two of those in the open.
 *
 * ## The two engines, from their parsers
 *
 * `amneziawg-go`, `device/obf.go` — the `obfBuilders` map is the whole
 * vocabulary:
 *
 *     "b", "t", "r", "rc", "rd", "d", "ds", "dz"        <- no "c"
 *
 * `amneziawg-linux-kernel-module`, `src/junk.c`, `jp_parse_tags` — a chain of
 * `strcmp` ending in `else return -EINVAL`:
 *
 *     "b", "c", "t", "r", "rc", "rd"                    <- no "d", "ds", "dz"
 *
 * So the sets are disjoint in both directions: the counter tag exists only in
 * the kernel module, the data tags only in go.
 *
 * ## Why an unknown tag is not a harmless one
 *
 * Neither parser skips what it does not know. go collects the failures and
 * returns them joined, so `newObfChain` yields an error and the junk spec is
 * refused whole; the kernel module returns `-EINVAL` from `jp_parse_tags` and
 * `jp_spec_setup` propagates it. One wrong tag does not cost you that tag, it
 * costs you the packet it was in.
 *
 * ## What the versions say
 *
 * `device/obf.go` is byte-identical (blob `cf2275c5`) at v3.0.0, v3.0.1,
 * v3.0.2, v3.0.3, v3.0.20260805 and `master`, so the go vocabulary needs no
 * release axis inside 3.x. `src/junk.c` carries the same six tags on both the
 * kernel module's 1.0.x and 3.0.x lines. Checked 6 aug 2026.
 */

/** A tag the junk-packet chain can carry. */
export type CpsTag = "b" | "c" | "t" | "r" | "rc" | "rd" | "d" | "ds" | "dz";

/** The three tags the generator lets a reader switch on and off. */
export interface CpsTagSupport {
  supportsCpsTagC: boolean;
  supportsCpsTagRC: boolean;
  supportsCpsTagRD: boolean;
}

/** An implementation of the tunnel, named as its own project names itself. */
export interface AwgEngine {
  id: string;
  /** The package name. Not translated — it spells itself the same anywhere. */
  label: string;
  /**
   * Catalogue key for the label, when there is no package to name.
   *
   * "amneziawg-go 3.x" is the same string in every language and belongs in
   * `label`. "an unidentified engine" is a phrase, and left in `label` it
   * turned up untranslated in the middle of a Russian sentence.
   */
  labelKey?: string;
  /** Every tag its parser accepts. Anything outside this refuses the chain. */
  tags: readonly CpsTag[];
  /**
   * Whether the tag set was read out of the engine's own source.
   *
   * False marks a client whose engine we could not establish — a proprietary
   * firmware, or a build whose published sources say nothing about what is
   * underneath. Those get the tags both known engines share, which is a
   * conservative guess and is labelled as one rather than presented as fact.
   */
  verified: boolean;
}

/** amneziawg-go, `device/obf.go`. The engine under every Amnezia app. */
export const ENGINE_GO: AwgEngine = {
  id: "amneziawg-go",
  label: "amneziawg-go 3.x",
  tags: ["b", "t", "r", "rc", "rd", "d", "ds", "dz"],
  verified: true,
};

/** amneziawg-linux-kernel-module, `src/junk.c`. The only engine with `<c>`. */
export const ENGINE_KMOD: AwgEngine = {
  id: "amneziawg-kmod",
  label: "amneziawg-linux-kernel-module",
  tags: ["b", "c", "t", "r", "rc", "rd"],
  verified: true,
};

/**
 * WireSock's BoringTun fork, which has no signature chain at all.
 *
 * It reads Jc, Jmin, Jmax, S1–S4 and H1–H4, and then, in the vendor's own
 * words on the 3.4.4.1 release page: "Standard AWG 1.5 `I1`–`I5` parameters
 * are not supported. WireSock uses its own method for configuring simulation
 * settings" — its `Id`/`Ip`/`Ib` triple, which is nobody else's format.
 *
 * The awkward part is what it does with an I1–I5 config, stated on the 3.4.5.1
 * page: the fields are "now silently ignored instead of being flagged as
 * errors by the profile editor". The tunnel still comes up — the chain is
 * junk the client sends and the server discards, so nothing on the far end
 * misses it — which is exactly why this is worth saying. Everything looks
 * fine, and the mimicry the config was generated for is simply not on the
 * wire. A failure that announced itself would be easier.
 *
 * Closed source, so this is vendor documentation rather than a parser.
 */
export const ENGINE_WIRESOCK: AwgEngine = {
  id: "wiresock-boringtun",
  label: "WireSock (BoringTun fork)",
  tags: [],
  verified: false,
};

/**
 * The FreeBSD kernel module behind OPNsense, `net/amnezia-kmod`.
 *
 * A third implementation: derived from FreeBSD's in-tree `if_wg` rather than
 * from either Linux engine, and it carries neither `device/obf.go` nor
 * `src/junk.c`. Its parameter model has I1–I5, so something in it reads a
 * chain; what that something accepts we have not read.
 */
export const ENGINE_KMOD_BSD: AwgEngine = {
  id: "amnezia-kmod-bsd",
  label: "amnezia-kmod (FreeBSD)",
  tags: ["b", "t", "r", "rc", "rd"],
  verified: false,
};

/**
 * What every engine we have read accepts — the intersection of the two above.
 *
 * For a client whose insides are closed. Claiming `<c>` here would be claiming
 * the kernel module on no evidence, and go is what nearly everything ships;
 * withholding a tag costs a little entropy, while sending one the parser does
 * not know costs the whole junk packet.
 */
export const ENGINE_UNVERIFIED: AwgEngine = {
  id: "unverified",
  label: "an unidentified engine",
  labelKey: "client.engine.unverified",
  tags: ["b", "t", "r", "rc", "rd"],
  verified: false,
};

/**
 * awg-quick on Linux, which picks the engine at run time.
 *
 * amneziawg-tools `src/wg-quick/linux.bash`, `add_if`: `ip link add ... type
 * amneziawg` first, and only when the kernel module is missing does it start
 * the userspace binary. A container image that ships both (wg-easy builds
 * amneziawg-go and amneziawg-tools into its own) can end up on either, and the
 * same config has to work on both. So the tag set is the intersection, as for
 * an unverified engine, but read from both sources rather than guessed.
 */
export const ENGINE_AWG_QUICK: AwgEngine = {
  id: "awg-quick",
  label: "awg-quick (kernel module, or amneziawg-go without it)",
  tags: ["b", "t", "r", "rc", "rd"],
  verified: true,
};

export const AWG_ENGINES: readonly AwgEngine[] = [
  ENGINE_GO,
  ENGINE_KMOD,
  ENGINE_KMOD_BSD,
  ENGINE_WIRESOCK,
  ENGINE_AWG_QUICK,
  ENGINE_UNVERIFIED,
];

/** Whether an engine's parser knows a tag. */
export function engineHasTag(engine: AwgEngine, tag: CpsTag): boolean {
  return engine.tags.includes(tag);
}

/**
 * The three switchable tags, as the client matrix states them.
 *
 * Derived rather than written per client, which is the point: four entries
 * naming one engine cannot disagree about that engine any more.
 */
export function engineTagSupport(engine: AwgEngine): CpsTagSupport {
  return {
    supportsCpsTagC: engineHasTag(engine, "c"),
    supportsCpsTagRC: engineHasTag(engine, "rc"),
    supportsCpsTagRD: engineHasTag(engine, "rd"),
  };
}
