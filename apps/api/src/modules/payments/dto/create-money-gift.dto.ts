import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsPositive,
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  MinLength,
  MaxLength,
  IsUrl,
} from "class-validator";
import { z } from "zod";

export const createMoneyGiftSchema = z
  .object({
    amountKobo: z.number().int().positive("Gift amount must be positive"),
    currency: z.string().trim().default("NGN"),
    provider: z.string().trim().optional(),
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

export class CreateMoneyGiftDto {
  @ApiProperty({ example: 5000000, description: "Gift amount in currency subunit (5000000 kobo = ₦50,000)" })
  @IsInt()
  @IsPositive()
  amountKobo: number;

  @ApiPropertyOptional({ example: "NGN", default: "NGN", description: "Currency code (NGN, USD, GBP, EUR, GHS, KES)" })
  @IsOptional()
  @IsString()
  currency?: string = "NGN";

  @ApiPropertyOptional({ example: "PAYSTACK", description: "Specific gateway provider (PAYSTACK, STRIPE)" })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: "Chidi Obi", description: "Giver name (optional if anonymous)" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  giverName?: string;

  @ApiPropertyOptional({ example: "Chidi Obi" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({ example: "chidi@example.com", description: "Giver email address for receipt" })
  @IsOptional()
  @IsEmail()
  giverEmail?: string;

  @ApiPropertyOptional({ example: "chidi@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "Congratulations on your new beginning!", description: "Message for the host and Wall of Love" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiPropertyOptional({ example: false, default: false, description: "Hide giver identity on public Wall of Love" })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean = false;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @ApiPropertyOptional({ example: true, default: true, description: "Display gift message on the Wall of Love" })
  @IsOptional()
  @IsBoolean()
  showOnWall?: boolean = true;

  @ApiPropertyOptional({ example: "https://givvly.com/e/tola-emeka/thank-you", description: "Callback URL after gateway redirect" })
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}

export class PaymentInitDetailsDto {
  @ApiProperty({ example: "pay_1793701566791_abc123" })
  reference: string;

  @ApiProperty({ example: "acc_01J8ZX..." })
  accessCode?: string;

  @ApiProperty({ example: "https://checkout.paystack.com/acc_01J8ZX..." })
  authorizationUrl: string;

  @ApiProperty({ example: 5000000 })
  amountKobo: number;

  @ApiProperty({ example: 75000 })
  feeKobo: number;

  @ApiProperty({ example: 5075000 })
  totalKobo: number;

  @ApiProperty({ example: "NGN" })
  currency: string;
}

export class MoneyGiftInitResponseDto {
  @ApiProperty({ example: "gift_01J8ZX..." })
  giftId: string;

  @ApiProperty({ type: PaymentInitDetailsDto })
  payment: PaymentInitDetailsDto;
}

export class PaymentStatusResponseDto {
  @ApiProperty({ example: "pay_1793701566791_abc123" })
  reference: string;

  @ApiPropertyOptional({ example: "acc_123" })
  accessCode?: string;

  @ApiPropertyOptional({ example: "https://checkout.paystack.com/123" })
  authorizationUrl?: string;

  @ApiProperty({ example: "SUCCESS" })
  status: string;

  @ApiProperty({ example: 5000000, description: "Net gift amount" })
  amountKobo: number;

  @ApiPropertyOptional({ example: 75000, description: "Service fee" })
  serviceFeeKobo?: number;

  @ApiPropertyOptional({ example: 5075000, description: "Total amount charged" })
  totalKobo?: number;

  @ApiPropertyOptional({ example: 75000 })
  feeKobo?: number;

  @ApiProperty({ example: "NGN" })
  currency: string;

  @ApiPropertyOptional({ example: "card" })
  channel?: string | null;

  @ApiPropertyOptional({ example: "2026-11-03T11:20:00.000Z" })
  paidAt?: Date | string | null;

  @ApiPropertyOptional({ example: "2026-11-03T11:20:00.000Z" })
  createdAt?: Date | string;

  @ApiPropertyOptional({ example: "adaobi-chidi" })
  eventSlug?: string;

  @ApiPropertyOptional({ example: "Adaobi & Chidi Wedding" })
  eventName?: string;

  @ApiPropertyOptional({ example: "Chidi" })
  giverName?: string | null;

  @ApiPropertyOptional({ example: false })
  anonymous?: boolean;

  @ApiPropertyOptional({ example: "Congratulations!" })
  message?: string | null;

  @ApiPropertyOptional()
  gift?: any;
}
