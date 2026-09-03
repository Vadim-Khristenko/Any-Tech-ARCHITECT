/**
 * AmneziaWG Architect — canonical `.conf` renderer.
 *
 * Single source of truth for turning an `AWGConfig` into wg-quick text. The
 * batch export, the copy/download payload and the syntax-highlighted preview
 * all render from here, so a parameter can never appear in one view and go
 * missing in another.
 *
 * Key spellings follow amneziawg-tools (`src/config.c`): the 2.x set on
 * `master`, the 3.0 additions on `feat/awg3`.
 */

import type { AWGConfig, AWGVersion } from "./types";
import { capsFor } from "./versions";

export type ConfLineType = "comment" | "kv" | "section";

export interface ConfLine {
  key: string;
  value: string;
  type: ConfLineType;
}

/**
 * Comment text, injected by the caller.
 *
 * This module stays free of i18n so it can run in the worker and in tests; the
 * UI passes translated strings in, and the English defaults below are what a
 * `.conf` gets when nobody supplies any.
 */
export interface RenderLabels {
  privateKey: string;
  /** Placeholder for the peer key, which only the server operator has. */
  peerKey: string;
  /** What the endpoint line is for. */
  endpoint: string;
  address: string;
  cpsClientOnly: string;
  noCps: string;
  /** The version has a chain and the chosen client does not read one. */
  noCpsClient: string;
  awg3Hpk: string;
  awg3Cpa: string;
  awg3Timers: string;

  /**
   * A line above each block saying what it is for.
   *
   * A `.conf` is read months later by someone who did not generate it, and
   * often by someone editing the server side to match. Four magic numbers
   * under no heading are four numbers to copy carefully and not understand;
   * the same four under one sentence are a decision that can be checked.
   */
  blockHeaders: string;
  blockSizes: string;
  blockJunk: string;
  blockCps: string;
  /** Which side has to carry the identical value. */
  mustMatch: string;
}

export const DEFAULT_LABELS: RenderLabels = {
  privateKey: "PrivateKey = <your private key>",
  peerKey: "PublicKey = <the server public key>",
  endpoint: "The server this connects to",
  address: "Address = 10.0.0.2/32",
  cpsClientOnly: "Client-side only in 1.5 — the server ignores these:",
  noCps: "1.0 has no CPS chain; obfuscation here is junk packets and headers",
  noCpsClient:
    "The chosen client does not send I1-I5, so this config carries none. The tunnel works without them; what they add is the mimicry, and writing fields the client will not send would only look like it",
  awg3Hpk: "Header encryption. The key is shared, and the padding above feeds its nonce",
  awg3Cpa: "Extra random padding on every transport packet",
  awg3Timers: "Randomised protocol timers instead of the fixed constants",

  blockHeaders: "Packet type markers. Must match the server and must not overlap",
  blockSizes: "Random padding in front of each kind of packet",
  blockJunk: "Empty packets sent before the handshake",
  blockCps: "Fake packets sent before the handshake. The receiver never parses them",
  mustMatch: "Everything above this line must be identical on the server",
};

export interface RenderOptions {
  /**
   * The server this config connects to, as `host:port`.
   *
   * Empty by default, and then nothing is emitted: the file has always been
   * the obfuscation block alone, pasted into a config the user already has.
   * When it is given, a `[Peer]` section is written with the endpoint and a
   * commented placeholder for the key — the same treatment PrivateKey and
   * Address already get, because those are the two things this tool has never
   * had and must never invent.
   */
  endpoint?: string;

  /**
   * Preview mode collapses the PrivateKey/Address placeholders onto one
   * comment line and is what the on-screen preview uses.
   */
  preview?: boolean;
  /** Optional "config N/M" caption for batch exports. */
  caption?: string;
  /** Localised comment text; falls back to English. */
  labels?: Partial<RenderLabels>;
}

const cm = (value: string): ConfLine => ({ key: "", value, type: "comment" });
const kv = (key: string, value: string | number): ConfLine => ({
  key,
  value: String(value),
  type: "kv",
});

/**
 * Build the ordered line list for a config.
 *
 * Version differences, all as implemented upstream:
 *   1.0 — single-value H1–H4, S1/S2 only, no CPS chains
 *   1.5 — single-value H1–H4, S1/S2, client-side-only I1–I5
 *   2.0 — H1–H4 as ranges, S1–S4, I1–I5
 *   3.0 — everything in 2.0 plus HeaderProtectionKey, ContentPaddingAddition
 *         and the randomised timers
 */
export function renderConfLines(
  cfg: AWGConfig,
  opts: RenderOptions = {},
): ConfLine[] {
  const { preview = false, caption, endpoint = "" } = opts;
  const L: RenderLabels = { ...DEFAULT_LABELS, ...opts.labels };
  const v: AWGVersion = cfg.version;
  const lines: ConfLine[] = [];

  lines.push(cm(caption ? `# AmneziaWG ${v} — ${caption}` : `# AmneziaWG ${v}`));
  lines.push(cm("[Interface]"));
  if (preview) {
    lines.push(cm(`# ${L.privateKey}  ${L.address}`));
  } else {
    lines.push(cm(`# ${L.privateKey}`));
    lines.push(cm(`# ${L.address}`));
  }

  // Shape comes from the capability table, so this renderer and the on-screen
  // parameter panel cannot disagree about what a version looks like.
  const caps = capsFor(v);

  lines.push(cm(""));
  lines.push(cm(`# ${L.blockHeaders}`));
  if (caps.rangedHeaders) {
    lines.push(kv("H1", cfg.h1), kv("H2", cfg.h2), kv("H3", cfg.h3), kv("H4", cfg.h4));
  } else {
    lines.push(
      kv("H1", cfg.h1s),
      kv("H2", cfg.h2s),
      kv("H3", cfg.h3s),
      kv("H4", cfg.h4s),
    );
  }

  lines.push(cm(""));
  lines.push(cm(`# ${L.blockSizes}`));
  lines.push(kv("S1", cfg.s1), kv("S2", cfg.s2));
  if (caps.extraSizes) lines.push(kv("S3", cfg.s3), kv("S4", cfg.s4));

  lines.push(cm(""));
  // The count and the range, stated once, so the three numbers below read as
  // one decision rather than as three unrelated constants.
  lines.push(
    cm(
      cfg.jc > 0
        ? `# ${L.blockJunk}: ${cfg.jc} × ${cfg.jmin}–${cfg.jmax} B`
        : `# ${L.blockJunk} — off`,
    ),
  );
  lines.push(kv("Jc", cfg.jc), kv("Jmin", cfg.jmin), kv("Jmax", cfg.jmax));

  lines.push(cm(""));
  /*
   * Read off the config rather than off the client, because render is handed
   * a config and nothing else. On a version that has a chain, all five empty
   * only happens when whatever produced it decided against one, and saying
   * "1.0 has no chain" over an AWG 2.0 config would be the wrong reason.
   */
  const hasChain = [cfg.i1, cfg.i2, cfg.i3, cfg.i4, cfg.i5].some(
    (field) => String(field ?? "") !== "",
  );
  if (!caps.cps) {
    lines.push(cm(`# ${L.noCps}`));
  } else if (!hasChain) {
    lines.push(cm(`# ${L.noCpsClient}`));
  } else {
    lines.push(cm(`# ${L.blockCps}`));
    if (v === "1.5") lines.push(cm(`# ${L.cpsClientOnly}`));
    lines.push(
      kv("I1", cfg.i1),
      kv("I2", cfg.i2),
      kv("I3", cfg.i3),
      kv("I4", cfg.i4),
      kv("I5", cfg.i5),
    );
  }

  if (caps.headerProtection && cfg.awg3) {
    const p = cfg.awg3;

    lines.push(cm(""));
    if (p.headerProtectionKey) {
      lines.push(cm(`# ${L.awg3Hpk}`));
      lines.push(kv("HeaderProtectionKey", p.headerProtectionKey));
    }
    if (p.contentPaddingAddition) {
      lines.push(cm(`# ${L.awg3Cpa}`));
      lines.push(kv("ContentPaddingAddition", p.contentPaddingAddition));
    }

    const timers: Array<[string, string]> = [
      ["RekeyAfterTime", p.rekeyAfterTime],
      ["RekeyTimeout", p.rekeyTimeout],
      ["RejectAfterTime", p.rejectAfterTime],
      ["KeepaliveTimeout", p.keepaliveTimeout],
      ["MaxHandshakeAttempts", p.maxHandshakeAttempts],
    ];
    const active = timers.filter(([, value]) => value !== "");
    if (active.length) {
      lines.push(cm(`# ${L.awg3Timers}`));
      for (const [key, value] of active) lines.push(kv(key, value));
    }

    // The 3.1 switches. Tools require both lines when either is on:
    // enabled as "1", disabled as "0". When both are off nothing is written
    // — a 3.0 device would reject the keys outright. Go/UAPI accepts
    // true|yes|on|1, but 1/0 is the only form accepted by both stacks,
    // and tools clients reject "true" at parse. Parser TRUTHY
    // (parse.ts:106) handles 1 and true.
    if (caps.featureFlags) {
      if (p.randomTrailers || p.disableCookies) {
        lines.push(kv("RandomTrailers", p.randomTrailers ? "1" : "0"));
        lines.push(kv("DisableCookies", p.disableCookies ? "1" : "0"));
      }
    }
  }

  /*
   * The peer, when there is one to name. It goes last because that is where
   * wg-quick expects it, and it carries a commented key rather than a
   * generated one: a public key that did not come from the server it claims to
   * belong to is worse than no line at all.
   */
  if (endpoint.trim()) {
    lines.push(cm(""));
    lines.push(cm("[Peer]"));
    lines.push(cm(`# ${L.peerKey}`));
    lines.push(cm(`# ${L.endpoint}`));
    lines.push(kv("Endpoint", endpoint.trim()));
    lines.push(kv("AllowedIPs", "0.0.0.0/0, ::/0"));
  }

  return lines;
}

/** Render a config to wg-quick text. */
export function renderConf(cfg: AWGConfig, opts: RenderOptions = {}): string {
  return renderConfLines(cfg, opts)
    .map((l) => (l.type === "kv" ? `${l.key} = ${l.value}` : l.value))
    .join("\n");
}
