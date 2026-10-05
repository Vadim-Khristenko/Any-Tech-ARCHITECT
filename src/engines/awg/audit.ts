/**
 * Structural checks on a wg-quick / AmneziaWG `.conf`.
 *
 * These are the rules that are about the *file* rather than about the
 * obfuscation: a missing section, a key that is not base64, an endpoint with
 * no port. They used to live in `healthCheck.ts` with a `Finding` type of
 * their own — one that carried a Russian sentence instead of a code, so an
 * English reader got Russian and the UI had nothing to translate.
 *
 * Same checks, on the shared finding type, expressed as rules so the list can
 * be read as a list.
 */

import { parseConf, getField } from "./awgFormat";
import { error, warn, info } from "@/shared/findings";
import type { Finding } from "@/types/findings";

/** Fields wg-quick refuses to start without. */
const REQUIRED_INTERFACE = ["PrivateKey", "Address"] as const;
const REQUIRED_PEER = ["PublicKey", "Endpoint"] as const;

/**
 * A WireGuard key is 32 bytes in standard base64 — 44 characters with one
 * `=` of padding. The old check accepted anything base64-ish of length 32 or
 * more, which passed a truncated key.
 */
function isWireGuardKey(value: string): boolean {
  return /^[A-Za-z0-9+/]{43}=$/.test(value.trim());
}

/** host:port, [v6]:port, or ip:port. */
function isEndpoint(value: string): boolean {
  return /^((\[[\dA-Fa-f:]+])|([\w\-.]+)):\d{1,5}$/.test(value.trim());
}

/**
 * Is a section header written in the text?
 *
 * Asked of the text rather than of the parse, because the parser invents an
 * `Interface` section for keys that appear before any header — sensible when
 * reading a fragment, and useless for deciding whether one was written.
 */
function hasSection(text: string, name: string): boolean {
  return new RegExp(`^\\s*\\[${name}\\]`, "im").test(text);
}

/** Is the field written, but commented out — a placeholder to fill in? */
function hasCommentedField(text: string, key: string): boolean {
  return new RegExp(`^\\s*[#;]\\s*${key}\\s*=`, "im").test(text);
}

/**
 * Does this text claim to be a whole tunnel, or just a set of parameters?
 *
 * A tunnel names its sections or carries a key. Anything else is the
 * parameter block the generator renders, and holding it to wg-quick's
 * requirements would report a problem the user did not have.
 */
function looksLikeTunnel(text: string, peerCount: number): boolean {
  return (
    peerCount > 0 ||
    hasSection(text, "Interface") ||
    hasSection(text, "Peer") ||
    /^\s*(PrivateKey|PublicKey|Address|Endpoint)\s*=/im.test(text)
  );
}

/**
 * Check the shape of a `.conf`.
 *
 * Never throws: unreadable input is itself a finding, because a checker that
 * crashes on bad input is useless exactly when it is needed.
 */
export function auditConf(text: string): Finding[] {
  const found: Finding[] = [];

  let parsed: ReturnType<typeof parseConf>;
  try {
    parsed = parseConf(text);
  } catch (cause) {
    return [
      error("parse", "awg.conf.unparsable", {
        reason: cause instanceof Error ? cause.message : String(cause),
      }),
    ];
  }

  const peers = parsed.sections.filter((s) => s.name === "Peer");

  // A bare list of obfuscation parameters is a legitimate thing to check —
  // it is what the generator renders and what people paste out of a support
  // thread. Demanding a PrivateKey of it would report a tunnel as broken when
  // the user never claimed to have pasted one.
  if (!looksLikeTunnel(text, peers.length)) {
    return found;
  }

  if (!hasSection(text, "Interface")) {
    // Nothing below can be checked without it, so this is the whole answer.
    return [error("[Interface]", "awg.conf.no_interface")];
  }

  // A template says what is missing by leaving it commented out. That is the
  // shape the generator renders and the shape a user is meant to fill in, so
  // it gets one note rather than an error per placeholder.
  const missingInterface = REQUIRED_INTERFACE.filter(
    (key) => !getField(parsed, key),
  );
  const isTemplate =
    missingInterface.length > 0 &&
    missingInterface.every((key) => hasCommentedField(text, key));

  if (isTemplate) {
    return [...found, info("[Interface]", "awg.conf.template")];
  }

  if (peers.length === 0) {
    found.push(warn("[Peer]", "awg.conf.no_peer"));
  }

  for (const key of missingInterface) {
    found.push(error(key, "awg.conf.missing_field", { key }));
  }

  const privateKey = getField(parsed, "PrivateKey");
  if (privateKey && !isWireGuardKey(privateKey)) {
    found.push(error("PrivateKey", "awg.conf.bad_key", { key: "PrivateKey" }));
  }

  peers.forEach((peer, index) => {
    const n = index + 1;
    const valueOf = (key: string) =>
      peer.entries.find((e) => e.key === key)?.value;

    for (const key of REQUIRED_PEER) {
      if (!valueOf(key)) {
        found.push(
          error(`${key}#${n}`, "awg.conf.peer_missing_field", { key, n }),
        );
      }
    }

    const publicKey = valueOf("PublicKey");
    if (publicKey && !isWireGuardKey(publicKey)) {
      found.push(
        error(`PublicKey#${n}`, "awg.conf.peer_bad_key", { key: "PublicKey", n }),
      );
    }

    const endpoint = valueOf("Endpoint");
    if (endpoint && !isEndpoint(endpoint)) {
      found.push(warn(`Endpoint#${n}`, "awg.conf.peer_bad_endpoint", { n }));
    }
  });

  return found;
}
