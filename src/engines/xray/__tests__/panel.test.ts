import { describe, it, expect } from "vitest";

import { xrayEngine } from "../index";
import { buildServerInbound, buildPanelInbound } from "../render";
import type { XrayInput } from "../types";

/**
 * The panel export is the same inbound in the vocabulary hosting panels
 * validate against. Xray-core accepts both spellings — `case "raw", "tcp"`
 * and a rawSettings block folded into TCPSettings — so the rename costs the
 * wire nothing. What these tests hold is that it costs the config nothing
 * either: everything the core reads survives the trip untouched.
 */

const input = (over: Partial<XrayInput> = {}): XrayInput => ({
  ...xrayEngine.createDefaults(),
  address: "198.51.100.10",
  ...over,
});

describe("the panel export", () => {
  it("renames the raw transport to the name panels know", () => {
    const cfg = xrayEngine.generate(input({ transport: "raw" }));
    const stream = buildPanelInbound(cfg).streamSettings as Record<string, unknown>;
    expect(stream.method === "raw" || stream.network === "raw").toBe(false);
    expect(stream.method === "tcp" || stream.network === "tcp").toBe(true);
  });

  it("moves rawSettings under the key panels read", () => {
    const cfg = xrayEngine.generate(input({ transport: "raw" }));
    const stream = buildPanelInbound(cfg).streamSettings as Record<string, unknown>;
    expect(stream.rawSettings).toBeUndefined();
    expect(stream.tcpSettings).toBeDefined();
  });

  it("leaves every other transport block alone", () => {
    for (const transport of ["ws", "grpc", "httpupgrade", "xhttp"] as const) {
      const cfg = xrayEngine.generate(input({ transport }));
      const stream = buildPanelInbound(cfg).streamSettings as Record<string, unknown>;
      const coreStream = buildServerInbound(cfg).streamSettings as Record<
        string,
        unknown
      >;
      // No raw keys anywhere, and the stream equals what the core gets.
      expect(stream).toEqual(coreStream);
      expect(JSON.stringify(stream)).not.toContain("rawSettings");
    }
  });

  it("changes nothing but the two names and the panel-only email", () => {
    const cfg = xrayEngine.generate(input({ transport: "raw", clientCount: 1 }));
    const panel = buildPanelInbound(cfg) as Record<string, unknown>;
    const core = buildServerInbound(cfg) as Record<string, unknown>;

    // Everything outside streamSettings and settings.clients is identical.
    // Panel adds email per client (3x-ui requires min(1)), core never has it.
    const { streamSettings: _panelStream, settings: panelSettings, ...panelRest } =
      panel as Record<string, unknown>;
    const { streamSettings: _coreStream, settings: coreSettings, ...coreRest } =
      core as Record<string, unknown>;
    expect(panelRest).toEqual(coreRest);
    expect((panelSettings as Record<string, unknown>).decryption).toEqual(
      (coreSettings as Record<string, unknown>).decryption,
    );
    const panelClients = (panelSettings as { clients: Array<Record<string, unknown>> }).clients;
    const coreClients = (coreSettings as { clients: Array<Record<string, unknown>> }).clients;
    expect(panelClients.length).toBe(coreClients.length);
    expect(panelClients[0]!.id).toBe(coreClients[0]!.id);
    expect(typeof panelClients[0]!.email).toBe("string");
    expect((panelClients[0]!.email as string).length).toBeGreaterThan(0);
    expect(coreClients[0]!.email).toBeUndefined();

    // Inside streamSettings, exactly three edits: the value raw→tcp and the key move.
    const panelStream = panel.streamSettings as Record<string, unknown>;
    const coreStream = core.streamSettings as Record<string, unknown>;
    expect(panelStream.security).toEqual(coreStream.security);
    expect(panelStream.realitySettings).toEqual(coreStream.realitySettings);
    expect(panelStream.tcpSettings).toEqual(coreStream.rawSettings);
  });

  it("adds a unique email per client derived from the UUID", () => {
    const cfg = xrayEngine.generate(input({ clientCount: 5 }));
    const panel = buildPanelInbound(cfg) as Record<string, unknown>;
    const settings = panel.settings as { clients: Array<Record<string, unknown>> };
    const emails = settings.clients.map((c) => String(c.email));
    expect(emails.every((e) => e.length > 0)).toBe(true);
    expect(new Set(emails).size).toBe(emails.length);
    // Default derivation is the UUID prefix.
    expect(emails[0]).toBe(String(settings.clients[0]!.id).slice(0, 8));
  });

  it("leaves the server inbound untouched (no email on the wire)", () => {
    const cfg = xrayEngine.generate(input({ clientCount: 3 }));
    const core = buildServerInbound(cfg) as Record<string, unknown>;
    const settings = core.settings as { clients: Array<Record<string, unknown>> };
    expect(settings.clients.every((c) => c.email === undefined)).toBe(true);
  });
});
