import { describe, expect, it } from "vitest";
import { formatDate, formatNumber, formatPercent, formatRelative, formatUsd, parseUsd, shortAddress, unitsToInput } from "@/lib/format";

describe("formatUsd", () => {
  it("always shows a dollar sign and two decimals, rounding down to the cent", () => {
    expect(formatUsd(BigInt(0))).toBe("$0.00");
    expect(formatUsd(BigInt(170_000_000))).toBe("$170.00");
    expect(formatUsd(BigInt(1_234_567_890))).toBe("$1,234.56");
    expect(formatUsd(BigInt(9_999))).toBe("$0.00");
  });

  it("uses Devanagari digits in Nepali", () => {
    expect(formatUsd(BigInt(170_500_000), "ne")).toBe("$१७०.५०");
  });
});

describe("parseUsd", () => {
  it("reads typed amounts into base units", () => {
    expect(parseUsd("200")).toBe(BigInt(200_000_000));
    expect(parseUsd("64.01")).toBe(BigInt(64_010_000));
    expect(parseUsd(" 1,000.5 ")).toBe(BigInt(1_000_500_000));
    expect(parseUsd("0.000001")).toBe(BigInt(1));
  });

  it("refuses anything that is not a positive amount", () => {
    for (const text of ["", "0", "-5", "abc", "1.2.3", "0.0000001", "1e3"]) expect(parseUsd(text)).toBeNull();
  });

  it("round-trips through unitsToInput", () => {
    for (const units of [BigInt(1), BigInt(200_000_000), BigInt(64_010_000)]) expect(parseUsd(unitsToInput(units))).toBe(units);
  });
});

describe("small formats", () => {
  it("shortens addresses and formats shares", () => {
    expect(shortAddress("GHmZ7YCiQNHJQZHTGZfK3oJBfjRWFspKU47HcWaGTiKj")).toBe("GHmZ…TiKj");
    expect(formatPercent(1500)).toBe("15%");
    expect(formatPercent(1250)).toBe("12.5%");
  });
});

describe("Nepali dates and numbers", () => {
  // 15 Nov 2026, 12:00 UTC: the same calendar day in every time zone the tests run in.
  const ts = Date.UTC(2026, 10, 15, 12) / 1000;

  it("uses Nepali month names and digits", () => {
    expect(formatDate(ts, "ne")).toBe("१५ नोभेम्बर २०२६");
    expect(formatDate(ts, "en")).toBe("15 Nov 2026");
  });

  it("says how long until or since in Nepali", () => {
    expect(formatRelative(ts + 3 * 86_400, ts, "ne")).toBe("३ दिनमा");
    expect(formatRelative(ts - 2 * 3_600, ts, "ne")).toBe("२ घण्टाअघि");
    expect(formatRelative(ts + 3 * 86_400, ts, "en")).toBe("in 3 days");
  });

  it("groups large numbers the Nepali way", () => {
    expect(formatNumber(1234567, "ne")).toBe("१२,३४,५६७");
    expect(formatNumber(1234567, "en")).toBe("1,234,567");
    expect(formatPercent(1500, "ne")).toBe("१५%");
  });
});
