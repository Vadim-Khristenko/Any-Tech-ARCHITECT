/**
 * The `vless://` share link: reading one, writing one, and saying what is
 * wrong with it.
 *
 * Structure and parameter names follow the standard proposed and settled in
 * XTLS/Xray-core discussion #716 — `vless://UUID@host:port?params#remark`,
 * every value percent-escaped, parameter order insignificant, parameter names
 * case-sensitive.
 *
 * Parsing is deliberately lenient and reporting is separate. A link pasted out
 * of a chat window is routinely missing a parameter or carrying one nobody
 * recognises, and the useful response is to show what was understood alongside
 * what looks wrong — not to refuse the whole string. `parseVless` therefore
 * only fails on what makes a link meaningless (no id, no host, no usable
 * port); everything else comes back as a finding.
 *
 * This is the other half of a translation. The same connection is described by
 * a share link in query parameters and by an Amnezia container in `xray_*`
 * fields; `toContainer` and `fromContainer` move between the two vocabularies.
 */

import { error, warn, info, type Finding } from "@/shared/findings";

/* ── What a link says ─────────────────────────────────────────────────────── */

export interface VlessLink {
  /** The client identifier. This is the credential — treat it as a secret. */
  id: string;
  host: string;
  port: number;
  /** The label after `#`, already decoded. */
  remark: string;
  /** Every query parameter, verbatim and undecoded-by-us beyond percent rules. */
  params: Record<string, string>;
}

/** What came back from reading a link. */
export interface VlessParse {
  link: VlessLink | null;
  findings: Finding[];
}

/**
 * Parameters the standard defines.
 *
 * Kept so an unrecognised one can be reported rather than silently carried:
 * a misspelt `secutiry=reality` is a link that quietly runs without REALITY,
 * which is the failure mode worth catching.
 */
const KNOWN_PARAMS = new Set([
  // protocol
  "encryption",
  "flow",
  // transport
  "type",
  "security",
  "path",
  "host",
  "serviceName",
  "mode",
  "mtu",
  "tti",
  "seed",
  "headerType",
  // tls / reality
  "fp",
  "sni",
  "alpn",
  "ech",
  "pcs",
  "vcn",
  "pbk",
  "sid",
  "pqv",
  "spx",
]);

const TRANSPORTS = new Set([
  "tcp",
  "kcp",
  "ws",
  "http",
  "grpc",
  "httpupgrade",
  "xhttp",
  "raw",
]);

const SECURITIES = new Set(["none", "tls", "reality"]);

/** A UUID as the core writes it. Some panels issue other strings; hence a warn. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ── Reading ──────────────────────────────────────────────────────────────── */

/**
 * Read a `vless://` link.
 *
 * `URL` is not used to do it. It lowercases the host, reorders nothing but
 * normalises enough to matter, and — the reason that settles it — it strips
 * the userinfo on some runtimes, which is where the whole credential lives.
 */
export function parseVless(input: string): VlessParse {
  const findings: Finding[] = [];
  const raw = input.trim();

  if (!/^vless:\/\//i.test(raw)) {
    return {
      link: null,
      findings: [error("uri", "vless.not_a_link")],
    };
  }

  const body = raw.slice(raw.indexOf("://") + 3);

  // Split off the remark first: it may legally contain ? and @ once escaped,
  // and taking it from the end avoids both.
  const hash = body.indexOf("#");
  const remarkRaw = hash >= 0 ? body.slice(hash + 1) : "";
  const beforeHash = hash >= 0 ? body.slice(0, hash) : body;

  const q = beforeHash.indexOf("?");
  const query = q >= 0 ? beforeHash.slice(q + 1) : "";
  const authority = q >= 0 ? beforeHash.slice(0, q) : beforeHash;

  const at = authority.lastIndexOf("@");
  if (at < 0) {
    return { link: null, findings: [error("uri", "vless.no_identifier")] };
  }

  const id = decodeSafely(authority.slice(0, at));
  const hostPort = authority.slice(at + 1);

  if (!id) {
    return { link: null, findings: [error("id", "vless.no_identifier")] };
  }

  const addr = splitHostPort(hostPort);
  if (!addr.host) {
    return { link: null, findings: [error("host", "vless.no_host")] };
  }
  if (!Number.isInteger(addr.port) || addr.port < 1 || addr.port > 65535) {
    return {
      link: null,
      findings: [error("port", "vless.bad_port", { port: addr.portText })],
    };
  }

  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(query)) params[k] = v;

  const link: VlessLink = {
    id,
    host: addr.host,
    port: addr.port,
    remark: decodeSafely(remarkRaw),
    params,
  };

  findings.push(...checkVless(link));
  return { link, findings };
}

function decodeSafely(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    // A stray % is not a reason to lose the rest of the string.
    return s;
  }
}

function splitHostPort(s: string): {
  host: string;
  port: number;
  portText: string;
} {
  // IPv6 arrives bracketed, and its colons are not separators.
  if (s.startsWith("[")) {
    const close = s.indexOf("]");
    if (close > 0) {
      const host = s.slice(1, close);
      const portText = s.slice(close + 2);
      return { host, port: Number(portText), portText };
    }
  }
  const colon = s.lastIndexOf(":");
  if (colon < 0) return { host: s, port: NaN, portText: "" };
  const portText = s.slice(colon + 1);
  return { host: s.slice(0, colon), port: Number(portText), portText };
}

/* ── Checking ─────────────────────────────────────────────────────────────── */

/**
 * What is wrong, or worth knowing, about a link that parsed.
 *
 * The rules that matter are the ones where the link works and does not do what
 * its owner thinks: REALITY without a public key falls back to plain TLS with
 * whatever certificate the server has, and Vision on a transport that cannot
 * carry it is simply ignored.
 */
export function checkVless(link: VlessLink): Finding[] {
  const out: Finding[] = [];
  const p = link.params;

  if (!UUID.test(link.id)) {
    out.push(warn("id", "vless.id_not_uuid"));
  }

  const security = p.security ?? "none";
  if (!SECURITIES.has(security)) {
    out.push(warn("security", "vless.unknown_security", { value: security }));
  }

  const type = p.type ?? "tcp";
  if (!TRANSPORTS.has(type)) {
    out.push(warn("type", "vless.unknown_transport", { value: type }));
  }

  if (security === "reality") {
    if (!p.pbk) out.push(error("pbk", "vless.reality_no_pbk"));
    if (!p.sni) out.push(warn("sni", "vless.reality_no_sni"));
    if (!p.fp) {
      // Without one the client leaves the library's own handshake, which is
      // the fingerprint REALITY exists to avoid presenting.
      out.push(warn("fp", "vless.reality_no_fp"));
    }
  }

  if (security === "none" && p.pbk) {
    out.push(warn("security", "vless.pbk_without_reality"));
  }

  if (p.flow) {
    if (!p.flow.startsWith("xtls-rprx-vision")) {
      out.push(warn("flow", "vless.unknown_flow", { value: p.flow }));
    } else if (security === "none") {
      out.push(warn("flow", "vless.flow_without_tls"));
    }
  }

  if (p.encryption && p.encryption !== "none" && !p.encryption.includes("."))
    out.push(warn("encryption", "vless.odd_encryption"));

  for (const name of Object.keys(p)) {
    if (!KNOWN_PARAMS.has(name)) {
      out.push(info(name, "vless.unknown_param", { name }));
    }
  }

  return out;
}

/* ── Writing ──────────────────────────────────────────────────────────────── */

/** Build a link back. Empty parameters are dropped rather than written blank. */
export function buildVless(link: VlessLink): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(link.params)) {
    if (v !== "" && v != null) params.set(k, v);
  }

  const host = link.host.includes(":") ? `[${link.host}]` : link.host;
  const query = params.toString();
  const remark = link.remark ? `#${encodeURIComponent(link.remark)}` : "";
  return `vless://${encodeURIComponent(link.id)}@${host}:${link.port}${
    query ? `?${query}` : ""
  }${remark}`;
}

/* ── Between the two vocabularies ─────────────────────────────────────────── */

/**
 * The Amnezia container's names for what a link calls something else.
 *
 * Only where they genuinely correspond. `xhttp_mode` capitalises its values
 * (`Auto`, `Packet-up`) while the link writes them lowercase, so the mapping
 * is by meaning rather than by copying strings across.
 */
const LINK_TO_CONTAINER: Record<string, string> = {
  security: "xray_security",
  flow: "xray_flow",
  fp: "xray_fingerprint",
  sni: "xray_sni",
  alpn: "xray_alpn",
  type: "xray_transport",
  host: "xhttp_host",
  path: "xhttp_path",
};

const XHTTP_MODES: Record<string, string> = {
  auto: "Auto",
  "packet-up": "Packet-up",
  "stream-up": "Stream-up",
  "stream-one": "Stream-one",
};

/**
 * A link as an Amnezia XRay container body.
 *
 * Lossy in one direction on purpose: `pbk`, `sid` and `spx` have no container
 * field in the client's key list, so they are carried under their own names
 * rather than dropped. A key that loses the REALITY public key is a key that
 * cannot connect, and silently producing one would be worse than carrying a
 * field the client may ignore.
 */
export function toContainer(link: VlessLink): Record<string, string> {
  const out: Record<string, string> = {};

  for (const [from, to] of Object.entries(LINK_TO_CONTAINER)) {
    const v = link.params[from];
    if (v) out[to] = v;
  }

  const mode = link.params.mode?.toLowerCase();
  if (mode && XHTTP_MODES[mode]) out.xhttp_mode = XHTTP_MODES[mode];

  for (const carried of ["pbk", "sid", "spx", "encryption"]) {
    if (link.params[carried]) out[carried] = link.params[carried];
  }

  out.port = String(link.port);
  out.hostName = link.host;
  out.clientId = link.id;
  return out;
}

/** And back again, for handing a container to a client that wants a link. */
export function fromContainer(
  body: Record<string, unknown>,
  fallback: { host?: string; port?: number; id?: string } = {},
): VlessLink | null {
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const id = str(body.clientId) ?? fallback.id;
  const host = str(body.hostName) ?? fallback.host;
  const port = Number(body.port ?? fallback.port);

  if (!id || !host || !Number.isInteger(port)) return null;

  const params: Record<string, string> = {};
  for (const [to, from] of Object.entries(LINK_TO_CONTAINER)) {
    const v = str(body[from]);
    if (v) params[to] = v;
  }

  const mode = str(body.xhttp_mode);
  if (mode) params.mode = mode.toLowerCase();

  for (const carried of ["pbk", "sid", "spx", "encryption"]) {
    const v = str(body[carried]);
    if (v) params[carried] = v;
  }

  return { id, host, port, remark: str(body.description) ?? "", params };
}
