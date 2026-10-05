/**
 * Ask a real Xray core whether it would load what the generator produced.
 *
 *   bun scripts/configs.ts check          # every version's configs on its own core
 *   bun scripts/configs.ts probe          # which knobs each core actually has
 *   bun scripts/configs.ts emit <dir>     # just write the fixtures out
 *
 * One tool rather than three files in two languages: the fixtures, the core
 * runner and the capability prober were a TypeScript emitter, a bash Docker
 * loop and a Node config writer, and the version list had to be kept in step
 * across all of them by hand.
 *
 * WHY EACH VERSION RUNS AGAINST ITS OWN CORE
 *
 * A core ignores JSON keys it does not know. Run everything against one recent
 * core and a config naming a feature that core has passes, whether or not the
 * core it was generated *for* has it. Three real bugs hid behind exactly that:
 * VLESS Encryption offered on a release with none, a required ML-DSA-65 seed
 * treated as optional, and an XHTTP mode that did not exist yet.
 *
 * WHY `probe` ASKS BACKWARDS
 *
 * The same silence makes "does this core have this knob?" unanswerable
 * directly — the config loads either way. So each knob is set to a value the
 * core would *refuse* if it knew the knob. Rejected means supported; accepted
 * means silently ignored. That is how `sessionPlacement` turned out to be read
 * by no released core at all, after the generator had been writing it for two.
 */

import { mkdirSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createDefaults, generateXray } from "../src/engines/xray/generate";
import { buildServerInbound, buildClientUris } from "../src/engines/xray/render";
import { XRAY_VERSIONS } from "../src/engines/xray/versions";
import type {
  XrayInput,
  XrayTransport,
  XraySecurity,
  XrayFlow,
} from "../src/engines/xray/types";

const [command, ...rest] = process.argv.slice(2);

const USAGE = `usage:
  configs.ts check [--keep]     run every version's configs against its own core
  configs.ts probe              find which knobs each core actually reads
  configs.ts emit <dir>         write the fixtures and stop`;

/* ── The matrix ───────────────────────────────────────────────────────────── */

const TRANSPORTS: XrayTransport[] = [
  "raw", "xhttp", "grpc", "ws", "httpupgrade",
  // Hysteria is QUIC-based and arrived in v26.1.13; the generator drops it on
  // a core that predates it, and the check is that the core agrees.
  "hysteria",
];
const SECURITIES: XraySecurity[] = ["reality", "tls", "none"];
const FLOWS: XrayFlow[] = ["", "xtls-rprx-vision"];

/**
 * FinalMask kinds, including none.
 *
 * Every one is offered to every version: the generator drops the block on a
 * core that predates it, and the check is that the core agrees.
 */
const MASKS = ["none", "noise", "fragment", "sudoku", "salamander", "mkcp-legacy"] as const;

interface Fixture {
  name: string;
  version: string;
  config: unknown;
  requested: Record<string, unknown>;
  produced: Record<string, unknown>;
  uris: unknown;
}

function fixtures(): Fixture[] {
  const out: Fixture[] = [];

  for (const version of XRAY_VERSIONS) {
    for (const transport of TRANSPORTS) {
      for (const security of SECURITIES) {
        for (const flow of FLOWS) {
          for (const useVlessEncryption of [false, true]) {
            for (const useMldsa65 of [false, true]) {
              // One mask per point of the matrix rather than a sixth nesting
              // level: 720 configs already take six image pulls to check, and
              // rotating covers every kind against every version anyway.
              const mask = MASKS[out.length % MASKS.length]!;
              const defaults = createDefaults();
              const input: XrayInput = {
                ...defaults,
                version: version.id,
                // Documentation range, so nothing here resolves to a real host.
                address: "203.0.113.10",
                transport,
                security,
                flow,
                useVlessEncryption,
                useMldsa65,
                finalMask: { ...defaults.finalMask, kind: mask },
                clientCount: 2,
              };

              const cfg = generateXray(input);
              out.push({
                name: [
                  version.id, transport, security,
                  flow ? "vision" : "noflow",
                  useVlessEncryption ? "enc" : "noenc",
                  useMldsa65 ? "mldsa" : "nomldsa",
                ].join("_"),
                version: version.id,
                config: {
                  log: { loglevel: "warning" },
                  inbounds: [buildServerInbound(cfg)],
                  outbounds: [{ protocol: "freedom", tag: "direct" }],
                },
                requested: {
                  transport, security, flow,
                  encryption: useVlessEncryption,
                  mldsa65: useMldsa65,
                },
                produced: {
                  transport: cfg.transport,
                  security: cfg.security,
                  flow: cfg.clients[0]?.flow ?? "",
                  encryption: cfg.vlessEncryption?.decryption ?? "none",
                  mldsa65: Boolean(cfg.reality?.mldsa65?.seed),
                  xhttpMode: cfg.xhttp?.resolvedMode ?? "",
                  finalMask: cfg.finalMask?.kind ?? "none",
                },
                uris: buildClientUris(cfg),
              });
            }
          }
        }
      }
    }
  }

  return out;
}

function emit(dir: string, files: readonly Fixture[]): void {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  for (const fixture of files) {
    writeFileSync(
      join(dir, `${fixture.name}.json`),
      JSON.stringify(fixture.config, null, 2),
    );
  }

  writeFileSync(
    join(dir, "_index.json"),
    JSON.stringify(
      files.map(({ name, requested, produced, uris }) => ({ name, requested, produced, uris })),
      null,
      2,
    ),
  );
}

/* ── Running a core ───────────────────────────────────────────────────────── */

async function sh(args: string[], quiet = true): Promise<{ code: number; out: string }> {
  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: quiet ? "pipe" : "inherit",
  });
  const out = await new Response(proc.stdout).text();
  return { code: await proc.exited, out };
}

/**
 * Docker Desktop on Windows takes Windows paths.
 *
 * A bind mount with a path Docker cannot resolve comes up silently *empty*
 * rather than failing, so the loop inside finds no configs and reports a clean
 * pass over nothing at all. Everywhere but Windows this is the identity.
 *
 * It used to run `cygpath` unconditionally and fall back on a non-zero exit
 * code — which reads as safe and is not, because a missing executable makes
 * `Bun.spawn` throw rather than exit non-zero. There is no cygpath on a Linux
 * runner, so this threw on the first call and the whole core check never ran
 * in CI at all.
 */
async function hostPath(path: string): Promise<string> {
  if (process.platform !== "win32") return path;

  try {
    const converted = await sh(["cygpath", "-m", path]);
    return converted.code === 0 && converted.out.trim()
      ? converted.out.trim()
      : path;
  } catch {
    // A Windows shell without cygpath: Docker may still accept the path.
    return path;
  }
}

/**
 * The official images are distroless, so there is no shell to loop configs in.
 * Same binary and geo files, on a base that has one. The v24.11.11 image keeps
 * them under /usr; later releases moved to /usr/local.
 */
async function buildImage(version: string, tag: string, work: string): Promise<void> {
  const old = version === "24.11.11";
  const dockerfile = [
    `FROM ghcr.io/xtls/xray-core:${version} AS core`,
    "FROM alpine:3.22",
    `COPY --from=core ${old ? "/usr/bin/xray" : "/usr/local/bin/xray"} /usr/local/bin/xray`,
    `COPY --from=core ${old ? "/usr/share/xray/" : "/usr/local/share/xray/"} /usr/local/share/xray/`,
    "ENV XRAY_LOCATION_ASSET=/usr/local/share/xray",
    'ENTRYPOINT ["/bin/sh"]',
  ].join("\n");

  writeFileSync(join(work, "Dockerfile"), dockerfile);
  const built = await sh([
    "docker", "build", "-q",
    "-f", await hostPath(join(work, "Dockerfile")),
    "-t", tag,
    await hostPath(work),
  ]);
  if (built.code !== 0) throw new Error(`could not build an image for ${version}`);
}

const RUNNER = `#!/bin/sh
for config in /cfg/"$1"_*.json; do
  [ -e "$config" ] || continue
  if error=$(xray run -test -c "$config" 2>&1); then
    echo "PASS $(basename "$config" .json)"
  else
    echo "FAIL $(basename "$config" .json)"
    printf '%s' "$error" | grep -i 'failed to start' | tail -1
  fi
done
`;

async function runCore(
  version: string,
  fixtureDir: string,
  work: string,
): Promise<{ pass: number; failures: string[] }> {
  const tag = `awga-xray:${version}`;
  await buildImage(version, tag, work);

  const result = await sh([
    "docker", "run", "--rm",
    "-v", `${await hostPath(fixtureDir)}:/cfg:ro`,
    "-v", `${await hostPath(join(work, "run.sh"))}:/run.sh:ro`,
    tag, "-c", `sh /run.sh ${version}`,
  ]);

  let pass = 0;
  const failures: string[] = [];
  let pending: string | null = null;

  for (const line of result.out.split("\n")) {
    if (line.startsWith("PASS ")) pass++;
    else if (line.startsWith("FAIL ")) pending = line.slice(5);
    else if (pending && line.trim()) {
      failures.push(`${pending}\n      ${line.trim()}`);
      pending = null;
    }
  }
  if (pending) failures.push(pending);

  return { pass, failures };
}

async function check(): Promise<void> {
  const work = join(tmpdir(), `awga-configs-${crypto.randomUUID().slice(0, 8)}`);
  mkdirSync(work, { recursive: true });
  const dir = join(work, "fixtures");

  const files = fixtures();
  emit(dir, files);
  writeFileSync(join(work, "run.sh"), RUNNER);
  console.log(`${files.length} configs across ${XRAY_VERSIONS.length} versions\n`);

  let failed = 0;
  for (const version of XRAY_VERSIONS) {
    const count = readdirSync(dir).filter((f) => f.startsWith(`${version.id}_`)).length;
    if (count === 0) {
      throw new Error(`no fixtures for ${version.id} — the version list and the generator disagree`);
    }

    const { pass, failures } = await runCore(version.id, dir, work);
    console.log(`── core ${version.id} (${count} configs) — ${pass} loaded, ${failures.length} refused`);
    for (const failure of failures) console.log(`    ${failure}`);
    failed += failures.length;
  }

  if (!rest.includes("--keep")) rmSync(work, { recursive: true, force: true });
  else console.log(`\nfixtures kept in ${work}`);

  console.log();
  if (failed) {
    console.log(`${failed} config(s) the core would refuse to load.`);
    process.exit(1);
  }
  console.log("Every generated config loads on the core it was generated for.");
}

/* ── Asking a core what it reads ──────────────────────────────────────────── */

/**
 * Each knob, set to a value the core would refuse if it knew the knob.
 *
 * Rejected means supported. Accepted means the key is being ignored, and any
 * config the generator writes with it is decoration.
 */
const KNOB_PROBES: [string, Record<string, unknown>][] = [
  ["xPaddingPlacement", { xPaddingPlacement: "nowhere-at-all" }],
  ["xPaddingMethod", { xPaddingMethod: "nowhere-at-all" }],
  ["sessionIDPlacement", { sessionIDPlacement: "nowhere-at-all" }],
  ["sessionPlacement", { sessionPlacement: "nowhere-at-all" }],
  ["seqPlacement", { seqPlacement: "nowhere-at-all" }],
  ["uplinkDataPlacement", { uplinkDataPlacement: "nowhere-at-all" }],
  ["uplinkHTTPMethod", { uplinkHTTPMethod: "GET" }],
  ["serverMaxHeaderBytes", { serverMaxHeaderBytes: -1 }],
  ["sessionIDTable", { sessionIDTable: "ab", sessionIDLength: "1-2" }],
  ["headers-host", { headers: { host: "example.com" } }],
];

const KNOB_BASE = {
  log: { loglevel: "warning" },
  inbounds: [
    {
      listen: "0.0.0.0",
      port: 443,
      protocol: "vless",
      settings: {
        clients: [{ id: "11111111-1111-1111-1111-111111111111" }],
        decryption: "none",
      },
      streamSettings: {
        network: "xhttp",
        security: "none",
        // stream-up exists on every version, unlike stream-one.
        xhttpSettings: { path: "/probe", mode: "stream-up" },
      },
    },
  ],
  outbounds: [{ protocol: "freedom" }],
};

async function probeKnobs(): Promise<void> {
  const work = join(tmpdir(), `awga-knobs-${crypto.randomUUID().slice(0, 8)}`);
  const dir = join(work, "fixtures");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(work, "run.sh"), RUNNER);

  for (const version of XRAY_VERSIONS) {
    // A control that must be accepted. If it is not, the probe itself is
    // broken and every "supported" reading would be a false positive — which
    // happened once, when the control config was rejected for an unrelated
    // missing seed and a whole version's capabilities were read backwards.
    writeFileSync(
      join(dir, `${version.id}__control.json`),
      JSON.stringify(KNOB_BASE, null, 2),
    );

    for (const [name, patch] of KNOB_PROBES) {
      const config = structuredClone(KNOB_BASE) as typeof KNOB_BASE;
      Object.assign(config.inbounds[0]!.streamSettings.xhttpSettings, patch);
      writeFileSync(
        join(dir, `${version.id}_${name}.json`),
        JSON.stringify(config, null, 2),
      );
    }
  }

  for (const version of XRAY_VERSIONS) {
    const { failures } = await runCore(version.id, dir, work);
    const refused = new Set(failures.map((f) => f.split("\n")[0]!.trim()));

    if (refused.has(`${version.id}__control`)) {
      console.log(`── core ${version.id}: the control config was refused; readings would be meaningless`);
      continue;
    }

    const supported = KNOB_PROBES.filter(([name]) => refused.has(`${version.id}_${name}`)).map(([n]) => n);
    const ignored = KNOB_PROBES.filter(([name]) => !refused.has(`${version.id}_${name}`)).map(([n]) => n);

    console.log(`── core ${version.id}`);
    console.log(`    reads:    ${supported.join(", ") || "none of them"}`);
    console.log(`    ignores:  ${ignored.join(", ") || "none of them"}`);
  }

  rmSync(work, { recursive: true, force: true });
}

/* ── Entry point ──────────────────────────────────────────────────────────── */

switch (command) {
  case "check":
    await check();
    break;
  case "probe":
    await probeKnobs();
    break;
  case "emit": {
    const dir = rest.find((a) => !a.startsWith("--"));
    if (!dir) throw new Error(USAGE);
    const files = fixtures();
    emit(dir, files);
    console.log(`${files.length} configs → ${dir}`);
    break;
  }
  default:
    console.log(USAGE);
    process.exit(command ? 2 : 0);
}
