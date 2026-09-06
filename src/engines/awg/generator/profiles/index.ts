/**
 * AmneziaWG Architect — protocol profile generators index.
 */

export { mkQUICi, mkQUIC0, mkHTTP3 } from "./quic";
export { mkTLS } from "./tls";
export { mkNoise } from "./noise";
export { mkDTLS12 } from "./dtls12";
export { mkDTLS13 } from "./dtls13";
/** @deprecated pre-4.2.0 name for mkDTLS12. */
export { mkDTLS12 as mkDTLS } from "./dtls12";
export { mkSIP } from "./sip";
export { mkDNS } from "./dns";
export { mkEntropy } from "./entropy";
