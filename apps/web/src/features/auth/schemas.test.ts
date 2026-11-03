import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  normalizeNigerianPhone,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from "@givvly/contracts";

describe("normalizeNigerianPhone", () => {
  it("normalizes local 0XXXXXXXXXX format to +234 E.164", () => {
    expect(normalizeNigerianPhone("08012345678")).toBe("+2348012345678");
    expect(normalizeNigerianPhone("+2349012345678")).toBe("+2349012345678");
  });

  it("returns null for invalid phone numbers", () => {
    expect(normalizeNigerianPhone("12345")).toBeNull();
    expect(normalizeNigerianPhone("+14155552671")).toBeNull();
  });
});

describe("signupSchema", () => {
  it("accepts valid signup input and normalizes email and phone", () => {
    const result = signupSchema.parse({
      name: "  Adaobi Okafor  ",
      email: "  Adaobi@Example.com ",
      phone: "08012345678",
      password: "SafePassword99!",
      terms: true,
    });

    expect(result.name).toBe("Adaobi Okafor");
    expect(result.email).toBe("adaobi@example.com");
    expect(result.phone).toBe("+2348012345678");
  });

  it("rejects common passwords, short passwords, or missing terms", () => {
    expect(
      signupSchema.safeParse({
        name: "Adaobi",
        email: "ada@example.com",
        password: "password123",
        terms: true,
      }).success
    ).toBe(false);

    expect(
      signupSchema.safeParse({
        name: "Adaobi",
        email: "ada@example.com",
        password: "Short1!",
        terms: true,
      }).success
    ).toBe(false);

    expect(
      signupSchema.safeParse({
        name: "Adaobi",
        email: "ada@example.com",
        password: "SafePassword99!",
        terms: false,
      }).success
    ).toBe(false);
  });
});

describe("loginSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema", () => {
  it("validates login and forgotPassword schemas", () => {
    expect(
      loginSchema.safeParse({ email: "user@givvly.ng", password: "secret" })
        .success
    ).toBe(true);
    expect(
      forgotPasswordSchema.safeParse({ email: "user@givvly.ng" }).success
    ).toBe(true);
    expect(verifyEmailSchema.safeParse({ token: "tok_123" }).success).toBe(
      true
    );
  });

  it("enforces matching passwords on resetPasswordSchema", () => {
    expect(
      resetPasswordSchema.safeParse({
        token: "tok_1",
        password: "SafePassword99!",
        confirmPassword: "DifferentPassword99!",
      }).success
    ).toBe(false);

    expect(
      resetPasswordSchema.safeParse({
        token: "tok_1",
        password: "SafePassword99!",
        confirmPassword: "SafePassword99!",
      }).success
    ).toBe(true);
  });
});

