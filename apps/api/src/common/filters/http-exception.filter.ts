import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

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
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === "object" &&
      exceptionResponse !== null
    ) {
      const res = exceptionResponse as Record<string, unknown>;
      message = (res.message as string) || message;
      code = (res.code as string) || (res.error as string) || code;
      details = res.details ?? (Array.isArray(res.message) ? res.message : undefined);
    } else if (exception instanceof Error) {
      message = exception.message;
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

