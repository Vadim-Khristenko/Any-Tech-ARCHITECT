/**
 * Assembling a key, and taking one apart into the format someone needs.
 *
 * Two directions, one file, because they are the same knowledge used twice: a
 * container is a wg-quick text and a JSON copy and a set of fields, and
 * whether you are writing those or reading them out, the rule about keeping
 * all three in step is the same rule.
 *
 * Nothing here invents key material. A builder that generated a private key
 * would be producing half a tunnel — the server has to know the public half —
 * so what goes in is what the caller already has.
 */

import {
  AWG_CLIENT_FIELDS,
  AWG_SHARED_FIELDS,
  AWG3_LOCAL_FIELDS,
  containerKind,
} from "./containers";
import { containerBody, inferProtocol } from "./identify";
import { buildVless, fromContainer } from "./vless";
import { getAwgWgQuick } from "./wgQuick";
import type { ContainerEntry, VpnConfig } from "./types";

/* ── Taking a key apart ───────────────────────────────────────────────────── */

/**
 * The wg-quick text for a container, if it has one.
 *
 * Preferred over rebuilding it from fields: the stored text is what the client
 * wrote and may carry lines this tool has no opinion about. Rebuilding would
 * quietly drop them.
 */
export function extractWgQuick(entry: ContainerEntry): string | null {
  const found = containerBody(entry);
  if (!found) return null;
  return getAwgWgQuick(found.body as import("./types").AwgContainer);
}

/**
 * The `vless://` link for an XRay container, if one can be formed.
 *
 * The address and the client identifier usually sit one level in, inside
 * `last_config`, while the transport settings sit at the top — so both levels
 * have to be read before deciding a link cannot be built.
 */
export function extractVless(entry: ContainerEntry): string | null {
  const found = containerBody(entry);
  if (!found) return null;

  /*
   * Only for containers that are actually XRay. Without this gate a WireGuard
   * container produced a link out of its own public key and endpoint — a
   * well-formed `vless://` describing a tunnel that does not exist, which is
   * worse than offering nothing.
   */
  const kind = containerKind(entry.container ?? "");
  const protocol = kind?.protocol ?? inferProtocol(found.body);
  if (protocol !== "xray" && protocol !== "ssxray") return null;

  const body = found.body;
  let inner: Record<string, unknown> = {};
  if (typeof body.last_config === "string") {
    try {
      inner = JSON.parse(body.last_config) as Record<string, unknown>;
    } catch {
      // Unreadable inner copy; the top level may still be enough.
    }
  }

  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const num = (v: unknown) =>
    typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;

  const link = fromContainer(body, {
    host: str(inner.hostName),
    port: Number.isFinite(num(body.port)) ? num(body.port) : num(inner.port),
    id: str(inner.clientId) ?? str(inner.client_pub_key),
  });

  return link ? buildVless(link) : null;
}

/** The whole key as readable JSON — what a person inspects or edits by hand. */
export function exportJson(cfg: VpnConfig): string {
  return JSON.stringify(cfg, null, 2);
}

/**
 * Every format this key can be handed over in.
 *
 * Absent rather than empty when a format does not apply: a WireGuard container
 * has no `vless://`, and offering an empty download is worse than offering
 * nothing.
 */
export interface KeyExports {
  json: string;
  /** Per container, keyed by container name. */
  conf: Record<string, string>;
  vless: Record<string, string>;
}

export function exportAll(cfg: VpnConfig): KeyExports {
  const conf: Record<string, string> = {};
  const vless: Record<string, string> = {};

  for (const entry of cfg.containers ?? []) {
    const name = entry.container ?? "";
    const quick = extractWgQuick(entry);
    if (quick) conf[name] = quick;
    const link = extractVless(entry);
    if (link) vless[name] = link;
  }

  return { json: exportJson(cfg), conf, vless };
}

/* ── Putting one together ─────────────────────────────────────────────────── */

/** What a caller supplies for an AmneziaWG container. */
export interface AwgContainerInput {
  hostName: string;
  port: number | string;
  clientPrivKey?: string;
  clientPubKey?: string;
  serverPubKey?: string;
  pskKey?: string;
  clientIp?: string;
  dns?: [string, string];
  mtu?: number | string;
  allowedIps?: string[];
  persistentKeepalive?: number | string;
  /** Obfuscation fields, as the format spells them: Jc, S1, H1, and so on. */
  obfuscation?: Record<string, string>;
}

const DEFAULT_ALLOWED = ["0.0.0.0/0", "::/0"];

/**
 * The wg-quick text for a container being built.
 *
 * The obfuscation fields go in the `[Interface]` section, which is where
 * AmneziaWG reads them and where the client writes them.
 */
export function renderWgQuick(input: AwgContainerInput): string {
  const obf = input.obfuscation ?? {};
  const lines: string[] = ["[Interface]"];

  if (input.clientIp) lines.push(`Address = ${input.clientIp}/32`);
  if (input.dns) lines.push(`DNS = ${input.dns[0]}, ${input.dns[1]}`);
  if (input.clientPrivKey) lines.push(`PrivateKey = ${input.clientPrivKey}`);
  if (input.mtu) lines.push(`MTU = ${input.mtu}`);

  // In the order the format lists them, so two keys built from the same
  // parameters produce the same text.
  for (const field of [...AWG_CLIENT_FIELDS, ...AWG_SHARED_FIELDS, ...AWG3_LOCAL_FIELDS]) {
    const v = obf[field];
    if (v !== undefined && v !== "") lines.push(`${field} = ${v}`);
  }

  lines.push("", "[Peer]");
  if (input.serverPubKey) lines.push(`PublicKey = ${input.serverPubKey}`);
  if (input.pskKey) lines.push(`PresharedKey = ${input.pskKey}`);
  lines.push(`AllowedIPs = ${(input.allowedIps ?? DEFAULT_ALLOWED).join(", ")}`);
  lines.push(`Endpoint = ${input.hostName}:${input.port}`);
  if (input.persistentKeepalive) {
    lines.push(`PersistentKeepalive = ${input.persistentKeepalive}`);
  }

  return `${lines.join("\n")}\n`;
}

/**
 * An AmneziaWG container, with all three copies of itself in step.
 *
 * Writing them together is the point: the format stores the configuration as
 * fields, as JSON in `last_config`, and as wg-quick text, and a builder that
 * filled one would produce exactly the self-contradicting key `validate` was
 * written to catch.
 */
export function makeAwgContainer(
  input: AwgContainerInput,
  container:
    | "amnezia-awg"
    | "amnezia-awg2"
    | "amnezia-awg3"
    | "amnezia-wireguard" = "amnezia-awg",
): ContainerEntry {
  // Every AmneziaWG container carries obfuscation; only WireGuard does not.
  const obf =
    container === "amnezia-wireguard" ? {} : (input.obfuscation ?? {});
  const quick = renderWgQuick({ ...input, obfuscation: obf });

  const inner: Record<string, unknown> = {
    allowed_ips: input.allowedIps ?? DEFAULT_ALLOWED,
    client_ip: input.clientIp,
    client_priv_key: input.clientPrivKey,
    client_pub_key: input.clientPubKey,
    clientId: input.clientPubKey,
    config: quick,
    hostName: input.hostName,
    mtu: String(input.mtu ?? 1420),
    persistent_keep_alive: String(input.persistentKeepalive ?? 25),
    port: Number(input.port),
    psk_key: input.pskKey,
    server_pub_key: input.serverPubKey,
    ...obf,
  };

  for (const k of Object.keys(inner)) {
    if (inner[k] === undefined) delete inner[k];
  }

  const protocol = container === "amnezia-wireguard" ? "wireguard" : "awg";

  return {
    container,
    [protocol]: {
      ...obf,
      last_config: JSON.stringify(inner),
      port: String(input.port),
      transport_proto: "udp",
    },
  } as ContainerEntry;
}

/** An XRay container from a share link. */
export function makeXrayContainer(
  body: Record<string, string>,
): ContainerEntry {
  return { container: "amnezia-xray", xray: body } as ContainerEntry;
}

/** What a key needs beyond its containers. */
export interface KeyMeta {
  description?: string;
  name?: string;
  hostName?: string;
  dns1?: string;
  dns2?: string;
  defaultContainer?: string;
}

/**
 * A key from parts.
 *
 * `defaultContainer` falls back to the first container rather than being left
 * empty: a key whose default names nothing is one the client opens on
 * whatever it feels like, and `validate` reports it.
 */
export function buildKey(
  containers: ContainerEntry[],
  meta: KeyMeta = {},
): VpnConfig {
  const first = containers[0]?.container ?? "";

  const cfg: VpnConfig = {
    containers,
    defaultContainer: meta.defaultContainer ?? first,
    description: meta.description ?? "",
    hostName: meta.hostName ?? "",
  };

  if (meta.dns1) cfg.dns1 = meta.dns1;
  if (meta.dns2) cfg.dns2 = meta.dns2;
  if (meta.name !== undefined) {
    (cfg as unknown as Record<string, unknown>).name = meta.name;
    cfg.nameOverriddenByUser = true;
  }

  return cfg;
}
