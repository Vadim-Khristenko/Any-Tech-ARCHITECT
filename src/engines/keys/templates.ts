/**
 * Starting points for building a key.
 *
 * A blank build mode asks someone to know the format before they can use the
 * tool that explains the format. A template is the way in: pick what the
 * server runs, get a container with the right fields present, then replace the
 * placeholders with real values.
 *
 * Every placeholder is obviously a placeholder. Nothing here is key material
 * and nothing here connects — a template that shipped a plausible-looking
 * private key would be inviting someone to use it, and a template that shipped
 * a real address would be inviting them to connect to a stranger.
 *
 * The AmneziaWG generations differ by which fields exist at all, so each one
 * carries exactly its own set. That is also how a container's generation is
 * read back: there is no version field, so the newest field present names it.
 */

import { makeAwgContainer, makeXrayContainer } from "./build";
import type { ContainerEntry } from "./types";

export type TemplateId =
  | "awg-3.0"
  | "awg-2.0"
  | "awg-1.5"
  | "awg-1.0"
  | "wireguard"
  | "xray";

export interface KeyTemplate {
  id: TemplateId;
  /** Proper nouns, so not localised. */
  label: string;
  /** i18n key stem for the one-line description. */
  key: string;
}

export const TEMPLATES: readonly KeyTemplate[] = [
  { id: "awg-3.0", label: "AmneziaWG 3.0", key: "awg3" },
  { id: "awg-2.0", label: "AmneziaWG 2.0", key: "awg2" },
  { id: "awg-1.5", label: "AmneziaWG 1.5", key: "awg15" },
  { id: "awg-1.0", label: "AmneziaWG 1.0", key: "awg1" },
  { id: "wireguard", label: "WireGuard", key: "wg" },
  { id: "xray", label: "XRay / REALITY", key: "xray" },
];

/* ── Placeholders ─────────────────────────────────────────────────────────── */

/**
 * Documentation addresses, from RFC 5737. They are reserved for exactly this
 * and route nowhere, so a template left unedited fails to connect rather than
 * reaching somebody else's machine.
 */
const HOST = "198.51.100.1";
const PORT = 51820;

/** Visibly not keys. A reader who leaves these in gets a refusal, not a leak. */
const PLACEHOLDER = {
  clientPriv: "REPLACE-WITH-YOUR-PRIVATE-KEY",
  clientPub: "REPLACE-WITH-YOUR-PUBLIC-KEY",
  serverPub: "REPLACE-WITH-THE-SERVER-PUBLIC-KEY",
  psk: "REPLACE-WITH-THE-PRESHARED-KEY",
  headerProtection: "REPLACE-WITH-THE-HEADER-PROTECTION-KEY",
  uuid: "00000000-0000-0000-0000-000000000000",
  realityPub: "REPLACE-WITH-THE-REALITY-PUBLIC-KEY",
};

/* ── The obfuscation each generation has ──────────────────────────────────── */

const AWG_1_0 = {
  Jc: "4",
  Jmin: "40",
  Jmax: "70",
  S1: "60",
  S2: "80",
  H1: "1000000001",
  H2: "1000000002",
  H3: "1000000003",
  H4: "1000000004",
};

/** 1.5 adds the CPS chain, and nothing else. */
const AWG_1_5 = { ...AWG_1_0, I1: "<b 0x00000000>" };

/** 2.0 adds the cookie and transport padding. */
const AWG_2_0 = { ...AWG_1_5, S3: "30", S4: "20" };

/**
 * 3.0 adds header protection and the timers.
 *
 * The S values are at or above twelve deliberately: with a header-protection
 * key set, anything under twelve is an interface that will not start, and a
 * template that shipped one would be handing over a broken config as a
 * starting point.
 */
const AWG_3_0 = {
  ...AWG_2_0,
  HeaderProtectionKey: PLACEHOLDER.headerProtection,
  ContentPaddingAddition: "16",
  RekeyAfterTime: "110-130",
  RekeyTimeout: "4-6",
  RejectAfterTime: "170-190",
  KeepaliveTimeout: "9-11",
  MaxHandshakeAttempts: "17-20",
};

const OBFUSCATION: Record<string, Record<string, string>> = {
  "awg-1.0": AWG_1_0,
  "awg-1.5": AWG_1_5,
  "awg-2.0": AWG_2_0,
  "awg-3.0": AWG_3_0,
};

/**
 * Which container name a generation goes in.
 *
 * The client ships these as separate containers rather than as versions of
 * one, so a 3.0 config belongs in `amnezia-awg3` and putting it in
 * `amnezia-awg` would be the name/contents mismatch the validator reports.
 * 1.0 and 1.5 share the original name: there is no `amnezia-awg1`.
 */
const CONTAINER_FOR: Record<string, "amnezia-awg" | "amnezia-awg2" | "amnezia-awg3"> = {
  "awg-1.0": "amnezia-awg",
  "awg-1.5": "amnezia-awg",
  "awg-2.0": "amnezia-awg2",
  "awg-3.0": "amnezia-awg3",
};

/* ── Building one ─────────────────────────────────────────────────────────── */

/** A container to start from. Placeholders throughout; nothing real. */
export function templateContainer(id: TemplateId): ContainerEntry {
  if (id === "xray") {
    return makeXrayContainer({
      xray_security: "reality",
      xray_flow: "xtls-rprx-vision",
      xray_fingerprint: "chrome",
      xray_sni: "www.example.com",
      xray_transport: "tcp",
      pbk: PLACEHOLDER.realityPub,
      clientId: PLACEHOLDER.uuid,
      hostName: HOST,
      port: "443",
    });
  }

  const base = {
    hostName: HOST,
    port: PORT,
    clientPrivKey: PLACEHOLDER.clientPriv,
    clientPubKey: PLACEHOLDER.clientPub,
    serverPubKey: PLACEHOLDER.serverPub,
    pskKey: PLACEHOLDER.psk,
    clientIp: "10.0.0.2",
    dns: ["1.1.1.1", "1.0.0.1"] as [string, string],
    mtu: 1420,
    persistentKeepalive: 25,
  };

  if (id === "wireguard") {
    return makeAwgContainer(base, "amnezia-wireguard");
  }

  return makeAwgContainer({ ...base, obfuscation: OBFUSCATION[id] }, CONTAINER_FOR[id]);
}
