import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/infra/prisma/prisma.service";

export interface RecordAuditParams {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  ip?: string | null;
  userAgent?: string | null;
  diff?: Record<string, unknown>;
}

export interface AuditLogQuery {
  search?: string;
  targetType?: string;
  action?: string;
  authState?: "ALL" | "AUTHENTICATED" | "GUEST";
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "newpassword",
  "currentpassword",
  "confirmpassword",
  "token",
  "refreshtoken",
  "accesstoken",
  "secret",
  "accesscode",
  "pin",
  "cvv",
  "cardnumber",
  "authorization",
  "cookie",
  "cookies",
]);

export function sanitizeAuditData(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 4) return "[truncated]";
  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeAuditData(item, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = sanitizeAuditData(v, depth + 1);
    }
  }
  return out;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Strictly fire-and-forget audit recorder. Never throws or blocks callers.
   */
  record(params: RecordAuditParams): void {
    void this.write(params);
  }

  private async write(params: RecordAuditParams): Promise<void> {
    try {
      const sanitizedDiff = params.diff
        ? (sanitizeAuditData(params.diff) as Record<string, unknown>)
        : undefined;

      await this.prisma.auditLog.create({
        data: {
          actorId: params.actorId ?? null,
          action: params.action,
          targetType: params.targetType,
          targetId: params.targetId || "N/A",
          ip: params.ip ?? null,
          userAgent: params.userAgent ? params.userAgent.slice(0, 500) : null,
          diff: sanitizedDiff
            ? JSON.parse(JSON.stringify(sanitizedDiff))
            : undefined,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Fire-and-forget audit log write failed: ${msg}`);
    }
  }

  async queryLogs(query: AuditLogQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.targetType && query.targetType !== "ALL") {
      where.targetType = query.targetType;
    }

    if (query.action && query.action !== "ALL") {
      where.action = { contains: query.action, mode: "insensitive" };
    }

    if (query.authState === "AUTHENTICATED") {
      where.actorId = { not: null };
    } else if (query.authState === "GUEST") {
      where.actorId = null;
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        const fromDate = new Date(query.from);
        if (!Number.isNaN(fromDate.getTime())) where.createdAt.gte = fromDate;
      }
      if (query.to) {
        const toDate = new Date(query.to);
        if (!Number.isNaN(toDate.getTime())) where.createdAt.lte = toDate;
      }
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { targetType: { contains: search, mode: "insensitive" } },
        { targetId: { contains: search, mode: "insensitive" } },
        { ip: { contains: search, mode: "insensitive" } },
        { actorId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total, authenticatedCount, guestCount] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.count({
        where: { ...where, actorId: { not: null } },
      }),
      this.prisma.auditLog.count({
        where: { ...where, actorId: null },
      }),
    ]);

    const actorIds = Array.from(
      new Set(
        items
          .map((item) => item.actorId)
          .filter((id): id is string => Boolean(id))
      )
    );

    const actors =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true, email: true, role: true },
          })
        : [];

    const actorMap = new Map(actors.map((a) => [a.id, a]));

    const enriched = items.map((item) => {
      const diffObj =
        item.diff && typeof item.diff === "object" && !Array.isArray(item.diff)
          ? (item.diff as Record<string, any>)
          : {};
      const actor = item.actorId ? actorMap.get(item.actorId) ?? null : null;

      return {
        id: item.id,
        actorId: item.actorId,
        actor,
        isAuthenticated: Boolean(item.actorId),
        action: item.action,
        targetType: item.targetType,
        targetId: item.targetId,
        ip: item.ip,
        userAgent: item.userAgent,
        message:
          typeof diffObj.message === "string"
            ? diffObj.message
            : `${item.action} on ${item.targetType} (${item.targetId})`,
        redirectPath:
          typeof diffObj.redirectPath === "string" ? diffObj.redirectPath : null,
        method: typeof diffObj.method === "string" ? diffObj.method : null,
        path: typeof diffObj.path === "string" ? diffObj.path : null,
        statusCode:
          typeof diffObj.statusCode === "number" ? diffObj.statusCode : null,
        durationMs:
          typeof diffObj.durationMs === "number" ? diffObj.durationMs : null,
        diff: item.diff,
        createdAt: item.createdAt.toISOString(),
      };
    });

    return {
      items: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        authenticatedCount,
        guestCount,
      },
    };
  }
}
