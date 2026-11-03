import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiClientError, readCookie } from "@/lib/api-client";

describe("api-client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    document.cookie = "givvly_csrf=csrf-token-123";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("reads cookie by name", () => {
    expect(readCookie("givvly_csrf", "foo=bar; givvly_csrf=abc123")).toBe(
      "abc123"
    );
  });

  it("sends credentials, X-Request-Id, and parses envelope data", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: { id: "evt_1" } }),
    });
    global.fetch = fetchMock;

    const result = await api<{ id: string }>("/events/evt_1");
    expect(result).toEqual({ id: "evt_1" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/v1/events/evt_1");
    expect(init.credentials).toBe("include");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Request-Id"]).toBeDefined();
  });

  it("attaches X-CSRF-Token and Idempotency-Key on POST requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ data: { reference: "ref_1" } }),
    });
    global.fetch = fetchMock;

    await api("/public/events/birthday/gifts/money", {
      method: "POST",
      body: { amountKobo: 100_000 },
      idempotencyKey: "idem-uuid-1",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-CSRF-Token"]).toBe("csrf-token-123");
    expect(headers["Idempotency-Key"]).toBe("idem-uuid-1");
  });

  it("throws ApiClientError with parsed error envelope on non-2xx", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () =>
        JSON.stringify({
          error: {
            code: "VALIDATION_FAILED",
            message: "Invalid input",
            details: { email: ["Invalid email"] },
            requestId: "req_99",
          },
        }),
    });

    await expect(api("/auth/register", { method: "POST", body: {} })).rejects.toMatchObject({
      name: "ApiClientError",
      status: 422,
      code: "VALIDATION_FAILED",
      message: "Invalid input",
      details: { email: ["Invalid email"] },
      requestId: "req_99",
    } satisfies Partial<ApiClientError>);
  });

  it("replays request once after successful 401 TOKEN_EXPIRED refresh", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({
            error: {
              code: "TOKEN_EXPIRED",
              message: "Expired",
              requestId: "req_1",
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: { ok: true } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: { id: "user_1" } }),
      });

    global.fetch = fetchMock;

    const user = await api<{ id: string }>("/auth/me");
    expect(user).toEqual({ id: "user_1" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

