import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import * as crypto from "node:crypto";
import { Observable, throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { sanitizeForLog } from "../utils/log-sanitizer";

const SKIP_PATHS = new Set([
  "/api/v1/health",
  "/api/v1/health/live",
  "/api/v1/health/ready",
]);

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");
  private readonly isPretty = process.env.NODE_ENV !== "production";

  private formatBlock(label: string, value: unknown): string {
    const serialized = this.isPretty
      ? JSON.stringify(value, null, 2)
      : JSON.stringify(value);
    if (!this.isPretty) {
      return `${label}=${serialized}`;
    }
    const indented = serialized
      .split("\n")
      .map((line) => `      ${line}`)
      .join("\n");
    return `    ${label}:\n${indented}`;
  }

  private formatHeader(parts: Array<string | undefined | false>): string {
    return parts.filter(Boolean).join("  ");
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const path: string = req.originalUrl || req.url || "";
    if (SKIP_PATHS.has(path.split("?")[0])) {
      return next.handle();
    }

    const existingReqId = req.headers?.["x-request-id"];
    const requestId: string =
      (Array.isArray(existingReqId) ? existingReqId[0] : existingReqId) ||
      (typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `req_${Date.now()}`);

    if (req.headers) {
      req.headers["x-request-id"] = requestId;
    }
    if (typeof res?.setHeader === "function" && !res.headersSent) {
      res.setHeader("x-request-id", requestId);
    }

    const method: string = req.method || "GET";
    const ip: string =
      req.ip ||
      req.headers?.["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "unknown";
    const userAgent: string = req.headers?.["user-agent"] || "unknown";
    const userId: string | undefined = req.user?.id;
    const userRole: string | undefined = req.user?.role;
    const startNs = process.hrtime.bigint();

    const reqLines: string[] = [
      this.formatHeader([
        `--> ${method} ${path}`,
        `[req:${requestId}]`,
        userId ? `user=${userId}${userRole ? `(${userRole})` : ""}` : "user=guest",
        `ip=${ip}`,
      ]),
    ];

    if (this.isPretty) {
      reqLines.push(`    ua: ${userAgent}`);
    }
    if (req.params && Object.keys(req.params).length > 0) {
      reqLines.push(this.formatBlock("params", sanitizeForLog(req.params)));
    }
    if (req.query && Object.keys(req.query).length > 0) {
      reqLines.push(this.formatBlock("query", sanitizeForLog(req.query)));
    }
    if (
      req.body &&
      typeof req.body === "object" &&
      Object.keys(req.body).length > 0
    ) {
      reqLines.push(this.formatBlock("body", sanitizeForLog(req.body)));
    }

    this.logger.log(this.isPretty ? reqLines.join("\n") : reqLines.join(" "));

    return next.handle().pipe(
      tap((responseBody) => {
        const durationMs = Number(
          (process.hrtime.bigint() - startNs) / BigInt(1_000_000)
        );
        const statusCode: number = res?.statusCode || 200;

        // Avoid repeating envelope meta when TransformInterceptor wraps { success, data, meta }
        const payloadToLog =
          responseBody &&
          typeof responseBody === "object" &&
          "data" in responseBody &&
          "meta" in responseBody
            ? (responseBody as { data: unknown }).data
            : responseBody;

        const resLines: string[] = [
          this.formatHeader([
            `<-- ${method} ${path}`,
            `${statusCode}`,
            `${durationMs}ms`,
            `[req:${requestId}]`,
            userId ? `user=${userId}` : undefined,
            `ip=${ip}`,
          ]),
        ];

        // if (payloadToLog !== undefined) {
        //   resLines.push(
        //     this.formatBlock("response", sanitizeForLog(payloadToLog))
        //   );
        // }

        const line = this.isPretty ? resLines.join("\n") : resLines.join(" ");
        if (statusCode >= 400) {
          this.logger.warn(line);
        } else {
          this.logger.log(line);
        }
      }),
      catchError((err: unknown) => {
        const durationMs = Number(
          (process.hrtime.bigint() - startNs) / BigInt(1_000_000)
        );
        const statusCode =
          err instanceof HttpException ? err.getStatus() : 500;
        const errorMessage =
          err instanceof Error ? err.message : "Unhandled error";

        const errLines: string[] = [
          this.formatHeader([
            `<-- ${method} ${path}`,
            `${statusCode}`,
            `${durationMs}ms`,
            `[req:${requestId}]`,
            userId ? `user=${userId}` : undefined,
            `ip=${ip}`,
          ]),
          this.formatBlock("error", { statusCode, message: errorMessage }),
        ];

        const line = this.isPretty ? errLines.join("\n") : errLines.join(" ");
        if (statusCode >= 500) {
          this.logger.error(line);
        } else {
          this.logger.warn(line);
        }

        return throwError(() => err);
      })
    );
  }
}
