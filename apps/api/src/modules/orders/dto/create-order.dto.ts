import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsUUID,
  IsInt,
  IsPositive,
  IsEmail,
  IsOptional,
  ValidateNested,
  IsArray,
  IsBoolean,
  IsIn,
  ArrayMaxSize,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { z } from "zod";
import { OrderStatus } from "@prisma/client";

export const orderItemInputSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().min(1).default(1),
});

export const recipientSchema = z.object({
  name: z.string().trim().min(2).max(60),
  phone: z.string().trim().min(7).max(20).optional(),
  email: z.string().email().optional(),
});

export const deliveryAddressSchema = z.object({
  street: z.string().trim().min(3).max(100),
  area: z.string().trim().min(2).max(50),
  city: z.string().trim().min(2).max(50),
  state: z.string().trim().min(2).max(50),
});

export const createOrderSchema = z
  .object({
    items: z.array(orderItemInputSchema).min(1).optional(),
    productId: z.string().uuid().optional(),
    productSlug: z.string().optional(),
    qty: z.number().int().min(1).default(1).optional(),
    recipient: recipientSchema.optional(),
    recipientName: z.string().trim().max(60).optional().or(z.literal("")),
    recipientPhone: z.string().trim().min(7).max(20).optional(),
    recipientPhones: z.array(z.string().trim().min(7).max(20)).max(50).optional(),
    address: deliveryAddressSchema.optional(),
    giftNote: z.string().trim().max(300).optional(),
    wrapStyle: z.string().trim().max(50).optional(),
    packagingId: z.string().trim().max(50).optional(),
    wrapping: z.boolean().optional(),
    buyerEmail: z.string().email().optional().or(z.literal("")),
    eventId: z.string().uuid().optional(),
    currency: z.string().trim().length(3).default("NGN"),
    vtuType: z.enum(["airtime", "data"]).optional(),
    vtuProvider: z.string().trim().max(30).optional(),
    billItemIdentifier: z.string().trim().max(80).optional(),
    customAmountKobo: z.number().int().min(5000).optional(),
  })
  .transform((data) => {
    const primaryPhone = data.recipientPhone || data.recipientPhones?.[0];
    const resolvedName =
      data.recipientName?.trim() || primaryPhone || "Valued Recipient";
    const recipient = data.recipient ?? {
      name: resolvedName,
      phone: primaryPhone,
    };
    return {
      ...data,
      recipient,
      wrapStyle:
        data.wrapStyle || (data.wrapping ? "gift-wrapping" : undefined),
    };
  });

export class OrderItemInputDto {
  @ApiProperty({ example: "a0000000-0000-0000-0000-000000000001" })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsInt()
  @IsPositive()
  qty: number;
}

export class RecipientDto {
  @ApiProperty({ example: "Amina Bello" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: "08031234567" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "amina@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class DeliveryAddressDto {
  @ApiProperty({ example: "14 Admiralty Way" })
  @IsString()
  street: string;

  @ApiProperty({ example: "Lekki Phase 1" })
  @IsString()
  area: string;

  @ApiProperty({ example: "Lagos" })
  @IsString()
  city: string;

  @ApiProperty({ example: "Lagos" })
  @IsString()
  state: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ type: [OrderItemInputDto], description: "List of products for gift box or multi-item cart" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items?: OrderItemInputDto[];

  @ApiPropertyOptional({ example: "a0000000-0000-0000-0000-000000000001", description: "Convenience single product purchase" })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ example: "lagos-luxury-birthday-box" })
  @IsOptional()
  @IsString()
  productSlug?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  qty?: number;

  @ApiPropertyOptional({ type: RecipientDto, description: "Recipient delivery contact" })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecipientDto)
  recipient?: RecipientDto;

  @ApiPropertyOptional({ example: "Chidinma Eze" })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiPropertyOptional({ example: "08031234567" })
  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @ApiPropertyOptional({
    example: ["08031234567", "08166551496"],
    description: "Multiple recipient phone numbers for bulk VTU airtime/data gifting (max 50)",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  recipientPhones?: string[];

  @ApiPropertyOptional({ type: DeliveryAddressDto, description: "Physical delivery address" })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  address?: DeliveryAddressDto;

  @ApiPropertyOptional({ example: "Happy Anniversary, wishing you endless love!" })
  @IsOptional()
  @IsString()
  giftNote?: string;

  @ApiPropertyOptional({ example: "woven-cane", description: "Selected keepsake box style (blush-gold, woven-cane, midnight-plum, minimalist-kraft)" })
  @IsOptional()
  @IsString()
  packagingId?: string;

  @ApiPropertyOptional({ example: "satin-ribbon" })
  @IsOptional()
  @IsString()
  wrapStyle?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  wrapping?: boolean;

  @ApiPropertyOptional({ example: "buyer@example.com", description: "Buyer email address (required if guest)" })
  @IsOptional()
  @IsEmail()
  buyerEmail?: string;

  @ApiPropertyOptional({ example: "a0000000-0000-0000-0000-000000000001", description: "Linked event celebration UUID if gifting for an event" })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({ example: "NGN", default: "NGN" })
  @IsOptional()
  @IsString()
  currency?: string = "NGN";

  @ApiPropertyOptional({ example: "airtime", enum: ["airtime", "data"] })
  @IsOptional()
  @IsIn(["airtime", "data"])
  vtuType?: "airtime" | "data";

  @ApiPropertyOptional({ example: "mtn", enum: ["mtn", "airtel", "glo", "t2mobile"] })
  @IsOptional()
  @IsString()
  vtuProvider?: string;

  @ApiPropertyOptional({ example: "KUD-DAT-MTND-008" })
  @IsOptional()
  @IsString()
  billItemIdentifier?: string;

  @ApiPropertyOptional({ example: 500000, description: "Custom VTU amount in kobo (min 5000 = ₦50)" })
  @IsOptional()
  @IsInt()
  @Min(5000)
  customAmountKobo?: number;
}

export class OrderItemResponseDto {
  @ApiProperty({ example: "item_01J8ZX..." })
  id: string;

  @ApiProperty({ example: "Delonghi Espresso Machine" })
  title: string;

  @ApiProperty({ example: 5000000 })
  unitPriceKobo: number;

  @ApiProperty({ example: 1 })
  qty: number;
}

export class OrderResponseDto {
  @ApiProperty({ example: "ord_01J8ZX..." })
  id: string;

  @ApiProperty({ example: "GV-2026-ABC123" })
  number: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.CONFIRMED })
  status: OrderStatus;

  @ApiProperty({ example: 5000000 })
  subtotalKobo: number;

  @ApiProperty({ example: 250000 })
  deliveryFeeKobo: number;

  @ApiProperty({ example: 5250000 })
  totalKobo: number;

  @ApiProperty({ example: "trk_74a7aec1c74a5e6915221531" })
  trackingToken: string;

  @ApiProperty({ example: "Amina Bello" })
  recipientName: string;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty({ example: "2026-11-03T11:00:00.000Z" })
  createdAt: Date;
}

export class OrderPaymentInitResponseDto {
  @ApiProperty({ type: OrderResponseDto })
  order: OrderResponseDto;

  @ApiProperty({
    example: {
      reference: "ord_1793701566791_abc123",
      authorizationUrl: "https://checkout.paystack.com/acc_01J8ZX...",
      amountKobo: 5250000,
      currency: "NGN",
    },
  })
  payment: {
    reference: string;
    accessCode?: string;
    authorizationUrl: string;
    amountKobo: number;
    currency: string;
  };

  @ApiProperty({ example: "https://wa.me/2348029176372?text=..." })
  whatsappLink: string;
}

export class TrackingHistoryItemDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.CONFIRMED })
  status: OrderStatus;

  @ApiPropertyOptional({ example: "Order confirmed and being prepared" })
  note?: string | null;

  @ApiProperty({ example: "2026-11-03T11:05:00.000Z" })
  createdAt: Date;
}

export class PublicOrderTrackingResponseDto {
  @ApiProperty({ example: "GV-2026-ABC123" })
  orderNumber: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.CONFIRMED })
  status: OrderStatus;

  @ApiProperty({ example: "Amina Bello" })
  recipientName: string;

  @ApiPropertyOptional({ example: "Lagos, Lagos" })
  deliveryLocation?: string;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty({ type: [TrackingHistoryItemDto] })
  history: TrackingHistoryItemDto[];

  @ApiProperty({ example: "2026-11-03T11:00:00.000Z" })
  createdAt: Date;

  @ApiPropertyOptional({ example: "2026-11-04T15:30:00.000Z" })
  deliveredAt?: Date | null;

  @ApiProperty({ example: "https://wa.me/2348029176372?text=..." })
  whatsappSupportLink: string;
}
