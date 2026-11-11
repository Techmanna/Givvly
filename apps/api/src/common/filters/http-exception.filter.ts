import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

function humanizeValidationMessage(raw: string): string {
  if (!raw || typeof raw !== "string") return "An error occurred";
  let cleaned = raw.trim();

  // If multiple validation messages were concatenated without periods (e.g. "characters newPassword must be"):
  cleaned = cleaned.replace(
    /([a-z0-9])\s+([a-zA-Z]+ (?:must|should|cannot|is|does|has)\b)/g,
    "$1. $2"
  );

  const parts = cleaned.split(/(?<=[.!?])\s+|[;\n]+/);
  const formattedParts: string[] = [];

  for (const part of parts) {
    let p = part.trim();
    if (!p) continue;

    // Technical validator phrases first (before field aliases replace words like "email")
    p = p.replace(
      /must be longer than or equal to (\d+) characters/gi,
      "must be at least $1 characters long"
    );
    p = p.replace(
      /must be shorter than or equal to (\d+) characters/gi,
      "cannot exceed $1 characters"
    );
    p = p.replace(/must be an email/gi, "must be a valid email address");
    p = p.replace(/must be a string/gi, "is required");
    p = p.replace(/must not be empty/gi, "is required");
    p = p.replace(/should not be empty/gi, "is required");
    p = p.replace(/must be a boolean value/gi, "must be selected");
    p = p.replace(
      /must be a number conforming to the specified constraints/gi,
      "must be a valid number"
    );

    // Replace property subject at the beginning of the clause
    p = p.replace(/^newPassword\b/i, "Password");
    p = p.replace(/^new_password\b/i, "Password");
    p = p.replace(/^currentPassword\b/i, "Current password");
    p = p.replace(/^oldPassword\b/i, "Current password");
    p = p.replace(/^confirmPassword\b/i, "Confirm password");
    p = p.replace(/^confirm_password\b/i, "Confirm password");
    p = p.replace(/^buyerEmail\b/i, "Email address");
    p = p.replace(/^userEmail\b/i, "Email address");
    p = p.replace(/^email\b/i, "Email address");
    p = p.replace(/^buyerPhone\b/i, "Phone number");
    p = p.replace(/^userPhone\b/i, "Phone number");
    p = p.replace(/^phone\b/i, "Phone number");
    p = p.replace(/^recipientName\b/i, "Recipient name");
    p = p.replace(/^recipientPhone\b/i, "Recipient phone");
    p = p.replace(/^recipientEmail\b/i, "Recipient email");
    p = p.replace(/^targetBudgetHint\b/i, "Budget target");
    p = p.replace(/^wrapStyle\b/i, "Gift presentation style");

    p = p.charAt(0).toUpperCase() + p.slice(1);
    if (!/[.!?]$/.test(p)) {
      p += ".";
    }
    formattedParts.push(p);
  }

  // Deduplicate messages: if a specific constraint is present, drop generic "is required"
  const deduplicated = formattedParts.filter((msg, idx, arr) => {
    if (msg.endsWith("is required.")) {
      const prefix = msg.replace(/ is required\.$/, "");
      const hasMoreSpecific = arr.some(
        (other, otherIdx) =>
          otherIdx !== idx && other.startsWith(prefix) && other !== msg
      );
      return !hasMoreSpecific;
    }
    return true;
  });

  return deduplicated.join(" ") || "Please check your inputs and try again.";
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = "Internal server error";
    let code = "INTERNAL_SERVER_ERROR";
    let details: unknown = undefined;

    if (typeof exceptionResponse === "string") {
      message = humanizeValidationMessage(exceptionResponse);
    } else if (
      typeof exceptionResponse === "object" &&
      exceptionResponse !== null
    ) {
      const res = exceptionResponse as Record<string, unknown>;
      code = (res.code as string) || (res.error as string) || code;

      if (Array.isArray(res.message)) {
        const cleanedMessages = res.message.map((m) =>
          typeof m === "string" ? humanizeValidationMessage(m) : String(m)
        );
        // Deduplicate messages: if a specific constraint is present, drop generic "is required"
        const filteredMessages = cleanedMessages.filter((msg, idx, arr) => {
          if (msg.endsWith("is required.")) {
            const prefix = msg.replace(/ is required\.$/, "");
            const hasMoreSpecific = arr.some(
              (other, otherIdx) =>
                otherIdx !== idx && other.startsWith(prefix) && other !== msg
            );
            return !hasMoreSpecific;
          }
          return true;
        });

        details = res.details ?? filteredMessages;
        message =
          filteredMessages.length > 0
            ? filteredMessages[0]
            : "Please check your inputs and try again.";
      } else if (typeof res.message === "string") {
        message = humanizeValidationMessage(res.message);
        details = res.details;
      }
    } else if (exception instanceof Error) {
      message = humanizeValidationMessage(exception.message);
    }

    const requestId =
      request.headers["x-request-id"] ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `req_${Date.now()}`);

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details: status === HttpStatus.INTERNAL_SERVER_ERROR ? undefined : details,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

