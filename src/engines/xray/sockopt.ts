/**
 * The socket itself, which nothing here used to touch.
 *
 * `streamSettings.sockopt` sets options on the socket underneath every other
 * layer, and leaving it out means every Architect deployment shares the
 * kernel's defaults. Two of those defaults are visible from outside:
 *
 *   - **Congestion control.** How fast a sender ramps up, how it reacts to
 *     loss, how bursty it is. It is a property of the traffic, not of the
 *     handshake, so no amount of care in the TLS layer hides it — and the
 *     default is the same on every stock Linux server.
 *   - **Keepalive timing.** A probe every N seconds on an idle connection, on
 *     a schedule identical across every deployment that never set it.
 *
 * The rest of the block is infrastructure: a routing mark, a bound interface,
 * a transparent-proxy mode. Those depend on a machine Architect cannot see, so
 * they are settable and never invented — guessing an interface name produces a
 * config that does not start.
 *
 * Read from Xray-core v26.7.11 `infra/conf/transport_internet.go`.
 */

import { cryptoRnd } from "@/shared/rng";

/** How a hostname in an outbound is resolved before dialling. */
export type SockoptDomainStrategy =
  | "AsIs"
  | "UseIP"
  | "UseIPv4"
  | "UseIPv6";

/**
 * Congestion control algorithms the kernel is commonly built with.
 *
 * Empty means "leave the kernel's choice alone", which is the honest option
 * when the algorithm may not be loaded: the core passes the string straight to
 * `setsockopt`, and a name the kernel does not know fails the connection
 * rather than falling back.
 */
export type SockoptCongestion = "" | "bbr" | "cubic" | "reno";

export interface SockoptInput {
  /** Congestion control. Empty leaves the kernel's own. */
  tcpCongestion: SockoptCongestion;

  /** Seconds an idle connection waits before the first keepalive probe. */
  tcpKeepAliveIdle: number;
  /** Seconds between probes once they start. */
  tcpKeepAliveInterval: number;
  /** Milliseconds before unacknowledged data gives up. Zero is the default. */
  tcpUserTimeout: number;

  /** Send small writes immediately rather than coalescing them. */
  tcpNoDelay: boolean;

  /**
   * TCP Fast Open, which puts data in the SYN.
   *
   * Off unless asked: it changes the handshake in a way middleboxes handle
   * inconsistently, and a connection that fails to establish is worse than one
   * that establishes conventionally.
   */
  tcpFastOpen: boolean;

  /**
   * Multipath TCP.
   *
   * Needs kernel support at both ends; without it the connection fails rather
   * than degrading, so this is never turned on for anyone.
   */
  tcpMptcp: boolean;

  /** Maximum segment size. Zero leaves the path MTU to decide. */
  tcpMaxSeg: number;

  /** How a hostname is resolved before dialling. */
  domainStrategy: SockoptDomainStrategy;

  /** Routing mark — infrastructure, so never invented. */
  mark: number;
  /** Interface to bind to — infrastructure, so never invented. */
  bindInterface: string;
}

/** The block as it goes into the config, after the blanks are filled. */
export type SockoptConfig = SockoptInput;

/**
 * What a fresh config starts from.
 *
 * The drawn values are the two that are visible from outside; everything else
 * begins where the kernel does. The keepalive numbers sit in the range an
 * ordinary long-lived connection uses — long enough not to chatter, short
 * enough to notice a dead peer — and differ per config so the interval is not
 * a constant anyone can measure.
 */
export function defaultSockopt(): SockoptInput {
  return {
    // No congestion algorithm by default: `bbr` is not built into every
    // kernel, and the core does not check before setting it. The generator
    // offers it, the user's server decides whether it exists.
    tcpCongestion: "",

    tcpKeepAliveIdle: cryptoRnd(90, 300),
    tcpKeepAliveInterval: cryptoRnd(15, 45),
    tcpUserTimeout: cryptoRnd(8, 20) * 1000,

    // On: the traffic here is interactive far more often than it is bulk, and
    // waiting to coalesce adds a delay that is itself measurable.
    tcpNoDelay: true,

    tcpFastOpen: false,
    tcpMptcp: false,
    tcpMaxSeg: 0,

    domainStrategy: "AsIs",
    mark: 0,
    bindInterface: "",
  };
}

/** Draw the parts that are worth varying, keeping anything already chosen. */
export function buildSockopt(input: SockoptInput): SockoptConfig {
  return {
    ...input,
    tcpKeepAliveIdle: input.tcpKeepAliveIdle || cryptoRnd(90, 300),
    tcpKeepAliveInterval: input.tcpKeepAliveInterval || cryptoRnd(15, 45),
    tcpUserTimeout: input.tcpUserTimeout || cryptoRnd(8, 20) * 1000,
  };
}

/**
 * The `sockopt` object, or nothing.
 *
 * Nothing when every field is at the kernel's default: an empty `sockopt` is a
 * key the core reads and applies nothing from, and a config should not carry
 * blocks that do not do anything.
 */
export function renderSockopt(s: SockoptConfig): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};

  if (s.tcpCongestion) out.tcpcongestion = s.tcpCongestion;
  if (s.tcpKeepAliveIdle > 0) out.tcpKeepAliveIdle = s.tcpKeepAliveIdle;
  if (s.tcpKeepAliveInterval > 0) out.tcpKeepAliveInterval = s.tcpKeepAliveInterval;
  if (s.tcpUserTimeout > 0) out.tcpUserTimeout = s.tcpUserTimeout;
  if (s.tcpNoDelay) out.tcpNoDelay = true;
  if (s.tcpFastOpen) out.tcpFastOpen = true;
  if (s.tcpMptcp) out.tcpMptcp = true;
  if (s.tcpMaxSeg > 0) out.tcpMaxSeg = s.tcpMaxSeg;
  if (s.domainStrategy !== "AsIs") out.domainStrategy = s.domainStrategy;
  if (s.mark > 0) out.mark = s.mark;
  if (s.bindInterface) out.interface = s.bindInterface;

  return Object.keys(out).length ? out : undefined;
}

/** Read a `sockopt` block back, so a parsed config round-trips. */
export function parseSockopt(raw: Record<string, unknown> | undefined): SockoptInput {
  const base = defaultSockopt();
  if (!raw) {
    // Nothing in the config means nothing was set, not "draw some now" — a
    // parsed config has to come back as what it was.
    return {
      ...base,
      tcpKeepAliveIdle: 0,
      tcpKeepAliveInterval: 0,
      tcpUserTimeout: 0,
      tcpNoDelay: false,
    };
  }

  const number = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const congestion = String(raw.tcpcongestion ?? "");

  return {
    tcpCongestion: (["bbr", "cubic", "reno"].includes(congestion)
      ? congestion
      : "") as SockoptCongestion,
    tcpKeepAliveIdle: number(raw.tcpKeepAliveIdle),
    tcpKeepAliveInterval: number(raw.tcpKeepAliveInterval),
    tcpUserTimeout: number(raw.tcpUserTimeout),
    tcpNoDelay: Boolean(raw.tcpNoDelay),
    tcpFastOpen: Boolean(raw.tcpFastOpen),
    tcpMptcp: Boolean(raw.tcpMptcp),
    tcpMaxSeg: number(raw.tcpMaxSeg),
    domainStrategy: (["UseIP", "UseIPv4", "UseIPv6"].includes(
      String(raw.domainStrategy ?? ""),
    )
      ? String(raw.domainStrategy)
      : "AsIs") as SockoptDomainStrategy,
    mark: number(raw.mark),
    bindInterface: String(raw.interface ?? ""),
  };
}

/** Congestion algorithms the UI offers, in the order it offers them. */
export const SOCKOPT_CONGESTIONS: readonly SockoptCongestion[] = [
  "",
  "bbr",
  "cubic",
  "reno",
];

/** Resolution strategies the UI offers. */
export const SOCKOPT_DOMAIN_STRATEGIES: readonly SockoptDomainStrategy[] = [
  "AsIs",
  "UseIP",
  "UseIPv4",
  "UseIPv6",
];
