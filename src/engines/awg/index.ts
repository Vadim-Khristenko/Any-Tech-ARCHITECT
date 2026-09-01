/**
 * AmneziaWG as an Engine.
 *
 * This is an adapter and nothing more: it calls the existing functions in
 * `utils/generator` and reshapes their results to the contract. Not one line
 * of the generator moved to make it fit, which was the condition — an
 * abstraction that requires rewriting the thing it abstracts has been drawn
 * in the wrong place.
 *
 * Two mismatches were worth noting rather than papering over:
 *
 *   - Validation lives in three functions here (sizes, client compatibility,
 *     the 3.0 block) and the contract asks for one call, so the adapter joins
 *     them. That is a real simplification for the shell, which never wanted
 *     to know the split.
 *
 *   - `RenderLabels` is a fixed set of named fields, while the contract passes
 *     a plain record. The cast is contained here, in the one place that knows
 *     both shapes.
 */

import { auditConf } from "./audit";
import { Shield } from "lucide-vue-next";

import {
  genCfg,
  renderConfLines,
  validateGeneratedConfig,
  validateAwg3,
  DEFAULT_CLIENT_ID,
  type AWGConfig,
  type GeneratorInput,
  type RenderLabels,
} from "@/engines/awg/generator";
import { AWG_VERSIONS } from "@/engines/awg/generator/versions";
import { buildVpnConfig } from "@/engines/awg/awgFormat";
import { awgSimulator } from "./packetSim";

import { defineEngine, linesToText } from "@/types/engine";
import type { EngineLabels, EngineLine, EngineFinding } from "@/types/engine";
import { parseAwgConf } from "./parse";

/**
 * Same defaults the generator page has always started from. Kept here rather
 * than imported from the composable so an engine can be exercised without a
 * Vue runtime — the batch worker and the tests both need that.
 */
function createDefaults(): GeneratorInput {
  return {
    version: "3.0",
    intensity: "medium",
    profile: "quic_initial",
    customHost: "",
    hostRegion: "any",
    mimicAll: false,

    useTagC: false,
    useTagT: true,
    useTagR: true,
    useTagRC: true,
    useTagRD: true,

    useBrowserFp: false,
    browserProfile: "chrome",

    mtu: 1500,
    junkLevel: 5,
    iterCount: 0,
    routerMode: false,
    useExtremeMax: false,
    clientId: DEFAULT_CLIENT_ID,
    clientRelease: null,

    useHeaderProtection: true,
    useContentPadding: true,
    useRandomTimings: true,
    useRandomTrailers: false,
    useDisableCookies: false,
  };
}

export const awgEngine = defineEngine<GeneratorInput, AWGConfig>({
  id: "awg",
  label: "AmneziaWG",
  route: "/amnezia",
  icon: Shield,

  versions: AWG_VERSIONS.map((v) => ({
    id: v.id,
    label: v.label,
    isNewest: v.isNewest,
  })),

  // `vpn://` links are handled by the MergeKeys page rather than here, so the
  // engine only claims the format it reads end to end.
  formats: ["text"],

  createDefaults,

  parse: parseAwgConf,

  generate: (input) => genCfg(input),

  render(config, labels: EngineLabels, options?: Readonly<Record<string, string>>): EngineLine[] {
    // The form's endpoint field rides in through options: the shell knows it
    // as a string flag, the renderer knows what to build from it.
    return renderConfLines(config, {
      labels: labels as Partial<RenderLabels>,
      endpoint: options?.endpoint ?? "",
    });
  },

  /**
   * Structural checks on the `.conf` text itself.
   *
   * Separate from `validate`, which judges a config that has already been
   * understood. A file with no [Interface] section never gets that far, and
   * saying so is more useful than a parse error.
   */
  audit: auditConf,

  validate(config): EngineFinding[] {
    // The generator splits validation by concern; the shell only ever wants
    // the union. `defineEngine` handles the ordering.
    //
    // These used to be adapted on the way out — the validators carried a
    // ready-made sentence and, for some rules, no code at all, so the field
    // name stood in as one. Every rule carries its own code now, and the
    // findings come through unchanged.
    return [...validateGeneratedConfig(config), ...validateAwg3(config)];
  },

  toClientPayload(config) {
    // Amnezia's apps import a VpnConfig built from the rendered text, so the
    // payload is derived from the same render everyone else sees.
    return buildVpnConfig(linesToText(renderConfLines(config)));
  },

  simulator: awgSimulator,
});
