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

  // Replace common camelCase field names with user-friendly names
  cleaned = cleaned.replace(/\bnewPassword\b/g, "Password");
  cleaned = cleaned.replace(/\bcurrentPassword\b/g, "Current password");
  cleaned = cleaned.replace(/\boldPassword\b/g, "Current password");
  cleaned = cleaned.replace(/\bconfirmPassword\b/g, "Confirm password");
  cleaned = cleaned.replace(/\bbuyerEmail\b/g, "Email address");
  cleaned = cleaned.replace(/\buserEmail\b/g, "Email address");
  cleaned = cleaned.replace(/\bemail\b/g, "Email address");
  cleaned = cleaned.replace(/\bphone\b/g, "Phone number");
  cleaned = cleaned.replace(/\brecipientName\b/g, "Recipient name");
  cleaned = cleaned.replace(/\brecipientPhone\b/g, "Recipient phone");
  cleaned = cleaned.replace(/\brecipientEmail\b/g, "Recipient email");
  cleaned = cleaned.replace(/\btargetBudgetHint\b/g, "Budget target");
  cleaned = cleaned.replace(/\bwrapStyle\b/g, "Gift presentation style");

  // Replace technical class-validator jargon with natural sentences
  cleaned = cleaned.replace(/must be longer than or equal to (\d+) characters/gi, "must be at least $1 characters long");
  cleaned = cleaned.replace(/must be shorter than or equal to (\d+) characters/gi, "cannot exceed $1 characters");
  cleaned = cleaned.replace(/must be a string/gi, "is required");
  cleaned = cleaned.replace(/must not be empty/gi, "is required");
  cleaned = cleaned.replace(/should not be empty/gi, "is required");
  cleaned = cleaned.replace(/must be an email/gi, "must be a valid email address");
  cleaned = cleaned.replace(/must be a boolean value/gi, "must be selected");
  cleaned = cleaned.replace(/must be a number conforming to the specified constraints/gi, "must be a valid number");

  // Capitalize first character
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  // Ensure trailing punctuation
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += ".";
  }

  return cleaned;
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

