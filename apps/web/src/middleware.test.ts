import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function buildFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

describe("middleware route guards (Section 5.4)", () => {
  it("redirects unauthenticated guest without refresh cookie to /login?next=", async () => {
    const req = new NextRequest("http://localhost:3000/dashboard?tab=gifts");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fdashboard%3Ftab%3Dgifts"
    );
  });

  it("redirects to /api/auth/refresh when givvly_at is missing/expired but givvly_rt exists", async () => {
    const req = new NextRequest("http://localhost:3000/dashboard", {
      headers: {
        cookie: "givvly_rt=refresh-token-123",
      },
    });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/api/auth/refresh?next=%2Fdashboard"
    );
  });

  it("allows guest users to access /events/new to draft events without redirect", async () => {
    const req = new NextRequest("http://localhost:3000/events/new");
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it("redirects USER hitting /admin to /dashboard?error=forbidden", async () => {
    const token = buildFakeJwt({
      sub: "u_1",
      role: "USER",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const req = new NextRequest("http://localhost:3000/admin/moderation", {
      headers: {
        cookie: `givvly_at=${token}`,
      },
    });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/dashboard?error=forbidden"
    );
  });

  it("bounces logged-in user away from /login to sanitized next path", async () => {
    const token = buildFakeJwt({
      sub: "u_1",
      role: "USER",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const req = new NextRequest(
      "http://localhost:3000/login?next=%2Fevents%2Fnew",
      {
        headers: {
          cookie: `givvly_at=${token}`,
        },
      }
    );
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/events/new"
    );
  });
});

