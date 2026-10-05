/**
 * What a hostname is, to a tool that hides traffic behind one.
 *
 * Both engines lean on real domain names, for two different jobs:
 *
 *   - AmneziaWG builds junk packets that imitate a handshake toward a name.
 *     The name has to be one a client there would plausibly contact, and the
 *     protocol has to be one the host actually speaks — a QUIC packet aimed at
 *     a host with no HTTP/3 is a packet nobody could have sent.
 *   - XRay's REALITY borrows a real site's TLS handshake wholesale. That site
 *     has to speak TLS 1.3 and HTTP/2, must not sit behind the same CDN as the
 *     server pretending to be it, and must answer without redirecting away.
 *
 * The lists that fed both were flat arrays of strings, chosen once and never
 * checked. A host that dropped HTTP/3, moved behind Cloudflare, or started
 * redirecting stayed in the pool and quietly made the traffic worse. So a
 * domain is a record with facts attached, and the facts say when they were
 * last established and from where.
 *
 * WHAT IS NOT HERE
 *
 * No HTTP status code, and no reachability flag. Both are properties of the
 * path between a vantage point and a host rather than of the host: a Chinese
 * CDN that ignores a Russian address has not said it lacks HTTP/3, and a site
 * that answers 301 today answers 200 next week. This database says what a host
 * *supports*; whether it is up and reachable right now is a live question, and
 * a live question deserves a live check at the moment of use.
 */

/**
 * Where a name is plausible to contact, and where it is likely reachable.
 *
 * `uk` is separate from `eu` because the traffic is: a British client's day is
 * BBC, gov.uk and the high-street banks, and none of those look like a German
 * client's day. `by` is separate from `ru` for the same reason and one more —
 * the two have different whitelists, and a name that is guaranteed reachable
 * in one is not in the other.
 */
export type DomainRegion = "ru" | "global" | "eu" | "cn" | "by" | "uk";

/**
 * Who sits in front of a host.
 *
 * The one that matters is `cloudflare`: a REALITY donor behind the same CDN
 * as the server imitating it is the classic way the disguise fails. The
 * others are recorded because a shared CDN is a shared fate — the whole edge
 * can be blocked at once.
 */
export type DomainCdn =
  | "none"
  | "cloudflare"
  | "cloudfront"
  | "akamai"
  | "fastly"
  | "qrator"
  | "ddosguard"
  | "unknown";

/**
 * Whether a fact was established or merely assumed.
 *
 * `unknown` is a real answer and is kept as one. A pool built by guessing
 * which hosts speak HTTP/3 is worse than a smaller pool that knows.
 */
export type Fact = "yes" | "no" | "unknown";

/**
 * DNS record types, as a query asks for them.
 *
 * They are here because a DNS mimicry packet carries a QTYPE, and the name it
 * carries alongside has to be one that answers *that* type. A query for an MX
 * record on a name that has never had one is a question no resolver would be
 * asked twice; asking for A on a name with only AAAA is the same mistake in
 * miniature.
 */
export type DnsQueryType =
  | "A"
  | "AAAA"
  | "MX"
  | "TXT"
  | "NS"
  | "SOA"
  | "CNAME"
  | "SRV"
  | "HTTPS"
  | "CAA";

/**
 * Services a host runs beyond HTTPS.
 *
 * Not derivable from an HTTPS probe: whether a name answers SIP, SMTP or STUN
 * is a different question on a different port, so each is recorded separately
 * and left `unknown` until something asks.
 *
 * The list is as long as it is because the mimicry profiles are: traffic can
 * be dressed as a mail submission, a time sync, or an encrypted DNS query as
 * readily as a web request, and each disguise names a host that has to be able
 * to wear it.
 */
export interface DomainServices {
  /** SIP, normally UDP and TCP 5060, TLS 5061. */
  sip: Fact;
  /** STUN, normally UDP 3478. */
  stun: Fact;
  /** DTLS, which in practice means WebRTC, TURN, or a datagram VPN. */
  dtls: Fact;
  /** SMTP, on 25 for relay and 587 or 465 for submission. */
  smtp: Fact;
  /** IMAP, on 143 or 993. */
  imap: Fact;
  /** POP3, on 110 or 995. */
  pop3: Fact;
  /** A resolver: answers DNS queries on 53 for names other than its own. */
  dns: Fact;
  /** DNS over HTTPS, RFC 8484 — an ordinary-looking POST to /dns-query. */
  doh: Fact;
  /** DNS over TLS, RFC 7858, on 853. */
  dot: Fact;
  /** NTP, on UDP 123. */
  ntp: Fact;
  /** SSH, on 22. */
  ssh: Fact;

  /**
   * Which query types this resolver will actually answer.
   *
   * Resolvers are picky in ways that show. Public ones commonly refuse ANY,
   * some answer A and AAAA but not TXT, and an authoritative server answers
   * only for its own zones. A mimicry packet asking a resolver something it
   * refuses gets a REFUSED back, which is a louder signal than sending
   * nothing at all. Absent means nothing asked.
   */
  dnsTypes?: readonly DnsQueryType[];
}

export interface DomainRecord {
  /** The hostname, with no scheme and no path. */
  host: string;
  regions: readonly DomainRegion[];

  /** TLS 1.3, HTTP/2 via ALPN, and HTTP/3. */
  tls13: Fact;
  h2: Fact;
  h3: Fact;

  /**
   * The host serves content at its own name, without redirecting elsewhere.
   *
   * This is what a REALITY donor needs and the reason a bare status code was
   * not enough: 200 and 301-to-itself are both fine, while 301 to another
   * domain means the borrowed handshake leads somewhere the client never
   * asked to go — and that is visible to anyone who follows it.
   */
  serves: Fact;

  cdn: DomainCdn;

  /**
   * Which record types this *name* has.
   *
   * Distinct from `services.dnsTypes`, which is about a resolver's manners.
   * This is about the name itself: it is the QNAME a DNS mimicry packet
   * carries, and it has to answer the QTYPE alongside it.
   */
  dnsAnswers?: readonly DnsQueryType[];

  /**
   * What the host runs besides HTTPS.
   *
   * Absent means nothing has asked. SIP, mail, DNS and the rest live on other
   * ports and need their own probes, so an HTTPS-only sweep leaves this empty
   * rather than guessing — and a SIP packet naming a host that speaks no SIP
   * is an imitation that fails the first time anything looks.
   */
  services?: DomainServices;

  /**
   * Regions where this host is reachable whatever else is happening.
   *
   * Several countries publish lists of socially significant resources that
   * stay available when other things do not — exempt from throttling, from
   * data-plan charges, or from a shutdown. Russia and Belarus both have one.
   *
   * That property is worth more here than anywhere else. A mimicry packet
   * naming a whitelisted host is plausible under exactly the conditions the
   * tool exists for: when the network is degraded, that traffic is what is
   * still flowing, and a client contacting it is a client doing the ordinary
   * thing. A packet naming a host that everyone else has lost access to is
   * the opposite of cover.
   *
   * Applies to addresses as much as names — a whitelist is enforced on what
   * the packet is addressed to, and that is often an IP.
   */
  whitelistedIn?: readonly DomainRegion[];

  /**
   * When these facts were last established, as YYYY-MM-DD.
   *
   * Kept because they expire. A certificate rotates, a site moves behind a
   * CDN, a CDN turns HTTP/3 on. An undated fact is an assumption wearing a
   * fact's clothes.
   */
  checked?: string;

  /**
   * Where the facts were measured from.
   *
   * Not bookkeeping: some of these answers are a property of the vantage
   * point rather than of the host. A Chinese CDN may serve a Chinese address
   * and ignore every other, so a `no` measured from elsewhere would be a
   * fact about the path wearing a fact's clothes — which is why a failed
   * measurement is recorded as `unknown` and the vantage recorded with it.
   */
  vantage?: DomainRegion;

  /**
   * The measurement did not take the ordinary path from its vantage point.
   *
   * The machine these were probed from routes a handful of destinations —
   * Cloudflare, GitHub, Discord, Matrix, Telegram — through a tunnel rather
   * than directly. Their readings are therefore real facts about the host and
   * *not* facts about what a plain client in that region can reach, so they
   * are flagged rather than quietly mixed in with the rest.
   */
  routed?: boolean;

  /** Why the host is in the list, where that is not obvious. */
  note?: string;
}

/**
 * What a host is good for. A host is usually good for several things at once.
 *
 * These are the distinct jobs the generators have, not a taxonomy: each one
 * asks something different of the host, and lumping the leftovers into `dns`
 * — as an earlier version did — produced SIP packets naming hosts that speak
 * no SIP and DTLS packets naming hosts with no UDP at all.
 */
export type DomainRole =
  /** A REALITY `dest`: TLS 1.3, HTTP/2, no CDN, serves at its own name. */
  | "donor"
  /** Named in QUIC or HTTP/3 mimicry. Needs the host to actually speak h3. */
  | "quic"
  /** Named in a TLS ClientHello. Needs TLS 1.3. */
  | "tls"
  /** Named in DTLS mimicry: a host that answers datagram TLS, not just TCP. */
  | "dtls"
  /** Named in SIP mimicry: a host that runs SIP, normally on 5060. */
  | "sip"
  /** Named in STUN or TURN mimicry: a host that answers on 3478. */
  | "stun"
  /** The QNAME of a DNS query: a name that resolves to something. */
  | "dns"
  /** A resolver to address a query to, rather than a name to ask about. */
  | "resolver"
  /** DNS over HTTPS: a POST that looks like any other. */
  | "doh"
  /** DNS over TLS on 853. */
  | "dot"
  /** Mail submission mimicry. */
  | "smtp"
  /** IMAP mimicry: a long-lived connection to a mail store. */
  | "imap"
  /** POP3 mimicry. */
  | "pop3"
  /** NTP mimicry: small, regular, unremarkable datagrams. */
  | "ntp"
  /** SSH mimicry. */
  | "ssh";

/** A filter over the database, as the UI and the generators express it. */
export interface DomainQuery {
  /** Restrict to these regions. Empty or absent means all of them. */
  regions?: readonly DomainRegion[];
  /** What the host has to be fit for. */
  role?: DomainRole;
  /**
   * For the `dns` and `resolver` roles: the query type that will be asked.
   *
   * A name is only a good QNAME for the type it actually answers, and a
   * resolver is only a good target for a type it does not refuse.
   */
  dnsType?: DnsQueryType;
  /** Exclude hosts behind any CDN, or behind these particular ones. */
  excludeCdn?: readonly DomainCdn[];
  /**
   * Only hosts on this region's whitelist.
   *
   * For when the network is expected to be degraded: whitelisted names are
   * what is still moving, so naming one is the plausible thing to do.
   */
  whitelistedIn?: DomainRegion;
  /**
   * Accept hosts whose facts were never established.
   *
   * Off by default: an unverified host in a QUIC pool is a packet claiming a
   * protocol the host may not speak.
   */
  allowUnknown?: boolean;
}
