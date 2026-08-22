/**
 * mihomo (Clash.Meta) proxy entry for an AmneziaWG parameter set.
 *
 * A different format for the same parameters: mihomo speaks YAML, nests the
 * obfuscation under `amnezia-wg-option`, and names fields in its own case.
 * Verified against MetaCubeX/mihomo `adapter/outbound/wireguard.go` (Alpha):
 *
 *   - H1–H4 and every timer are strings there, so this config's ranges pass
 *     through untouched — v1.x singles as numbers-in-strings, v2+ as "lo-hi".
 *   - `version: 3` is the switch to the v3 implementation; any other value
 *     lands on the legacy one, which is why it is emitted for 3.0 only.
 *   - `ip` is required (an empty local address fails at load), while
 *     `allowed-ips` is not: the simplified syntax derives 0.0.0.0/0 and ::/0
 *     from the addresses given, which suits a parameter set that has no
 *     routing opinion of its own.
 *
 * What a visitor still owes the file is what a generator cannot know: the
 * endpoint, the tunnel address, and both key halves. They appear as YOUR_*
 * placeholders rather than as comments, because a field that exists but is
 * obviously fake gets filled; a commented-out field gets forgotten.
 */

import { capsFor } from "./generator/versions";
import type { AWGConfig } from "./generator/types";

/** Proxy name as it appears in the visitor's proxy list. */
const PROXY_NAME = "AnyTech Architect";

/** Values the visitor replaces with their own key material. */
const FILL_IN = {
  server: "YOUR_ENDPOINT_HOST",
  port: 51820,
  ip: "YOUR_TUNNEL_IPV4",
  privateKey: "YOUR_PRIVATE_KEY",
  publicKey: "YOUR_SERVER_PUBLIC_KEY",
} as const;

/** Double-quoted scalar — safe for ranges, `<b …>` tags and empty strings. */
function q(value: string | number): string {
  return `"${value}"`;
}

/**
 * Render the parameter set as a ready-to-paste mihomo proxy block.
 *
 * The shape follows the version's capability table, the same table the `.conf`
 * renderer reads, so the two exports cannot disagree about what a version
 * puts on the wire.
 */
export function renderMihomoProxy(cfg: AWGConfig): string {
  const caps = capsFor(cfg.version);
  const out: string[] = [];

  out.push(`# AmneziaWG ${cfg.version} for mihomo (Clash.Meta)`);
  out.push("# Replace every YOUR_* value with your own key material.");
  if (cfg.version === "3.0") {
    out.push("# AWG 3.0 needs a recent mihomo build (Alpha or a nightly).");
  }
  out.push("proxies:");
  out.push(`  - name: ${q(PROXY_NAME)}`);
  out.push("    type: wireguard");
  out.push(`    server: ${FILL_IN.server}`);
  out.push(`    port: ${FILL_IN.port}`);
  out.push(`    ip: ${FILL_IN.ip}`);
  out.push(`    private-key: ${FILL_IN.privateKey}`);
  out.push(`    public-key: ${FILL_IN.publicKey}`);
  out.push("    udp: true");

  out.push("    amnezia-wg-option:");
  if (cfg.version === "3.0") out.push("      version: 3");

  // Junk train — the count and the range it draws from.
  out.push(`      jc: ${cfg.jc}`);
  out.push(`      jmin: ${cfg.jmin}`);
  out.push(`      jmax: ${cfg.jmax}`);

  // Packet size prefixes. S3/S4 exist only where the version does.
  out.push(`      s1: ${cfg.s1}`);
  out.push(`      s2: ${cfg.s2}`);
  if (caps.extraSizes) {
    out.push(`      s3: ${cfg.s3}`);
    out.push(`      s4: ${cfg.s4}`);
  }

  // Headers: ranged versions carry "lo-hi" strings, older ones fixed values.
  if (caps.rangedHeaders) {
    out.push(`      h1: ${q(cfg.h1)}`);
    out.push(`      h2: ${q(cfg.h2)}`);
    out.push(`      h3: ${q(cfg.h3)}`);
    out.push(`      h4: ${q(cfg.h4)}`);
  } else {
    out.push(`      h1: ${cfg.h1s}`);
    out.push(`      h2: ${cfg.h2s}`);
    out.push(`      h3: ${cfg.h3s}`);
    out.push(`      h4: ${cfg.h4s}`);
  }

  /*
   * The signature chain, when this config actually carries one. All five
   * empty on a chain-capable version means whatever produced it decided
   * against one — the same reading the .conf renderer gives it.
   */
  if (caps.cps) {
    const chain: Array<[string, string]> = [
      ["i1", cfg.i1],
      ["i2", cfg.i2],
      ["i3", cfg.i3],
      ["i4", cfg.i4],
      ["i5", cfg.i5],
    ];
    for (const [field, value] of chain) {
      if (String(value ?? "") !== "") out.push(`      ${field}: ${q(value)}`);
    }
  }

  // The 3.0 block. Timers are strings here too, ranges included.
  if (caps.headerProtection && cfg.awg3) {
    const p = cfg.awg3;
    if (p.headerProtectionKey) {
      out.push(`      header-protection-key: ${q(p.headerProtectionKey)}`);
    }
    if (p.contentPaddingAddition) {
      out.push(`      content-padding-addition: ${q(p.contentPaddingAddition)}`);
    }
    const timers: Array<[string, string]> = [
      ["rekey-after-time", p.rekeyAfterTime],
      ["rekey-timeout", p.rekeyTimeout],
      ["reject-after-time", p.rejectAfterTime],
      ["keepalive-timeout", p.keepaliveTimeout],
      ["max-handshake-attempts", p.maxHandshakeAttempts],
    ];
    for (const [field, value] of timers) {
      if (value !== "") out.push(`      ${field}: ${q(value)}`);
    }

    // The 3.1 switches. mihomo spells them the way its own docs do and
    // forwards both to the device's UAPI untouched.
    if (caps.featureFlags) {
      if (p.randomTrailers) out.push("      random-trailers: true");
      if (p.disableCookies) out.push("      disable-cookies: true");
    }
  }

  return out.join("\n") + "\n";
}
