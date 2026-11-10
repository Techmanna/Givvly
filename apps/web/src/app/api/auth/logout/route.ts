import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

function getBackendUrl(): string {
  return "API_INTERNAL_URL" in env && typeof env.API_INTERNAL_URL === "string"
    ? env.API_INTERNAL_URL.replace(/\/$/, "")
    : env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
}

function clearAuthCookies(response: NextResponse): void {
  const cookieNames = ["givvly_at", "givvly_rt", "givvly_csrf"];
  for (const name of cookieNames) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: name !== "givvly_csrf",
      sameSite: "lax",
    });
    response.cookies.delete(name);
  }

  // Explicit Set-Cookie headers with Max-Age=0 and epoch date
  const expiredCookies = [
    "givvly_at=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax",
    "givvly_rt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax",
    "givvly_csrf=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=Lax",
    "givvly_at=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0",
    "givvly_rt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0",
    "givvly_csrf=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0",
  ];

  for (const cookieHeader of expiredCookies) {
    response.headers.append("Set-Cookie", cookieHeader);
  }
}

export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const csrfToken = request.cookies.get("givvly_csrf")?.value;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Request-Id": crypto.randomUUID(),
    };
    if (cookieHeader) headers["Cookie"] = cookieHeader;
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;

    await fetch(`${getBackendUrl()}/auth/logout`, {
      method: "POST",
      headers,
      cache: "no-store",
    });
  } catch (err: unknown) {
    console.warn("[/api/auth/logout] Upstream logout warning:", err);
  }

  const response = NextResponse.json({
    success: true,
    message: "Signed out successfully",
  });
  clearAuthCookies(response);
  return response;
}

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const csrfToken = request.cookies.get("givvly_csrf")?.value;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Request-Id": crypto.randomUUID(),
    };
    if (cookieHeader) headers["Cookie"] = cookieHeader;
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;

    await fetch(`${getBackendUrl()}/auth/logout`, {
      method: "POST",
      headers,
      cache: "no-store",
    });
  } catch {
    // Ignore upstream errors
  }

  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl);
  clearAuthCookies(response);
  return response;
}
