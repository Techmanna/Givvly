import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ZodSchema, ZodError } from "zod";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== "body") {
      return value;
    }
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const field = issue.path.join(".") || "value";
          if (!details[field]) {
            details[field] = [];
          }
          details[field].push(issue.message);
        }

        throw new UnprocessableEntityException({
          code: "VALIDATION_FAILED",
          message: "Request validation failed",
          details,
        });
      }
      throw error;
    }
  }
}

