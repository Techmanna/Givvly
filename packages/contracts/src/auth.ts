import { z } from "zod";

const COMMON_PASSWORDS = new Set([
  "password123",
  "password1234",
  "1234567890",
  "qwerty1234",
  "qwertyuiop1",
  "welcome123",
  "letmein123",
  "admin12345",
  "iloveyou12",
  "nigeria123",
  "givvly1234",
  "changeme12",
]);

export const NIGERIAN_PHONE_REGEX = /^(?:\+234|0)([789][01]\d{8})$/;

/**
 * Validates and normalizes a Nigerian phone number (`+234XXXXXXXXXX` or `0XXXXXXXXXX`)
 * into E.164 format (`+234XXXXXXXXXX`).
 */
export function normalizeNigerianPhone(input: string): string | null {
  const cleaned = input.replace(/[\s-]/g, "");
  const match = NIGERIAN_PHONE_REGEX.exec(cleaned);
  if (!match || !match[1]) {
    return null;
  }
  return `+234${match[1]}`;
}

export const passwordFieldSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(72, "Use at most 72 characters")
  .refine((val) => /[A-Za-z]/.test(val), {
    message: "Include at least one letter",
  })
  .refine((val) => /\d/.test(val), {
    message: "Include at least one number",
  })
  .refine((val) => !COMMON_PASSWORDS.has(val.toLowerCase()), {
    message: "Choose a less common password",
  });

export const optionalNigerianPhoneSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (val) => {
      if (!val) return true;
      return normalizeNigerianPhone(val) !== null;
    },
    {
      message:
        "Enter a valid Nigerian phone number (e.g. 08012345678 or +2348012345678)",
    }
  )
  .transform((val) => {
    if (!val) return undefined;
    return normalizeNigerianPhone(val) ?? undefined;
  });

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your name (at least 2 characters)")
    .max(60, "Name must be 60 characters or fewer"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .max(254, "Email must be 254 characters or fewer"),
  phone: optionalNigerianPhoneSchema,
  password: passwordFieldSchema,
  terms: z.boolean().refine((val) => val === true, {
    message: "Accept the terms and privacy policy to continue",
  }),
});

export type SignupInput = z.input<typeof signupSchema>;
export type SignupPayload = z.output<typeof signupSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter your email address")
    .email("Enter a valid email address")
    .max(254, "Email must be 254 characters or fewer"),
  password: z.string().min(1, "Enter your password"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter your email address")
    .email("Enter a valid email address")
    .max(254, "Email must be 254 characters or fewer"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is missing from the link"),
    password: passwordFieldSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match. Re-enter the same password",
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

