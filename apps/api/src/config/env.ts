import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  APP_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().url().default("http://localhost:4000"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((val) => val.split(",").map((s) => s.trim())),
  COOKIE_DOMAIN: z.string().optional(),

  DATABASE_URL: z.string().min(1).default("postgresql://givvly:givvly_password@localhost:5432/givvly_dev"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  // JWT & Security
  JWT_SECRET: z.string().min(16).default("dev_jwt_secret_super_secure_32_bytes_long"),
  ENCRYPTION_KEY: z
    .string()
    .length(64)
    .default("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
  ACCOUNT_HASH_KEY: z
    .string()
    .min(16)
    .default("dev_account_hash_key_for_hmac_32_bytes"),

  // Paystack
  PAYSTACK_SECRET_KEY: z.string().default("sk_test_mock_paystack_secret_key"),
  PAYSTACK_PUBLIC_KEY: z.string().default("pk_test_mock_paystack_public_key"),
  PAYSTACK_BASE_URL: z.string().url().default("https://api.paystack.co"),

  // BillSpot VTU (Airtime & Data)
  BILLSPOT_API_KEY: z.string().optional().default(""),
  BILLSPOT_BASE_URL: z.string().url().default("https://app.billspot.co/api/v1"),

  // Fees & Business Constraints
  FEE_MODE: z.enum(["GUEST_PAYS", "OWNER_PAYS", "SPLIT"]).default("GUEST_PAYS"),
  FEE_BPS: z.coerce.number().default(150),
  FEE_FLAT_KOBO: z.coerce.number().default(0),
  FEE_CAP_KOBO: z.coerce.number().default(200000),
  MIN_GIFT_KOBO: z.coerce.number().default(50000),
  MAX_GIFT_KOBO: z.coerce.number().default(100000000),

  // Mail
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  MAIL_FROM: z.string().default("Givvly <no-reply@givvly.ng>"),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.error("❌ Environment validation error:", result.error.format());
    throw new Error("Invalid application configuration");
  }
  return result.data;
}

