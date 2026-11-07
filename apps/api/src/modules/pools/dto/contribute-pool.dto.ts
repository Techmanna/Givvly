import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsPositive,
  IsString,
  IsUUID,
  IsEmail,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  IsUrl,
} from "class-validator";
import { z } from "zod";
import { PaymentInitDetailsDto } from "../../payments/dto/create-money-gift.dto";
import { PoolMode, PoolStatus } from "@prisma/client";

export const contributePoolSchema = z
  .object({
    poolId: z.string().uuid("Invalid pool ID"),
    amountKobo: z.number().int().positive("Contribution amount must be positive"),
    giverName: z.string().trim().max(60).optional().or(z.literal("")),
    name: z.string().trim().max(60).optional().or(z.literal("")),
    giverEmail: z.string().trim().email("Please provide a valid email address").optional(),
    email: z.string().trim().email("Please provide a valid email address").optional(),
    message: z.string().trim().max(500, "Message cannot exceed 500 characters").optional(),
    isAnonymous: z.boolean().optional(),
    anonymous: z.boolean().optional(),
    showOnWall: z.boolean().default(true),
    callbackUrl: z.string().url().optional(),
  })
  .transform((data) => {
    const isAnon = data.isAnonymous ?? data.anonymous ?? false;
    const resolvedName = (data.giverName ?? data.name)?.trim() || undefined;
    const resolvedEmail = (data.giverEmail ?? data.email)?.trim();
    return {
      ...data,
      giverName: isAnon ? undefined : resolvedName,
      giverEmail: resolvedEmail!,
      isAnonymous: isAnon,
    };
  })
  .refine((data) => Boolean(data.giverEmail), {
    path: ["giverEmail"],
    message: "giverEmail must be an email",
  });

export class ContributePoolDto {
  @ApiProperty({ example: "a0000000-0000-0000-0000-000000000001", description: "Pool UUID" })
  @IsUUID()
  poolId: string;

  @ApiProperty({ example: 2500000, description: "Contribution amount in subunits (2500000 kobo = ₦25,000)" })
  @IsInt()
  @IsPositive()
  amountKobo: number;

  @ApiPropertyOptional({ example: "Chidi Obi" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  giverName?: string;

  @ApiPropertyOptional({ example: "Chidi Obi" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({ example: "chidi@example.com" })
  @IsOptional()
  @IsEmail()
  giverEmail?: string;

  @ApiPropertyOptional({ example: "chidi@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "Excited to support your dream honeymoon!" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean = false;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  showOnWall?: boolean = true;

  @ApiPropertyOptional({ example: "https://givvly.com/e/tola-emeka/thank-you" })
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}

export class PoolContributionInitResponseDto {
  @ApiProperty({ example: "gift_pool_01J8ZX..." })
  giftId: string;

  @ApiProperty({ type: PaymentInitDetailsDto })
  payment: PaymentInitDetailsDto;
}

export class PoolDetailsResponseDto {
  @ApiProperty({ example: "pool_01J8ZX..." })
  id: string;

  @ApiProperty({ example: "Honeymoon in Zanzibar" })
  title: string;

  @ApiProperty({ enum: PoolMode, example: PoolMode.CASH })
  mode: PoolMode;

  @ApiProperty({ enum: PoolStatus, example: PoolStatus.OPEN })
  status: PoolStatus;

  @ApiProperty({ example: 100000000, description: "Target in kobo (₦1,000,000)" })
  targetKobo: number;

  @ApiProperty({ example: 45000000, description: "Raised in kobo (₦450,000)" })
  raisedKobo: number;

  @ApiProperty({ example: 55000000, description: "Remaining in kobo" })
  remainingKobo: number;

  @ApiProperty({ example: 45.0, description: "Percentage funded" })
  progressPercent: number;

  @ApiPropertyOptional({ example: "2026-12-15T00:00:00.000Z" })
  deadline?: Date | null;
}

export class PoolConversionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: "Pool converted to cash payout" })
  message: string;

  @ApiProperty({ example: 45000000 })
  convertedKobo: number;

  @ApiProperty({ example: "payout_01J8ZX..." })
  payoutReference: string;
}

export class PoolDeadlinesCheckResponseDto {
  @ApiProperty({ example: 2, description: "Number of past-deadline pools expired" })
  expiredCount: number;
}
