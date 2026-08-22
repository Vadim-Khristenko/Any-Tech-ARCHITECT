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

  it("changes nothing but the two names", () => {
    const cfg = xrayEngine.generate(input({ transport: "raw" }));
    const panel = buildPanelInbound(cfg) as Record<string, unknown>;
    const core = buildServerInbound(cfg) as Record<string, unknown>;

    // Everything outside streamSettings is byte-for-byte the same object.
    const { streamSettings: _panelStream, ...panelRest } = panel;
    const { streamSettings: _coreStream, ...coreRest } = core;
    expect(panelRest).toEqual(coreRest);

    // Inside it, exactly three edits: the value raw→tcp and the key move.
    const panelStream = panel.streamSettings as Record<string, unknown>;
    const coreStream = core.streamSettings as Record<string, unknown>;
    expect(panelStream.security).toEqual(coreStream.security);
    expect(panelStream.realitySettings).toEqual(coreStream.realitySettings);
    expect(panelStream.tcpSettings).toEqual(coreStream.rawSettings);
  });
});
