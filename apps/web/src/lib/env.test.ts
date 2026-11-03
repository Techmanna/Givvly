import { describe, expect, it } from "vitest";
import { parseClientEnv, parseServerEnv } from "@/lib/env";

describe("env validation", () => {
  it("applies safe defaults for local development", () => {
    const parsed = parseClientEnv({});
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(parsed.NEXT_PUBLIC_API_URL).toBe("http://localhost:4000/api/v1");
  });

  it("rejects invalid URLs", () => {
    expect(() =>
      parseClientEnv({
        NEXT_PUBLIC_APP_URL: "not-a-url",
      })
    ).toThrow();
  });

  it("parses server env variables", () => {
    const parsed = parseServerEnv({
      API_INTERNAL_URL: "http://internal-api:4000/api/v1",
      REVALIDATE_SECRET: "secret-123",
    });
    expect(parsed.API_INTERNAL_URL).toBe("http://internal-api:4000/api/v1");
    expect(parsed.REVALIDATE_SECRET).toBe("secret-123");
  });
});

