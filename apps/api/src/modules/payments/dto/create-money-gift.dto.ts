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

export const createMoneyGiftSchema = z.object({
  amountKobo: z.number().int().positive("Gift amount must be positive"),
  currency: z.string().trim().default("NGN"),
  provider: z.string().trim().optional(),
  giverName: z.string().trim().min(2, "Name must be at least 2 characters").max(60).optional(),
  giverEmail: z.string().trim().email("Please provide a valid email address"),
  message: z.string().trim().max(500, "Message cannot exceed 500 characters").optional(),
  isAnonymous: z.boolean().default(false),
  showOnWall: z.boolean().default(true),
  callbackUrl: z.string().url().optional(),
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
  @MinLength(2)
  @MaxLength(60)
  giverName?: string;

  @ApiProperty({ example: "chidi@example.com", description: "Giver email address for receipt" })
  @IsEmail()
  giverEmail: string;

  @ApiPropertyOptional({ example: "Congratulations on your new beginning!", description: "Message for the host and Wall of Love" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiPropertyOptional({ example: false, default: false, description: "Hide giver identity on public Wall of Love" })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean = false;

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

  @ApiProperty({ example: "SUCCESS" })
  status: string;

  @ApiProperty({ example: 5000000 })
  amountKobo: number;

  @ApiProperty({ example: "NGN" })
  currency: string;

  @ApiPropertyOptional({ example: "card" })
  channel?: string | null;

  @ApiPropertyOptional({ example: "2026-11-03T11:20:00.000Z" })
  paidAt?: Date | null;
}
