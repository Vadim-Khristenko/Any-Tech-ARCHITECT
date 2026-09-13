import { describe, it, expect } from "bun:test";

import { xrayEngine } from "../index";
import {
  simulateXray,
  vlessHeaderSize,
  xraySimulator,
  XRAY_KIND_TABLE,
  XRAY_LEGEND,
} from "../packetSim";
import type { XrayConfig, XrayInput } from "../types";
import { XRAY_VERSIONS } from "../versions";

/**
 * Sizes here are approximate on purpose — the simulator shows the shape of a
 * session, not a byte-exact capture. Two things are exact and are tested as
 * such: the VLESS request header, which is a fixed layout, and the invariant
 * that the totals agree with the packets they came from.
 */

const config = (over: Partial<XrayInput> = {}): XrayConfig =>
  xrayEngine.generate({ ...xrayEngine.createDefaults(), address: "vpn.example.com", ...over });

describe("XRay packet kinds", () => {
  it("declares a legend entry for every kind it can emit", () => {
    const emitted = new Set(
      simulateXray(config()).packets.map((p) => p.kind as string),
    );
    for (const kind of emitted) {
      expect(XRAY_KIND_TABLE[kind], kind).toBeTruthy();
      expect(XRAY_LEGEND).toContain(kind);
    }
  });

  it("counts only application data as payload", () => {
    // Everything else — handshake, VLESS header, framing, padding — is the
    // cost of moving it, and the overhead figure is the point of the view.
    for (const id of XRAY_LEGEND) {
      const weight = XRAY_KIND_TABLE[id]?.weight;
      expect(weight, id).toBe(id === "app-data" ? "payload" : "overhead");
    }
  });
});

describe("vlessHeaderSize", () => {
  it("computes the layout rather than guessing it", () => {
    // version 1 + uuid 16 + addonLen 1 + command 1 + port 2 + atyp 1
    // + (domain length prefix 1 + "vpn.example.com" 15) = 38
    const cfg = config({ flow: "" });
    expect(vlessHeaderSize(cfg)).toBe(38);
  });

  it("adds the Vision addon when the flow is set", () => {
    const withVision = config({ flow: "xtls-rprx-vision" });
    const without = config({ flow: "" });
    // Protobuf tag and length ahead of the 16-character name.
    expect(vlessHeaderSize(withVision) - vlessHeaderSize(without)).toBe(18);
  });

  it("uses four bytes for a literal address", () => {
    const literal = config({ address: "203.0.113.10", flow: "" });
    // 1 + 16 + 1 + 1 + 2 + 1 + 4
    expect(vlessHeaderSize(literal)).toBe(26);
  });
});

describe("simulateXray", () => {
  it("keeps the totals consistent with the packets", () => {
    for (const version of XRAY_VERSIONS) {
      const result = simulateXray(config({ version: version.id }));
      const sum = result.packets.reduce((n, p) => n + p.size, 0);

      expect(result.totals.totalBytes, version.id).toBe(sum);
      expect(
        result.totals.payloadBytes + result.totals.overheadBytes,
        version.id,
      ).toBe(sum);
    }
  });

  it("never emits a packet with no size or no description", () => {
    for (const packet of simulateXray(config()).packets) {
      expect(packet.size, packet.label).toBeGreaterThan(0);
      expect(packet.payload).toBeLessThanOrEqual(packet.size);
      expect(packet.description, packet.label).toBeTruthy();
    }
  });

  it("runs a TLS handshake for REALITY and for TLS, and none without", () => {
    const handshakeKinds = ["client-hello", "server-hello", "handshake-finish"];
    const kindsOf = (security: "reality" | "tls" | "none") =>
      simulateXray(config({ security })).packets.map((p) => p.kind as string);

    for (const security of ["reality", "tls"] as const) {
      for (const kind of handshakeKinds) {
        expect(kindsOf(security), security).toContain(kind);
      }
    }

    // security: none is worth seeing precisely because there is no handshake
    // to hide behind.
    for (const kind of handshakeKinds) {
      expect(kindsOf("none")).not.toContain(kind);
    }
  });

  it("charges the transport's framing to every application record", () => {
    const raw = simulateXray(config({ transport: "raw" }));
    const ws = simulateXray(config({ transport: "ws" }));

    const appSize = (r: typeof raw) =>
      r.packets.find((p) => p.kind === "app-data")!.size;

    // WebSocket wraps every write; raw TLS over TCP does not.
    expect(appSize(ws)).toBeGreaterThan(appSize(raw));
  });

  it("shows the VLESS Encryption exchange only when it is on", () => {
    const on = simulateXray(config({ useVlessEncryption: true, version: "26.7.11" }));
    const off = simulateXray(config({ useVlessEncryption: false }));

    expect(on.packets.some((p) => p.kind === "padding")).toBe(true);
    expect(off.packets.some((p) => p.kind === "padding")).toBe(false);
  });

  it("marks the packet that carries the REALITY authentication", () => {
    const reality = simulateXray(config({ security: "reality" }));
    const hello = reality.packets.find((p) => p.kind === "client-hello");

    // The whole point of REALITY is that this packet looks like every other
    // ClientHello, so the simulator has to say which one it is.
    expect(hello?.extra?.carriesRealityAuth).toBe(true);

    const tls = simulateXray(config({ security: "tls" }));
    expect(
      tls.packets.find((p) => p.kind === "client-hello")?.extra
        ?.carriesRealityAuth,
    ).toBeFalsy();
  });
});

describe("xraySimulator", () => {
  it("exposes the same surface the AmneziaWG one does", () => {
    expect(xraySimulator.kinds).toBe(XRAY_KIND_TABLE);
    expect(xraySimulator.legend).toBe(XRAY_LEGEND);
    expect(xraySimulator.simulate(config()).packets.length).toBeGreaterThan(0);
  });
});
