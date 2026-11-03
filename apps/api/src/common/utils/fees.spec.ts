import { calculateGiftFee, FeeConfig } from "./fees";

describe("Fee Calculation", () => {
  const defaultConfig: FeeConfig = {
    feeMode: "GUEST_PAYS",
    feeBps: 150, // 1.5%
    feeFlatKobo: 0,
    feeCapKobo: 200000, // ₦2,000 cap
  };

  it("calculates 1.5% fee correctly under GUEST_PAYS", () => {
    // ₦10,000 = 1,000,000 kobo
    // 1.5% = 15,000 kobo (₦150)
    const result = calculateGiftFee(1000000, defaultConfig);
    expect(result.amountKobo).toBe(1000000);
    expect(result.feeKobo).toBe(15000);
    expect(result.totalKobo).toBe(1015000);
    expect(result.payoutKobo).toBe(1000000);
  });

  it("applies fee cap when percentage exceeds cap", () => {
    // ₦200,000 = 20,000,000 kobo
    // 1.5% = 300,000 kobo (₦3,000) -> capped at 200,000 kobo (₦2,000)
    const result = calculateGiftFee(20000000, defaultConfig);
    expect(result.feeKobo).toBe(200000);
    expect(result.totalKobo).toBe(20200000);
    expect(result.payoutKobo).toBe(20000000);
  });

  it("deducts fee from owner payout under OWNER_PAYS", () => {
    const config: FeeConfig = {
      ...defaultConfig,
      feeMode: "OWNER_PAYS",
    };
    const result = calculateGiftFee(1000000, config);
    expect(result.amountKobo).toBe(1000000);
    expect(result.feeKobo).toBe(15000);
    expect(result.totalKobo).toBe(1000000);
    expect(result.payoutKobo).toBe(985000);
  });

  it("splits fee between guest and owner under SPLIT", () => {
    const config: FeeConfig = {
      ...defaultConfig,
      feeMode: "SPLIT",
    };
    const result = calculateGiftFee(1000000, config);
    expect(result.feeKobo).toBe(15000);
    expect(result.totalKobo).toBe(1007500); // 1,000,000 + 7,500
    expect(result.payoutKobo).toBe(992500); // 1,000,000 - 7,500
  });
});

