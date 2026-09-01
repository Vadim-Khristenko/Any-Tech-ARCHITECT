import { describe, it, expect } from "vitest";

import { awgEngine } from "../index";
import { linesToText } from "@/types/engine";

/**
 * The endpoint field has been in the form for a while, and a report came in
 * that whatever the visitor typed, the rendered config never carried it.
 * These tests pin the two ends: the engine renders a [Peer] section when an
 * endpoint is given, and the composable's output path — the same render the
 * view prints and the download saves — passes the field through.
 */
describe("endpoint in the rendered config", () => {
  it("a filled endpoint produces a [Peer] section", () => {
    const cfg = awgEngine.generate({
      ...awgEngine.createDefaults(),
      version: "3.1",
    });
    const lines = awgEngine.render(
      cfg,
      undefined,
      { endpoint: "203.0.113.10:51820" },
    );
    const text = linesToText(lines);
    expect(text).toContain("[Peer]");
    expect(text).toContain("Endpoint = 203.0.113.10:51820");
    expect(text).toContain("AllowedIPs = 0.0.0.0/0, ::/0");
  });

  it("an empty endpoint leaves the file as the parameter block alone", () => {
    const cfg = awgEngine.generate({
      ...awgEngine.createDefaults(),
      version: "3.1",
    });
    const lines = awgEngine.render(cfg, { endpoint: "   " });
    const text = linesToText(lines);
    expect(text).not.toContain("[Peer]");
    expect(text).not.toContain("Endpoint");
  });
});
