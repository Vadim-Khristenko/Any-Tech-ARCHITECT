/**
 * The domain database, as a tool.
 *
 *   bun scripts/domains.ts probe hosts.txt --remote user@host > facts.json
 *   bun scripts/domains.ts merge facts.json --checked 2026-08-01 --vantage ru
 *   bun scripts/domains.ts roles www.bing.com dns.google
 *   bun scripts/domains.ts stats
 *
 * One tool rather than four: the previous arrangement was a bash prober, a
 * Python service prober, a bash wrapper for each, and a Node merger, which
 * meant four places to keep a hostname list format in step and four places for
 * the region rule to be forgotten. The questions themselves live in
 * `probe.ts`, which is self-contained so it can be shipped somewhere else and
 * run there.
 *
 * WHICH VANTAGE MAY SPEAK FOR WHICH REGION
 *
 * `--allow` lists the regions a vantage point may speak for, and `merge` drops
 * anything outside it. Reachability is a property of the path, so a region is
 * only honestly measured from somewhere that path resembles a client's: a
 * Russian address is the right place to ask about Russian hosts and a poor one
 * to ask about Chinese ones, which serve Chinese addresses and ignore the
 * rest. The default therefore allows everything, and the flag is there for
 * when a particular sweep should not claim to speak for somewhere it is not.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { HostFacts } from "./probe";
import { DOMAINS, domainStats, rolesOf } from "../src/shared/domains";
import type {
  DomainRecord,
  DomainRegion,
  DomainRole,
} from "../src/types/domain";

/* ── Arguments ────────────────────────────────────────────────────────────── */

const [command, ...rest] = process.argv.slice(2);

const flag = (name: string, fallback?: string): string | undefined => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 && rest[i + 1] ? rest[i + 1] : fallback;
};

const positional = rest.filter(
  (arg, i) => !arg.startsWith("--") && !rest[i - 1]?.startsWith("--"),
);

const USAGE = `usage:
  domains.ts probe <hosts.txt> [--remote user@host] [--parallel 12]
  domains.ts merge <facts.json> --checked YYYY-MM-DD [--vantage ru] [--allow global,eu,cn,uk,by]
  domains.ts add < hosts.txt                    hosts no vantage may ask about
  domains.ts whitelist <region> < hosts.txt
  domains.ts roles [host...]
  domains.ts stats`;

/* ── Where a name belongs ─────────────────────────────────────────────────── */

/** Hosts routed around the vantage point rather than reached from it. */
const ROUTED = [
  "cloudflare.com", "github.com", "githubusercontent.com",
  "discord.com", "discordapp.com", "matrix.org", "telegram.org", "t.me",
];

/**
 * Russian operators on domains that do not say so.
 *
 * A TLD is a decent first guess and wrong often enough to matter: Yandex
 * serves most of its bytes from `.net`, VK from `.me` and `.com`.
 */
const RU_OWNED = [
  "yandex.net", "yandex.ru", "yandex.com", "yandexcloud.net", "yastatic.net",
  "avito.st", "vkuseraudio.net", "vkuservideo.net", "vk-portal.net",
  "ngenix.net", "cdnvideo.ru", "selcdn.net", "selstorage.ru",
  "mycdn.me", "userapi.com", "vk-cdn.net", "vk.com", "vk.ru", "vkuser.net",
  "imgsmail.ru", "wbstatic.net", "wbbasket.ru", "ozone.ru",
  "mail.ru", "ok.ru", "dzen.ru", "sberbank.ru", "kaspersky.ru", "rambler.ru",
];

/**
 * Chinese operators on domains that do not say so.
 *
 * The same problem as the Russian list and worse: almost none of the endpoints
 * that carry China's bytes sit under `.cn`. Alibaba serves from `alicdn.com`,
 * Tencent from `myqcloud.com`, ByteDance from `pstatp.com` — all of which the
 * first import filed as `global`, where a query for Chinese hosts never saw
 * them.
 */
const CN_OWNED = [
  "alicdn.com", "aliyuncs.com", "aliyun.com", "alipay.com", "alipayobjects.com",
  "taobao.com", "tmall.com", "1688.com",
  "qq.com", "myqcloud.com", "qcloud.com", "tencent-cloud.net", "gtimg.cn",
  "qpic.cn", "qlogo.cn", "tencentcloudapi.com",
  "bdstatic.com", "bcebos.com", "baidu.com",
  "hdslb.com", "bilivideo.com", "bilivideo.cn", "bilibili.com",
  "pstatp.com", "ibyteimg.com", "douyinpic.com", "douyinvod.com", "douyin.com",
  "ixigua.com", "360buyimg.com", "jd.com", "jd.hk",
  "meituan.net", "meituan.com", "dianping.com",
  "kwaicdn.com", "sinaimg.cn", "weibo.com", "xhscdn.com", "xiaohongshu.com",
  "zhimg.com", "zhihu.com", "doubanio.com", "douban.com",
  "ykimg.com", "youku.com", "qiyipic.com", "iqiyi.com", "mgtv.com",
  "mi-img.com", "mi.com", "miui.com", "xiaomi.com",
  "126.net", "127.net", "163.com",
  "wangsu.com", "wscdns.com", "huaweicloud.com", "myhuaweicloud.com",
  "hicloud.com", "huawei.com", "vmall.com", "honor.com",
  "oppomobile.com", "coloros.com", "vivo.com.cn",
  "pinduoduo.com", "yangkeduo.com", "vip.com", "suning.com", "gome.com.cn",
  "amap.com", "autonavi.com", "ctrip.com", "qunar.com",
  "kugou.com", "kuwo.cn", "migu.cn", "ximalaya.com", "acfun.cn", "hitv.com",
  "npmmirror.com", "gitee.com", "ucloud.cn", "ufileos.com",
  "qingcloud.com", "qingstor.com", "cnki.net", "maimai.cn",
  "unionpay.com", "95516.com", "icbc.com.cn", "ccb.com", "boc.cn",
  "abchina.com", "cmbchina.com", "bankcomm.com", "pingan.com.cn",
  "cebbank.com", "cib.com.cn", "psbc.com", "spdb.com.cn",
  "chinamobile.com", "chinaunicom.com", "chinatelecom.com.cn",
  "10086.cn", "10010.com", "189.cn", "139.com",
];

/**
 * British operators, and Belarusian ones, on domains that do not say so.
 *
 * The BBC is the reason this list exists: it serves most of its bytes from
 * `bbci.co.uk` and `bbc.com`, and a `.uk` rule alone files half of British
 * traffic as global.
 */
const UK_OWNED = [
  "bbc.com", "bbci.co.uk", "bbc.co.uk", "bbcfmt.hs.llnwd.net",
  "theguardian.com", "guim.co.uk", "ft.com", "economist.com",
  "sky.com", "skyassets.com", "itv.com", "channel4.com",
  "asos.com", "asos-media.com", "boots.com", "argos.co.uk",
  "monzo.com", "starlingbank.com", "revolut.com", "wise.com",
  "arm.com", "sage.com", "ocado.com", "deliveroo.co.uk", "just-eat.co.uk",
  "rightmove.co.uk", "zoopla.co.uk", "autotrader.co.uk",
  "britishairways.com", "easyjet.com", "heathrow.com",
];

const BY_OWNED = [
  "onliner.by", "kufar.by", "21vek.by", "oz.by", "deal.by",
  "belarusbank.by", "priorbank.by", "belinvestbank.by", "raschet.by",
  "a1.by", "mts.by", "life.com.by", "beltelecom.by", "hoster.by",
  "belavia.by", "rw.by", "belta.by", "sb.by", "tvr.by",
  "wildberries.by", "evroopt.by", "edostavka.by",
];

const EU_TLDS = [
  ".de", ".fr", ".it", ".nl", ".pl", ".es", ".eu",
  ".se", ".no", ".fi", ".dk", ".cz", ".at", ".ch", ".be", ".pt", ".ie",
];

const under = (host: string, list: readonly string[]) =>
  list.some((d) => host === d || host.endsWith(`.${d}`));

function regionOf(host: string): DomainRegion {
  if (under(host, RU_OWNED)) return "ru";
  if (/\.(ru|su|xn--p1ai)$/.test(host)) return "ru";
  if (under(host, BY_OWNED)) return "by";
  if (/\.by$/.test(host) || /\.xn--90ais$/.test(host)) return "by";
  if (under(host, CN_OWNED)) return "cn";
  if (/\.cn$/.test(host) || /\.com\.cn$/.test(host)) return "cn";
  if (under(host, UK_OWNED)) return "uk";
  if (/\.uk$/.test(host)) return "uk";
  if (EU_TLDS.some((t) => host.endsWith(t))) return "eu";
  return "global";
}

/* ── probe ────────────────────────────────────────────────────────────────── */

/**
 * Run the prober, here or somewhere else.
 *
 * Shipping it is deliberately dull: three commands, none containing a pipe, a
 * redirect or a semicolon. The obvious one-liner —
 * `T=$(mktemp); echo … | base64 -d > $T; bun $T` — works from a POSIX shell
 * and silently does not from Windows, where the argument is re-quoted on the
 * way to ssh, the pipeline falls apart, and the far end helpfully prints the
 * base64 back instead of running it. Metacharacter-free commands cannot break
 * that way.
 *
 * The script cannot travel on stdin either: the host list needs it.
 */
async function probe(listPath: string, remote?: string): Promise<void> {
  const list = readFileSync(listPath);
  const parallel = flag("parallel", "12")!;
  const local = join(import.meta.dir, "probe.ts");

  // `stdout: "inherit"` rather than collecting the text: a sweep of a
  // thousand hosts runs for an hour, and gathering its output into a string
  // to print at the end means an hour of looking at an empty file and losing
  // the lot if anything goes wrong on the way. The prober already writes one
  // finished record per line for exactly this reason; holding them here undid
  // that.
  if (!remote) {
    const proc = Bun.spawn(["bun", local], {
      stdin: list,
      stdout: "inherit",
      stderr: "inherit",
      env: { ...process.env, PROBE_PARALLEL: parallel },
    });
    await proc.exited;
    return;
  }

  const ssh = (args: string[]) => [
    "ssh", "-o", "BatchMode=yes",
    ...(process.env.PROBE_SSH_OPTS ?? "").split(" ").filter(Boolean),
    remote,
    ...args,
  ];

  const path = `/tmp/probe-${crypto.randomUUID().slice(0, 8)}.ts`;

  // `tee` writes the file without the shell needing a redirect. Its echo of
  // the content back down the pipe is discarded here.
  const send = Bun.spawn(ssh(["tee", path]), {
    stdin: readFileSync(local),
    stdout: "ignore",
    stderr: "inherit",
  });
  if ((await send.exited) !== 0) throw new Error(`could not ship the prober to ${remote}`);

  try {
    const run = Bun.spawn(ssh(["env", `PROBE_PARALLEL=${parallel}`, "bun", path]), {
      stdin: list,
      stdout: "inherit",
      stderr: "inherit",
    });
    const code = await run.exited;
    if (code !== 0) throw new Error(`probe on ${remote} exited ${code}`);
  } finally {
    Bun.spawn(ssh(["rm", "-f", path]), { stdout: "ignore", stderr: "ignore" });
  }
}

/* ── merge ────────────────────────────────────────────────────────────────── */

const TARGET = join("src", "shared", "domains.ts");
const MARKER = "export const DOMAINS: readonly DomainRecord[] = [";

/**
 * Read the array back out of the source file.
 *
 * The records are written by this tool in one fixed shape, so turning a line
 * into an object is a matter of quoting the keys. A line that will not parse
 * is one this tool did not write, and stopping is better than dropping it.
 */
function readExisting(source: string): Map<string, DomainRecord> {
  const start = source.indexOf(MARKER);
  const end = source.indexOf("];", start);
  if (start < 0 || end < 0) throw new Error("DOMAINS array not found");

  const records = new Map<string, DomainRecord>();
  for (const line of source.slice(start, end).split(/\r?\n/)) {
    const text = line
      .trim()
      .replace(/,$/, "")
      .replace(/^d\(/, "")
      .replace(/\)$/, "");
    if (!text.startsWith("{")) continue;

    const json = text.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
    let record: DomainRecord;
    try {
      record = JSON.parse(json) as DomainRecord;
    } catch {
      throw new Error(`cannot parse an existing record, refusing to drop it:\n  ${text}`);
    }
    records.set(record.host, record);
  }
  return records;
}

function render(records: readonly DomainRecord[], rn: string): string {
  return records
    .map((r) => {
      const parts = [
        `host: ${JSON.stringify(r.host)}`,
        `regions: [${r.regions.map((x) => JSON.stringify(x)).join(", ")}]`,
        `tls13: ${JSON.stringify(r.tls13)}`,
        `h2: ${JSON.stringify(r.h2)}`,
        `h3: ${JSON.stringify(r.h3)}`,
        `serves: ${JSON.stringify(r.serves)}`,
        `cdn: ${JSON.stringify(r.cdn)}`,
      ];
      if (r.dnsAnswers?.length) {
        parts.push(`dnsAnswers: [${r.dnsAnswers.map((t) => JSON.stringify(t)).join(", ")}]`);
      }
      if (r.services) {
        const s = r.services;
        const fields = (["sip", "stun", "dtls", "smtp", "imap", "pop3", "dns", "doh", "dot", "ntp", "ssh"] as const)
          .map((k) => `${k}: ${JSON.stringify(s[k])}`);
        if (s.dnsTypes?.length) {
          fields.push(`dnsTypes: [${s.dnsTypes.map((t) => JSON.stringify(t)).join(", ")}]`);
        }
        parts.push(`services: { ${fields.join(", ")} }`);
      }
      if (r.whitelistedIn?.length) {
        parts.push(`whitelistedIn: [${r.whitelistedIn.map((x) => JSON.stringify(x)).join(", ")}]`);
      }
      if (r.checked) parts.push(`checked: ${JSON.stringify(r.checked)}`);
      if (r.vantage) parts.push(`vantage: ${JSON.stringify(r.vantage)}`);
      if (r.routed) parts.push("routed: true");
      if (r.note) parts.push(`note: ${JSON.stringify(r.note)}`);
      // `d(...)` names the type at each element; see its definition for why
      // an unadorned array of this size will not compile.
      return `  d({ ${parts.join(", ")} }),`;
    })
    .join(rn);
}

function merge(factsPath: string): void {
  const checked = flag("checked");
  if (!checked) throw new Error("merge needs --checked YYYY-MM-DD");

  const vantage = (flag("vantage", "ru") as DomainRegion)!;
  const allow = (flag("allow", "global,eu,cn,uk,by,ru") ?? "")
    .split(",")
    .map((s) => s.trim()) as DomainRegion[];

  // One JSON object per line, so a probe run that dies partway still hands
  // over everything it managed to establish.
  const facts = readFileSync(factsPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as HostFacts);
  const source = readFileSync(TARGET, "utf8");
  const rn = source.includes("\r\n") ? "\r\n" : "\n";
  const existing = readExisting(source);

  let added = 0;
  let updated = 0;
  const refused: string[] = [];

  for (const fact of facts) {
    const region = regionOf(fact.host);
    if (!allow.includes(region)) {
      // This vantage point does not get to speak for this region.
      refused.push(`${fact.host} (${region})`);
      continue;
    }

    const prior = existing.get(fact.host);
    prior ? updated++ : added++;

    existing.set(fact.host, {
      ...prior,
      host: fact.host,
      regions: prior?.regions ?? [region],
      tls13: fact.tls13,
      h2: fact.h2,
      h3: fact.h3,
      serves: fact.serves,
      cdn: fact.cdn,
      ...(fact.dnsAnswers.length ? { dnsAnswers: fact.dnsAnswers } : {}),
      services: fact.services,
      checked,
      vantage,
      ...(under(fact.host, ROUTED) ? { routed: true } : {}),
    } as DomainRecord);
  }

  const records = [...existing.values()].sort((a, b) => a.host.localeCompare(b.host));

  /*
   * Re-classify every record, not just the ones this run probed.
   *
   * `regionOf` learns: the Chinese operator list did not exist when the first
   * import ran, so `alicdn.com` went in as `global` and stayed there, invisible
   * to a query for Chinese hosts. Running the current classifier over the whole
   * array is what makes new knowledge retroactive. Regions are unioned rather
   * than replaced, because they are plural on purpose — Alibaba's CDN is
   * genuinely a name contacted both inside China and outside it.
   */
  let reclassified = 0;
  let quarantined = 0;
  for (const record of records) {
    const derived = regionOf(record.host);
    if (!record.regions.includes(derived)) {
      (record as { regions: DomainRegion[] }).regions = [...record.regions, derived].sort();
      reclassified++;
    }

    // A record this vantage may not speak for must not keep facts this vantage
    // measured. Re-classification can move a host into such a region after the
    // fact — a host filed as global turning out to be Chinese, say — and a
    // reading taken from the wrong side of that does not become right because
    // nobody had noticed yet.
    if (!record.regions.some((r) => allow.includes(r)) && record.vantage === vantage) {
      Object.assign(record, {
        tls13: "unknown", h2: "unknown", h3: "unknown",
        serves: "unknown", cdn: "unknown",
      });
      delete (record as Partial<DomainRecord>).services;
      delete (record as Partial<DomainRecord>).dnsAnswers;
      delete (record as Partial<DomainRecord>).checked;
      delete (record as Partial<DomainRecord>).vantage;
      quarantined++;
    }
  }

  const start = source.indexOf(MARKER);
  const end = source.indexOf("];", start);
  writeFileSync(
    TARGET,
    source.slice(0, start) + MARKER + rn + render(records, rn) + rn + source.slice(end),
  );

  const byRegion: Record<string, number> = {};
  for (const r of records) for (const region of r.regions) byRegion[region] = (byRegion[region] ?? 0) + 1;

  console.log(`${records.length} domains → ${TARGET}`);
  console.log(`  added ${added}, updated ${updated}, re-classified ${reclassified}`);
  if (quarantined) console.log(`  quarantined ${quarantined} (region outside [${allow.join(", ")}])`);
  console.log(`  by region: ${JSON.stringify(byRegion)}`);
  if (refused.length) {
    console.log(`  refused ${refused.length} row(s) a ${vantage} vantage may not speak for:`);
    for (const r of refused.slice(0, 8)) console.log(`    ${r}`);
    if (refused.length > 8) console.log(`    … and ${refused.length - 8} more`);
  }
}

/* ── adding without measuring ─────────────────────────────────────────────── */

/**
 * Put hostnames in the database with nothing established about them.
 *
 *   bun scripts/domains.ts add < hosts.txt
 *
 * For hosts no available vantage point may ask about. Russia's are the case
 * here: the only machine that can reach them is one they must not be probed
 * from, so they go in with every fact `unknown` and no date. That is not a
 * gap being papered over — it is the gap, written down. They surface only for
 * callers that opt into unverified hosts, and they stop being unverified the
 * moment somewhere legitimate can ask.
 */
function add(hosts: readonly string[]): void {
  const source = readFileSync(TARGET, "utf8");
  const rn = source.includes("\r\n") ? "\r\n" : "\n";
  const existing = readExisting(source);

  let added = 0;
  for (const host of hosts) {
    if (existing.has(host)) continue;
    existing.set(host, {
      host,
      regions: [regionOf(host)],
      tls13: "unknown",
      h2: "unknown",
      h3: "unknown",
      serves: "unknown",
      cdn: "unknown",
    });
    added++;
  }

  const records = [...existing.values()].sort((a, b) => a.host.localeCompare(b.host));
  const start = source.indexOf(MARKER);
  const end = source.indexOf("];", start);
  writeFileSync(
    TARGET,
    source.slice(0, start) + MARKER + rn + render(records, rn) + rn + source.slice(end),
  );

  const byRegion: Record<string, number> = {};
  for (const r of records) for (const region of r.regions) byRegion[region] = (byRegion[region] ?? 0) + 1;

  console.log(`added ${added} host(s) with nothing established; ${records.length} total`);
  console.log(`  by region: ${JSON.stringify(byRegion)}`);
}

/* ── whitelists ───────────────────────────────────────────────────────────── */

/**
 * Mark hosts as reachable-whatever-happens in a region.
 *
 *   bun scripts/domains.ts whitelist ru < socially-significant.txt
 *
 * Kept separate from probing because it is not a measurable property: no
 * packet establishes whether a regulator has exempted a host. It comes from a
 * published list, so it is entered from one, and the list is the citation.
 */
function whitelist(region: DomainRegion, hosts: readonly string[]): void {
  const source = readFileSync(TARGET, "utf8");
  const rn = source.includes("\r\n") ? "\r\n" : "\n";
  const existing = readExisting(source);

  let marked = 0;
  const absent: string[] = [];

  for (const host of hosts) {
    const record = existing.get(host);
    if (!record) {
      absent.push(host);
      continue;
    }
    const already = record.whitelistedIn ?? [];
    if (already.includes(region)) continue;
    (record as { whitelistedIn: DomainRegion[] }).whitelistedIn = [...already, region].sort();
    marked++;
  }

  const records = [...existing.values()].sort((a, b) => a.host.localeCompare(b.host));
  const start = source.indexOf(MARKER);
  const end = source.indexOf("];", start);
  writeFileSync(
    TARGET,
    source.slice(0, start) + MARKER + rn + render(records, rn) + rn + source.slice(end),
  );

  console.log(`marked ${marked} host(s) as whitelisted in ${region}`);
  if (absent.length) {
    console.log(`  ${absent.length} not in the database yet — probe them first:`);
    for (const host of absent.slice(0, 8)) console.log(`    ${host}`);
    if (absent.length > 8) console.log(`    … and ${absent.length - 8} more`);
  }
}

/* ── roles and stats ──────────────────────────────────────────────────────── */

function roles(hosts: readonly string[]): void {
  const wanted = hosts.length
    ? DOMAINS.filter((d) => hosts.includes(d.host))
    : DOMAINS;

  const missing = hosts.filter((h) => !DOMAINS.some((d) => d.host === h));
  for (const host of missing) console.log(`${host.padEnd(32)} not in the database`);

  for (const domain of wanted) {
    const fit = rolesOf(domain);
    console.log(
      `${domain.host.padEnd(32)} ${domain.regions.join("/").padEnd(12)} ` +
        `${fit.length ? fit.join(", ") : "nothing established"}`,
    );
  }
}

function stats(): void {
  const s = domainStats();
  console.log(`${s.total} domains, ${s.verified} with facts established`);
  console.log(`  by region: ${JSON.stringify(s.byRegion)}`);
  console.log("  by role:");

  const width = Math.max(...Object.keys(s.byRole).map((r) => r.length));
  for (const [role, count] of Object.entries(s.byRole)) {
    console.log(`    ${role.padEnd(width)}  ${count}`);
  }

  const empty = (Object.entries(s.byRole) as [DomainRole, number][])
    .filter(([, count]) => count === 0)
    .map(([role]) => role);
  if (empty.length) {
    console.log(
      `\n  nothing qualifies for: ${empty.join(", ")}` +
        `\n  — those profiles will fall back to a host that does not speak the protocol.`,
    );
  }
}

/* ── Entry point ──────────────────────────────────────────────────────────── */

switch (command) {
  case "probe": {
    const list = positional[0];
    if (!list) throw new Error(USAGE);
    await probe(list, flag("remote"));
    break;
  }
  case "merge": {
    const facts = positional[0];
    if (!facts) throw new Error(USAGE);
    merge(facts);
    break;
  }
  case "add": {
    const hosts = (await Bun.stdin.text())
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    add(hosts);
    break;
  }
  case "whitelist": {
    const region = positional[0] as DomainRegion | undefined;
    if (!region) throw new Error(USAGE);
    const hosts = (await Bun.stdin.text())
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    whitelist(region, hosts);
    break;
  }
  case "roles":
    roles(positional);
    break;
  case "stats":
    stats();
    break;
  default:
    console.log(USAGE);
    process.exit(command ? 2 : 0);
}
