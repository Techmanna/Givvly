import { NextResponse, type NextRequest } from "next/server";
import { decodeJwt, importSPKI, jwtVerify, type JWTPayload } from "jose";
import type { Role } from "@givvly/contracts";
import { isMockApiEnabled } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/format";

export type AccessTokenClaims = JWTPayload & {
  sub?: string;
  role?: Role;
};

const AUTH_BOUNCE_PATHS = new Set(["/login", "/signup"]);

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/events",
  "/orders",
  "/account",
  "/vendor",
  "/admin",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function getRequiredRole(pathname: string): Role | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return "ADMIN";
  }
  return null;
}

export async function verifyAccessToken(
  token: string,
  publicKeyPem?: string
): Promise<AccessTokenClaims | null> {
  try {
    // Asymmetric key verification if configured
    const pem = publicKeyPem ?? process.env.JWT_PUBLIC_KEY;
    if (pem && pem.trim().length > 0) {
      const normalizedPem = pem.replace(/\\n/g, "\n");
      const alg = normalizedPem.includes("EC PUBLIC KEY") ? "ES256" : "RS256";
      const key = await importSPKI(normalizedPem, alg);
      const { payload } = await jwtVerify(token, key);
      return payload as AccessTokenClaims;
    }

    // Symmetric key verification matching NestJS API JWT_SECRET
    const secret = process.env.JWT_SECRET;
    if (secret && secret.trim().length > 0) {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(secret)
      );
      return payload as AccessTokenClaims;
    }

    // Fallback verification: decode token structure and check expiration
    const decoded = decodeJwt(token) as AccessTokenClaims;
    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof decoded.exp === "number" && decoded.exp <= nowSec) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const fullPath = `${pathname}${search}`;

  const accessCookie = request.cookies.get("givvly_at")?.value;
  const refreshCookie = request.cookies.get("givvly_rt")?.value;

  const claims: AccessTokenClaims | null = accessCookie
    ? await verifyAccessToken(accessCookie)
    : isMockApiEnabled() && !AUTH_BOUNCE_PATHS.has(pathname)
      ? {
          sub: "usr_adaobi_01",
          role: pathname.startsWith("/admin")
            ? "ADMIN"
            : "USER",
        }
      : null;

  // Bounce logged-in users away from /login and /signup (Section 5.1 & 5.4)
  if (AUTH_BOUNCE_PATHS.has(pathname)) {
    if (claims) {
      const nextParam = request.nextUrl.searchParams.get("next");
      const defaultRolePath =
        claims.role === "ADMIN"
          ? "/admin"
          : "/dashboard";
      const safeNext = nextParam
        ? sanitizeNextPath(nextParam, defaultRolePath)
        : defaultRolePath;
      return NextResponse.redirect(new URL(safeNext, request.url));
    }
    return NextResponse.next();
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // No valid access token
  if (!claims) {
    if (refreshCookie) {
      const refreshUrl = new URL("/api/auth/refresh", request.url);
      refreshUrl.searchParams.set("next", fullPath);
      return NextResponse.redirect(refreshUrl);
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", fullPath);
    return NextResponse.redirect(loginUrl);
  }

  // Vendor routes now redirect to admin console
  if (pathname === "/vendor" || pathname.startsWith("/vendor/")) {
    const adminPath = pathname.replace(/^\/vendor/, "/admin");
    return NextResponse.redirect(new URL(adminPath, request.url));
  }

  // Role check (Section 5.4)
  const requiredRole = getRequiredRole(pathname);
  if (requiredRole && claims.role !== requiredRole) {
    const fallbackUrl = new URL("/dashboard", request.url);
    fallbackUrl.searchParams.set("error", "forbidden");
    return NextResponse.redirect(fallbackUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/events/:path*",
    "/orders/:path*",
    "/account/:path*",
    "/vendor/:path*",
    "/admin/:path*",
    "/checkout/success",
    "/login",
    "/signup",
  ],
};

