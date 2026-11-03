import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/format";

function getBackendUrl(): string {
  return "API_INTERNAL_URL" in env && typeof env.API_INTERNAL_URL === "string"
    ? env.API_INTERNAL_URL.replace(/\/$/, "")
    : env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const safeNext = sanitizeNextPath(nextParam, "/dashboard");

  if (!code) {
    return NextResponse.redirect(new URL(safeNext, request.url));
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const headers: Record<string, string> = {
    "X-Request-Id": crypto.randomUUID(),
  };
  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
  }

  try {
    const callbackQuery = searchParams.toString();
    const backendResponse = await fetch(
      `${getBackendUrl()}/auth/google/callback?${callbackQuery}`,
      {
        method: "GET",
        headers,
        redirect: "manual",
        cache: "no-store",
      }
    );

    if (!backendResponse.ok && backendResponse.status >= 400) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "oauth_failed");
      return NextResponse.redirect(loginUrl);
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
    loginUrl.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(loginUrl);
  }
}

