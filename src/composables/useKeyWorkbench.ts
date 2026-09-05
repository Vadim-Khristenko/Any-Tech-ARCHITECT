/**
 * The state behind the MergeKeys page.
 *
 * Four things a person does with a key, kept as four modes rather than one
 * form with conditional fields:
 *
 *   inspect  paste anything and be told what it is
 *   merge    several keys into one
 *   refresh  write new obfuscation into a key you already have
 *   build    assemble a key from parts
 *
 * They share one idea: whatever comes in is decoded once, identified once and
 * checked once, and everything downstream reads that result.
 *
 * Nothing leaves the tab. There is no server to send a key to, which is the
 * only reason a page that handles private keys can be written at all.
 */

import { computed, ref, watch, type Ref } from "vue";
import {
  applyPatchToVpnConfig,
  AWG_CLIENT_FIELDS,
  AWG_SHARED_FIELDS,
  AWG3_LOCAL_FIELDS,
  buildKey,
  exportAll,
  identifyKey,
  makeAwgContainer,
  makeXrayContainer,
  mergeVpnConfigs,
  parseVless,
  setKeyLabels,
  templateContainer,
  type TemplateId,
  toContainer,
  validateVpnConfig,
  vpnDecode,
  vpnEncode,
  type ContainerEntry,
  type KeyExports,
  type KeyIdentity,
  type ObfuscationPatch,
  type VpnConfig,
} from "@/engines/keys";
import type { Finding } from "@/shared/findings";
import { localiseError } from "@/shared/errors";
import { warn } from "@/shared/findings";
import { translate, type MessageKey } from "@/i18n";

/** The catalogue lookup a plain function needs, since it has no component. */
const say = (key: string, params?: Record<string, unknown>) =>
  translate(key as MessageKey, params as never);

export type WorkbenchMode = "inspect" | "merge" | "refresh" | "build";

/** What reading one pasted string produced. */
export interface ReadKey {
  source: string;
  config: VpnConfig | null;
  identity: KeyIdentity | null;
  findings: Finding[];
  /** Set when the string could not be read at all. */
  error: string | null;
  /** True when the input was a `vless://` link rather than a `vpn://` key. */
  fromLink: boolean;
}

const EMPTY: ReadKey = {
  source: "",
  config: null,
  identity: null,
  findings: [],
  error: null,
  fromLink: false,
};

/** Every field a wg-quick file can carry that belongs in a container. */
const CONF_FIELDS = [
  ...AWG_CLIENT_FIELDS,
  ...AWG_SHARED_FIELDS,
  ...AWG3_LOCAL_FIELDS,
];

/** Pre-compiled field regexes — `new RegExp` per call was the per-keystroke hotspot. */
const FIELD_RE = new Map<string, RegExp>();
function fieldRe(field: string): RegExp {
  let re = FIELD_RE.get(field);
  if (!re) {
    const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`^[ \\t]*${escaped}[ \\t]*=[ \\t]*(.+?)[ \\t]*$`, "im");
    FIELD_RE.set(field, re);
  }
  return re;
}

/** One `Field = value` line, ignoring comments and case. */
function readField(text: string, field: string): string | undefined {
  const m = text.match(fieldRe(field));
  return m ? m[1] : undefined;
}

/** Debounce a ref so heavy computed (pako, JSON, validate) doesn't run per keystroke. */
function debouncedRef<T>(source: Ref<T>, delay = 180): Ref<T> {
  const debounced = ref(source.value) as Ref<T>;
  let timer: ReturnType<typeof setTimeout> | null = null;
  watch(
    source,
    (v) => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        // For arrays/objects, clone to trigger computed even if reference stable.
        debounced.value = Array.isArray(v) ? (JSON.parse(JSON.stringify(v)) as T) : v;
      }, delay);
    },
    { deep: true },
  );
  return debounced;
}

// Memoize readKey: pasting the same vpn:// repeatedly (history restore, tab switch)
// shouldn't inflate + validate again. Bounded to 50 entries to avoid leak.
const READ_CACHE = new Map<string, ReadKey>();
const READ_CACHE_MAX = 50;
function cachedReadKey(input: string): ReadKey {
  const key = input.trim();
  if (!key) return { ...EMPTY };
  const hit = READ_CACHE.get(key);
  if (hit) return hit;
  const res = readKeyUncached(key);
  if (READ_CACHE.size >= READ_CACHE_MAX) {
    const first = READ_CACHE.keys().next().value as string | undefined;
    if (first !== undefined) READ_CACHE.delete(first);
  }
  READ_CACHE.set(key, res);
  return res;
}

/** A `.conf` with no endpoint is not broken — it just has nowhere to go. */
export const NO_ENDPOINT = "__no-endpoint__";

/**
 * A `.conf` as a one-container key.
 *
 * A missing endpoint used to mean refusal, and that was the wrong call. A
 * generated parameter file has no endpoint by design — the obfuscation is the
 * whole point and the address is the reader's to supply — so the file is
 * perfectly good and simply cannot connect yet. Refusing it meant the tool
 * could not show a config it had produced itself.
 *
 * It is read either way. Where the address is missing, a marker goes in its
 * place and the checker says what to add rather than what went wrong.
 */
function fromWgQuick(text: string): VpnConfig | null {
  if (!/^\s*\[Interface\]/im.test(text)) return null;

  const endpoint = readField(text, "Endpoint");
  const at = endpoint ? endpoint.lastIndexOf(":") : -1;
  const host = endpoint ? (at > 0 ? endpoint.slice(0, at) : endpoint) : NO_ENDPOINT;
  const parsedPort = at > 0 ? Number(endpoint!.slice(at + 1)) : NaN;
  const port = Number.isFinite(parsedPort) ? parsedPort : 0;

  const obfuscation: Record<string, string> = {};
  for (const field of CONF_FIELDS) {
    const v = readField(text, field);
    if (v !== undefined) obfuscation[field] = v;
  }

  const address = readField(text, "Address");
  const dnsRaw = readField(text, "DNS");
  const dns = dnsRaw ? dnsRaw.split(",").map((s) => s.trim()) : undefined;

  const container = makeAwgContainer(
    {
      hostName: host,
      port,
      clientPrivKey: readField(text, "PrivateKey"),
      serverPubKey: readField(text, "PublicKey"),
      pskKey: readField(text, "PresharedKey"),
      clientIp: address ? address.split("/")[0] : undefined,
      dns: dns && dns.length >= 2 ? [dns[0], dns[1]] : undefined,
      mtu: readField(text, "MTU"),
      persistentKeepalive: readField(text, "PersistentKeepalive"),
      allowedIps: readField(text, "AllowedIPs")
        ?.split(",")
        .map((s) => s.trim()),
      obfuscation,
    },
    Object.keys(obfuscation).length > 0 ? "amnezia-awg" : "amnezia-wireguard",
  );

  return buildKey([container], { hostName: host });
}

/**
 * Read one pasted string.
 *
 * Four things arrive here and a person pasting one does not think of them as
 * different: a `vpn://` key, a `vless://` link, a `.json` export, a `.conf`
 * file. All of them come out as a key so everything downstream has one shape.
 */
function readKeyUncached(input: string): ReadKey {
  const source = input.trim();
  if (!source) return { ...EMPTY };

  if (/^vless:\/\//i.test(source)) {
    const { link, findings } = parseVless(source);
    if (!link) return { ...EMPTY, source, findings, fromLink: true };

    const config = buildKey([makeXrayContainer(toContainer(link))], {
      description: link.remark,
      hostName: link.host,
    });
    return {
      source,
      config,
      identity: identifyKey(config),
      findings: [...findings, ...validateVpnConfig(config)],
      error: null,
      fromLink: true,
    };
  }

  /* A `.json` export: the decoded form of a key, edited by hand. */
  if (source.startsWith("{")) {
    try {
      const config = JSON.parse(source) as VpnConfig;
      return {
        source,
        config,
        identity: identifyKey(config),
        findings: validateVpnConfig(config),
        error: null,
        fromLink: false,
      };
    } catch (e) {
      return { ...EMPTY, source, error: localiseError(e, say) };
    }
  }

  if (/^\s*\[Interface\]/im.test(source)) {
    const built = fromWgQuick(source);
    if (!built) return { ...EMPTY, source, error: say("mk.err.confUnreadable") };

    const findings = validateVpnConfig(built);
    if (built.hostName === NO_ENDPOINT) {
      // Said first, because it is the one thing standing between this config
      // and a working tunnel.
      findings.unshift(warn("Endpoint", "vpn.no_endpoint"));
    }

    return {
      source,
      config: built,
      identity: identifyKey(built),
      findings,
      error: null,
      fromLink: false,
    };
  }

  try {
    const config = vpnDecode(source) as VpnConfig;
    return {
      source,
      config,
      identity: identifyKey(config),
      findings: validateVpnConfig(config),
      error: null,
      fromLink: false,
    };
  } catch (e) {
    return { ...EMPTY, source, error: localiseError(e, say) };
  }
}

export const readKey = cachedReadKey;

export function useKeyWorkbench() {
  const mode: Ref<WorkbenchMode> = ref("inspect");

  /* ── Inspect ──────────────────────────────────────────────────────────── */

  const inspectInput = ref("");
  const inspectInputDebounced = debouncedRef(inspectInput, 180);
  const inspected = computed(() => cachedReadKey(inspectInputDebounced.value));

  /* ── Merge ────────────────────────────────────────────────────────────── */

  let nextSlot = 2;
  const slots = ref<{ id: number; value: string }[]>([
    { id: 0, value: "" },
    { id: 1, value: "" },
  ]);

  function addSlot(): void {
    slots.value.push({ id: nextSlot++, value: "" });
  }

  function removeSlot(id: number): void {
    // Two is the minimum that can be merged; below that the mode is pointless.
    if (slots.value.length <= 2) return;
    slots.value = slots.value.filter((s) => s.id !== id);
  }

  /** Each slot read on its own, so a bad one shows against its own box. */
  // Debounced per-slot: typing in one box shouldn't inflate all boxes.
  const slotsDebounced = debouncedRef(slots as unknown as Ref<typeof slots.value>, 180) as Ref<typeof slots.value>;
  const slotReads = computed(() => slotsDebounced.value.map((s) => cachedReadKey(s.value)));

  const mergeResult = ref<{
    config: VpnConfig;
    stats: { total: number; unique: number; dupes: number };
  } | null>(null);
  const mergeError = ref<string | null>(null);
  const mergeWarnings = ref<{ key: string; params?: Record<string, unknown> }[]>([]);

  function runMerge(): void {
    mergeError.value = null;
    mergeWarnings.value = [];
    mergeResult.value = null;

    const configs = slotReads.value
      .map((r) => r.config)
      .filter((c): c is VpnConfig => c !== null);

    try {
      const { merged, warnings, stats } = mergeVpnConfigs(configs);
      mergeResult.value = { config: merged, stats };
      mergeWarnings.value = warnings;
    } catch (e) {
      mergeError.value = localiseError(e, say);
    }
  }

  /* ── Refresh ──────────────────────────────────────────────────────────── */

  /** The key being rewritten. */
  const refreshInput = ref("");
  /** The parameters to write into it — a generated .conf, or pasted lines. */
  const refreshParams = ref("");

  const refreshInputDebounced = debouncedRef(refreshInput, 180);
  const refreshParamsDebounced = debouncedRef(refreshParams, 180);
  const refreshed = computed(() => cachedReadKey(refreshInputDebounced.value));

  /**
   * The obfuscation fields carried by a pasted parameter set.
   *
   * Only the client-side ones. The rest have to match the server, and
   * rewriting one of those on a single device is how a tunnel stops coming up.
   */
  const patchFields = computed<Record<string, string>>(() => {
    const text = refreshParamsDebounced.value;
    if (!text.trim()) return {};

    const out: Record<string, string> = {};
    for (const field of AWG_CLIENT_FIELDS) {
      const v = readField(text, field);
      if (v !== undefined) out[field] = v;
    }
    return out;
  });

  const refreshResult = ref<{ config: VpnConfig; changed: string[] } | null>(null);
  const refreshError = ref<string | null>(null);

  function runRefresh(): void {
    refreshError.value = null;
    refreshResult.value = null;

    const base = refreshed.value.config;
    if (!base) {
      refreshError.value = say("mk.err.needKey");
      return;
    }

    const patch = patchFields.value;
    if (Object.keys(patch).length === 0) {
      refreshError.value = say("mk.err.needParams");
      return;
    }

    try {
      // A copy, so the pasted key is untouched until this succeeds.
      const copy = JSON.parse(JSON.stringify(base)) as VpnConfig;
      const { updated, changed } = applyPatchToVpnConfig(
        copy,
        patch as unknown as ObfuscationPatch,
      );
      refreshResult.value = { config: updated, changed };
    } catch (e) {
      refreshError.value = localiseError(e, say);
    }
  }

  /* ── Build ────────────────────────────────────────────────────────────── */

  const parts = ref<ContainerEntry[]>([]);
  const buildInput = ref("");
  const buildInputDebounced = debouncedRef(buildInput, 180);
  const buildError = ref<string | null>(null);
  const buildMeta = ref({ description: "", name: "", hostName: "" });

  /**
   * Add whatever was pasted as a part.
   *
   * Anything `readKey` understands works, which is the low door in: a person
   * assembling a key has keys and links, not container objects.
   */
  function addPart(): void {
    buildError.value = null;
    const read = readKey(buildInput.value);

    if (read.error) {
      buildError.value = read.error;
      return;
    }
    if (!read.config?.containers?.length) {
      buildError.value = say("mk.err.noContainerToAdd");
      return;
    }

    parts.value.push(...read.config.containers);
    if (!buildMeta.value.hostName && read.config.hostName) {
      buildMeta.value.hostName = read.config.hostName;
    }
    buildInput.value = "";
  }

  /**
   * Start from a template.
   *
   * Appended rather than replacing what is there: a key holding AmneziaWG and
   * XRay at once is the whole reason the container format exists, and someone
   * picking a second template means to add it.
   */
  function addTemplate(id: TemplateId): void {
    buildError.value = null;
    parts.value.push(templateContainer(id));
  }

  function removePart(index: number): void {
    parts.value.splice(index, 1);
  }

  const built = computed(() => {
    if (parts.value.length === 0) return null;
    const meta = buildMeta.value;
    const config = buildKey(parts.value, {
      description: meta.description || undefined,
      name: meta.name || undefined,
      hostName: meta.hostName || undefined,
    });
    return {
      config,
      identity: identifyKey(config),
      findings: validateVpnConfig(config),
    };
  });

  /* ── Whatever the active mode produced ────────────────────────────────── */

  const current = computed<{
    config: VpnConfig;
    identity: KeyIdentity;
    findings: Finding[];
  } | null>(() => {
    const fromRead = (r: ReadKey) =>
      r.config && r.identity
        ? { config: r.config, identity: r.identity, findings: r.findings }
        : null;

    const fromConfig = (config: VpnConfig) => ({
      config,
      identity: identifyKey(config),
      findings: validateVpnConfig(config),
    });

    if (mode.value === "inspect") return fromRead(inspected.value);
    if (mode.value === "refresh") {
      // The patched key once it exists, the pasted one until then.
      return refreshResult.value
        ? fromConfig(refreshResult.value.config)
        : fromRead(refreshed.value);
    }
    if (mode.value === "merge") {
      return mergeResult.value ? fromConfig(mergeResult.value.config) : null;
    }
    return built.value
      ? {
          config: built.value.config,
          identity: built.value.identity,
          findings: built.value.findings,
        }
      : null;
  });

  const currentKey = computed(() =>
    current.value ? vpnEncode(current.value.config) : "",
  );

  const currentExports = computed<KeyExports | null>(() =>
    current.value ? exportAll(current.value.config) : null,
  );

  /* ── Naming ───────────────────────────────────────────────────────────── */

  const labelEdits = ref({ name: "", description: "" });

  /**
   * Applying labels rewrites whichever source produced the key, so the change
   * survives the next recompute rather than being lost when anything else
   * re-reads the input.
   */
  function applyLabels(): void {
    const c = current.value;
    if (!c) return;

    const next = setKeyLabels(c.config, {
      name: labelEdits.value.name || undefined,
      description: labelEdits.value.description || undefined,
    });

    if (mode.value === "inspect") inspectInput.value = vpnEncode(next);
    else if (mode.value === "refresh") {
      if (refreshResult.value) refreshResult.value = { ...refreshResult.value, config: next };
      else refreshInput.value = vpnEncode(next);
    } else if (mode.value === "merge" && mergeResult.value) {
      mergeResult.value = { ...mergeResult.value, config: next };
    } else if (mode.value === "build") {
      buildMeta.value = {
        ...buildMeta.value,
        name: labelEdits.value.name,
        description: labelEdits.value.description,
      };
    }
  }

  return {
    mode,

    inspectInput,
    inspected,

    slots,
    slotReads,
    addSlot,
    removeSlot,
    runMerge,
    mergeResult,
    mergeError,
    mergeWarnings,

    refreshInput,
    refreshParams,
    refreshed,
    patchFields,
    refreshResult,
    refreshError,
    runRefresh,

    parts,
    buildInput,
    buildError,
    buildMeta,
    addPart,
    addTemplate,
    removePart,
    built,

    current,
    currentKey,
    currentExports,

    labelEdits,
    applyLabels,
  };
}
