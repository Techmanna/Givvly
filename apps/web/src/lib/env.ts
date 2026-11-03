import { z } from "zod";

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000/api/v1"),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z
    .string()
    .min(1)
    .default("pk_test_placeholder"),
  NEXT_PUBLIC_USE_MOCK_API: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_IMAGE_CDN: z.string().optional(),
});

export const serverEnvSchema = clientEnvSchema.extend({
  API_INTERNAL_URL: z.string().url().default("http://localhost:4000/api/v1"),
  JWT_PUBLIC_KEY: z.string().optional(),
  REVALIDATE_SECRET: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Important: Next.js only inlines `process.env.NEXT_PUBLIC_*` in the browser
 * when referenced via static dot-access (`process.env.NEXT_PUBLIC_FOO`).
 */
function getStaticRuntimeEnv(): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY:
      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    NEXT_PUBLIC_USE_MOCK_API: process.env.NEXT_PUBLIC_USE_MOCK_API,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_IMAGE_CDN: process.env.NEXT_PUBLIC_IMAGE_CDN,
    API_INTERNAL_URL: process.env.API_INTERNAL_URL,
    JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY,
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  };
}

export function parseClientEnv(
  raw: Record<string, string | undefined>
): ClientEnv {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: raw.NEXT_PUBLIC_APP_URL || undefined,
    NEXT_PUBLIC_API_URL: raw.NEXT_PUBLIC_API_URL || undefined,
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY:
      raw.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || undefined,
    NEXT_PUBLIC_USE_MOCK_API: raw.NEXT_PUBLIC_USE_MOCK_API || undefined,
    NEXT_PUBLIC_SENTRY_DSN: raw.NEXT_PUBLIC_SENTRY_DSN || undefined,
    NEXT_PUBLIC_POSTHOG_KEY: raw.NEXT_PUBLIC_POSTHOG_KEY || undefined,
    NEXT_PUBLIC_IMAGE_CDN: raw.NEXT_PUBLIC_IMAGE_CDN || undefined,
  });
}

export function parseServerEnv(
  raw: Record<string, string | undefined>
): ServerEnv {
  return serverEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: raw.NEXT_PUBLIC_APP_URL || undefined,
    NEXT_PUBLIC_API_URL: raw.NEXT_PUBLIC_API_URL || undefined,
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY:
      raw.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || undefined,
    NEXT_PUBLIC_USE_MOCK_API: raw.NEXT_PUBLIC_USE_MOCK_API || undefined,
    NEXT_PUBLIC_SENTRY_DSN: raw.NEXT_PUBLIC_SENTRY_DSN || undefined,
    NEXT_PUBLIC_POSTHOG_KEY: raw.NEXT_PUBLIC_POSTHOG_KEY || undefined,
    NEXT_PUBLIC_IMAGE_CDN: raw.NEXT_PUBLIC_IMAGE_CDN || undefined,
    API_INTERNAL_URL: raw.API_INTERNAL_URL || undefined,
    JWT_PUBLIC_KEY: raw.JWT_PUBLIC_KEY || undefined,
    REVALIDATE_SECRET: raw.REVALIDATE_SECRET || undefined,
    SENTRY_AUTH_TOKEN: raw.SENTRY_AUTH_TOKEN || undefined,
  });
}

export const clientEnv = parseClientEnv(getStaticRuntimeEnv());
export const env =
  typeof window === "undefined"
    ? parseServerEnv(getStaticRuntimeEnv())
    : clientEnv;

export function isMockApiEnabled(): boolean {
  if (process.env.NODE_ENV === "test") {
    return process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
  }
  const flag = process.env.NEXT_PUBLIC_USE_MOCK_API;
  if (flag === "false") {
    return false;
  }
  return true;
}
