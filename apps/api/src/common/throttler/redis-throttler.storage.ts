import { Injectable, Logger } from "@nestjs/common";
import type { ThrottlerStorage } from "@nestjs/throttler";
import type { ThrottlerStorageRecord } from "@nestjs/throttler/dist/throttler-storage-record.interface";
import { RedisService } from "../../infra/redis/redis.service";

interface LocalRecord {
  totalHits: number;
  expiresAt: number;
  blockExpiresAt: number;
}

const INCREMENT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local pttl = redis.call("PTTL", KEYS[1])
if pttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  pttl = tonumber(ARGV[1])
end
return { current, pttl }
`;

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly fallbackStore = new Map<string, LocalRecord>();
  private lastWarnAt = 0;

  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string
  ): Promise<ThrottlerStorageRecord> {
    const redisKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `throttle:block:${throttlerName}:${key}`;

    try {
      const client = this.redis.client;

      if (blockDuration > 0) {
        const blockPttl = await client.pttl(blockKey);
        if (blockPttl > 0) {
          return {
            totalHits: limit + 1,
            timeToExpire: Math.ceil(ttl / 1000),
            isBlocked: true,
            timeToBlockExpire: Math.ceil(blockPttl / 1000),
          };
        }
      }

      const [totalHits, pttl] = (await client.eval(
        INCREMENT_SCRIPT,
        1,
        redisKey,
        String(ttl)
      )) as [number, number];

      const timeToExpire = Math.max(1, Math.ceil((pttl > 0 ? pttl : ttl) / 1000));

      if (blockDuration > 0 && totalHits > limit) {
        await client.set(blockKey, "1", "PX", blockDuration);
        return {
          totalHits,
          timeToExpire,
          isBlocked: true,
          timeToBlockExpire: Math.ceil(blockDuration / 1000),
        };
      }

      return {
        totalHits,
        timeToExpire,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    } catch (err: unknown) {
      const now = Date.now();
      if (now - this.lastWarnAt > 30_000) {
        this.lastWarnAt = now;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Redis throttler unavailable, using in-memory fallback: ${msg}`
        );
      }
      return this.incrementLocal(redisKey, ttl, limit, blockDuration);
    }
  }

  private incrementLocal(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number
  ): ThrottlerStorageRecord {
    const now = Date.now();
    // Opportunistically prune expired entries if map grows large
    if (this.fallbackStore.size > 5000) {
      for (const [k, rec] of this.fallbackStore) {
        if (rec.expiresAt <= now && rec.blockExpiresAt <= now) {
          this.fallbackStore.delete(k);
        }
      }
    }

    const existing = this.fallbackStore.get(key);
    if (existing && existing.blockExpiresAt > now) {
      return {
        totalHits: existing.totalHits,
        timeToExpire: Math.max(1, Math.ceil((existing.expiresAt - now) / 1000)),
        isBlocked: true,
        timeToBlockExpire: Math.max(
          1,
          Math.ceil((existing.blockExpiresAt - now) / 1000)
        ),
      };
    }

    if (!existing || existing.expiresAt <= now) {
      const record: LocalRecord = {
        totalHits: 1,
        expiresAt: now + ttl,
        blockExpiresAt: 0,
      };
      this.fallbackStore.set(key, record);
      return {
        totalHits: 1,
        timeToExpire: Math.ceil(ttl / 1000),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }

    existing.totalHits += 1;
    const isBlocked = blockDuration > 0 && existing.totalHits > limit;
    if (isBlocked) {
      existing.blockExpiresAt = now + blockDuration;
    }

    return {
      totalHits: existing.totalHits,
      timeToExpire: Math.max(1, Math.ceil((existing.expiresAt - now) / 1000)),
      isBlocked,
      timeToBlockExpire: isBlocked ? Math.ceil(blockDuration / 1000) : 0,
    };
  }
}
