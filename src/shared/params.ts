/**
 * Turning a catalogue of parameters into per-version sets, once.
 *
 * Both engines need the same three things from a parameter list: which
 * parameters a given version understands, what a key means on that version,
 * and which of them both ends have to agree on. AmneziaWG had all three
 * written out by hand, and XRay had none of them — its version rules lived as
 * booleans in the generator, which is how three of them ended up wrong.
 *
 * The type lives in `types/protocol`; this is the machinery around it.
 */

import type {
  ParamDescriptor,
  ParamScope,
  ParamSet,
} from "@/types/protocol";

/**
 * A catalogue with its version ordering.
 *
 * The order is data, not a sort: "1.5" is not less than "1.0" by any string
 * comparison, and XRay's CalVer sorts correctly only by accident.
 */
export interface ParamCatalogue<P extends ParamDescriptor = ParamDescriptor> {
  /** Every parameter of the protocol, in the order a config is written. */
  parameters: ParamSet<P>;
  /** Version ids, oldest first. */
  order: readonly string[];
}

/**
 * Parameters one version understands.
 *
 * A later entry for the same key replaces the earlier one rather than joining
 * it — AmneziaWG's H1 is a single value on 1.x and a range on 2.0+, and a
 * version that carried both spellings would render the header twice.
 */
export function paramSetFor<P extends ParamDescriptor>(
  catalogue: ParamCatalogue<P>,
  version: string,
): ParamSet<P> {
  const index = catalogue.order.indexOf(version);
  // An unknown version gets the whole catalogue rather than nothing: a
  // parameter list that is silently empty renders a config with no parameters
  // in it, which looks like a working config and is not.
  const upto =
    index < 0 ? catalogue.order : catalogue.order.slice(0, index + 1);

  const rank = (v: string) => catalogue.order.indexOf(v);
  const winner = new Map<string, ParamDescriptor>();

  for (const param of catalogue.parameters) {
    if (!upto.includes(param.since)) continue;
    const seen = winner.get(param.key);
    if (!seen || rank(param.since) >= rank(seen.since)) {
      winner.set(param.key, param);
    }
  }

  // Catalogue order is meaningful, so rebuild in it rather than in Map order.
  return catalogue.parameters.filter((p) => winner.get(p.key) === p);
}

/** Every version's set, built once. */
export function paramSets<P extends ParamDescriptor>(
  catalogue: ParamCatalogue<P>,
): Readonly<Record<string, ParamSet<P>>> {
  const sets: Record<string, ParamSet<P>> = {};
  for (const version of catalogue.order) {
    sets[version] = paramSetFor(catalogue, version);
  }
  return sets;
}

/** The description a version uses for a key, if it has one. */
export function paramFor<P extends ParamDescriptor>(
  catalogue: ParamCatalogue<P>,
  version: string,
  key: string,
): P | undefined {
  return paramSetFor(catalogue, version).find(
    (p) => p.key === key || p.aliases?.includes(key),
  );
}

/** Does this version understand this key at all? */
export function hasParam<P extends ParamDescriptor>(
  catalogue: ParamCatalogue<P>,
  version: string,
  key: string,
): boolean {
  return paramFor(catalogue, version, key) !== undefined;
}

/**
 * Parameters of one scope.
 *
 * `shared` is what a "why does my tunnel not come up" answer is built from, so
 * it is derived from the catalogue rather than retyped in the FAQ.
 */
export function paramsInScope<P extends ParamDescriptor>(
  catalogue: ParamCatalogue<P>,
  version: string,
  scope: ParamScope,
): ParamSet<P> {
  return paramSetFor(catalogue, version).filter((p) => p.scope === scope);
}

/**
 * Read a parameter's value off a config, following a dotted `field`.
 *
 * Dotted because a protocol nests: AmneziaWG keeps the 3.0 block under
 * `awg3.`, XRay keeps REALITY under `reality.`. Returns undefined for a path
 * that does not exist, which is how an optional parameter reports itself.
 */
export function readParam(
  config: unknown,
  field: string,
): unknown {
  let cursor: unknown = config;
  for (const step of field.split(".")) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[step];
  }
  return cursor;
}
