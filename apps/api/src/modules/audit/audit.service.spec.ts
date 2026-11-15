import { AuditService, sanitizeAuditData } from "./audit.service";

describe("AuditService", () => {
  it("redacts sensitive fields in audit payloads", () => {
    const sanitized = sanitizeAuditData({
      email: "host@givvly.store",
      password: "super-secret-password",
      accessCode: "1234",
      nested: {
        refreshToken: "rt_secret",
        note: "Updated settings",
      },
    }) as Record<string, any>;

    expect(sanitized.email).toBe("host@givvly.store");
    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.accessCode).toBe("[REDACTED]");
    expect(sanitized.nested.refreshToken).toBe("[REDACTED]");
    expect(sanitized.nested.note).toBe("Updated settings");
  });

  it("writes audit logs fire-and-forget and never throws if Prisma fails", async () => {
    const prismaMock = {
      auditLog: {
        create: jest.fn().mockRejectedValue(new Error("DB offline")),
      },
    } as any;

    const service = new AuditService(prismaMock);
    expect(() =>
      service.record({
        actorId: null,
        action: "AUTH_LOGIN_FAILED",
        targetType: "AUTH",
        targetId: "guest@test.com",
        ip: "203.0.113.10",
        diff: { message: "Guest failed login", password: "secret" },
      })
    ).not.toThrow();

    await new Promise((r) => setTimeout(r, 10));
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: null,
          action: "AUTH_LOGIN_FAILED",
          diff: expect.objectContaining({
            message: "Guest failed login",
            password: "[REDACTED]",
          }),
        }),
      })
    );
  });

  it("queries and enriches audit logs with actor details and redirectPath", async () => {
    const now = new Date("2026-11-15T01:00:00.000Z");
    const prismaMock = {
      auditLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "audit_1",
            actorId: "user_1",
            action: "ORDER_CREATE",
            targetType: "ORDER",
            targetId: "ord_1",
            ip: "127.0.0.1",
            userAgent: "Mozilla/5.0",
            diff: {
              message: "Created order ord_1",
              redirectPath: "/admin/orders/ord_1",
              method: "POST",
              statusCode: 201,
              durationMs: 42,
            },
            createdAt: now,
          },
          {
            id: "audit_2",
            actorId: null,
            action: "RSVP_SUBMITTED",
            targetType: "EVENT",
            targetId: "tola-emeka",
            ip: "198.51.100.5",
            userAgent: "Safari",
            diff: {
              message: 'Guest (198.51.100.5) submitted an RSVP for "tola-emeka"',
              redirectPath: "/e/tola-emeka",
              method: "POST",
              statusCode: 201,
              durationMs: 18,
            },
            createdAt: now,
          },
        ]),
        count: jest
          .fn()
          .mockResolvedValueOnce(2)
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(1),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "user_1",
            name: "Adaeze",
            email: "adaeze@givvly.store",
            role: "USER",
          },
        ]),
      },
    } as any;

    const service = new AuditService(prismaMock);
    const res = await service.queryLogs({ page: 1, limit: 25 });

    expect(res.meta.total).toBe(2);
    expect(res.meta.authenticatedCount).toBe(1);
    expect(res.meta.guestCount).toBe(1);
    expect(res.items[0]?.actor?.email).toBe("adaeze@givvly.store");
    expect(res.items[0]?.redirectPath).toBe("/admin/orders/ord_1");
    expect(res.items[1]?.isAuthenticated).toBe(false);
    expect(res.items[1]?.redirectPath).toBe("/e/tola-emeka");
  });
});
