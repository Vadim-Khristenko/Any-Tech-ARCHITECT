import { describe, it, expect } from "bun:test";

import { awgEngine } from "@/engines/awg/index";
import { PROFILE_LABELS, CLIENT_IDS, type MimicProfile } from "@/engines/awg/generator";
import { AWG_VERSIONS } from "@/engines/awg/generator/versions";
import ru from "@/i18n/locales/ru";
import en from "@/i18n/locales/en";
import { allPools, stringSubset } from "../../../scripts/lite/prepare";
import { HOSTS, POOLS } from "../generated/pools";
import { STRINGS } from "../generated/strings";
import { keyFor, pickHost, poolFor } from "../domains";
import { check, generate, liteDefaults, toInput } from "../form";
import { setLocale, translate } from "../i18n";

/**
 * The lite build answers the generator's questions from data prepared at
 * build time. These hold that data to its sources, so a domain or catalogue
 * change that was not re-prepared fails here instead of shipping stale.
 */

describe("prepared data is current", () => {
  it("every pool matches what the full database resolves", () => {
    const pools = allPools();
    expect(Object.keys(POOLS).sort()).toEqual([...pools.keys()].sort());
    for (const [key, hosts] of pools) {
      expect(poolFor(key), key).toEqual([...hosts]);
    }
  });

  it("strings match the catalogue subset in both languages", () => {
    expect(STRINGS.ru).toEqual(stringSubset(ru) as never);
    expect(STRINGS.en).toEqual(stringSubset(en) as never);
  });

  it("the host table holds only names a pool uses", () => {
    const used = new Set(Object.keys(POOLS).flatMap((k) => poolFor(k)!));
    expect(HOSTS.length).toBe(used.size);
  });
});

describe("the lite pickHost", () => {
  it("draws from the prepared pool of the query", () => {
    for (let k = 0; k < 200; k++) {
      const host = pickHost({ regions: ["ru"], role: "stun" });
      expect(poolFor("ru|stun|")).toContain(host);
    }
    expect(poolFor("any|dns|AAAA")).toContain(pickHost({ role: "dns", dnsType: "AAAA" }));
  });

  it("falls back rather than failing on a key it has not prepared", () => {
    expect(keyFor({ role: "donor" })).toBe("any|donor|");
    expect(typeof pickHost({ role: "donor" })).toBe("string");
    expect(typeof pickHost({})).toBe("string");
  });
});

describe("the lite form", () => {
  it("starts where the full site starts", () => {
    expect(liteDefaults()).toEqual(awgEngine.createDefaults());
  });

  it("generates on every version, profile and client", () => {
    for (const { id: version } of AWG_VERSIONS) {
      for (const profile of Object.keys(PROFILE_LABELS) as MimicProfile[]) {
        const result = generate({ ...liteDefaults(), version, profile, mimicAll: true });
        expect(result.text).toContain("[Interface]");
      }
    }
    for (const clientId of CLIENT_IDS) {
      const result = generate({ ...liteDefaults(), version: "3.1", clientId });
      expect(result.text).toContain("Jc = ");
    }
  });

  it("drops switches the version does not show", () => {
    const input = toInput({
      ...liteDefaults(),
      version: "2.0",
      useRandomTrailers: true,
      useDisableCookies: true,
      useNarrowH: true,
      useSameS: true,
    });
    expect(input.useRandomTrailers).toBe(false);
    expect(input.useDisableCookies).toBe(false);
    expect(input.useNarrowH).toBe(false);
    expect(input.useSameS).toBe(false);
  });

  it("checks a pasted config in the current language", () => {
    const conf =
      "[Interface]\nPrivateKey = x\nH1 = 405138553-456138212\nH2 = 680931238-1038459501\nH3 = 1114423399-1432068193\nRandomTrailers = 1\n";
    setLocale("en");
    const en = check(conf, "amneziavpn", null);
    expect(en.some((l) => l.text.includes("16.1%"))).toBe(true);
    setLocale("ru");
    const ru = check(conf, "amneziavpn", null);
    expect(ru.some((l) => l.text.includes("трафика"))).toBe(true);
  });

  it("translates with interpolation and falls back to the key", () => {
    setLocale("en");
    expect(translate("lite.build", { version: "4.4.0", date: "2026-10-05" })).toBe(
      "Version 4.4.0, built 2026-10-05",
    );
    expect(translate("no.such.key")).toBe("no.such.key");
    setLocale("ru");
  });
});
