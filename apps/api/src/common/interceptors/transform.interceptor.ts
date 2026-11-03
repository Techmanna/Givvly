import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseEnvelope<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<ApiResponseEnvelope<T>> {
    const req = context.switchToHttp().getRequest();
    const requestId =
      req.headers["x-request-id"] ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `req_${Date.now()}`);

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      }))
    );
  }
}

