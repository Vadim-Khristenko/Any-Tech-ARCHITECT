/**
 * FinalMask — XRay's own obfuscation, underneath everything else.
 *
 * This is the closest thing XRay has to what AmneziaWG does: it does not hide
 * the connection inside another protocol, it changes the shape of the bytes on
 * the wire. `noise` sends junk packets before the real ones, exactly like
 * AmneziaWG's junk train. `fragment` splits the TLS ClientHello across packets
 * so a middlebox reading SNI never sees a whole one. Both sit below the
 * transport, so they apply whatever else is configured.
 *
 * The core offers twelve mask types. Six are generated here, and six are not:
 * `header-custom` is a packet-scripting language, `xmc` needs a Minecraft
 * host, `xdns` needs resolvers, `xicmp` needs addresses, and `realm` needs a
 * URL and STUN servers. Those describe infrastructure a user has rather than
 * settings a generator can invent, so offering to produce them would be
 * offering to produce something that cannot work.
 *
 * Read from Xray-core v26.7.11 `infra/conf/transport_finalmask.go`.
 */

import { cryptoPick, cryptoRnd } from "@/shared/rng";
import { toBase64Url } from "@/shared/x25519";
import { cryptoBytes } from "@/shared/rng";

/* ── What a user chooses ──────────────────────────────────────────────────── */

/** Masks that can be generated without infrastructure the user must supply. */
export type FinalMaskKind =
  | "none"
  /** Junk packets before the real traffic — the AmneziaWG junk train. */
  | "noise"
  /** Split the first packets, so SNI never arrives whole. */
  | "fragment"
  /** Password-keyed obfuscation with padding, over UDP or TCP. */
  | "sudoku"
  /** Hysteria's UDP obfuscation. */
  | "salamander"
  /** mKCP's old header disguises: DNS, DTLS, SRTP, uTP, WeChat, WireGuard. */
  | "mkcp-legacy";

/** Header disguises `mkcp-legacy` can wear. */
export type MkcpHeader =
  | "dns"
  | "dtls"
  | "srtp"
  | "utp"
  | "wechat"
  | "wireguard";

/** Congestion control for QUIC-based transports. */
export type QuicCongestion = "" | "bbr" | "reno" | "brutal";

export interface FinalMaskInput {
  kind: FinalMaskKind;
  /** How many junk packets `noise` sends, as a range. */
  noiseCount: string;
  /** Size of each junk packet, as a range of bytes. */
  noiseSize: string;
  /** Delay between junk packets, milliseconds. */
  noiseDelay: string;
  /** `fragment`: which packets to split — "tlshello" or a range like "1-3". */
  fragmentPackets: string;
  /** `fragment`: how many bytes per piece. */
  fragmentLength: string;
  /** `fragment`: delay between pieces, milliseconds. */
  fragmentDelay: string;
  /** `sudoku` and `salamander` share a password; empty means generate one. */
  password: string;
  /** `sudoku`: padding added to each packet. */
  sudokuPadding: string;
  /** `mkcp-legacy`: which header to wear. */
  mkcpHeader: MkcpHeader;
  /** QUIC congestion control, for transports that run over QUIC. */
  quicCongestion: QuicCongestion;
}

/** The block as it goes into the config. */
export interface FinalMaskConfig extends FinalMaskInput {
  /** Resolved password: the user's, or one generated for them. */
  resolvedPassword: string;
}

/* ── Defaults ─────────────────────────────────────────────────────────────── */

const MKCP_HEADERS: readonly MkcpHeader[] = [
  "dns",
  "dtls",
  "srtp",
  "utp",
  "wechat",
  "wireguard",
];

export function defaultFinalMask(): FinalMaskInput {
  return {
    kind: "none",
    // A handful of packets: enough to change the opening shape, few enough
    // that the handshake is not visibly delayed.
    noiseCount: "3-8",
    noiseSize: "40-800",
    noiseDelay: "0-10",
    // The ClientHello is the packet worth splitting: it is the one carrying
    // the name a middlebox wants to read.
    fragmentPackets: "tlshello",
    fragmentLength: "10-40",
    fragmentDelay: "5-20",
    password: "",
    sudokuPadding: "0-64",
    mkcpHeader: cryptoPick(MKCP_HEADERS),
    quicCongestion: "",
  };
}

/* ── Building ─────────────────────────────────────────────────────────────── */

/**
 * A range in the form the core parses.
 *
 * `Int32Range` is unmarshalled from a string `"lo-hi"` or a plain integer —
 * *not* from an object with `from` and `to`. Emitting the object shape got
 * `Invalid integer range, expected either string of form "1-2" or plain
 * integer` out of every released core, which is the kind of thing only asking
 * the core reveals.
 */
function range(text: string): string | number {
  const match = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(text);
  if (match) {
    const from = Number(match[1]);
    const to = Number(match[2]);
    const [lo, hi] = from <= to ? [from, to] : [to, from];
    return lo === hi ? lo : `${lo}-${hi}`;
  }
  const single = Number(text.trim());
  return Number.isFinite(single) ? single : 0;
}

/** The low end of a range, for the fields the core wants split in two. */
function rangeLow(text: string): number {
  const value = range(text);
  return typeof value === "number" ? value : Number(String(value).split("-")[0]);
}

/** The high end of a range. */
function rangeHigh(text: string): number {
  const value = range(text);
  return typeof value === "number" ? value : Number(String(value).split("-")[1]);
}

export function buildFinalMask(input: FinalMaskInput): FinalMaskConfig {
  return {
    ...input,
    // A mask keyed on a password nobody chose still needs one, and an empty
    // password would make every user's traffic identical under it.
    resolvedPassword: input.password || toBase64Url(cryptoBytes(16)),
  };
}

/**
 * The `finalmask` object Xray-core reads.
 *
 * Returns undefined when no mask is selected, so the key is left out rather
 * than written empty — an empty `finalmask` is not the same as none, and the
 * core would build a mask that does nothing.
 */
export function renderFinalMask(
  cfg: FinalMaskConfig | undefined,
): Record<string, unknown> | undefined {
  if (!cfg || cfg.kind === "none") {
    return cfg?.quicCongestion
      ? { quicParams: { congestion: cfg.quicCongestion } }
      : undefined;
  }

  const quicParams = cfg.quicCongestion
    ? { quicParams: { congestion: cfg.quicCongestion } }
    : {};

  switch (cfg.kind) {
    case "noise": {
      // One entry per packet: the core sends the list in order, so the count
      // is expressed by how many entries there are rather than by a field.
      const count = cryptoRnd(
        rangeLow(cfg.noiseCount),
        rangeHigh(cfg.noiseCount),
      );
      const noise = Array.from({ length: Math.max(1, count) }, () => ({
        rand: range(cfg.noiseSize),
        delay: range(cfg.noiseDelay),
      }));
      return { udp: [{ type: "noise", settings: { noise } }], ...quicParams };
    }

    case "fragment":
      return {
        tcp: [
          {
            type: "fragment",
            settings: {
              packets: cfg.fragmentPackets,
              length: range(cfg.fragmentLength),
              delay: range(cfg.fragmentDelay),
            },
          },
        ],
        ...quicParams,
      };

    case "sudoku": {
      // Sudoku wants two plain integers rather than a range string: the two
      // shapes live side by side in the same config file.
      const settings = {
        password: cfg.resolvedPassword,
        paddingMin: rangeLow(cfg.sudokuPadding),
        paddingMax: rangeHigh(cfg.sudokuPadding),
      };
      // Sudoku is registered for both transports, so it is offered on both.
      return {
        tcp: [{ type: "sudoku", settings }],
        udp: [{ type: "sudoku", settings }],
        ...quicParams,
      };
    }

    case "salamander":
      return {
        udp: [
          {
            type: "salamander",
            settings: { password: cfg.resolvedPassword },
          },
        ],
        ...quicParams,
      };

    case "mkcp-legacy":
      return {
        udp: [
          {
            type: "mkcp-legacy",
            settings: { header: cfg.mkcpHeader },
          },
        ],
        ...quicParams,
      };
  }
}
