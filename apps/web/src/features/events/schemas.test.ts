import { describe, expect, it } from "vitest";
import {
  eventStep1Schema,
  eventStep3Schema,
  eventStep4Schema,
  getLagosDateBounds,
  payoutSetupSchema,
  unlockEventSchema,
} from "./schemas";
import { eventKeys } from "./keys";

describe("eventKeys", () => {
  it("constructs deterministic keys", () => {
    expect(eventKeys.all).toEqual(["events"]);
    expect(eventKeys.mine()).toEqual(["events", "mine"]);
    expect(eventKeys.detail("evt_1")).toEqual(["events", "detail", "evt_1"]);
    expect(eventKeys.public("chidi-wedding")).toEqual([
      "events",
      "public",
      "chidi-wedding",
    ]);
  });
});

describe("eventStep1Schema", () => {
  const { minDate, maxDate } = getLagosDateBounds();

  it("accepts valid type, name, and date within bounds", () => {
    expect(
      eventStep1Schema.safeParse({
        type: "WEDDING",
        name: "Chidi & Amaka's Wedding",
        date: minDate,
      }).success
    ).toBe(true);
  });

  it("rejects past dates and dates beyond 3 years", () => {
    expect(
      eventStep1Schema.safeParse({
        type: "BIRTHDAY",
        name: "My Birthday",
        date: "2020-01-01",
      }).success
    ).toBe(false);

    expect(
      eventStep1Schema.safeParse({
        type: "BIRTHDAY",
        name: "My Birthday",
        date: `${Number(maxDate.slice(0, 4)) + 1}-01-01`,
      }).success
    ).toBe(false);
  });
});

describe("eventStep3Schema & unlockEventSchema", () => {
  it("requires 6-12 alphanumeric accessCode when PRIVATE", () => {
    expect(
      eventStep3Schema.safeParse({
        visibility: "PRIVATE",
        accessCode: "",
      }).success
    ).toBe(false);

    expect(
      eventStep3Schema.safeParse({
        visibility: "PRIVATE",
        accessCode: "CHIDI2026",
      }).success
    ).toBe(true);

    expect(
      unlockEventSchema.safeParse({ accessCode: "CHIDI2026" }).success
    ).toBe(true);
  });
});

describe("eventStep4Schema & payoutSetupSchema", () => {
  it("validates registry item price range (500 to 5,000,000 naira)", () => {
    expect(
      eventStep4Schema.safeParse({
        registryItems: [
          { id: "1", title: "Blender", targetPriceNaira: 45_000 },
        ],
      }).success
    ).toBe(true);

    expect(
      eventStep4Schema.safeParse({
        registryItems: [{ id: "1", title: "Too cheap", targetPriceNaira: 200 }],
      }).success
    ).toBe(false);
  });

  it("validates 10-digit account number and ownership checkbox on payoutSetupSchema", () => {
    expect(
      payoutSetupSchema.safeParse({
        bankCode: "058",
        accountNumber: "0123456789",
        accountName: "ADAOBI OKAFOR",
        confirmedOwnership: true,
      }).success
    ).toBe(true);

    expect(
      payoutSetupSchema.safeParse({
        bankCode: "058",
        accountNumber: "012345678",
        accountName: "ADAOBI OKAFOR",
        confirmedOwnership: true,
      }).success
    ).toBe(false);
  });
});

