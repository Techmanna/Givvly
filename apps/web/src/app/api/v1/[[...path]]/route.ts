import { NextRequest, NextResponse } from "next/server";

function getTargetBackendUrl(): string {
  const candidate =
    process.env.API_INTERNAL_URL ||
    process.env.BACKEND_API_URL ||
    (process.env.NEXT_PUBLIC_API_URL?.startsWith("http")
      ? process.env.NEXT_PUBLIC_API_URL
      : "") ||
    "http://localhost:4000/api/v1";

  return candidate.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
}

async function handleProxy(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await context.params;
  const pathStr = path && path.length > 0 ? path.join("/") : "";
  const search = request.nextUrl.search;
  const backendBase = getTargetBackendUrl();
  const targetUrl = `${backendBase}/api/v1${pathStr ? `/${pathStr}` : ""}${search}`;

  const requestHeaders = new Headers();
  request.headers.forEach((val, key) => {
    const lower = key.toLowerCase();
    // Do not forward host or connection headers
    if (lower !== "host" && lower !== "connection") {
      requestHeaders.set(key, val);
    }
  });

  const body =
    ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await request.arrayBuffer();

  try {
    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers: requestHeaders,
      body,
      redirect: "manual",
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    backendResponse.headers.forEach((val, key) => {
      if (key.toLowerCase() !== "set-cookie") {
        responseHeaders.set(key, val);
      }
    });

    const res = new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });

    // Forward Set-Cookie headers as first-party cookies for the current domain
    const cookies =
      typeof backendResponse.headers.getSetCookie === "function"
        ? backendResponse.headers.getSetCookie()
        : [];

    for (const cookie of cookies) {
      // Remove any explicit domain parameter so the cookie binds to the current origin
      const cleanedCookie = cookie.replace(/;\s*Domain=[^;]+/gi, "");
      res.headers.append("Set-Cookie", cleanedCookie);
    }

    return res;
  } catch (err: any) {
    console.error(`[api-proxy] Failed to proxy request to ${targetUrl}:`, err.message);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: "Unable to connect to backend API service",
        },
      },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const HEAD = handleProxy;
export const OPTIONS = handleProxy;

