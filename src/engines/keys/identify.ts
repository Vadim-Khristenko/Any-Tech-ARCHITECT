/**
 * What a key actually is, once it has decoded.
 *
 * Decoding tells you a key is well-formed; it does not tell you it is useful.
 * An Amnezia subscription key parses perfectly and contains no tunnel at all —
 * it holds credentials for a service that will issue one later — so every
 * operation that walks `containers[]` produces nothing and reports success.
 * That is the failure this module exists to prevent: the page can say what it
 * is holding before offering to do something impossible with it.
 *
 * Nothing here contacts anything. Identifying a subscription key means reading
 * the label it carries, not asking the service about it.
 */

import {
  CONTAINERS,
  containerKind,
  keyShape,
  protocolKeyFor,
  type KeyShape,
  type ProtocolKey,
} from "./containers";
import type { ContainerEntry, VpnConfig } from "./types";

/** A service that issues configurations, rather than a configuration. */
export type ServiceKind =
  | "amnezia-premium"
  | "amnezia-free"
  | "amnezia-self-hosted"
  | "other";

export interface ContainerSummary {
  /** As the format spells it, e.g. `amnezia-awg`. */
  name: string;
  /** Human label, e.g. `AmneziaWG`. Proper nouns, so not localised. */
  label: string;
  /** Where its settings live inside the container object. */
  protocol: string;
  /** Carries AmneziaWG obfuscation parameters that can be rewritten. */
  obfuscated: boolean;
  /**
   * Set when the container name meant nothing and the protocol was worked out
   * from the fields instead. The interface should say so rather than present
   * a guess as a fact.
   */
  inferred?: ProtocolKey;
  /** Present only when the container declares one. */
  hostName?: string;
  port?: string;
  /** AmneziaWG generation, read from which fields are present. */
  awgVersion?: "1.0" | "1.5" | "2.0" | "3.0";
}

export interface KeyIdentity {
  shape: KeyShape;
  /** Set when `shape` is `api`. */
  service?: ServiceKind;
  /** The label the key carries, if any. */
  name?: string;
  description?: string;
  hostName?: string;
  containers: ContainerSummary[];
  /** Which the client opens by default. */
  defaultContainer?: string;
  /**
   * True when nothing in the key can be merged or have its obfuscation
   * rewritten — the page should offer to read it, not to edit it.
   */
  readOnly: boolean;
}

/* ── Which AmneziaWG generation a container carries ───────────────────────── */

/**
 * Read the version off the fields rather than off a version field, because
 * there is no version field. A container simply carries what its generation
 * had, so the newest field present names the generation.
 */
export function awgVersionOf(body: Record<string, unknown>): KeyIdentity["containers"][number]["awgVersion"] {
  const has = (k: string) => body[k] !== undefined && body[k] !== "";

  if (
    has("HeaderProtectionKey") ||
    has("ContentPaddingAddition") ||
    has("RekeyAfterTime")
  ) {
    return "3.0";
  }
  if (has("S3") || has("S4")) return "2.0";
  if (has("I1") || has("I2") || has("I3") || has("I4") || has("I5")) return "1.5";
  if (has("Jc") || has("H1") || has("S1")) return "1.0";
  return undefined;
}

/* ── Reading a container that does not announce itself ────────────────────── */

/**
 * What a container body looks like it holds, judged only by its fields.
 *
 * The name comes first everywhere this is used. A container that says
 * `amnezia-awg` is AmneziaWG whatever its fields suggest — the client wrote
 * that name and the client will read it back. This exists for the other case:
 * a name nothing recognises, like `amnezia-awg3`, where refusing to guess
 * means showing the reader an unlabelled blob they cannot act on.
 *
 * Order matters. AmneziaWG is WireGuard plus obfuscation fields, so a body
 * carrying both is AmneziaWG; testing for WireGuard first would call every
 * AWG container WireGuard.
 */
export function inferProtocol(
  body: Record<string, unknown>,
): ProtocolKey | undefined {
  const has = (k: string) => body[k] !== undefined && body[k] !== "";
  const hasAny = (keys: string[]) => keys.some(has);

  if (hasAny(["Jc", "Jmin", "Jmax", "H1", "S1", "HeaderProtectionKey"])) {
    return "awg";
  }
  if (hasAny(Object.keys(body).filter((k) => k.startsWith("xray_")))) {
    return "xray";
  }
  if (hasAny(["xhttp_mode", "xhttp_path", "xmux_enabled"])) return "xray";
  if (hasAny(["client_priv_key", "server_pub_key", "psk_key"])) {
    return "wireguard";
  }
  if (hasAny(["cert", "tls_auth", "ncp_disable", "cipher"])) return "openvpn";
  return undefined;
}

/**
 * The body a container holds, wherever it keeps it.
 *
 * A container names its protocol with one string and nests its settings under
 * another. When the name is unknown the nesting key is unknown too, so the
 * only way in is to take whichever property holds an object.
 */
export function containerBody(
  entry: ContainerEntry,
): { key: string; body: Record<string, unknown> } | undefined {
  const record = entry as unknown as Record<string, unknown>;
  const expected = protocolKeyFor(entry.container ?? "");

  const asBody = (v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : undefined;

  const direct = asBody(record[expected]);
  if (direct) return { key: expected, body: direct };

  for (const [k, v] of Object.entries(record)) {
    if (k === "container") continue;
    const body = asBody(v);
    if (body) return { key: k, body };
  }
  return undefined;
}

/* ── Which service issued a subscription key ──────────────────────────────── */

function serviceOf(cfg: Record<string, unknown>): ServiceKind {
  const api = cfg.api_config as Record<string, unknown> | undefined;
  const type = typeof api?.service_type === "string" ? api.service_type : "";

  if (type === "amnezia-premium") return "amnezia-premium";
  if (type === "amnezia-free") return "amnezia-free";
  if (type) return "other";

  /*
   * The older shape has no service_type at all — the endpoint and a name are
   * all there is, so the name is what identifies it. Matching on the endpoint
   * would be worse: those are bare IP addresses that change.
   */
  const name = typeof cfg.name === "string" ? cfg.name.toLowerCase() : "";
  if (name.includes("premium")) return "amnezia-premium";
  if (name.includes("free")) return "amnezia-free";
  return "other";
}

/* ── The whole picture ────────────────────────────────────────────────────── */

function summarise(entry: ContainerEntry): ContainerSummary {
  const name = entry.container ?? "";
  const kind = containerKind(name);
  const found = containerBody(entry);
  const body = found?.body;

  /*
   * The name wins when it is one we know. Inference only runs for a name
   * nothing recognises — `amnezia-awg3` and whatever the client adds next —
   * where the alternative is showing an unlabelled blob.
   */
  const inferred = kind ? undefined : body ? inferProtocol(body) : undefined;
  const protocol = kind?.protocol ?? inferred ?? protocolKeyFor(name);

  const str = (v: unknown) => (typeof v === "string" ? v : undefined);

  /* A port is written both ways in the wild: "44200" and 44200. */
  const port = (v: unknown): string | undefined => {
    if (typeof v === "string" && v !== "") return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    return undefined;
  };

  const obfuscated = kind?.obfuscated ?? inferred === "awg";

  /*
   * The address is usually one level further in. A container keeps `port` and
   * `transport_proto` at its top and leaves `hostName` to the copy inside
   * `last_config`, so reading only the top returns nothing for most real keys.
   */
  let inner: Record<string, unknown> | undefined;
  if (body && typeof body.last_config === "string") {
    try {
      inner = JSON.parse(body.last_config) as Record<string, unknown>;
    } catch {
      // A container whose inner copy is unreadable still has a name and a
      // protocol worth showing; validation reports the parse separately.
    }
  }

  return {
    name,
    label: kind?.label ?? labelForProtocol(inferred) ?? name,
    protocol,
    obfuscated,
    inferred: kind ? undefined : inferred,
    hostName: str(body?.hostName) ?? str(inner?.hostName),
    port: port(body?.port) ?? port(inner?.port),
    awgVersion: body && obfuscated ? awgVersionOf(body) : undefined,
  };
}

/** A readable name for a protocol worked out from the fields. */
function labelForProtocol(p: ProtocolKey | undefined): string | undefined {
  if (!p) return undefined;
  return (
    CONTAINERS.find((c) => c.protocol === p)?.label ?? p
  );
}

export function identifyKey(cfg: VpnConfig): KeyIdentity {
  const record = cfg as unknown as Record<string, unknown>;
  const shape = keyShape(record);

  const str = (v: unknown) => (typeof v === "string" ? v : undefined);

  if (shape !== "config") {
    return {
      shape,
      service: shape === "api" ? serviceOf(record) : undefined,
      name: str(record.name),
      description: str(record.description),
      containers: [],
      readOnly: true,
    };
  }

  const containers = (cfg.containers ?? []).map(summarise);

  return {
    shape,
    name: str(record.name),
    description: str(record.description),
    hostName: str(record.hostName),
    containers,
    defaultContainer: str(record.defaultContainer),
    // A tunnel key with no container to work on is still read-only, and an
    // empty containers array is a real thing a hand-edited key can have.
    readOnly: containers.length === 0,
  };
}

/** Whether anything in this key can have its obfuscation rewritten. */
export function hasObfuscation(identity: KeyIdentity): boolean {
  return identity.containers.some((c) => c.obfuscated);
}

/* ── Naming ───────────────────────────────────────────────────────────────── */

/**
 * Rename a key, or give it a description.
 *
 * `nameOverriddenByUser` exists in the format precisely for this: without it
 * the client is free to replace a name it thinks it owns, and a key renamed in
 * a tool would quietly revert. Only set when a name is actually given.
 */
export function setKeyLabels(
  cfg: VpnConfig,
  labels: { description?: string; name?: string },
): VpnConfig {
  const out: VpnConfig = { ...cfg };

  if (labels.description !== undefined) out.description = labels.description;

  if (labels.name !== undefined) {
    (out as unknown as Record<string, unknown>).name = labels.name;
    out.nameOverriddenByUser = true;
  }

  return out;
}
