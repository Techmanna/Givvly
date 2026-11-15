import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req.user?.id;
    if (typeof userId === "string" && userId.length > 0) {
      return `user:${userId}`;
    }

    const forwardedIp =
      Array.isArray(req.ips) && req.ips.length > 0 ? req.ips[0] : undefined;
    const rawIp =
      forwardedIp || req.ip || req.socket?.remoteAddress || "unknown";
    return `ip:${String(rawIp)}`;
  }
}
