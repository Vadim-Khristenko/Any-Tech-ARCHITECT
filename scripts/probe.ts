/**
 * Ask a host what it actually speaks.
 *
 *   bun scripts/probe.ts < hosts.txt > facts.json
 *
 * Self-contained on purpose: this file is shipped to whichever machine the
 * answers are wanted from and run there by Bun, so it imports nothing from
 * `src/`. The shapes it emits are checked against the real types when
 * `scripts/domains.ts merge` reads them back, which happens here.
 *
 * WHY EVERY QUESTION IS ASKED SEPARATELY
 *
 * The generators dress traffic as a dozen different protocols and name a real
 * host in each disguise. A SIP packet naming a host that has never spoken SIP,
 * or a DNS query asking for an MX record on a name that has none, is an
 * imitation that fails the first thing that looks at it — and the name is the
 * cheapest part of the packet to check. So HTTPS, mail, DNS, SIP, STUN, DTLS,
 * NTP and SSH are eight separate questions on eight separate ports, and a host
 * that answered none of them says so rather than being assumed into a pool.
 *
 * WHAT A `no` MEANS, AND WHAT IT DOES NOT
 *
 * `no` means asked and refused. When nothing came back at all the answer is
 * `unknown`, because silence is a property of the path as much as of the host:
 * a Chinese CDN that ignores a Russian address has not told us it lacks
 * HTTP/3. That distinction is the whole reason this file exists rather than a
 * list of hostnames someone was fairly confident about — and it is why the
 * vantage point is chosen to match the region being asked about, rather than
 * being whichever machine was to hand.
 */

/* ── The shapes, restated locally ─────────────────────────────────────────── */

type Fact = "yes" | "no" | "unknown";

type Cdn =
  | "none" | "cloudflare" | "cloudfront" | "akamai" | "fastly"
  | "qrator" | "ddosguard" | "unknown";

type DnsQueryType =
  | "A" | "AAAA" | "MX" | "TXT" | "NS" | "SOA" | "CNAME" | "SRV" | "HTTPS" | "CAA";

export interface HostFacts {
  host: string;
  tls13: Fact;
  h2: Fact;
  h3: Fact;
  serves: Fact;
  cdn: Cdn;
  dnsAnswers: DnsQueryType[];
  services: {
    sip: Fact;
    stun: Fact;
    dtls: Fact;
    smtp: Fact;
    imap: Fact;
    pop3: Fact;
    dns: Fact;
    doh: Fact;
    dot: Fact;
    ntp: Fact;
    ssh: Fact;
    dnsTypes?: DnsQueryType[];
  };
}

const TIMEOUT = Number(process.env.PROBE_TIMEOUT ?? 4) * 1000;
const PARALLEL = Number(process.env.PROBE_PARALLEL ?? 12);

/**
 * How many times to ask before believing a silence.
 *
 * Higher than feels necessary, on purpose. A single unanswered datagram is
 * indistinguishable from a host that does not speak the protocol, and the
 * difference decides whether a name goes into a mimicry pool it does not
 * belong in. Asking five times costs seconds on the hosts that were never
 * going to answer and rescues the ones that were merely busy — at
 * thirty-two-way concurrency this sweep recorded every STUN and SIP server in
 * its list as mute, having asked each exactly once.
 */
const ATTEMPTS = Number(process.env.PROBE_ATTEMPTS ?? 5);

/* ── DNS, built by hand ───────────────────────────────────────────────────── */

/**
 * The wire codes for the types worth asking about.
 *
 * Hand-rolled rather than taken from `node:dns` because the same query has to
 * serve two questions: which records a *name* has, and which types a
 * *resolver* is willing to answer. `node:dns` answers the first and hides the
 * second — a REFUSED and an empty answer both surface as an error there, and
 * the difference between "this resolver won't" and "this name hasn't" is
 * exactly what the mimicry needs to know.
 */
const DNS_TYPE: Record<DnsQueryType, number> = {
  A: 1, NS: 2, CNAME: 5, SOA: 6, MX: 15, TXT: 16, AAAA: 28,
  SRV: 33, HTTPS: 65, CAA: 257,
};

function encodeName(name: string): Uint8Array {
  const out: number[] = [];
  for (const label of name.split(".")) {
    if (!label) continue;
    const bytes = [...label].map((c) => c.charCodeAt(0));
    // A label is length-prefixed by one byte whose top two bits are reserved
    // for compression pointers, so 63 is the ceiling and not a style choice.
    out.push(Math.min(bytes.length, 63), ...bytes.slice(0, 63));
  }
  out.push(0);
  return new Uint8Array(out);
}

function dnsQuery(name: string, type: DnsQueryType, id: number): Uint8Array {
  const qname = encodeName(name);
  const buf = new Uint8Array(12 + qname.length + 4);
  const view = new DataView(buf.buffer);

  view.setUint16(0, id);
  view.setUint16(2, 0x0100); // standard query, recursion desired
  view.setUint16(4, 1); // one question
  buf.set(qname, 12);
  view.setUint16(12 + qname.length, DNS_TYPE[type]);
  view.setUint16(12 + qname.length + 2, 1); // class IN

  return buf;
}

/** What a resolver said: the rcode, and how many answers it carried. */
function readDnsReply(
  data: Uint8Array,
  id: number,
): { rcode: number; answers: number } | null {
  if (data.length < 12) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (view.getUint16(0) !== id) return null;
  return { rcode: view.getUint16(2) & 0x0f, answers: view.getUint16(6) };
}

/* ── Datagrams ────────────────────────────────────────────────────────────── */

/**
 * A hostname as an address, remembered for the length of the run.
 *
 * UDP needs this and TCP does not, which is a trap worth naming: `Bun.connect`
 * resolves a hostname on the way out, `send` on a datagram socket does not,
 * and handing it a name simply produces no reply. Every UDP service came back
 * `no` until this existed — a whole category of hosts silently declared mute.
 */
const addresses = new Map<string, string | null>();

async function addressOf(host: string): Promise<string | null> {
  if (addresses.has(host)) return addresses.get(host)!;

  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    addresses.set(host, host);
    return host;
  }

  try {
    const { lookup } = await import("node:dns/promises");
    const { address } = await lookup(host, { family: 4 });
    addresses.set(host, address);
    return address;
  } catch {
    addresses.set(host, null);
    return null;
  }
}

/**
 * Send one datagram and wait for one reply.
 *
 * UDP has no notion of a refused connection reaching us reliably, so a
 * timeout is the normal negative answer and the caller decides whether that
 * means `no` or `unknown`.
 */
async function udpAsk(
  hostOrIp: string,
  port: number,
  payload: Uint8Array,
  attempts = ATTEMPTS,
): Promise<Uint8Array | null> {
  // One datagram is not a measurement. UDP drops packets as a matter of
  // course, and a sweep wide enough to be useful drops its own: at thirty-two
  // hosts in flight every STUN, SIP and NTP server in the list came back
  // silent, including ones that had answered moments earlier. A single try
  // records congestion as a property of the host.
  for (let attempt = 1; attempt < attempts; attempt++) {
    const reply = await udpAsk(hostOrIp, port, payload, 1);
    if (reply) return reply;
  }

  const host = await addressOf(hostOrIp);
  if (!host) return null;
  let socket: Awaited<ReturnType<typeof Bun.udpSocket>> | null = null;

  try {
    return await new Promise<Uint8Array | null>((resolve) => {
      let done = false;
      const finish = (value: Uint8Array | null) => {
        if (done) return;
        done = true;
        resolve(value);
      };

      const timer = setTimeout(() => finish(null), TIMEOUT);

      Bun.udpSocket({
        socket: {
          data(_socket, buf) {
            clearTimeout(timer);
            finish(new Uint8Array(buf));
          },
          // A closed UDP port answers with an ICMP unreachable, which arrives
          // here as ECONNREFUSED on the next recv. That is a real answer —
          // nothing is listening — but with no handler it is an unhandled
          // error, and one refused port ends the whole run. This one died at
          // host 475 of 664 with nothing written.
          error(_socket, _error) {
            clearTimeout(timer);
            finish(null);
          },
        },
      })
        .then((s) => {
          socket = s;
          if (done) return;
          s.send(payload, port, host);
        })
        .catch(() => {
          clearTimeout(timer);
          finish(null);
        });
    });
  } finally {
    socket?.close();
  }
}

/* ── Streams ──────────────────────────────────────────────────────────────── */

/**
 * Connect and read whatever the server says first.
 *
 * Mail and SSH announce themselves before being asked, which is the cheapest
 * possible identification: `220` is SMTP, `* OK` is IMAP, `+OK` is POP3,
 * `SSH-` is SSH. Nothing is sent, so nothing is disturbed.
 */
async function readBanner(
  host: string,
  port: number,
  tls: boolean,
): Promise<string | null> {
  return await new Promise<string | null>((resolve) => {
    let done = false;
    let handle: { end(): void } | null = null;

    const finish = (value: string | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        handle?.end();
      } catch {
        // Already gone; the answer is what matters.
      }
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), TIMEOUT);

    Bun.connect({
      hostname: host,
      port,
      tls,
      socket: {
        data(_socket, buf) {
          finish(new TextDecoder().decode(buf));
        },
        error: () => finish(null),
        connectError: () => finish(null),
        close: () => finish(null),
      },
    })
      .then((s) => {
        handle = s;
        if (done) s.end();
      })
      .catch(() => finish(null));
  });
}

/**
 * Did a TLS handshake complete on this port?
 *
 * Some protocols do not greet. DNS over TLS sits on 853 and waits to be asked,
 * so waiting for a banner there returns nothing and would record a working
 * resolver as absent — the handshake itself is the answer.
 */
async function tlsOpens(host: string, port: number): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    let done = false;
    let handle: { end(): void } | null = null;

    const finish = (value: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        handle?.end();
      } catch {
        // Already gone; the answer is what matters.
      }
      resolve(value);
    };

    const timer = setTimeout(() => finish(false), TIMEOUT);

    Bun.connect({
      hostname: host,
      port,
      tls: true,
      socket: {
        open: () => finish(true),
        data: () => finish(true),
        error: () => finish(false),
        connectError: () => finish(false),
        close: () => finish(false),
      },
    })
      .then((s) => {
        handle = s;
        if (done) s.end();
      })
      .catch(() => finish(false));
  });
}

/* ── The protocol payloads ────────────────────────────────────────────────── */

/** A STUN Binding Request, RFC 5389 §6. */
function stunRequest(): Uint8Array {
  const buf = new Uint8Array(20);
  const view = new DataView(buf.buffer);
  view.setUint16(0, 0x0001); // Binding Request
  view.setUint16(2, 0); // no attributes
  view.setUint32(4, 0x2112a442); // magic cookie
  crypto.getRandomValues(buf.subarray(8));
  return buf;
}

function isStunReply(data: Uint8Array, sent: Uint8Array): boolean {
  if (data.length < 20) return false;
  for (let i = 4; i < 20; i++) if (data[i] !== sent[i]) return false;
  const type = (data[0]! << 8) | data[1]!;
  return type === 0x0101 || type === 0x0111; // success or error response
}

/** A SIP OPTIONS request, RFC 3261 §11 — the protocol's own "are you there". */
function sipOptions(host: string): Uint8Array {
  const tag = crypto.randomUUID().slice(0, 12);
  const lines = [
    `OPTIONS sip:${host} SIP/2.0`,
    `Via: SIP/2.0/UDP 0.0.0.0:5060;branch=z9hG4bK${tag};rport`,
    "Max-Forwards: 70",
    `To: <sip:${host}>`,
    `From: <sip:probe@${host}>;tag=${tag}`,
    `Call-ID: ${crypto.randomUUID()}@${host}`,
    "CSeq: 1 OPTIONS",
    "Contact: <sip:probe@0.0.0.0>",
    "Accept: application/sdp",
    "Content-Length: 0",
    "",
    "",
  ];
  return new TextEncoder().encode(lines.join("\r\n"));
}

/**
 * A DTLS 1.2 ClientHello, RFC 6347 §4.
 *
 * Deliberately cookie-less: a DTLS server answers the first cookie-less
 * ClientHello with a HelloVerifyRequest, which proves it speaks DTLS without
 * going any further into a handshake we have no intention of completing.
 */
function dtlsClientHello(): Uint8Array {
  const suites = new Uint8Array([
    0xc0, 0x2b, 0xc0, 0x2f, 0xc0, 0x0a, 0xc0, 0x14,
    0x00, 0x9c, 0x00, 0x2f, 0x00, 0x35,
  ]);

  const random = new Uint8Array(32);
  crypto.getRandomValues(random);

  const body = [
    0xfe, 0xfd, // client_version DTLS 1.2
    ...random,
    0x00, // session_id: empty
    0x00, // cookie: empty, so the server must verify
    (suites.length >> 8) & 0xff, suites.length & 0xff,
    ...suites,
    0x01, 0x00, // compression: null
    0x00, 0x00, // no extensions
  ];

  const handshake = [
    0x01, // client_hello
    (body.length >> 16) & 0xff, (body.length >> 8) & 0xff, body.length & 0xff,
    0x00, 0x00, // message_seq
    0x00, 0x00, 0x00, // fragment_offset
    (body.length >> 16) & 0xff, (body.length >> 8) & 0xff, body.length & 0xff,
    ...body,
  ];

  return new Uint8Array([
    0x16, // handshake
    0xfe, 0xfd, // DTLS 1.2
    0x00, 0x00, // epoch
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // sequence number
    (handshake.length >> 8) & 0xff, handshake.length & 0xff,
    ...handshake,
  ]);
}

/** A DTLS record back: a handshake, or an alert saying no in DTLS's own words. */
function isDtlsReply(data: Uint8Array): boolean {
  if (data.length < 13) return false;
  if (data[0] !== 0x16 && data[0] !== 0x15) return false;
  // 0xFEFF is DTLS 1.0, 0xFEFD is 1.2. Both are the protocol answering.
  return data[1] === 0xfe && (data[2] === 0xff || data[2] === 0xfd);
}

/** An NTP client packet, RFC 5905: mode 3, version 4, and nothing else. */
function ntpRequest(): Uint8Array {
  const buf = new Uint8Array(48);
  buf[0] = 0x23; // leap 0, version 4, mode 3 (client)
  return buf;
}

const isNtpReply = (data: Uint8Array) =>
  data.length >= 48 && (data[0]! & 0x07) === 4; // mode 4 (server)

/* ── HTTPS ────────────────────────────────────────────────────────────────── */

async function run(args: string[]): Promise<{ code: number; out: string }> {
  const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  return { code: await proc.exited, out };
}

const CURL = ["curl", "-sI", "--max-time", "8"];

/**
 * What this machine can actually ask, established before anything is recorded.
 *
 * A probe is an instrument, and an instrument that is not checked reports its
 * own faults as properties of the thing measured. Both faults below are real
 * and were found the hard way:
 *
 *   - Windows ships a Schannel-backed curl that rejects `--tls-max` outright.
 *     Every TLS 1.3 question failed, and every host on the internet was
 *     recorded as not having TLS 1.3.
 *   - The same machine sends no UDP from this process at all, so SIP, STUN,
 *     DTLS, NTP and DNS all came back negative — a few hundred hosts declared
 *     mute by a firewall rule.
 *
 * So each capability is confirmed against a control whose answer is known,
 * and whatever cannot be asked here is reported as `unknown` rather than as a
 * denial. A smaller set of facts is worth more than a larger set of fictions.
 */
interface Instrument {
  /** This curl accepts `--tls-max`, which Schannel builds do not. */
  tlsMax: boolean;
  /** This curl needs `--http2` asked for explicitly. */
  forceHttp2: boolean;
  /** TLS 1.3 can be forced at all, so a failure means the server lacks it. */
  canAskTls13: boolean;
  /** HTTP/2 is visible at all, so a 1.1 answer means the server offered 1.1. */
  canAskH2: boolean;
  /** This curl was built with HTTP/3, without which no h3 answer means much. */
  canAskH3: boolean;
  /** Datagrams leave this machine, so silence means the host is silent. */
  udp: boolean;
  /**
   * Port 123 in particular is not filtered on the way out.
   *
   * Worth its own control because it is filtered far more often than UDP in
   * general: NTP is the classic amplification vector, so hosting providers
   * block it outbound by default and every time server in a sweep comes back
   * silent. Without this, `0.pool.ntp.org` gets recorded as not speaking NTP.
   */
  ntp: boolean;
}

const instrument: Instrument = {
  tlsMax: true,
  forceHttp2: false,
  canAskTls13: true,
  canAskH2: true,
  canAskH3: true,
  udp: true,
  ntp: true,
};

async function calibrate(): Promise<void> {
  // Known to speak TLS 1.3 and HTTP/2 and to answer without redirecting away.
  // If it reads otherwise here, the reading is about this machine.
  const control = "www.bing.com";

  const withMax = await run([
    ...CURL, "--tlsv1.3", "--tls-max", "1.3", `https://${control}/`, "-o", "/dev/null",
  ]);
  if (withMax.code !== 0) {
    instrument.tlsMax = false;
    const withoutMax = await run([
      ...CURL, "--tlsv1.3", `https://${control}/`, "-o", "/dev/null",
    ]);
    instrument.canAskTls13 = withoutMax.code === 0;
  }

  const plain = await run([
    ...CURL, `https://${control}/`, "-o", "/dev/null", "-w", "%{http_version}",
  ]);
  if (!["2", "3"].includes(plain.out.trim())) {
    // Some builds do not negotiate HTTP/2 unless asked. That is the client's
    // preference, not the server's capability.
    const forced = await run([
      ...CURL, "--http2", `https://${control}/`, "-o", "/dev/null", "-w", "%{http_version}",
    ]);
    instrument.forceHttp2 = ["2", "3"].includes(forced.out.trim());
    instrument.canAskH2 = instrument.forceHttp2;
  }

  // curl without HTTP/3 compiled in refuses every h3 request, which would
  // record the whole internet as having dropped QUIC.
  const build = await run(["curl", "--version"]);
  instrument.canAskH3 = /HTTP3/.test(build.out);

  const id = Math.floor(Math.random() * 0xffff);
  const reply = await udpAsk("1.1.1.1", 53, dnsQuery("example.com", "A", id));
  instrument.udp = Boolean(reply && readDnsReply(reply, id));

  // A control on 123 specifically: two well-known time servers, either of
  // which answering means the port is open from here.
  if (instrument.udp) {
    const times = await Promise.all(
      ["time.cloudflare.com", "time.google.com"].map(async (host) => {
        const reply = await udpAsk(host, 123, ntpRequest());
        return Boolean(reply && isNtpReply(reply));
      }),
    );
    instrument.ntp = times.some(Boolean);
  } else {
    instrument.ntp = false;
  }

  const blind: string[] = [];
  if (!instrument.canAskTls13) blind.push("TLS 1.3");
  if (!instrument.canAskH2) blind.push("HTTP/2");
  if (!instrument.canAskH3) blind.push("HTTP/3");
  if (!instrument.udp) blind.push("everything over UDP");
  else if (!instrument.ntp) blind.push("NTP — port 123 is filtered on the way out");
  if (blind.length) {
    console.error(`  this machine cannot ask about ${blind.join(", ")}; those stay unknown`);
  }
}

/** A fact this machine was in a position to establish, or `unknown` if not. */
const asked = (able: boolean, value: Fact): Fact => (able ? value : "unknown");

/**
 * The web-facing facts, in four questions.
 *
 * ALPN answers HTTP/2 directly, and the TLS versions are asked for by forcing
 * them: a handshake that completes with 1.3 forced is a server that has 1.3.
 * Guessing from a cipher list or a published table is how the previous
 * generation of this database came to be wrong.
 */
async function httpsFacts(host: string): Promise<{
  tls13: Fact; h2: Fact; h3: Fact; serves: Fact; cdn: Cdn;
}> {
  const base = await run([
    ...CURL,
    ...(instrument.forceHttp2 ? ["--http2"] : []),
    `https://${host}/`, "-o", "/dev/null",
    "-w", "%{http_version} %{http_code} %{redirect_url}",
  ]);

  const [version = "", code = "0", redirect = ""] = base.out.trim().split(" ");
  const status = Number(code) || 0;

  if (status === 0) {
    // Nothing answered, so nothing was learned — including whether the host
    // is the sort of thing that would have answered.
    return { tls13: "unknown", h2: "unknown", h3: "unknown", serves: "unknown", cdn: "unknown" };
  }

  const [tls13Run, h3Run, headers] = await Promise.all([
    run([
      ...CURL, "--tlsv1.3",
      ...(instrument.tlsMax ? ["--tls-max", "1.3"] : []),
      `https://${host}/`, "-o", "/dev/null",
    ]),
    run([...CURL, "--http3-only", `https://${host}/`, "-o", "/dev/null"]),
    run(["curl", "-sI", "--max-time", "8", `https://${host}/`]),
  ]);

  const head = headers.out.toLowerCase();
  const cdn: Cdn =
    /cf-ray|server: *cloudflare/.test(head) ? "cloudflare"
    : /x-amz-cf-id|server: *cloudfront/.test(head) ? "cloudfront"
    : /server: *ecacc|akamai/.test(head) ? "akamai"
    : /server: *fastly|x-served-by/.test(head) ? "fastly"
    : /server: *qrator|qrator/.test(head) ? "qrator"
    : /ddos-guard|server: *ddos/.test(head) ? "ddosguard"
    : "none";

  return {
    tls13: asked(instrument.canAskTls13, tls13Run.code === 0 ? "yes" : "no"),
    h2: asked(instrument.canAskH2, version === "2" || version === "3" ? "yes" : "no"),
    h3: asked(instrument.canAskH3, h3Run.code === 0 ? "yes" : "no"),
    serves: servesItsOwnName(host, status, redirect),
    cdn,
  };
}

/**
 * Does the host serve at its own name, or send visitors elsewhere?
 *
 * This is what a REALITY donor needs and the reason a bare status code was not
 * enough to record. 200 and a redirect to itself are both fine; a redirect to
 * another domain means the borrowed handshake leads somewhere the client never
 * asked to go, which is visible to anyone who follows it.
 */
function servesItsOwnName(host: string, status: number, redirect: string): Fact {
  if (status >= 200 && status < 300) return "yes";
  if (status >= 400) return "no";
  if (status >= 300 && status < 400) {
    if (!redirect) return "no";
    let target: string;
    try {
      target = new URL(redirect).hostname;
    } catch {
      return "no";
    }
    const base = host.split(".").slice(-2).join(".");
    return target === host || target.endsWith(`.${base}`) ? "yes" : "no";
  }
  return "unknown";
}

/* ── Each service, asked its own way ──────────────────────────────────────── */

/**
 * Ask every port at once, rather than one after another.
 *
 * Sequentially, a host that answers nothing costs the sum of every timeout —
 * fifteen ports across the services below, twice over for the retries, which
 * is minutes per host and hours per sweep. Nothing is being waited *for* in
 * that time; the ports are independent questions. Concurrently the cost is
 * the slowest single answer.
 */
async function anyPort(
  ports: readonly number[],
  ask: (port: number) => Promise<boolean>,
): Promise<Fact> {
  const answers = await Promise.all(ports.map(ask));
  return answers.some(Boolean) ? "yes" : "no";
}

async function bannerIs(
  host: string,
  ports: readonly [number, boolean][],
  prefix: readonly string[],
): Promise<Fact> {
  const answers = await Promise.all(
    ports.map(async ([port, tls]) => {
      // Twice, for the same reason the datagram probes ask twice: a timeout
      // under a wide sweep is the sweep's fault as often as the host's, and
      // `smtp.gmail.com` reporting no IMAP is a statement about congestion.
      for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
        const banner = await readBanner(host, port, tls);
        if (banner && prefix.some((p) => banner.startsWith(p))) return true;
      }
      return false;
    }),
  );
  return answers.some(Boolean) ? "yes" : "no";
}

/**
 * Which record types a name has.
 *
 * Asked of a public resolver rather than of the host, because this is a
 * question about the name: it is the QNAME a DNS mimicry packet carries, and
 * the QTYPE next to it has to be one the name answers.
 */
async function dnsAnswersFor(host: string): Promise<DnsQueryType[]> {
  // A bare address is not a name and has no records of its own.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")) return [];

  const resolver = process.env.PROBE_RESOLVER ?? "1.1.1.1";
  const types: DnsQueryType[] = ["A", "AAAA", "MX", "TXT", "NS", "SOA", "HTTPS", "CAA"];

  const found = await Promise.all(
    types.map(async (type) => {
      const id = Math.floor(Math.random() * 0xffff);
      const reply = await udpAsk(resolver, 53, dnsQuery(host, type, id));
      if (!reply) return null;
      const parsed = readDnsReply(reply, id);
      // An answer count above zero is the whole test: NOERROR with nothing in
      // it means the name exists but has no record of this type, which is
      // precisely the case a mimicry packet must not claim.
      return parsed && parsed.rcode === 0 && parsed.answers > 0 ? type : null;
    }),
  );

  return found.filter((t): t is DnsQueryType => t !== null);
}

/**
 * Is this host a resolver, and what will it answer?
 *
 * A resolver is asked about a name that is not its own — that is the
 * difference between a resolver and an authoritative server, and it is the
 * behaviour a DNS mimicry packet is imitating. Refusals are recorded as
 * refusals: public resolvers commonly answer A and AAAA and turn down ANY,
 * and a packet asking for what a resolver refuses draws a REFUSED, which is
 * louder than sending nothing.
 */
async function resolverFacts(
  host: string,
): Promise<{ dns: Fact; dnsTypes?: DnsQueryType[] }> {
  const probeName = "example.com";
  const id = Math.floor(Math.random() * 0xffff);

  const reply = await udpAsk(host, 53, dnsQuery(probeName, "A", id));
  if (!reply) return { dns: "no" };

  const parsed = readDnsReply(reply, id);
  if (!parsed) return { dns: "no" };
  // Answering at all makes it a resolver; answering REFUSED makes it one with
  // opinions, which is still a resolver.
  if (parsed.rcode !== 0) return { dns: "yes", dnsTypes: [] };

  const types: DnsQueryType[] = ["A", "AAAA", "MX", "TXT", "NS", "SOA", "HTTPS"];
  const answered = await Promise.all(
    types.map(async (type) => {
      const qid = Math.floor(Math.random() * 0xffff);
      const r = await udpAsk(host, 53, dnsQuery(probeName, type, qid));
      if (!r) return null;
      const p = readDnsReply(r, qid);
      return p && p.rcode === 0 ? type : null;
    }),
  );

  return {
    dns: "yes",
    dnsTypes: answered.filter((t): t is DnsQueryType => t !== null),
  };
}

/** DNS over HTTPS, RFC 8484: a POST that looks like any other POST. */
async function dohFact(host: string): Promise<Fact> {
  const id = Math.floor(Math.random() * 0xffff);
  const query = dnsQuery("example.com", "A", id);

  try {
    const response = await fetch(`https://${host}/dns-query`, {
      method: "POST",
      headers: {
        "content-type": "application/dns-message",
        accept: "application/dns-message",
      },
      body: query,
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!response.ok) return "no";
    const body = new Uint8Array(await response.arrayBuffer());
    return readDnsReply(body, id) ? "yes" : "no";
  } catch {
    return "no";
  }
}

/* ── One host, every question ─────────────────────────────────────────────── */

/**
 * Nothing established, for a host that would not answer in time.
 *
 * Every question this file asks has its own timeout, but they add up: the mail
 * probes alone walk seven ports one after another, and a host that black-holes
 * every packet costs a minute and a half. Twenty such hosts at the end of a
 * list held a sweep of nine hundred open indefinitely with every answer still
 * unwritten. A host that will not answer is `unknown`, and saying so takes no
 * longer than the deadline.
 */
function nothingEstablished(host: string): HostFacts {
  const unknown = "unknown" as const;
  return {
    host,
    tls13: unknown, h2: unknown, h3: unknown, serves: unknown, cdn: unknown,
    dnsAnswers: [],
    services: {
      sip: unknown, stun: unknown, dtls: unknown, smtp: unknown, imap: unknown,
      pop3: unknown, dns: unknown, doh: unknown, dot: unknown, ntp: unknown,
      ssh: unknown,
    },
  };
}

/** How long one host gets, all questions together. */
const HOST_DEADLINE = Number(process.env.PROBE_HOST_DEADLINE ?? 120) * 1000;

export async function probeHost(host: string): Promise<HostFacts> {
  const clean = host.trim();

  const [https, dnsAnswers, resolver, doh, stun, sip, dtls, ntp, smtp, imap, pop3, ssh, dot] =
    await Promise.all([
      httpsFacts(clean),
      dnsAnswersFor(clean),
      resolverFacts(clean),
      dohFact(clean),

      (async () => {
        const sent = stunRequest();
        // 3478 is STUN's own port; 19302 is where Google put theirs; 443 is
        // where a TURN server hides from restrictive networks.
        return anyPort([3478, 19302, 443], async (port) => {
          const reply = await udpAsk(clean, port, sent);
          return !!reply && isStunReply(reply, sent);
        });
      })(),

      anyPort([5060, 5080], async (port) => {
        const reply = await udpAsk(clean, port, sipOptions(clean));
        return !!reply && new TextDecoder().decode(reply).startsWith("SIP/2.0");
      }),

      (async () => {
        const hello = dtlsClientHello();
        // 443 is WebRTC and datagram VPNs; 3478 and 5349 are TURN over DTLS.
        return anyPort([443, 3478, 5349], async (port) => {
          const reply = await udpAsk(clean, port, hello);
          return !!reply && isDtlsReply(reply);
        });
      })(),

      anyPort([123], async (port) => {
        const reply = await udpAsk(clean, port, ntpRequest());
        return !!reply && isNtpReply(reply);
      }),

      bannerIs(clean, [[25, false], [587, false], [465, true]], ["220"]),
      bannerIs(clean, [[143, false], [993, true]], ["* OK", "* PREAUTH"]),
      bannerIs(clean, [[110, false], [995, true]], ["+OK"]),
      bannerIs(clean, [[22, false]], ["SSH-"]),
      tlsOpens(clean, 853).then((ok): Fact => (ok ? "yes" : "no")),
    ]);

  // Everything below the line rides on datagrams. Where none leave this
  // machine, silence is the firewall's and not the host's.
  const udp = instrument.udp;

  return {
    host: clean,
    ...https,
    dnsAnswers,
    services: {
      smtp, imap, pop3, ssh, doh, dot,
      sip: asked(udp, sip),
      stun: asked(udp, stun),
      dtls: asked(udp, dtls),
      ntp: asked(udp && instrument.ntp, ntp),
      dns: asked(udp, resolver.dns),
      ...(udp && resolver.dnsTypes ? { dnsTypes: resolver.dnsTypes } : {}),
    },
  };
}

/* ── Entry point ──────────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  // A sweep of several hundred hosts touches thousands of sockets, and a
  // single stray rejection from any of them would otherwise discard every
  // answer gathered so far. Nothing here is silenced that changes a reading:
  // an unreachable port is already recorded as no reply.
  process.on("unhandledRejection", () => {});
  process.on("uncaughtException", (error) => {
    console.error(`  ignored: ${error}`);
  });

  // Before anything is recorded, find out what this machine is able to ask.
  await calibrate();

  const input = await Bun.stdin.text();
  const hosts = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  let done = 0;

  // A fixed number in flight rather than all at once: a few hundred hosts
  // times a dozen sockets each is enough to look like something worth
  // investigating from the far end.
  const queue = [...hosts];
  await Promise.all(
    Array.from({ length: Math.min(PARALLEL, queue.length) }, async () => {
      for (let host = queue.shift(); host; host = queue.shift()) {
        try {
          // One line per host, written straight to the descriptor as soon as
          // it is known. `console.log` into a pipe is block-buffered, so a run
          // that stalls or dies holds everything it learned in a buffer nobody
          // ever sees — which is exactly how two sweeps of several hundred
          // hosts ended with an empty file.
          const facts = await Promise.race([
            probeHost(host),
            Bun.sleep(HOST_DEADLINE).then(() => nothingEstablished(host)),
          ]);
          await Bun.write(Bun.stdout, `${JSON.stringify(facts)}\n`);
        } catch (error) {
          console.error(`  ${host}: ${error}`);
        }
        if (++done % 25 === 0) console.error(`  ${done}/${hosts.length}`);
      }
    }),
  );
}

if (import.meta.main) await main();
