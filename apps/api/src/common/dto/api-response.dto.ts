import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ApiMetaDto {
  @ApiProperty({ example: "req_01J8ZX7K9..." })
  requestId: string;

  @ApiProperty({ example: "2026-11-03T11:45:00.000Z" })
  timestamp: string;
}

export class BaseApiResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  data: T;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

export class ErrorDetailsDto {
  @ApiProperty({ example: "VALIDATION_FAILED" })
  code: string;

  @ApiProperty({ example: "Request validation failed" })
  message: string;

  @ApiPropertyOptional({
    example: { email: ["Enter a valid email address"] },
  })
  details?: Record<string, string[]>;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ type: ErrorDetailsDto })
  error: ErrorDetailsDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;
}

