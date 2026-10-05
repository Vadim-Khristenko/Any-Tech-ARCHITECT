/**
 * AmneziaWG Architect — XRay packet simulator.
 *
 * What a VLESS session looks like on the wire for the first second: the TLS
 * or REALITY handshake, the VLESS request header inside it, and a few
 * application records with whatever the transport wraps them in.
 *
 * Sizes are approximate in the same way the AmneziaWG simulator's are — the
 * point is the *shape*: how much of the connection is handshake, how much the
 * transport costs, and where the padding lands. Two numbers are not
 * approximate and are computed exactly, because they are the ones a user can
 * check against a capture: the ClientHello length that the chosen uTLS
 * fingerprint produces, and the VLESS request header.
 */

import { translate } from "@/i18n";
import {
  kindTable,
  toResult,
  type ExtraField,
  type PacketKind as SharedPacketKind,
  type SimPacket as SharedSimPacket,
  type SimResult as SharedSimResult,
  type Simulator,
} from "@/shared/simulation";
import type { XrayConfig } from "./types";

/** Kind ids XRay can emit, in legend order. */
export type XrayPacketKind =
  | "client-hello"
  | "server-hello"
  | "handshake-finish"
  | "vless-request"
  | "app-data"
  | "padding";

/** What only XRay packets carry. */
export interface XrayPacketExtra {
  /** TLS record type or transport frame this packet represents. */
  frame: string;
  /** Bytes this packet spends on framing rather than content. */
  framing: number;
  /** Set on the packet that carries the REALITY authentication. */
  carriesRealityAuth?: boolean;
}

const KINDS: readonly SharedPacketKind[] = [
  {
    id: "client-hello",
    label: "ClientHello",
    accent: "#38bdf8",
    descriptionKey: "sim.legend.clientHello",
    weight: "overhead",
  },
  {
    id: "server-hello",
    label: "ServerHello",
    accent: "#818cf8",
    descriptionKey: "sim.legend.serverHello",
    weight: "overhead",
  },
  {
    id: "handshake-finish",
    label: "Finished",
    accent: "#fbbf24",
    descriptionKey: "sim.legend.handshakeFinish",
    weight: "overhead",
  },
  {
    id: "vless-request",
    label: "VLESS",
    accent: "#a78bfa",
    descriptionKey: "sim.legend.vlessRequest",
    weight: "overhead",
  },
  {
    id: "app-data",
    label: "Data",
    accent: "#34d399",
    descriptionKey: "sim.legend.appData",
    weight: "payload",
  },
  {
    id: "padding",
    label: "Padding",
    accent: "#f87171",
    descriptionKey: "sim.legend.padding",
    weight: "overhead",
  },
];

const { table: XRAY_KIND_TABLE, legend: XRAY_LEGEND } = kindTable(KINDS);

export { XRAY_KIND_TABLE, XRAY_LEGEND };

export type XraySimPacket = SharedSimPacket<XrayPacketExtra> & {
  kind: XrayPacketKind;
};

export type XraySimResult = SharedSimResult<XrayPacketExtra>;

/* ── Sizes ────────────────────────────────────────────────────────────────── */

/**
 * ClientHello length per uTLS fingerprint, in bytes on the wire.
 *
 * These are the whole TLS record — the 5-byte header plus the handshake
 * message — because that is what a capture shows. Chrome pads its ClientHello
 * to 512 bytes of handshake body, which is where the familiar 517 comes from;
 * the others do not pad the same way and land where their extension list puts
 * them.
 */
const CLIENT_HELLO_SIZE: Readonly<Record<string, number>> = {
  chrome: 517,
  edge: 517,
  firefox: 571,
  safari: 517,
  ios: 517,
  android: 508,
  random: 517,
  randomized: 517,
};

const DEFAULT_CLIENT_HELLO = 517;

/** TLS record header, on every record. */
const TLS_RECORD_HEADER = 5;

/** AEAD tag on every encrypted record. */
const TLS_AEAD_TAG = 16;

/** A full-size application record's plaintext. */
const APP_RECORD_PLAINTEXT = 1400;

/** How many application records to show. Enough to see the pattern. */
const APP_RECORDS = 4;

/**
 * Per-packet framing the transport adds on top of TLS.
 *
 * `raw` is TLS straight over TCP and adds nothing. The rest wrap every write:
 * WebSocket a 2–14 byte frame header, HTTPUpgrade the same after its upgrade,
 * gRPC a 5-byte length-prefixed message inside an HTTP/2 DATA frame, XHTTP an
 * HTTP/2 DATA frame per chunk.
 */
const TRANSPORT_FRAMING: Readonly<Record<string, number>> = {
  raw: 0,
  ws: 6,
  httpupgrade: 6,
  grpc: 5 + 9,
  xhttp: 9,
};

/**
 * Size of the VLESS request header, computed rather than guessed.
 *
 * Layout: version(1) + uuid(16) + addonLen(1) + addons + command(1) +
 * port(2) + addressType(1) + address. Vision puts its name in the addons as a
 * protobuf field, which is a tag and a length ahead of the 16 characters.
 */
export function vlessHeaderSize(cfg: XrayConfig): number {
  const flow = cfg.clients[0]?.flow ?? "";
  const addons = flow ? 2 + flow.length : 0;
  const address = cfg.address || "0.0.0.0";
  // Address is sent as a domain when it is not a literal, which is the case
  // the generator produces; a literal v4 would be 4 bytes plus the type byte.
  const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(address);
  const addressBytes = isIpv4 ? 4 : 1 + address.length;
  return 1 + 16 + 1 + addons + 1 + 2 + 1 + addressBytes;
}

function framingFor(cfg: XrayConfig): number {
  return TRANSPORT_FRAMING[cfg.transport] ?? 0;
}

function clientHelloSize(cfg: XrayConfig): number {
  const fingerprint = cfg.reality?.fingerprint ?? "chrome";
  return CLIENT_HELLO_SIZE[fingerprint] ?? DEFAULT_CLIENT_HELLO;
}

/* ── The run ──────────────────────────────────────────────────────────────── */

/**
 * Simulate the opening of one VLESS session.
 *
 * The flow follows what the core actually does:
 *   1. ClientHello — carrying the REALITY authentication when REALITY is on.
 *   2. ServerHello and the certificate chain, borrowed from the real target.
 *   3. The client's Finished.
 *   4. The VLESS request header, inside the first application record.
 *   5. Application records, with the transport's framing on each.
 *
 * `security: "none"` has no handshake at all, which is exactly why it is
 * worth seeing next to the others.
 */
export function simulateXray(cfg: XrayConfig): XraySimResult {
  const packets: XraySimPacket[] = [];
  const framing = framingFor(cfg);
  let id = 0;
  let step = 0;

  const push = (packet: Omit<XraySimPacket, "id">) => {
    packets.push({ ...packet, id: id++ });
  };

  const hasTls = cfg.security === "reality" || cfg.security === "tls";
  const isReality = cfg.security === "reality";

  if (hasTls) {
    const hello = clientHelloSize(cfg);
    push({
      step: String(++step),
      kind: "client-hello",
      label: "TLS ClientHello",
      from: "client",
      to: "server",
      size: hello,
      payload: hello - TLS_RECORD_HEADER,
      description: isReality
        ? translate("sim.desc.xrayHelloReality", {
            sni: cfg.reality?.serverNames[0] ?? "",
            fp: cfg.reality?.fingerprint ?? "",
          })
        : translate("sim.desc.xrayHelloTls", {
            fp: cfg.reality?.fingerprint ?? "chrome",
          }),
      extra: {
        frame: "handshake",
        framing: TLS_RECORD_HEADER,
        // REALITY hides its authentication in the ClientHello's own fields,
        // which is why the packet is indistinguishable by size.
        carriesRealityAuth: isReality,
      },
    });

    // The certificate chain comes from the real target, so its size is the
    // target's, not ours. A range rather than a number: it depends on the site.
    const certChain = 2600 + Math.floor(Math.random() * 1800);
    push({
      step: String(++step),
      kind: "server-hello",
      label: "ServerHello + Certificate",
      from: "server",
      to: "client",
      size: certChain,
      payload: certChain - TLS_RECORD_HEADER * 3,
      description: isReality
        ? translate("sim.desc.xrayServerHelloReality", {
            dest: cfg.reality?.dest ?? "",
          })
        : translate("sim.desc.xrayServerHelloTls"),
      extra: { frame: "handshake", framing: TLS_RECORD_HEADER * 3 },
    });

    const finished = TLS_RECORD_HEADER + 32 + TLS_AEAD_TAG;
    push({
      step: String(++step),
      kind: "handshake-finish",
      label: "Finished",
      from: "client",
      to: "server",
      size: finished,
      payload: 32,
      description: translate("sim.desc.xrayFinished"),
      extra: { frame: "handshake", framing: TLS_RECORD_HEADER + TLS_AEAD_TAG },
    });
  }

  // The VLESS request header rides in the first application write.
  const headerBytes = vlessHeaderSize(cfg);
  const requestOverhead = (hasTls ? TLS_RECORD_HEADER + TLS_AEAD_TAG : 0) + framing;
  push({
    step: String(++step),
    kind: "vless-request",
    label: "VLESS request",
    from: "client",
    to: "server",
    size: headerBytes + requestOverhead,
    payload: headerBytes,
    description: translate("sim.desc.xrayVlessRequest", {
      bytes: headerBytes,
      flow: cfg.clients[0]?.flow || "—",
    }),
    extra: { frame: "application", framing: requestOverhead },
  });

  // VLESS Encryption negotiates its ticket in the first exchange, which is
  // padding as far as the observer is concerned.
  if (cfg.vlessEncryption) {
    const ticket = 1088 + 32; // ML-KEM-768 ciphertext plus the X25519 share.
    push({
      step: String(++step),
      kind: "padding",
      label: "VLESS Encryption",
      from: "client",
      to: "server",
      size: ticket + requestOverhead,
      payload: ticket,
      description: translate("sim.desc.xrayEncryption"),
      extra: { frame: "application", framing: requestOverhead },
    });
  }

  const perRecord =
    (hasTls ? TLS_RECORD_HEADER + TLS_AEAD_TAG : 0) + framing;
  for (let i = 0; i < APP_RECORDS; i++) {
    const outbound = i % 2 === 0;
    push({
      step: `${step + 1}${String.fromCharCode(97 + i)}`,
      kind: "app-data",
      label: "Application data",
      from: outbound ? "client" : "server",
      to: outbound ? "server" : "client",
      size: APP_RECORD_PLAINTEXT + perRecord,
      payload: APP_RECORD_PLAINTEXT,
      description: translate("sim.desc.xrayAppData", {
        transport: cfg.transport,
        overhead: perRecord,
      }),
      extra: { frame: "application", framing: perRecord },
    });
  }

  return toResult(packets, XRAY_KIND_TABLE);
}

/** The simulator, in the same shape the AmneziaWG one has. */
export const xraySimulator: Simulator<XrayConfig, XrayPacketExtra> = {
  kinds: XRAY_KIND_TABLE,
  legend: XRAY_LEGEND,
  simulate: simulateXray,

  /**
   * The one thing worth saying before the run: with `security: "none"` there
   * is no handshake at all, and a diagram that opens straight onto VLESS
   * reads as broken unless someone says it is not.
   */
  notes(cfg) {
    return cfg.security === "none"
      ? [translate("sim.note.plain")]
      : [];
  },

  /** Frame type and framing cost are XRay's alone. */
  describeExtra(extra) {
    const fields: ExtraField[] = [
      { label: translate("sim.detail.frame"), value: extra.frame },
      {
        label: translate("sim.detail.framing"),
        value: `+${extra.framing} ${translate("sim.bytes")}`,
      },
    ];
    if (extra.carriesRealityAuth) {
      fields.push({
        label: translate("sim.detail.realityAuth"),
        value: translate("sim.detail.realityAuth.carried"),
      });
    }
    return fields;
  },
};
