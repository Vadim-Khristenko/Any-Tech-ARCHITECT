/**
 * What the thing on the other end can actually accept.
 *
 * A config is only correct relative to what will read it. AmneziaWG has
 * clients that cap a field the protocol does not; XRay has cores that reject a
 * mode a later one added. Both are the same question — "which build is this
 * for?" — so the shape lives here and each protocol supplies its own limits.
 *
 * The part that needed generalising is the second axis. A client is not one
 * set of limits forever: AmneziaWG for Windows refused H values above 2^31-1
 * until v2.0.2 and accepts the full range after it. One entry per client could
 * only describe one of those, so it described the broken one for everybody.
 */

/**
 * A build of a client whose behaviour differs from the profile's baseline.
 *
 * `limits` is a patch, not a replacement: a release states what it does
 * differently and inherits the rest. That way a fixed bug is one line, and a
 * limit added to the baseline reaches every release that never overrode it.
 */
export interface ClientRelease<Limits> {
  /** Version the behaviour belongs to, as the vendor writes it. */
  id: string;
  /**
   * Catalogue key for the picker's label.
   *
   * A key rather than the text, because "up to 2.0.2" is a sentence even
   * though "2.0.2" is not — the version goes in as a parameter and the
   * wording around it is translated like anything else.
   */
  label: string;
  /** Values the label interpolates, e.g. the version it is bounded by. */
  labelParams?: Readonly<Record<string, string | number>>;
  limits: Partial<Limits>;
  /** What is wrong with this build, in the user's terms. */
  notes?: readonly string[];
}

/**
 * A client, with its current behaviour and the older builds that differ.
 *
 * `limits` describes the newest build. Older ones are corrections downward,
 * so adding a release never silently changes what current users get.
 */
export interface ClientProfile<Limits> {
  id: string;
  name: string;
  platforms: readonly string[];
  limits: Limits;
  /** Problems that are not version-specific. */
  notes?: readonly string[];
  /** Older builds, newest first. Absent when the client never changed. */
  releases?: readonly ClientRelease<Limits>[];
}

/** A profile and a chosen release, flattened into one set of limits. */
export interface ResolvedClient<Limits> {
  id: string;
  name: string;
  platforms: readonly string[];
  /** The release that was applied, or null for the current build. */
  releaseId: string | null;
  releaseLabel: string;
  limits: Limits;
  notes: readonly string[];
}

/** Label used when no older release is selected. */
const CURRENT_LABEL = "current";

/**
 * Flatten a profile against one of its releases.
 *
 * An unknown release id resolves to the current build rather than throwing:
 * it means a stored preference outlived the entry it named, and the newest
 * behaviour is the better guess. It is also the safer one — the limits it
 * carries are the least restrictive, so nothing is silently clamped on the
 * strength of a version we no longer know anything about.
 */
export function resolveClient<Limits>(
  profile: ClientProfile<Limits>,
  releaseId?: string | null,
): ResolvedClient<Limits> {
  const release = releaseId
    ? profile.releases?.find((r) => r.id === releaseId)
    : undefined;

  return {
    id: profile.id,
    name: profile.name,
    platforms: profile.platforms,
    releaseId: release?.id ?? null,
    releaseLabel: release?.label ?? CURRENT_LABEL,
    limits: { ...profile.limits, ...(release?.limits ?? {}) },
    notes: [...(profile.notes ?? []), ...(release?.notes ?? [])],
  };
}

/** Index profiles by id, keeping the declared order as the picker order. */
export function clientTable<Limits>(profiles: readonly ClientProfile<Limits>[]): {
  table: Readonly<Record<string, ClientProfile<Limits>>>;
  ids: readonly string[];
} {
  const table: Record<string, ClientProfile<Limits>> = {};
  for (const profile of profiles) table[profile.id] = profile;
  return { table, ids: profiles.map((p) => p.id) };
}

/**
 * Every release a client offers, current build first.
 *
 * For a picker: the first entry has a null id, meaning "whatever is current",
 * so a user who never touches it keeps getting the newest behaviour even
 * after a release is added.
 */
export function releaseOptions<Limits>(
  profile: ClientProfile<Limits>,
): readonly {
  id: string | null;
  label: string;
  labelParams?: Readonly<Record<string, string | number>>;
}[] {
  return [
    { id: null, label: CURRENT_LABEL },
    ...(profile.releases ?? []).map((r) => ({
      id: r.id,
      label: r.label,
      ...(r.labelParams ? { labelParams: r.labelParams } : {}),
    })),
  ];
}
