/**
 * AmneziaWG Architect — DTLS 1.2 Client Hello profile generator.
 */

import type { GeneratorInput } from "../types";
import { rh } from "../utils";
import { dtlsChain } from "./dtlsFrame";

/**
 * A DTLS 1.2 ClientHello: client version and the 32-byte random.
 *
 * DTLS 1.2 is 0xfefd: the version is ones' complement, so it counts down
 * where TLS counts up. Record framing lives in ./dtlsFrame (RFC 6347 §4.1,
 * handshake §4.2.2 — DTLS adds message sequence, fragment offset and
 * fragment length to TLS's two fields).
 */
export function mkDTLS12(input: GeneratorInput, iv: number): string {
  return dtlsChain(input, iv, {
    label: "mkDTLS12",
    poolKey: "dtls_1_2",
    body: "fefd" + rh(32),
  });
}
