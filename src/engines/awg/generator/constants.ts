/**
 * AmneziaWG Architect — generator constants (host pools, BFP tables, labels).
 */

import type { BrowserProfile, BfpSlot, MimicProfile } from "./types";
import { SIZED_FINGERPRINTS, type SizeRange } from "@/shared/fingerprints";

export const YANDEX_UNSTABLE_PROFILES: BrowserProfile[] = [
  "yandex_desktop",
  "yandex_mobile",
];

export const PROFILE_LABELS: Record<MimicProfile, string> = {
  quic_initial: "QUIC Initial",
  quic_0rtt: "QUIC 0-RTT",
  tls_client_hello: "TLS 1.3",
  wireguard_noise: "Noise_IK",
  dtls_1_2: "DTLS 1.2",
  dtls_1_3: "DTLS 1.3",
  http3: "HTTP/3",
  sip: "SIP",
  tls_to_quic: "TLS → QUIC",
  quic_burst: "QUIC Burst",
  dns_query: "DNS Query",
  random: "Random",
};


/**
 * Browser fingerprints now live in `shared/fingerprints.ts`, beside the uTLS
 * profiles XRay needs, because a browser is one object with two facets rather
 * than two lists that happen to share names.
 *
 * This alias is what is left of the table that used to be here. It reads the
 * registry, so a browser added there is immediately selectable for AmneziaWG
 * instead of having to be added twice.
 */
export const BFP: Record<string, Record<BfpSlot, SizeRange>> = Object.fromEntries(
  SIZED_FINGERPRINTS.map((b) => [b.id, b.sizes!]),
);

