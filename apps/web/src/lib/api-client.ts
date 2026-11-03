import type { ApiError, ApiMeta, ApiSuccess } from "@givvly/contracts";
import type { z } from "zod";
import { env, isMockApiEnabled } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/format";
import { handleMockApiRequest, MockApiError } from "@/lib/mocks/router";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;
  readonly requestId: string;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    details?: Record<string, string[]>;
    requestId: string;
  }) {
    super(params.message);
    this.name = "ApiClientError";
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
    this.requestId = params.requestId;
  }
}

export function isApiClientError(err: unknown): err is ApiClientError {
  if (err instanceof ApiClientError) return true;
  if (
    typeof err === "object" &&
    err !== null &&
    ("status" in err || "code" in err || (err as Error).name === "ApiClientError")
  ) {
    return true;
  }
  return false;
}

export type ApiRequestOptions<T> = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  schema?: z.ZodType<T>;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  signal?: AbortSignal;
};

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let refreshPromise: Promise<boolean> | null = null;
let onUnauthenticatedCallback: ((nextPath: string) => void) | null = null;

/**
 * Registers a callback (e.g., clearing `useAuthStore` and navigating via Next router)
 * when a token refresh fails.
 */
export function registerUnauthenticatedHandler(
  handler: (nextPath: string) => void
): void {
  onUnauthenticatedCallback = handler;
}

export function readCookie(name: string, cookieSource?: string): string | undefined {
  const source =
    cookieSource ?? (typeof document !== "undefined" ? document.cookie : "");
  if (!source) return undefined;
  const parts = source.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return undefined;
}

function getBaseUrl(): string {
  if (typeof window === "undefined") {
    return "API_INTERNAL_URL" in env && typeof env.API_INTERNAL_URL === "string"
      ? env.API_INTERNAL_URL
      : env.NEXT_PUBLIC_API_URL;
  }
  return env.NEXT_PUBLIC_API_URL;
}

async function getServerCookieHeader(): Promise<string | undefined> {
  if (typeof window !== "undefined") return undefined;
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const serialized = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    return serialized || undefined;
  } catch {
    return undefined;
  }
}

async function refreshSession(baseUrl: string): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const csrfToken = readCookie("givvly_csrf");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Request-Id": crypto.randomUUID(),
      };
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
      }
      const res = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers,
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function apiWithMeta<T>(
  path: string,
  opts: ApiRequestOptions<T> = {},
  isRetry = false
): Promise<ApiSuccess<T>> {
  const method = opts.method ?? (opts.body !== undefined ? "POST" : "GET");
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;
  const requestId = crypto.randomUUID();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
    ...opts.headers,
  };

  if (UNSAFE_METHODS.has(method)) {
    const csrfToken = readCookie("givvly_csrf");
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  if (opts.idempotencyKey) {
    headers["Idempotency-Key"] = opts.idempotencyKey;
  }

  if (typeof window === "undefined") {
    const serverCookie = await getServerCookieHeader();
    if (serverCookie && !headers["Cookie"]) {
      headers["Cookie"] = serverCookie;
    }
  }

  if (isMockApiEnabled()) {
    try {
      const mockEnvelope = await handleMockApiRequest<T>(normalizedPath, {
        method,
        body: opts.body,
        idempotencyKey: opts.idempotencyKey,
        cookieHeader:
          headers["Cookie"] ??
          (typeof document !== "undefined" ? document.cookie : undefined),
      });

      if (process.env.NODE_ENV === "development" && opts.schema) {
        const validation = opts.schema.safeParse(mockEnvelope.data);
        if (!validation.success) {
          console.warn(
            `[api-client:mock] Schema mismatch for ${method} ${normalizedPath}:`,
            validation.error.flatten()
          );
        }
      }

      return mockEnvelope;
    } catch (err) {
      if (isApiClientError(err) || err instanceof MockApiError) {
        const anyErr = err as {
          status?: number;
          code?: string;
          message?: string;
          details?: Record<string, string[]>;
          requestId?: string;
        };
        throw new ApiClientError({
          status: anyErr.status ?? 500,
          code: anyErr.code ?? "INTERNAL_ERROR",
          message: anyErr.message ?? "Mock error occurred",
          details: anyErr.details,
          requestId: anyErr.requestId ?? `mock_${Date.now()}`,
        });
      }
      throw err;
    }
  }

  const fetchInit: RequestInit & { next?: NextFetchRequestConfig } = {
    method,
    credentials: "include",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  };

  if (opts.cache) {
    fetchInit.cache = opts.cache;
  } else if (typeof window === "undefined" && !opts.next) {
    fetchInit.cache = "no-store";
  }

  if (opts.next) {
    fetchInit.next = opts.next;
  }

  let response: Response;
  try {
    response = await fetch(url, fetchInit);
  } catch (networkErr) {
    if (process.env.NODE_ENV !== "test") {
      try {
        const mockFallback = await handleMockApiRequest<T>(normalizedPath, {
          method,
          body: opts.body,
          idempotencyKey: opts.idempotencyKey,
          cookieHeader:
            headers["Cookie"] ??
            (typeof document !== "undefined" ? document.cookie : undefined),
        });
        return mockFallback;
      } catch (mockErr) {
        if (isApiClientError(mockErr) || mockErr instanceof MockApiError) {
          const anyErr = mockErr as {
            status?: number;
            code?: string;
            message?: string;
            details?: Record<string, string[]>;
            requestId?: string;
          };
          throw new ApiClientError({
            status: anyErr.status ?? 500,
            code: anyErr.code ?? "INTERNAL_ERROR",
            message: anyErr.message ?? "Mock request failed",
            details: anyErr.details,
            requestId: anyErr.requestId ?? `mock_${Date.now()}`,
          });
        }
      }
    }
    throw networkErr;
  }
  const responseText = await response.text();
  let parsed: unknown = null;

  if (responseText) {
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const errEnvelope = parsed as Partial<ApiError> | null;
    const code = errEnvelope?.error?.code ?? "INTERNAL_ERROR";
    const message =
      errEnvelope?.error?.message ??
      `Request failed with status ${response.status}`;
    const details = errEnvelope?.error?.details;
    const errRequestId = errEnvelope?.error?.requestId ?? requestId;

    if (
      response.status === 401 &&
      code === "TOKEN_EXPIRED" &&
      !isRetry &&
      typeof window !== "undefined"
    ) {
      const refreshed = await refreshSession(baseUrl);
      if (refreshed) {
        return apiWithMeta<T>(path, opts, true);
      }
      const nextPath = sanitizeNextPath(
        window.location.pathname + window.location.search,
        "/dashboard"
      );
      onUnauthenticatedCallback?.(nextPath);
    }

    throw new ApiClientError({
      status: response.status,
      code,
      message,
      details,
      requestId: errRequestId,
    });
  }

  const envelope = parsed as ApiSuccess<T> | null;
  if (!envelope || !("data" in envelope)) {
    throw new ApiClientError({
      status: response.status,
      code: "INVALID_RESPONSE",
      message: "Invalid response envelope from server",
      requestId,
    });
  }

  if (process.env.NODE_ENV === "development" && opts.schema) {
    const validation = opts.schema.safeParse(envelope.data);
    if (!validation.success) {
      console.warn(
        `[api-client] Schema mismatch for ${method} ${normalizedPath}:`,
        validation.error.flatten()
      );
    }
  }

  return {
    data: envelope.data,
    meta: envelope.meta as ApiMeta | undefined,
  };
}

export async function api<T>(
  path: string,
  opts: ApiRequestOptions<T> = {}
): Promise<T> {
  const result = await apiWithMeta<T>(path, opts);
  return result.data;
}
