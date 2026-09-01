/**
 * Rewriting the obfuscation inside a key that already exists.
 *
 * Only the client-side parameters are touched. A container stores its
 * configuration three times over — as fields, as a JSON string in
 * `last_config`, and as wg-quick text in `config` — and an edit that
 * reaches only one of them leaves a key contradicting itself.
 */

import { LocalisedError } from "@/shared/errors";
import type {
  AwgContainer,
  AwgVersion,
  ContainerEntry,
  GeneratedParams,
  ObfuscationPatch,
  PatchResult,
  VpnConfig,
} from "./types";


const AWG_CLIENT_FIELDS_BASE: readonly string[] = ["Jc", "Jmin", "Jmax"];
const AWG_CLIENT_FIELDS_CPS: readonly string[] = ["I1", "I2", "I3", "I4", "I5"];


/**
 * Get the list of client fields to update based on AWG version.
 * awgVer: "1" (AWG 1.0) | "2" (AWG 1.5/2.0/3.0/3.1)
 */
export function getClientFields(awgVer: "1" | "2"): string[] {
  if (awgVer === "1") return [...AWG_CLIENT_FIELDS_BASE];
  return [...AWG_CLIENT_FIELDS_BASE, ...AWG_CLIENT_FIELDS_CPS];
}

/**
 * Build an obfuscation patch object from generated params.
 *
 * @param p - Generated config params (from genCfg())
 * @param selectedVer - Selected AWG version in generator ("1.0" | "1.5" | "2.0" | "3.0" | "3.1")
 */
export function buildObfuscationPatch(
  p: GeneratedParams,
  selectedVer: AwgVersion,
): ObfuscationPatch {
  if (!p) {
    throw new LocalisedError(
      "mk.err.noConfig",
      {},
      "no config has been generated yet",
    );
  }

  const patch: ObfuscationPatch = {
    Jc: String(p.jc),
    Jmin: String(p.jmin),
    Jmax: String(p.jmax),
  };

  // I1-I5 only if version supports CPS
  if (selectedVer !== "1.0") {
    patch.I1 = String(p.i1 ?? 0);
    patch.I2 = String(p.i2 ?? 0);
    patch.I3 = String(p.i3 ?? 0);
    patch.I4 = String(p.i4 ?? 0);
    patch.I5 = String(p.i5 ?? 0);
  }

  return patch;
}


function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace a field value in a wg-quick format string ("Field = Value\n").
 * Safe for multiline strings with < > and other special chars.
 */
export function patchWgQuickString(
  str: string,
  field: string,
  value: string,
): string {
  const re = new RegExp(
    "^(" + escapeRegExp(field) + "[ \\t]*=[ \\t]*)(.*)$",
    "m",
  );
  if (re.test(str)) {
    return str.replace(re, "$1" + value);
  }
  // Field not found — add to end of [Interface] section if it exists
  if (str.includes("[Interface]")) {
    return str.replace(/(\[Interface\][^[]*)/, (m) => {
      return m.trimEnd() + "\n" + field + " = " + value + "\n";
    });
  }
  return str + "\n" + field + " = " + value;
}

/**
 * Replace a field value in a JSON string.
 * Used for awg.last_config (JSON within JSON).
 */
export function patchJsonString(
  jsonStr: string,
  field: string,
  value: string,
): string {
  try {
    const obj = JSON.parse(jsonStr) as Record<string, unknown>;
    if (field in obj) {
      obj[field] = value;
      return JSON.stringify(obj, null, 4) + "\n";
    }
    return jsonStr;
  } catch {
    // If it doesn't parse — regex replace like wg-quick
    return patchWgQuickString(jsonStr, field, value);
  }
}

/**
 * Apply obfuscation patch to an AWG container object.
 * Updates:
 *   1. Top-level fields (awg.Jc, awg.I1, ...)
 *   2. awg.last_config (JSON string) — both the JSON fields and the
 *      embedded wg-quick `config` inside it
 *   3. awg.config (wg-quick string)
 *
 * Returns list of changed fields.
 *
 * A container stores the same config three times (fields, last_config,
 * config) and the third copy appears twice: `awg.config` and
 * `JSON.parse(awg.last_config).config`. Missing any one of them leaves a
 * key that contradicts itself and whose `.conf` export stays stale — which
 * is exactly the 4.0 bug where `vpn://` and `json` updated but `.conf` did
 * not.
 */
export function applyObfPatchToAwg(
  awg: AwgContainer,
  patch: ObfuscationPatch,
): string[] {
  const changed: string[] = [];
  const fields = Object.keys(patch) as (keyof ObfuscationPatch)[];
  const present: (keyof ObfuscationPatch)[] = [];

  for (const field of fields) {
    const newVal = patch[field];
    if (newVal === undefined) continue;
    present.push(field);

    const oldVal = awg[field];

    // 1. Top-level — Jc/Jmin/Jmax only if already present, I1-I5 always
    // (a CPS field absent on the original key is still added).
    if (awg[field] !== undefined || AWG_CLIENT_FIELDS_CPS.includes(field)) {
      awg[field] = newVal;
      if (oldVal !== newVal) changed.push(field);
    }
  }

  if (present.length === 0) return changed;

  // 2. last_config — JSON fields + inner wg-quick `config`
  if (awg.last_config && typeof awg.last_config === "string") {
    try {
      const obj = JSON.parse(awg.last_config) as Record<string, unknown>;
      let touched = false;

      for (const field of present) {
        const newVal = patch[field]!;
        // Keep the JSON mirror in sync with the top level: add the field
        // even if the original key did not carry it (e.g. I3-I5 on a key
        // that only had I1/I2). `patchJsonString` preserves the old
        // "do not add" contract for its direct callers; the container sync
        // cannot keep it — otherwise top and inner diverge.
        if (obj[field] !== newVal) {
          obj[field] = newVal;
          touched = true;
        }
      }

      if (typeof obj.config === "string" && obj.config.includes("[Interface]")) {
        let innerConf = obj.config as string;
        for (const field of present) {
          innerConf = patchWgQuickString(innerConf, field, patch[field]!);
        }
        if (innerConf !== obj.config) {
          obj.config = innerConf;
          touched = true;
        }
      }

      if (touched) {
        awg.last_config = JSON.stringify(obj, null, 4) + "\n";
      }
    } catch {
      // Unparseable — fall back to line-wise patching so the operation
      // still reaches the visible text.
      for (const field of present) {
        awg.last_config = patchWgQuickString(
          awg.last_config as string,
          field,
          patch[field]!,
        );
      }
    }
  }

  // 3. config (wg-quick) at the top level
  if (awg.config && typeof awg.config === "string") {
    for (const field of present) {
      awg.config = patchWgQuickString(awg.config as string, field, patch[field]!);
    }
  }

  return changed;
}

/**
 * Apply patch to all AWG containers in a VPN config object.
 * Returns { updated, changed, containerCount }.
 */
export function applyPatchToVpnConfig(
  cfg: VpnConfig,
  patch: ObfuscationPatch,
): PatchResult {
  const containers = cfg.containers || [];
  const awgContainers = containers.filter(
    (c): c is ContainerEntry & { awg: AwgContainer } => c.awg != null,
  );

  if (awgContainers.length === 0) {
    throw new LocalisedError(
      "mk.err.noAwgContainer",
      {},
      "the key carries no AmneziaWG container",
    );
  }

  const allChanged: string[] = [];
  for (const c of awgContainers) {
    const ch = applyObfPatchToAwg(c.awg, patch);
    for (const f of ch) {
      if (!allChanged.includes(f)) allChanged.push(f);
    }
  }

  return {
    updated: cfg,
    changed: allChanged,
    containerCount: awgContainers.length,
  };
}
