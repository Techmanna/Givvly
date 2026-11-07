import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatNaira,
  nairaToKobo,
  sanitizeNextPath,
} from "@/lib/format";

describe("formatNaira", () => {
  it("formats integer kobo into Naira currency string", () => {
    expect(formatNaira(50_000)).toContain("500");
    expect(formatNaira(1_000_000)).toContain("10,000");
    expect(formatNaira(0)).toContain("0");
  });

  it("throws when passed a float", () => {
    expect(() => formatNaira(100.5)).toThrow(
      "Money in kobo must be a safe integer"
    );
  });
});

describe("nairaToKobo", () => {
  it("converts integer naira to kobo", () => {
    expect(nairaToKobo(500)).toBe(50_000);
  });

  it("throws on non-integer naira", () => {
    expect(() => nairaToKobo(12.34)).toThrow(
      "Naira amount must be a safe integer"
    );
  });
});

describe("formatDate", () => {
  it("formats UTC ISO date in Africa/Lagos timezone", () => {
    expect(formatDate("2026-10-28T10:00:00Z", "yyyy-MM-dd HH:mm")).toBe(
      "2026-10-28 11:00"
    );
  });

  it("safely handles undefined, null, or invalid dates without throwing", () => {
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-valid-date")).toBe("—");
    expect(formatDate(new Date(NaN))).toBe("—");
    expect(formatDate("", "d MMM yyyy", undefined, "N/A")).toBe("N/A");
  });
});

describe("sanitizeNextPath", () => {
  it("allows valid relative paths starting with /", () => {
    expect(sanitizeNextPath("/events/123")).toBe("/events/123");
    expect(sanitizeNextPath("/dashboard?tab=gifts")).toBe(
      "/dashboard?tab=gifts"
    );
  });

  it("rejects protocol-relative or external URLs", () => {
    expect(sanitizeNextPath("//evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath("https://evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath("/\\evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath("")).toBe("/dashboard");
    expect(sanitizeNextPath(null)).toBe("/dashboard");
  });
});

