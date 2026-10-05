/**
 * What a `vpn://` key can hold, and what the client calls it.
 *
 * Names are read from the Amnezia client's own
 * `client/core/utils/constants/configKeys.h` rather than guessed from the
 * keys that happen to have been seen. Guessing is how `amnezia-awg2` gets
 * missed — it exists, it is a separate container, and nothing in a sample key
 * would have said so.
 *
 * The important asymmetry this file records: a container names its protocol
 * with one string and nests its settings under another. `amnezia-wireguard`
 * stores them under `wireguard`, `amnezia-awg` under `awg`, `amnezia-xray`
 * under `xray`. Reading a key means knowing both.
 */

/** A container as the format spells it. */
export type ContainerName =
  | "amnezia-openvpn"
  | "amnezia-openvpn-cloak"
  | "amnezia-wireguard"
  | "amnezia-awg"
  | "amnezia-awg2"
  | "amnezia-awg3"
  | "amnezia-xray"
  | "amnezia-ssxray";

/** The key a container nests its settings under. */
export type ProtocolKey =
  | "openvpn"
  | "wireguard"
  | "awg"
  | "xray"
  | "ssxray"
  | "cloak";

export interface ContainerKind {
  name: ContainerName;
  /** Where the settings live inside the container object. */
  protocol: ProtocolKey;
  /** Whether this container carries AmneziaWG obfuscation parameters. */
  obfuscated: boolean;
  /** A short label for the interface; not localised — these are proper nouns. */
  label: string;
}

export const CONTAINERS: readonly ContainerKind[] = [
  {
    name: "amnezia-awg",
    protocol: "awg",
    obfuscated: true,
    label: "AmneziaWG",
  },
  /*
   * A second AmneziaWG container the client ships alongside the first. It is
   * not a version of `amnezia-awg` — it is its own entry in the container
   * enum, and a key can carry both.
   */
  {
    name: "amnezia-awg2",
    protocol: "awg",
    obfuscated: true,
    label: "AmneziaWG 2",
  },
  {
    name: "amnezia-awg3",
    protocol: "awg",
    obfuscated: true,
    label: "AmneziaWG 3",
  },
  {
    name: "amnezia-wireguard",
    protocol: "wireguard",
    obfuscated: false,
    label: "WireGuard",
  },
  { name: "amnezia-xray", protocol: "xray", obfuscated: false, label: "XRay" },
  {
    name: "amnezia-ssxray",
    protocol: "ssxray",
    obfuscated: false,
    label: "Shadowsocks over XRay",
  },
  {
    name: "amnezia-openvpn",
    protocol: "openvpn",
    obfuscated: false,
    label: "OpenVPN",
  },
  {
    name: "amnezia-openvpn-cloak",
    protocol: "cloak",
    obfuscated: false,
    label: "OpenVPN over Cloak",
  },
];

export function containerKind(name: string): ContainerKind | undefined {
  return CONTAINERS.find((c) => c.name === name);
}

/**
 * Where a container keeps its settings.
 *
 * Falls back to the container name with the `amnezia-` prefix removed, which
 * is the convention every known container follows — so a container added to
 * the client tomorrow reads correctly rather than reading as empty.
 */
export function protocolKeyFor(name: string): string {
  return containerKind(name)?.protocol ?? name.replace(/^amnezia-/, "");
}

/* ── AmneziaWG fields, as the format spells them ──────────────────────────── */

/**
 * Client-side: safe to change on one device without touching the server.
 *
 * The junk train and the CPS chain are sent before the handshake and land in
 * the receiver's "unknown packet" branch, which is their whole purpose.
 */
export const AWG_CLIENT_FIELDS = [
  "Jc",
  "Jmin",
  "Jmax",
  "I1",
  "I2",
  "I3",
  "I4",
  "I5",
] as const;

/**
 * Shared: the receiving side parses arriving packets with its own copies, so
 * changing one of these on a client without changing the server produces a
 * tunnel that will not come up.
 */
export const AWG_SHARED_FIELDS = [
  "H1",
  "H2",
  "H3",
  "H4",
  "S1",
  "S2",
  "S3",
  "S4",
  "HeaderProtectionKey",
] as const;

/**
 * AmneziaWG 3.0 additions.
 *
 * `HeaderProtectionKey` is shared and listed above; the timers are local to
 * each side and need no agreement at all.
 */
export const AWG3_LOCAL_FIELDS = [
  "ContentPaddingAddition",
  "RekeyAfterTime",
  "RekeyTimeout",
  "RejectAfterTime",
  "KeepaliveTimeout",
  "MaxHandshakeAttempts",
  "RandomTrailers",
  "DisableCookies",
] as const;

/** Every AmneziaWG field this tool understands, in the order a form shows them. */
export const AWG_ALL_FIELDS = [
  ...AWG_CLIENT_FIELDS,
  ...AWG_SHARED_FIELDS,
  ...AWG3_LOCAL_FIELDS,
] as const;

export type AwgFieldName = (typeof AWG_ALL_FIELDS)[number];

/** Which side has to agree about a field — what a form must tell the reader. */
export function fieldScope(field: string): "client" | "shared" | "local" {
  if ((AWG_CLIENT_FIELDS as readonly string[]).includes(field)) return "client";
  if ((AWG_SHARED_FIELDS as readonly string[]).includes(field)) return "shared";
  return "local";
}

/* ── Telling a key apart from a key ───────────────────────────────────────── */

export type KeyShape =
  /** Holds containers: a tunnel, or several. */
  | "config"
  /** Holds credentials for a service that issues configs. Nothing to merge. */
  | "api"
  /** Decoded, but neither of the above. */
  | "unknown";

/**
 * What kind of key this is.
 *
 * Worth doing explicitly: an API key decodes perfectly well and then has no
 * containers, so every operation that walks `containers[]` silently produces
 * nothing. The page has to say "this is a subscription key" rather than
 * "0 containers merged".
 */
export function keyShape(cfg: Record<string, unknown>): KeyShape {
  if (Array.isArray(cfg.containers)) return "config";
  if (cfg.api_config || cfg.api_endpoint || cfg.auth_data) return "api";
  return "unknown";
}
