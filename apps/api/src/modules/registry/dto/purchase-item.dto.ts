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

export const purchaseItemGiftSchema = z
  .object({
    registryItemId: z.string().uuid("Invalid registry item ID").optional(),
    itemId: z.string().uuid("Invalid registry item ID").optional(),
    reservationToken: z.string().min(10, "Valid reservation token is required").optional(),
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
      registryItemId: (data.registryItemId ?? data.itemId)!,
      giverName: isAnon ? undefined : resolvedName,
      giverEmail: resolvedEmail!,
      isAnonymous: isAnon,
    };
  })
  .refine((data) => Boolean(data.registryItemId), {
    path: ["registryItemId"],
    message: "registryItemId is required",
  })
  .refine((data) => Boolean(data.giverEmail), {
    path: ["giverEmail"],
    message: "giverEmail must be an email",
  });

export class PurchaseItemGiftDto {
  @ApiProperty({ example: "a0000000-0000-0000-0000-000000000001", description: "Registry item ID" })
  @IsUUID()
  registryItemId: string;

  @ApiPropertyOptional({ example: "a0000000-0000-0000-0000-000000000001" })
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiPropertyOptional({ example: "res_74a7aec1c74a5e6915221531", description: "Active 10-minute hold reservation token" })
  @IsOptional()
  @IsString()
  reservationToken?: string;

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

  @ApiPropertyOptional({ example: "Enjoy your new espresso maker!" })
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
