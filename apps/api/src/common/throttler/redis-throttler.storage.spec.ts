import { RedisThrottlerStorage } from "./redis-throttler.storage";
import { AppThrottlerGuard } from "./app-throttler.guard";

describe("RedisThrottlerStorage", () => {
  it("uses Redis Lua increment when Redis is available", async () => {
    const evalMock = jest
      .fn()
      .mockResolvedValueOnce([1, 10_000])
      .mockResolvedValueOnce([2, 9_500]);
    const redisMock = {
      client: {
        eval: evalMock,
        pttl: jest.fn().mockResolvedValue(-2),
        set: jest.fn(),
      },
    } as any;

    const storage = new RedisThrottlerStorage(redisMock);
    const first = await storage.increment("ip:1.2.3.4", 10_000, 5, 0, "short");
    const second = await storage.increment("ip:1.2.3.4", 10_000, 5, 0, "short");

    expect(first).toEqual({
      totalHits: 1,
      timeToExpire: 10,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
    expect(second).toEqual({
      totalHits: 2,
      timeToExpire: 10,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
    expect(evalMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to in-memory counting when Redis throws", async () => {
    const redisMock = {
      client: {
        eval: jest.fn().mockRejectedValue(new Error("ECONNREFUSED")),
        pttl: jest.fn().mockRejectedValue(new Error("ECONNREFUSED")),
      },
    } as any;

    const storage = new RedisThrottlerStorage(redisMock);
    const r1 = await storage.increment("ip:9.9.9.9", 10_000, 2, 5_000, "short");
    const r2 = await storage.increment("ip:9.9.9.9", 10_000, 2, 5_000, "short");
    const r3 = await storage.increment("ip:9.9.9.9", 10_000, 2, 5_000, "short");

    expect(r1.totalHits).toBe(1);
    expect(r1.isBlocked).toBe(false);
    expect(r2.totalHits).toBe(2);
    expect(r2.isBlocked).toBe(false);
    expect(r3.totalHits).toBe(3);
    expect(r3.isBlocked).toBe(true);
    expect(r3.timeToBlockExpire).toBe(5);
  });
});

describe("AppThrottlerGuard", () => {
  it("tracks authenticated users by user ID and anonymous callers by forwarded/client IP", async () => {
    const guard = new (AppThrottlerGuard as any)(
      [],
      {} as any,
      {} as any
    );

    const authTracker = await guard.getTracker({
      user: { id: "user_123" },
      ip: "10.0.0.1",
    });
    expect(authTracker).toBe("user:user_123");

    const anonForwardedTracker = await guard.getTracker({
      ips: ["203.0.113.42", "10.0.0.1"],
      ip: "10.0.0.1",
    });
    expect(anonForwardedTracker).toBe("ip:203.0.113.42");

    const anonIpTracker = await guard.getTracker({
      ip: "198.51.100.7",
    });
    expect(anonIpTracker).toBe("ip:198.51.100.7");
  });
});
