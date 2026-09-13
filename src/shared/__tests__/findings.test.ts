import { describe, it, expect, vi } from "bun:test";

import {
  error,
  warn,
  info,
  resolveFinding,
  describeFindings,
  groupFindings,
  findingsForField,
  sortFindings,
  hasErrors,
} from "../findings";
import ru from "@/i18n/locales/ru";

/**
 * Findings are data now: a code plus values, with the sentence produced from
 * the catalogue at read time. These tests hold the two halves together — a
 * code with no message would show a raw identifier to a user, and a message
 * with a placeholder nobody fills would print `{max}` verbatim.
 */

describe("building findings", () => {
  it("records level, field, code and values", () => {
    const f = error("S4", "awg.s4_too_big", { max: 32 });
    expect(f).toEqual({
      field: "S4",
      level: "error",
      code: "awg.s4_too_big",
      values: { max: 32 },
      line: undefined,
    });
  });

  it("keeps the line number when one is known", () => {
    expect(warn("H1", "parse.not_a_range", undefined, 7).line).toBe(7);
  });
});

describe("ordering", () => {
  it("puts errors before warnings before notes", () => {
    const sorted = sortFindings([
      info("a", "x"),
      warn("b", "y"),
      error("c", "z"),
    ]);
    expect(sorted.map((f) => f.level)).toEqual(["error", "warn", "info"]);
  });

  it("does not mutate the input", () => {
    const original = [info("a", "x"), error("c", "z")];
    const copy = [...original];
    sortFindings(original);
    expect(original).toEqual(copy);
  });

  it("answers whether anything is fatal", () => {
    expect(hasErrors([warn("a", "x")])).toBe(false);
    expect(hasErrors([warn("a", "x"), error("b", "y")])).toBe(true);
  });
});

describe("resolving to text", () => {
  it("uses the catalogue and fills placeholders", () => {
    const text = resolveFinding(
      error("MaxHandshakeAttempts", "awg3.attempts_zero"),
    );
    expect(text).toBe(ru["find.awg3.attempts_zero"]);
  });

  it("interpolates values", () => {
    const text = resolveFinding(
      error("H1", "parse.not_a_range", { key: "H1", version: "2.0" }),
    );
    expect(text).toContain("H1");
    expect(text).toContain("2.0");
    expect(text).not.toContain("{");
  });

  it("falls back to the bare code rather than to nothing", () => {
    // A visible identifier is a bug report; an empty string is a rule that
    // silently stopped being reported.
    // The missing-message warning is dev-only (CI runs with
    // NODE_ENV=production, where it never fires), so the test only owns the
    // noise: swallow it where it exists, pin the return value everywhere.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(resolveFinding(error("x", "no.such.code"))).toBe("no.such.code");
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("describes a whole list worst-first", () => {
    const texts = describeFindings([
      info("a", "awg3.cpa_zero"),
      error("b", "awg3.attempts_zero"),
    ]);
    expect(texts[0]).toBe(ru["find.awg3.attempts_zero"]);
  });
});

describe("every code used in the app has a message", () => {
  it("covers the AWG 3.0 and parse codes", () => {
    // The list mirrors what the validators and the parser emit. A code added
    // without a message would otherwise surface as a raw identifier.
    const codes = [
      "awg3.version_mismatch",
      "awg3.hpk_format",
      "awg3.s_below_nonce",
      "awg3.cpa_format",
      "awg3.cpa_zero",
      "awg3.timing_format",
      "awg3.timing_inverted",
      "awg3.reject_too_low",
      "awg3.rekey_after_reject",
      "awg3.attempts_zero",
      "parse.empty",
      "parse.not_awg",
      "parse.plain_wireguard",
      "parse.missing",
      "parse.not_a_number",
      "parse.not_a_range",
      "parse.unsupported_for_version",
      "parse.unknown_version",
    ];

    for (const code of codes) {
      expect(ru[`find.${code}` as keyof typeof ru], code).toBeTruthy();
    }
  });
});

describe("grouping for the UI", () => {
  it("omits levels with nothing in them", () => {
    const grouped = groupFindings([warn("a", "x"), warn("b", "y")]);
    expect(Object.keys(grouped)).toEqual(["warn"]);
  });

  it("finds what was said about one field, whatever its case", () => {
    const findings = [error("shortId", "a"), warn("S1", "b")];
    expect(findingsForField(findings, "shortid")).toHaveLength(1);
    expect(findingsForField(findings, "SHORTID")[0].code).toBe("a");
  });
});
