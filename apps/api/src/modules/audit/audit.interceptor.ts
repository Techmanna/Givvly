import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { AuditService } from "./audit.service";

interface ActivitySummary {
  action: string;
  targetType: string;
  targetId: string;
  message: string;
  redirectPath?: string;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function stripPrefix(url: string): string {
  const withoutQuery = url.split("?")[0] || "/";
  return withoutQuery.replace(/^\/api\/v\d+/, "") || "/";
}

function buildActivitySummary(
  method: string,
  path: string,
  statusCode: number,
  body: Record<string, any> | undefined,
  responseData: any,
  actorLabel: string
): ActivitySummary {
  const segments = path.split("/").filter(Boolean);
  const failed = statusCode >= 400;

  // Auth routes
  if (segments[0] === "auth") {
    const sub = segments[1] || "session";
    const emailHint = body?.email ? ` (${String(body.email)})` : "";
    const map: Record<string, [string, string]> = {
      login: ["AUTH_LOGIN", `${actorLabel} signed in${emailHint}`],
      register: ["AUTH_REGISTER", `${actorLabel} registered a new account${emailHint}`],
      logout: ["AUTH_LOGOUT", `${actorLabel} signed out`],
      refresh: ["AUTH_REFRESH", `${actorLabel} refreshed session token`],
      "forgot-password": ["AUTH_PASSWORD_RESET_REQUEST", `Password reset requested${emailHint}`],
      "reset-password": ["AUTH_PASSWORD_RESET", "Completed password reset"],
      "verify-email": ["AUTH_EMAIL_VERIFY", "Verified email address"],
      "resend-verification": ["AUTH_RESEND_VERIFICATION", `Resent verification email${emailHint}`],
    };
    const [baseAction, okMsg] = map[sub] ?? [`AUTH_${sub.toUpperCase()}`, `${actorLabel} performed ${sub}`];
    return {
      action: failed ? `${baseAction}_FAILED` : baseAction,
      targetType: "AUTH",
      targetId: String(responseData?.user?.id || body?.email || "session"),
      message: failed ? `${okMsg} — failed (HTTP ${statusCode})` : okMsg,
      redirectPath: responseData?.user?.id
        ? `/admin/users?search=${encodeURIComponent(responseData.user.id)}`
        : "/admin/users",
    };
  }

  // Webhooks
  if (segments[0] === "webhooks") {
    const provider = segments[1] || "gateway";
    return {
      action: failed ? "WEBHOOK_FAILED" : "WEBHOOK_RECEIVED",
      targetType: "PAYMENT",
      targetId: String(body?.data?.reference || provider),
      message: failed
        ? `Webhook from ${provider} failed (HTTP ${statusCode})`
        : `Processed ${provider} webhook${body?.event ? ` (${body.event})` : ""}`,
      redirectPath: "/admin/payments",
    };
  }

  // Public guest actions
  if (segments[0] === "public" && segments[1] === "events" && segments[2]) {
    const slug = segments[2];
    const sub = segments[3] || "event";
    if (sub === "unlock") {
      return {
        action: failed ? "EVENT_UNLOCK_FAILED" : "EVENT_UNLOCKED",
        targetType: "EVENT",
        targetId: slug,
        message: failed
          ? `${actorLabel} failed to unlock private event "${slug}"`
          : `${actorLabel} unlocked private event "${slug}"`,
        redirectPath: `/e/${slug}`,
      };
    }
    if (sub === "rsvps") {
      return {
        action: failed ? "RSVP_SUBMIT_FAILED" : "RSVP_SUBMITTED",
        targetType: "EVENT",
        targetId: slug,
        message: `${actorLabel} submitted an RSVP for "${slug}"`,
        redirectPath: `/e/${slug}`,
      };
    }
    if (sub === "wall") {
      return {
        action: failed ? "WALL_POST_FAILED" : "WALL_POST_CREATED",
        targetType: "EVENT",
        targetId: slug,
        message: `${actorLabel} posted a wish on the Wall of Love for "${slug}"`,
        redirectPath: `/admin/moderation`,
      };
    }
    if (sub === "gifts") {
      const kind = segments[4] || "gift";
      return {
        action: failed ? "GIFT_INIT_FAILED" : `GIFT_${kind.toUpperCase()}_INITIATED`,
        targetType: "PAYMENT",
        targetId: String(responseData?.reference || slug),
        message: `${actorLabel} initiated a ${kind} gift for "${slug}"`,
        redirectPath: "/admin/payments",
      };
    }
    if (sub === "registry") {
      const op = segments[5] || "action";
      return {
        action: `REGISTRY_${op.toUpperCase()}`,
        targetType: "EVENT",
        targetId: String(segments[4] || slug),
        message: `${actorLabel} performed registry ${op} on "${slug}"`,
        redirectPath: `/e/${slug}`,
      };
    }
  }

  // Orders & custom quotes
  if (segments[0] === "orders") {
    const orderId = segments[1] && segments[1] !== "custom-quote" ? segments[1] : String(responseData?.id || responseData?.orderNumber || "new");
    const sub = segments[2] || (segments[1] === "custom-quote" ? "custom-quote" : method.toLowerCase());
    return {
      action: failed ? `ORDER_${sub.toUpperCase()}_FAILED` : `ORDER_${sub.toUpperCase()}`,
      targetType: "ORDER",
      targetId: orderId,
      message: `${actorLabel} ${method} order (${sub}) — ${failed ? `failed (${statusCode})` : "succeeded"}`,
      redirectPath:
        orderId && orderId !== "new" && orderId !== "quote"
          ? `/admin/orders/${orderId}`
          : "/admin/orders",
    };
  }

  // Host Events
  if (segments[0] === "events") {
    const eventId = segments[1] || String(responseData?.id || "event");
    const sub = segments[2] || method.toLowerCase();
    return {
      action: failed ? `EVENT_${sub.toUpperCase()}_FAILED` : `EVENT_${sub.toUpperCase()}`,
      targetType: "EVENT",
      targetId: eventId,
      message: `${actorLabel} ${method} event ${eventId} (${sub})`,
      redirectPath: "/admin/events",
    };
  }

  // Payouts
  if (segments[0] === "payouts" || segments[0]?.startsWith("payout-account")) {
    return {
      action: failed ? "PAYOUT_ACTION_FAILED" : "PAYOUT_ACTION",
      targetType: "PAYOUT",
      targetId: String(segments[1] || responseData?.id || "payout"),
      message: `${actorLabel} performed payout action (${method} ${path})`,
      redirectPath: "/admin/payouts",
    };
  }

  // Admin routes
  if (segments[0] === "admin") {
    const resource = segments[1] || "admin";
    const targetId = segments[2] || String(responseData?.id || "batch");
    const redirectMap: Record<string, string> = {
      orders: "/admin/orders",
      products: "/admin/products",
      events: "/admin/events",
      users: "/admin/users",
      payments: "/admin/payments",
      payouts: "/admin/payouts",
      moderation: "/admin/moderation",
      disputes: "/admin/disputes",
      shipping: "/admin/shipping",
      "shipping-zones": "/admin/shipping",
    };
    return {
      action: `ADMIN_${resource.toUpperCase()}_${method}`,
      targetType: resource.toUpperCase(),
      targetId,
      message: `Admin ${actorLabel} ${method} ${path}${failed ? ` (failed ${statusCode})` : ""}`,
      redirectPath: redirectMap[resource] ?? "/admin",
    };
  }

  // Fallback for any other endpoint (media, wallet, notifications, users, etc.)
  const root = (segments[0] || "SYSTEM").toUpperCase();
  return {
    action: failed ? `${root}_${method}_FAILED` : `${root}_${method}`,
    targetType: root,
    targetId: String(segments[1] || responseData?.id || "N/A"),
    message: `${actorLabel} ${method} ${path}${failed ? ` (HTTP ${statusCode})` : ""}`,
  };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Record<string, any>>();
    const res = context.switchToHttp().getResponse<Record<string, any>>();
    const method = String(req.method || "GET").toUpperCase();
    const rawPath = stripPrefix(String(req.originalUrl || req.url || "/"));

    // Skip health probes and reading audit logs to avoid noise/recursion
    if (
      rawPath.startsWith("/health") ||
      rawPath.startsWith("/admin/audit-logs")
    ) {
      return next.handle();
    }

    const isMutation = MUTATING_METHODS.has(method);
    const startedAt = Date.now();
    const forwardedIp =
      Array.isArray(req.ips) && req.ips.length > 0 ? req.ips[0] : undefined;
    const ip = String(
      forwardedIp || req.ip || req.socket?.remoteAddress || "unknown"
    );
    const userAgent =
      typeof req.headers?.["user-agent"] === "string"
        ? req.headers["user-agent"]
        : null;
    const requestId =
      typeof req.headers?.["x-request-id"] === "string"
        ? req.headers["x-request-id"]
        : undefined;

    const recordEvent = (statusCode: number, responseData?: any, errorMsg?: string) => {
      // Log all mutations (POST/PUT/PATCH/DELETE), plus security/server errors (401/403/429/5xx) on any method
      const isNotableError =
        statusCode === 401 ||
        statusCode === 403 ||
        statusCode === 429 ||
        statusCode >= 500;

      if (!isMutation && !isNotableError) {
        return;
      }

      const actorId: string | null =
        typeof req.user?.id === "string" ? req.user.id : null;
      const actorLabel = req.user?.email
        ? String(req.user.email)
        : actorId
          ? `User ${actorId.slice(0, 8)}`
          : `Guest (${ip})`;

      const summary = buildActivitySummary(
        method,
        rawPath,
        statusCode,
        req.body,
        responseData,
        actorLabel
      );

      this.auditService.record({
        actorId,
        action: summary.action,
        targetType: summary.targetType,
        targetId: summary.targetId,
        ip,
        userAgent,
        diff: {
          message: errorMsg ? `${summary.message}: ${errorMsg}` : summary.message,
          redirectPath: summary.redirectPath,
          method,
          path: rawPath,
          statusCode,
          durationMs: Date.now() - startedAt,
          requestId,
          actorType: actorId ? "AUTHENTICATED" : "GUEST",
          actorEmail: req.user?.email ?? undefined,
          actorRole: req.user?.role ?? undefined,
          body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
        },
      });
    };

    return next.handle().pipe(
      tap((data) => {
        const statusCode = Number(res?.statusCode) || 200;
        recordEvent(statusCode, data);
      }),
      catchError((err: unknown) => {
        const statusCode =
          err instanceof HttpException ? err.getStatus() : 500;
        const errorMsg =
          err instanceof Error ? err.message : "Unexpected error";
        recordEvent(statusCode, undefined, errorMsg);
        return throwError(() => err);
      })
    );
  }
}
