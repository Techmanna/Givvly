import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EventStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { z } from "zod";

export const updateAdminEventStatusSchema = z.object({
  status: z.nativeEnum(EventStatus),
  reason: z.string().trim().max(300).optional(),
});

export class UpdateAdminEventStatusDto {
  @ApiProperty({
    enum: EventStatus,
    example: EventStatus.CLOSED,
    description: "Target celebration lifecycle status (e.g. PUBLISHED, CLOSED, ARCHIVED)",
  })
  @IsEnum(EventStatus)
  status!: EventStatus;

  @ApiPropertyOptional({
    example: "Blocked due to policy violation",
    description: "Optional admin moderation reason recorded in the audit log",
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
