import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
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

export const purchaseItemGiftSchema = z.object({
  registryItemId: z.string().uuid("Invalid registry item ID"),
  reservationToken: z.string().min(10, "Valid reservation token is required"),
  giverName: z.string().trim().min(2, "Name must be at least 2 characters").max(60).optional(),
  giverEmail: z.string().trim().email("Please provide a valid email address"),
  message: z.string().trim().max(500, "Message cannot exceed 500 characters").optional(),
  isAnonymous: z.boolean().default(false),
  showOnWall: z.boolean().default(true),
  callbackUrl: z.string().url().optional(),
});

export class PurchaseItemGiftDto {
  @ApiProperty({ example: "a0000000-0000-0000-0000-000000000001", description: "Registry item ID" })
  @IsUUID()
  registryItemId: string;

  @ApiProperty({ example: "res_74a7aec1c74a5e6915221531", description: "Active 10-minute hold reservation token" })
  @IsString()
  @MinLength(10)
  reservationToken: string;

  @ApiPropertyOptional({ example: "Chidi Obi" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  giverName?: string;

  @ApiProperty({ example: "chidi@example.com" })
  @IsEmail()
  giverEmail: string;

  @ApiPropertyOptional({ example: "Enjoy your new espresso maker!" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean = false;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  showOnWall?: boolean = true;

  @ApiPropertyOptional({ example: "https://givvly.com/e/tola-emeka/thank-you" })
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}

export class ReservationResponseDto {
  @ApiProperty({ example: "a0000000-0000-0000-0000-000000000001" })
  itemId: string;

  @ApiProperty({ example: "Delonghi Espresso Machine" })
  title: string;

  @ApiProperty({ example: "res_74a7aec1c74a5e6915221531" })
  reservationToken: string;

  @ApiProperty({ example: "2026-11-03T11:55:00.000Z" })
  reservedUntil: Date;
}

export class RegistryGiftInitResponseDto {
  @ApiProperty({ example: "gift_01J8ZX..." })
  giftId: string;

  @ApiProperty({ type: PaymentInitDetailsDto })
  payment: PaymentInitDetailsDto;
}

export class ReleasedReservationsResponseDto {
  @ApiProperty({ example: 3, description: "Number of expired reservations released" })
  releasedCount: number;
}
