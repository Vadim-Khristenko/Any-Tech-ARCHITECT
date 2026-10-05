import { describe, it, expect } from "bun:test";

import {
  estimateSeconds,
  kindTable,
  summarise,
  toResult,
  type PacketKind,
  type SimPacket,
} from "../simulation";

/**
 * The model each protocol's simulator is built on. What matters is that the
 * totals are derived from the kind table rather than from a list of names, so
 * a protocol that adds a kind gets it counted without editing this file.
 */

const KINDS: readonly PacketKind[] = [
  {
    id: "handshake",
    label: "Handshake",
    accent: "#000",
    descriptionKey: "x",
    weight: "overhead",
  },
  {
    id: "data",
    label: "Data",
    accent: "#fff",
    descriptionKey: "y",
    weight: "payload",
  },
];

const { table, legend } = kindTable(KINDS);

const packet = (kind: string, size: number): SimPacket => ({
  id: 0,
  step: "1",
  kind,
  label: kind,
  from: "client",
  to: "server",
  size,
  payload: size,
  description: "",
});

describe("kindTable", () => {
  it("indexes by id and keeps the declared order as the legend", () => {
    expect(legend).toEqual(["handshake", "data"]);
    expect(table.data?.label).toBe("Data");
  });
});

describe("summarise", () => {
  it("splits payload from overhead by the kind's weight", () => {
    const totals = summarise(
      [packet("handshake", 500), packet("data", 1500)],
      table,
    );

    expect(totals.totalBytes).toBe(2000);
    expect(totals.payloadBytes).toBe(1500);
    expect(totals.overheadBytes).toBe(500);
    expect(totals.overheadShare).toBeCloseTo(0.25);
  });

  it("counts bytes per kind", () => {
    const totals = summarise(
      [packet("data", 100), packet("data", 200), packet("handshake", 50)],
      table,
    );

    expect(totals.byKind).toEqual({ data: 300, handshake: 50 });
  });

  it("counts an unknown kind as overhead rather than dropping it", () => {
    // An unknown kind is an engine bug. Losing its bytes would make the
    // traffic look leaner than it is, which is the wrong way to be wrong.
    const totals = summarise([packet("mystery", 400)], table);

    expect(totals.totalBytes).toBe(400);
    expect(totals.overheadBytes).toBe(400);
    expect(totals.payloadBytes).toBe(0);
  });

  it("has no opinion about an empty run", () => {
    const totals = summarise([], table);

    expect(totals.totalBytes).toBe(0);
    // Not NaN: an empty run divides by zero if this is computed naively.
    expect(totals.overheadShare).toBe(0);
  });
});

describe("estimateSeconds", () => {
  it("converts bytes to seconds at the reference upstream", () => {
    // 10 Mbit/s is 1.25 MB/s, so 1.25 MB takes a second.
    expect(estimateSeconds(1_250_000)).toBe(1);
  });

  it("accepts another link speed", () => {
    expect(estimateSeconds(1_250_000, 100)).toBe(0.1);
  });

  it("rounds to the millisecond rather than printing float noise", () => {
    expect(String(estimateSeconds(1234))).toBe("0.001");
  });
});

describe("toResult", () => {
  it("derives totals and the estimate from the packets alone", () => {
    const result = toResult([packet("data", 1_250_000)], table);

    expect(result.packets).toHaveLength(1);
    expect(result.totals.payloadBytes).toBe(1_250_000);
    expect(result.estSeconds10mbps).toBe(1);
  });
});
