/**
 * The rules that decide which name goes into a packet.
 *
 * These matter more than they look. Every mimicry profile names a real host,
 * and the name is the cheapest part of the packet for anyone to check: a SIP
 * packet addressed to a host that has never spoken SIP, or a query for an MX
 * record on a name that has none, is a question nobody would ask. The tests
 * below are about the difference between a host that was asked and answered
 * `no` and one nothing has ever asked — because an earlier version treated
 * those the same and filled the SIP pool with web servers.
 */

import { describe, it, expect } from "bun:test";

import {
  ALL_ROLES,
  DOMAINS,
  domainStats,
  findDomains,
  hostsFor,
  meetsRole,
  pickHost,
  pickHostStrict,
  rolesOf,
  REGIONS,
} from "../domains";
import type { DomainQuery, DomainRecord } from "@/types/domain";

/** A record with nothing established, to be overridden field by field. */
const blank: DomainRecord = {
  host: "example.test",
  regions: ["global"],
  tls13: "unknown",
  h2: "unknown",
  h3: "unknown",
  serves: "unknown",
  cdn: "unknown",
};

const noServices = {
  sip: "no", stun: "no", dtls: "no", smtp: "no", imap: "no", pop3: "no",
  dns: "no", doh: "no", dot: "no", ntp: "no", ssh: "no",
} as const;

describe("what a role requires", () => {
  it("accepts a donor only when every part of the disguise holds", () => {
    const donor: DomainRecord = {
      ...blank,
      tls13: "yes",
      h2: "yes",
      serves: "yes",
      cdn: "none",
    };
    expect(meetsRole(donor, "donor")).toBe(true);

    // A donor behind the same CDN as the server imitating it is the classic
    // way a REALITY setup gives itself away.
    expect(meetsRole({ ...donor, cdn: "cloudflare" }, "donor")).toBe(false);

    // A site that redirects away leads the borrowed handshake somewhere the
    // client never asked to go.
    expect(meetsRole({ ...donor, serves: "no" }, "donor")).toBe(false);

    expect(meetsRole({ ...donor, tls13: "no" }, "donor")).toBe(false);
    expect(meetsRole({ ...donor, h2: "no" }, "donor")).toBe(false);
  });

  it("will not claim a protocol on a host nothing has asked about", () => {
    // The distinction the whole database exists for: `unknown` is not `no`,
    // and it is certainly not `yes`.
    expect(meetsRole(blank, "quic")).toBe(false);
    expect(meetsRole(blank, "sip")).toBe(false);
    expect(meetsRole(blank, "smtp")).toBe(false);

    // Unless the caller says outright that it would rather have a guess than
    // nothing at all.
    expect(meetsRole(blank, "quic", true)).toBe(true);
    expect(meetsRole(blank, "sip", true)).toBe(true);
  });

  it("reads each service from its own probe, not from the web one", () => {
    const web: DomainRecord = {
      ...blank,
      tls13: "yes",
      h2: "yes",
      h3: "yes",
      serves: "yes",
      cdn: "none",
      services: { ...noServices },
    };

    // A perfectly good web server that was asked about SIP and said no.
    expect(meetsRole(web, "quic")).toBe(true);
    expect(meetsRole(web, "sip")).toBe(false);
    expect(meetsRole(web, "stun")).toBe(false);
    expect(meetsRole(web, "smtp")).toBe(false);
    expect(meetsRole(web, "ntp")).toBe(false);

    const mail: DomainRecord = {
      ...web,
      services: { ...noServices, smtp: "yes", imap: "yes" },
    };
    expect(meetsRole(mail, "smtp")).toBe(true);
    expect(meetsRole(mail, "imap")).toBe(true);
    expect(meetsRole(mail, "pop3")).toBe(false);
  });
});

describe("DNS asks about a name and a type together", () => {
  const named: DomainRecord = { ...blank, dnsAnswers: ["A", "MX", "NS"] };

  it("only offers a name for a record type it actually answers", () => {
    expect(meetsRole(named, "dns", false, "A")).toBe(true);
    expect(meetsRole(named, "dns", false, "MX")).toBe(true);
    // The name has no AAAA, so a query for one is a question nobody asks.
    expect(meetsRole(named, "dns", false, "AAAA")).toBe(false);
  });

  it("treats a name with no records as unusable rather than universal", () => {
    // The old rule was `case "dns": return true` — every host in the database
    // qualified, including the ones that resolve to nothing.
    expect(meetsRole(blank, "dns")).toBe(false);
    expect(meetsRole(blank, "dns", true)).toBe(true);
  });

  it("keeps a resolver separate from a name to ask about", () => {
    const resolver: DomainRecord = {
      ...blank,
      services: { ...noServices, dns: "yes", dnsTypes: ["A", "AAAA"] },
    };

    expect(meetsRole(resolver, "resolver")).toBe(true);
    expect(meetsRole(resolver, "resolver", false, "A")).toBe(true);
    // Resolvers refuse types, and a refusal is a louder answer than silence.
    expect(meetsRole(resolver, "resolver", false, "TXT")).toBe(false);

    // Being a resolver says nothing about being a good QNAME.
    expect(meetsRole(resolver, "dns")).toBe(false);
  });
});

describe("querying the database", () => {
  it("gives every role a host qualifies for, not just the first", () => {
    const versatile: DomainRecord = {
      ...blank,
      tls13: "yes",
      h2: "yes",
      h3: "yes",
      serves: "yes",
      cdn: "none",
      dnsAnswers: ["A"],
      services: { ...noServices, ssh: "yes" },
    };

    const roles = rolesOf(versatile);
    expect(roles).toContain("donor");
    expect(roles).toContain("quic");
    expect(roles).toContain("tls");
    expect(roles).toContain("dns");
    expect(roles).toContain("ssh");
    expect(roles).not.toContain("sip");
  });

  it("filters by region, and a host may belong to several", () => {
    for (const region of REGIONS) {
      const found = findDomains({ regions: [region] });
      for (const domain of found) expect(domain.regions).toContain(region);
    }
  });

  it("narrows to a whitelist when asked, and does not otherwise", () => {
    const listed = findDomains({ whitelistedIn: "ru" });
    for (const domain of listed) expect(domain.whitelistedIn).toContain("ru");
    expect(findDomains({}).length).toBeGreaterThanOrEqual(listed.length);
  });

  it("returns nothing rather than something wrong, when asked strictly", () => {
    // A profile that would rather produce no packet than a wrong one needs an
    // answer it can distinguish from a fallback.
    expect(pickHostStrict({ role: "sip", regions: ["cn"] })).toBeTypeOf("object");
  });
});

describe("the database itself", () => {
  it("has no duplicate hostnames", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const domain of DOMAINS) {
      if (seen.has(domain.host)) duplicates.push(domain.host);
      seen.add(domain.host);
    }
    expect(duplicates).toEqual([]);
  });

  it("dates every fact it claims to have established", () => {
    // An undated fact is an assumption wearing a fact's clothes: nothing says
    // when it stopped being true.
    const established = DOMAINS.filter(
      (d) => d.tls13 !== "unknown" || d.h3 !== "unknown" || d.services,
    );
    for (const domain of established) {
      expect(domain.checked, `${domain.host} claims facts with no date`).toBeTruthy();
    }
  });

  it("records where each measurement was taken from", () => {
    // Reachability is a property of the vantage point, so a fact without one
    // cannot be read for what it is.
    for (const domain of DOMAINS) {
      if (domain.checked) {
        expect(domain.vantage, `${domain.host} is dated but placeless`).toBeTruthy();
      }
    }
  });

  it("carries a real population for every region it offers", () => {
    // A region with an empty pool is worse than one that is not offered: the
    // UI shows the choice, the generator falls through to somewhere else, and
    // nothing says so. Both Belarus and the UK spent a while at zero because
    // their records were probed but never merged, and nothing noticed.
    for (const region of REGIONS) {
      const found = findDomains({ regions: [region], allowUnknown: true });
      expect(found.length, `no hosts at all for ${region}`).toBeGreaterThan(20);
    }
  });

  it("measures each region from somewhere that region's traffic goes", () => {
    // Reachability is a property of the path. A Chinese CDN serves Chinese
    // addresses and ignores the rest, so a reading of it taken from Europe
    // describes the route rather than the host — which is why the vantage is
    // recorded and chosen rather than being whichever machine was to hand.
    const measured = DOMAINS.filter((d) => d.vantage);
    expect(measured.length).toBeGreaterThan(0);
    for (const domain of measured) {
      expect(REGIONS, `${domain.host} names a vantage that is not a region`).toContain(
        domain.vantage!,
      );
    }
  });

  it("can still name a host for every role, even where nothing qualifies", () => {
    // A generator with no host to name cannot produce a packet at all, so
    // pickHost widens rather than failing. The widening is the point of the
    // strict variant existing alongside it.
    for (const role of ALL_ROLES) {
      const host = pickHost({ role });
      expect(host, `no host at all for ${role}`).toBeTruthy();
    }
  });

  it("counts what it knows", () => {
    const stats = domainStats();
    expect(stats.total).toBe(DOMAINS.length);
    expect(stats.verified).toBeLessThanOrEqual(stats.total);
    expect(hostsFor({}).length).toBe(DOMAINS.length);
  });
});

/**
 * The cache is an optimisation, and an optimisation that changes an answer is
 * a bug wearing a stopwatch.
 */
describe("remembering answers", () => {
  it("gives the same result whether or not it has been asked before", () => {
    const queries: DomainQuery[] = [
      { role: "quic" },
      { role: "quic", regions: ["ru"] },
      { role: "quic", regions: ["ru"], allowUnknown: true },
      { role: "dns", dnsType: "MX" },
      { role: "dns", dnsType: "A" },
      { role: "donor", excludeCdn: ["cloudflare"] },
      { whitelistedIn: "ru" },
    ];

    for (const query of queries) {
      const first = findDomains(query).map((d) => d.host);
      const second = findDomains(query).map((d) => d.host);
      expect(second, JSON.stringify(query)).toEqual(first);
    }
  });

  it("keeps queries apart that differ only in one field", () => {
    // A key that collapsed two of these would serve one query's answer to the
    // other, which is the failure mode a cache brings with it.
    const a = hostsFor({ role: "dns", dnsType: "A" });
    const mx = hostsFor({ role: "dns", dnsType: "MX" });
    expect(a).not.toEqual(mx);

    const strict = hostsFor({ role: "quic", regions: ["cn"] });
    const loose = hostsFor({ role: "quic", regions: ["cn"], allowUnknown: true });
    expect(loose.length).toBeGreaterThanOrEqual(strict.length);

    const anyCdn = hostsFor({ role: "tls" });
    const noCloudflare = hostsFor({ role: "tls", excludeCdn: ["cloudflare"] });
    expect(noCloudflare.length).toBeLessThan(anyCdn.length);
  });

  it("still draws differently each time, cache or no cache", () => {
    // The pool is remembered; the pick is not. A cached draw would give every
    // packet in a run the same hostname.
    const drawn = new Set(
      Array.from({ length: 40 }, () => pickHost({ role: "tls" })),
    );
    expect(drawn.size).toBeGreaterThan(1);
  });
});
