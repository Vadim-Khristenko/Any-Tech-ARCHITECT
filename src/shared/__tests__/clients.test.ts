import { describe, it, expect } from "bun:test";

import {
  clientTable,
  releaseOptions,
  resolveClient,
  type ClientProfile,
} from "../clients";

/**
 * The model exists for one reason: a client is not one set of limits forever.
 * A release states what it does differently and inherits the rest, so a fixed
 * bug is one line and a limit added later reaches every build that never
 * overrode it.
 */

interface Limits {
  maxH: number;
  supportsTagC: boolean;
  maxJc: number;
}

const profile: ClientProfile<Limits> = {
  id: "example",
  name: "Example",
  platforms: ["Windows"],
  limits: { maxH: 4_294_967_295, supportsTagC: true, maxJc: 10 },
  notes: ["note.always"],
  releases: [
    {
      id: "<2.0.2",
      label: "before 2.0.2",
      limits: { maxH: 2_147_483_647 },
      notes: ["note.hcap"],
    },
    {
      id: "<1.0.0",
      label: "before 1.0.0",
      limits: { maxH: 65_535, supportsTagC: false },
    },
  ],
};

describe("resolveClient", () => {
  it("gives the current build when no release is chosen", () => {
    const resolved = resolveClient(profile);

    expect(resolved.releaseId).toBeNull();
    expect(resolved.limits.maxH).toBe(4_294_967_295);
    expect(resolved.limits.supportsTagC).toBe(true);
  });

  it("applies a release as a patch, not a replacement", () => {
    const resolved = resolveClient(profile, "<2.0.2");

    expect(resolved.limits.maxH).toBe(2_147_483_647);
    // The release said nothing about these, so it inherits them. Otherwise
    // every release would have to restate the whole table to stay correct.
    expect(resolved.limits.supportsTagC).toBe(true);
    expect(resolved.limits.maxJc).toBe(10);
  });

  it("carries both the profile's notes and the release's", () => {
    expect(resolveClient(profile, "<2.0.2").notes).toEqual([
      "note.always",
      "note.hcap",
    ]);
    expect(resolveClient(profile).notes).toEqual(["note.always"]);
  });

  it("falls back to the current build for a release it does not know", () => {
    // A stored preference that outlived its entry. The current limits are
    // also the least restrictive, so nothing is clamped on the strength of a
    // version we know nothing about.
    const resolved = resolveClient(profile, "<0.0.1");

    expect(resolved.releaseId).toBeNull();
    expect(resolved.limits.maxH).toBe(4_294_967_295);
  });

  it("does not share limit objects between resolutions", () => {
    const a = resolveClient(profile);
    a.limits.maxJc = 1;
    expect(resolveClient(profile).limits.maxJc).toBe(10);
  });
});

describe("releaseOptions", () => {
  it("puts the current build first, with a null id", () => {
    const options = releaseOptions(profile);

    // Null rather than the newest version string: a user who never touches
    // the picker keeps getting the newest behaviour after a release is added.
    expect(options[0]?.id).toBeNull();
    expect(options.map((o) => o.id)).toEqual([null, "<2.0.2", "<1.0.0"]);
  });

  it("returns a single entry for a client that never changed", () => {
    const simple: ClientProfile<Limits> = {
      id: "simple",
      name: "Simple",
      platforms: [],
      limits: profile.limits,
    };
    expect(releaseOptions(simple)).toHaveLength(1);
  });
});

describe("clientTable", () => {
  it("indexes by id and keeps the declared order", () => {
    const second: ClientProfile<Limits> = { ...profile, id: "second" };
    const { table, ids } = clientTable([profile, second]);

    expect(ids).toEqual(["example", "second"]);
    expect(table.second?.id).toBe("second");
  });
});
