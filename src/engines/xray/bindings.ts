/**
 * Which catalogue parameters the interface can actually edit, and where.
 *
 * The catalogue describes a parameter as the core spells it and points `field`
 * at the *config* object. What a form has to write to is the *input* object,
 * and the two are not the same shape: the input is what a person fills in and
 * the config is what the generator makes of it.
 *
 * So this is the missing half — key to a path on `XrayInput` — and it is a
 * table rather than a convention because two of them genuinely disagree:
 * `tcpcongestion` is stored as `tcpCongestion`, and `interface` cannot be a
 * field name in a TypeScript interface so it is `bindInterface`. A rule that
 * lowercases or camelises would get both wrong, silently, and write into a
 * property nobody reads.
 *
 * A parameter with no entry here is not editable yet. That is the honest state
 * of it, and the interface says so rather than rendering a control that
 * changes nothing — which is the failure mode this table exists to prevent.
 */

/** Groups whose parameters this table covers completely. */
export const EDITABLE_GROUPS = ["sockopt"] as const;

/**
 * Catalogue key → dotted path on `XrayInput`.
 *
 * Only the pairs that differ are written out; everything else in a covered
 * group maps to `<group root>.<key>`, which is checked by a test rather than
 * assumed.
 */
const RENAMED: Record<string, string> = {
  tcpcongestion: "tcpCongestion",
  interface: "bindInterface",
};

/** Where a group whose parameters all live under one object are kept. */
const GROUP_ROOT: Record<string, string> = {
  sockopt: "sockopt",
};

/**
 * Single parameters, for groups the input does not gather under one object.
 *
 * REALITY is mostly generated — keys, shortIds, the target — and four of its
 * parameters are deliberately left to the user, because a value invented for
 * either of them makes a worse tool. `maxTimeDiff` cuts off clients whose
 * clocks have drifted, and the two fallback limits throttle traffic that
 * failed authentication; guessing at those is guessing about someone else's
 * deployment.
 *
 * They live at the top of the input rather than under a `reality` object, so
 * they are named here one at a time instead of by a prefix that does not
 * exist.
 */
const EXPLICIT: Record<string, Record<string, string>> = {
  /*
   * The last two XHTTP parameters the generator does not choose.
   *
   * Where the uplink data is hidden and the key it is hidden under: both are
   * decisions about a specific deployment, and the rest of the group is picked
   * for you, so these two are named here rather than the whole group being
   * rooted.
   */
  xhttp: {
    uplinkDataPlacement: "xhttp.uplinkDataPlacement",
    uplinkDataKey: "xhttp.uplinkDataKey",
  },

  /*
   * PROXY protocol in front of the inbound. Off unless something upstream
   * really speaks it — turning it on otherwise breaks the inbound outright,
   * which is why it was never generated.
   */
  transport: {
    acceptProxyProtocol: "transportSettings.acceptProxyProtocol",
  },

  reality: {
    maxClientVer: "maxClientVer",
    maxTimeDiff: "maxTimeDiff",
    limitFallbackUpload: "limitFallbackUpload",
    limitFallbackDownload: "limitFallbackDownload",
  },
};

/**
 * The path to write, or null when the parameter is not wired.
 *
 * Null is a real answer and the reason this returns one: an interface that
 * guesses a path renders a control that appears to work and changes nothing,
 * which is worse than a control that is honestly absent.
 */
export function inputPathFor(group: string, key: string): string | null {
  const named = EXPLICIT[group]?.[key];
  if (named) return named;

  const root = GROUP_ROOT[group];
  if (!root) return null;
  return `${root}.${RENAMED[key] ?? key}`;
}

/** Every explicitly bound parameter, for the test that checks they resolve. */
export const EXPLICIT_BINDINGS: readonly { group: string; key: string }[] =
  Object.entries(EXPLICIT).flatMap(([group, keys]) =>
    Object.keys(keys).map((key) => ({ group, key })),
  );

/** Read a dotted path off an object. */
export function readPath(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[part]
          : undefined,
      obj,
    );
}

/** Write a dotted path on an object, leaving missing parents alone. */
export function writePath(obj: unknown, path: string, value: unknown): boolean {
  const parts = path.split(".");
  const last = parts.pop();
  if (!last) return false;

  let target: unknown = obj;
  for (const part of parts) {
    if (!target || typeof target !== "object") return false;
    target = (target as Record<string, unknown>)[part];
  }
  if (!target || typeof target !== "object") return false;

  (target as Record<string, unknown>)[last] = value;
  return true;
}
