/**
 * What the lite page does, without the page.
 *
 * Kept apart from the DOM code so it can be tested on its own, and so the one
 * thing that must not drift from the full site, the input the generator is
 * given, is visible in one place.
 */

import {
  genCfg,
  renderConf,
  validateGeneratedConfig,
  clientCaps,
  notesForVersion,
  DEFAULT_CLIENT_ID,
  type AWGConfig,
  type GeneratorInput,
  type RenderLabels,
} from "@/engines/awg/generator";
import { capsFor } from "@/engines/awg/generator/versions";
import { healthCheckConf } from "@/engines/awg/healthCheck";
import { resolveFinding, sortFindings, type Finding } from "@/shared/findings";
import { translate } from "./i18n";

/**
 * The full site's starting point (`awgEngine.createDefaults`), written out
 * because the engine module also pulls in icons and the simulator. A test
 * holds the two equal.
 */
export function liteDefaults(): GeneratorInput {
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
    useNarrowH: false,
    useSameS: false,
  };
}

/** Which switches mean anything on a version. Hidden ones must not act. */
export function switchesFor(version: GeneratorInput["version"]) {
  const caps = capsFor(version);
  return {
    cps: caps.cps,
    awg3: caps.headerProtection,
    awg31: caps.featureFlags,
  };
}

/**
 * The input handed to the generator: the form, minus whatever a hidden switch
 * still holds. Same rule as the full page's `buildInput`: identical S only on
 * 3.1 together with protection and trailers.
 */
export function toInput(form: GeneratorInput): GeneratorInput {
  const on = switchesFor(form.version);
  return {
    ...form,
    useRandomTrailers: on.awg31 && form.useRandomTrailers,
    useDisableCookies: on.awg31 && form.useDisableCookies,
    useNarrowH: on.awg31 && !!form.useNarrowH,
    useSameS:
      !!form.useSameS &&
      form.version === "3.1" &&
      form.useHeaderProtection &&
      form.useRandomTrailers,
  };
}

/** The `.conf` comments, in the current language. */
export function confLabels(): Partial<RenderLabels> {
  const keys = [
    "privateKey", "address", "cpsClientOnly", "noCps", "noCpsClient",
    "awg3Hpk", "awg3HpkManaged", "awg3Cpa", "awg3Timers", "blockHeaders",
    "blockSizes", "blockJunk", "blockCps", "peerKey", "endpoint", "mustMatch",
  ] as const;
  return Object.fromEntries(keys.map((k) => [k, translate(`conf.${k}`)]));
}

export interface LiteResult {
  config: AWGConfig;
  text: string;
  findings: string[];
  notes: string[];
}

/** One config, rendered, with what the validators and the client say about it. */
export function generate(form: GeneratorInput): LiteResult {
  const input = toInput(form);
  const config = genCfg(input);
  const client = clientCaps(input.clientId, input.clientRelease);
  const text = renderConf(config, {
    labels: confLabels(),
    hpkManagedNote: client.limits.managesHeaderProtection && input.useHeaderProtection,
  });
  const findings = describe(
    validateGeneratedConfig(config, input.clientId, input.clientRelease),
  );
  const notes = notesForVersion(client.notes, input.version).map((key) =>
    translate(key),
  );
  return { config, text, findings, notes };
}

export interface CheckLine {
  level: Finding["level"];
  text: string;
}

/** A pasted `.conf`, checked against a client, worst first. */
export function check(text: string, clientId: string, release: string | null): CheckLine[] {
  return sortFindings(healthCheckConf(text, clientId, release)).map((f) => ({
    level: f.level,
    text: resolveFinding(f),
  }));
}

function describe(findings: readonly Finding[]): string[] {
  return sortFindings(findings).map(
    (f) => `${f.level === "error" ? "✖" : f.level === "warn" ? "!" : "i"} ${resolveFinding(f)}`,
  );
}
