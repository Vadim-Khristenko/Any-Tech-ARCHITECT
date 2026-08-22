/**
 * XRay as an Engine.
 *
 * The second implementation of the contract, and the one that shows whether
 * the seam was drawn in the right place: nothing here reshapes itself to fit
 * AmneziaWG's model, because the contract never asked it to.
 */

import { Zap } from "lucide-vue-next";

import { defineEngine } from "@/types/engine";
import type { EngineLine } from "@/types/engine";
import { XRAY_VERSIONS } from "./versions";
import { createDefaults, generateXray } from "./generate";
import { renderServer, buildClientUri } from "./render";
import { parseXray } from "./parse";
import { validateXray } from "./validate";
import { xraySimulator } from "./packetSim";
import type { XrayConfig, XrayInput } from "./types";

export const xrayEngine = defineEngine<XrayInput, XrayConfig>({
  id: "xray",
  label: "XRay",
  route: "/xray",
  icon: Zap,

  versions: XRAY_VERSIONS.map((v) => ({
    id: v.id,
    label: v.label,
    isNewest: v.isNewest,
    isLegacy: v.isLegacy,
    isFloor: v.isFloor,
  })),

  // A pasted config arrives as either a share link or a JSON inbound; both
  // are read, so both are declared.
  formats: ["uri", "json"],

  createDefaults,
  generate: generateXray,

  render(config): EngineLine[] {
    // The server inbound is the primary artefact; the client link is offered
    // separately through `toUri`, because the two have different audiences.
    return renderServer(config);
  },

  toUri: (config) => buildClientUri(config),

  parse: parseXray,

  detect(text) {
    const t = text.trim().toLowerCase();
    return t.startsWith("vless://") || t.includes('"protocol": "vless"') ||
      t.includes('"protocol":"vless"');
  },

  validate: validateXray,

  simulator: xraySimulator,
});

export * from "./types";
export * from "./versions";
export { buildServerInbound, buildClientUris } from "./render";
export { generateXrayBatch } from "./generate";
