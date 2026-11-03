import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/format";

function getBackendUrl(): string {
  return "API_INTERNAL_URL" in env && typeof env.API_INTERNAL_URL === "string"
    ? env.API_INTERNAL_URL.replace(/\/$/, "")
    : env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const nextParam = request.nextUrl.searchParams.get("next");
  const safeNext = sanitizeNextPath(nextParam, "/dashboard");
  const cookieHeader = request.headers.get("cookie") ?? "";
  const csrfToken = request.cookies.get("givvly_csrf")?.value;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-Id": crypto.randomUUID(),
  };

  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
  }
  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/auth/refresh`, {
      method: "POST",
      headers,
      cache: "no-store",
    });

    if (!backendResponse.ok) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", safeNext);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.cookies.delete("givvly_at");
      redirectResponse.cookies.delete("givvly_rt");
      return redirectResponse;
    }

    const destinationUrl = new URL(safeNext, request.url);
    const redirectResponse = NextResponse.redirect(destinationUrl);

    const setCookies =
      typeof backendResponse.headers.getSetCookie === "function"
        ? backendResponse.headers.getSetCookie()
        : [];

    for (const cookieStr of setCookies) {
      redirectResponse.headers.append("Set-Cookie", cookieStr);
    }

    return redirectResponse;
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", safeNext);
    return NextResponse.redirect(loginUrl);
  }
}

