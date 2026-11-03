import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { z } from "zod";
import { DisputeStatus } from "@prisma/client";

export const resolveDisputeSchema = z
  .object({
    status: z.enum([
      "RESOLVED",
      "REJECTED",
      DisputeStatus.RESOLVED_REFUND,
      DisputeStatus.RESOLVED_REJECTED,
    ]),
    resolution: z.string().trim().max(500).optional(),
  })
  .transform((data) => ({
    status:
      data.status === "RESOLVED"
        ? DisputeStatus.RESOLVED_REFUND
        : data.status === "REJECTED"
          ? DisputeStatus.RESOLVED_REJECTED
          : data.status,
    resolution:
      data.resolution && data.resolution.length > 0
        ? data.resolution
        : "Dispute resolved by administrator via operations console",
  }));

export class ResolveDisputeDto {
  @ApiProperty({
    enum: [
      "RESOLVED",
      "REJECTED",
      DisputeStatus.RESOLVED_REFUND,
      DisputeStatus.RESOLVED_REJECTED,
    ],
    example: "RESOLVED",
    description: "Resolution decision",
  })
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({
    example: "Item damaged in transit verified via photos. Resolution granted.",
    description: "Resolution explanation",
  })
  @IsOptional()
  @IsString()
  resolution?: string;
}

export const issueRefundSchema = z.object({
  paymentId: z.string().uuid(),
  amountKobo: z.number().int().min(1).optional(),
  reason: z.string().trim().min(5).max(300),
});

export class IssueRefundDto {
  @ApiProperty({ example: "a0000000-0000-0000-0000-000000000001", description: "Payment record UUID" })
  @IsUUID()
  paymentId: string;

  @ApiPropertyOptional({ example: 2500000, description: "Refund amount in kobo (full amount if omitted)" })
  @IsOptional()
  @IsInt()
  @IsPositive()
  amountKobo?: number;

  @ApiProperty({ example: "Customer requested cancellation prior to packing" })
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  reason: string;
}
