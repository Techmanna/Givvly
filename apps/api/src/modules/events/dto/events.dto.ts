import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  Length,
} from "class-validator";
import { Visibility, EventStatus, PayoutStatus, EventType } from "@prisma/client";

export class CreateEventRequestDto {
  @ApiProperty({ example: "Tola & Emeka's Wedding", description: "Name of the celebration" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: "tola-emekas-wedding-k8m2", description: "Optional client-previewed unique slug" })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: "Tola & Emeka", description: "Host or celebrant name displayed on the event page" })
  @IsOptional()
  @IsString()
  hostName?: string;

  @ApiProperty({ enum: EventType, example: EventType.WEDDING, description: "Event type or occasion category" })
  @IsEnum(EventType)
  type: EventType;

  @ApiProperty({ example: "2026-12-15T10:00:00Z", description: "Date of the event" })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ example: "Join us in celebrating our union!", description: "Event story or bio" })
  @IsOptional()
  @IsString()
  story?: string;

  @ApiPropertyOptional({ enum: Visibility, default: Visibility.PUBLIC })
  @IsOptional()
  @IsEnum(Visibility)
  visibility: Visibility = Visibility.PUBLIC;

  @ApiPropertyOptional({ example: "1234", description: "Access code for private events" })
  @IsOptional()
  @IsString()
  accessCode?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  allowPlusOne?: boolean;

  @ApiPropertyOptional({ example: "elegant-gold", description: "Invitation template key" })
  @IsOptional()
  @IsString()
  templateKey?: string;

  @ApiPropertyOptional({ example: "uploads/cover_image/a0000000.jpg", description: "Uploaded cover storage key" })
  @IsOptional()
  @IsString()
  coverKey?: string;

  @ApiPropertyOptional({ example: "https://cdn.givvly.store/uploads/cover_image/a0000000.jpg", description: "Uploaded cover media URL" })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ example: "NGN", default: "NGN" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: "Initial registry items to create" })
  @IsOptional()
  @IsArray()
  registryItems?: Array<{
    productId?: string;
    title: string;
    priceKobo: number;
  }>;
}

export class UpdateEventRequestDto {
  @ApiPropertyOptional({ example: "Tola & Emeka's Wedding" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "Tola & Emeka" })
  @IsOptional()
  @IsString()
  hostName?: string;

  @ApiPropertyOptional({ enum: EventType })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiPropertyOptional({ example: "2026-12-15T10:00:00Z" })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ example: "Join us in celebrating our union!" })
  @IsOptional()
  @IsString()
  story?: string;

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @ApiPropertyOptional({ example: "1234" })
  @IsOptional()
  @IsString()
  accessCode?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allowPlusOne?: boolean;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ example: "uploads/cover_image/a0000000.jpg" })
  @IsOptional()
  @IsString()
  coverKey?: string;

  @ApiPropertyOptional({ example: "https://cdn.givvly.store/uploads/cover_image/a0000000.jpg" })
  @IsOptional()
  @IsString()
  coverUrl?: string;
}

export class UpdateInviteTemplateRequestDto {
  @ApiProperty({ example: "blush-minimal" })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiPropertyOptional({ example: "Civic Centre, Victoria Island" })
  @IsOptional()
  @IsString()
  venue?: string;

  @ApiPropertyOptional({ example: "Traditional & Black Tie" })
  @IsOptional()
  @IsString()
  dressCode?: string;

  @ApiPropertyOptional({ example: "10:00 AM - Church, 2:00 PM - Reception" })
  @IsOptional()
  @IsString()
  schedule?: string;

  @ApiPropertyOptional({ example: "Your presence is our biggest gift!" })
  @IsOptional()
  @IsString()
  registryNote?: string;

  @ApiPropertyOptional({ description: "Arbitrary template field key-values" })
  @IsOptional()
  fields?: Record<string, string>;
}

export class UpdateKeepsakeSummaryRequestDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  keepsakePublished: boolean;
}

export class ResolveBankAccountRequestDto {
  @ApiProperty({ example: "058", description: "3-digit CBN bank code" })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty({ example: "0123456789", description: "10-digit NUBAN account number" })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;
}

export class ResolveBankAccountResponseDto {
  @ApiProperty({ example: "CHIDI OKAFOR" })
  accountName: string;

  @ApiProperty({ example: "0123456789" })
  accountNumber: string;

  @ApiProperty({ example: "058" })
  bankCode: string;
}

export class CreatePayoutAccountRequestDto {
  @ApiProperty({ example: "058", description: "3-digit CBN bank code" })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiPropertyOptional({ example: "Guaranty Trust Bank", description: "Bank name" })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ example: "0123456789", description: "10-digit NUBAN account number" })
  @IsString()
  @Length(10, 10)
  accountNumber: string;

  @ApiProperty({ example: "TOLA ADEBAYO", description: "Verified beneficiary account name" })
  @IsString()
  @IsNotEmpty()
  accountName: string;
}

export class BankOptionResponseDto {
  @ApiProperty({ example: "058" })
  code: string;

  @ApiProperty({ example: "Guaranty Trust Bank" })
  name: string;
}

export class PayoutAccountResponseDto {
  @ApiProperty({ example: "acc_01J8ZX..." })
  id: string;

  @ApiProperty({ example: "058" })
  bankCode: string;

  @ApiProperty({ example: "Guaranty Trust Bank" })
  bankName: string;

  @ApiProperty({ example: "6789", description: "Last 4 digits of account number" })
  accountNumberLast4: string;

  @ApiProperty({ example: "TOLA ADEBAYO" })
  accountName: string;

  @ApiProperty({ enum: PayoutStatus, example: PayoutStatus.QUEUED })
  status: string;

  @ApiProperty({ example: true })
  isDefault: boolean;
}

export class EventDetailResponseDto {
  @ApiProperty({ example: "evt_01J8ZX..." })
  id: string;

  @ApiProperty({ example: "tola-emeka-x7k2" })
  slug: string;

  @ApiProperty({ example: "Tola & Emeka's Wedding" })
  name: string;

  @ApiProperty({ example: "WEDDING" })
  type: string;

  @ApiProperty({ example: "2026-12-15T10:00:00.000Z" })
  date: Date;

  @ApiPropertyOptional({ example: "Join us in celebrating our union!" })
  story?: string | null;

  @ApiProperty({ enum: Visibility, example: Visibility.PUBLIC })
  visibility: Visibility;

  @ApiProperty({ enum: EventStatus, example: EventStatus.PUBLISHED })
  status: EventStatus;

  @ApiProperty({ example: true })
  allowPlusOne: boolean;

  @ApiProperty({ example: "NGN" })
  currency: string;

  @ApiProperty({ example: 0, description: "Total money gifts received in kobo" })
  totalReceivedKobo?: number;

  @ApiProperty({ example: 0, description: "Total gift items or contributions received" })
  giftCount?: number;

  @ApiProperty({ example: 0, description: "Confirmed attending RSVPs" })
  rsvpYesCount?: number;

  @ApiProperty({ example: true, description: "Whether money gifts are enabled (payout account verified)" })
  moneyGiftsEnabled?: boolean;

  @ApiPropertyOptional({ example: "2026-11-03T11:00:00.000Z" })
  publishedAt?: Date | null;

  @ApiProperty({ example: "2026-11-03T10:00:00.000Z" })
  createdAt: Date;
}

export class PublishEventResponseDto {
  @ApiProperty({ example: "tola-emeka-x7k2" })
  slug: string;

  @ApiProperty({ example: "https://givvly.com/e/tola-emeka-x7k2" })
  url: string;

  @ApiProperty({ example: true })
  moneyGiftsEnabled: boolean;
}

export class PublicRegistryItemDto {
  @ApiProperty({ example: "reg_01" })
  id: string;

  @ApiProperty({ example: "Kenwood Titanium Chef Baker Stand Mixer" })
  title: string;

  @ApiPropertyOptional({ example: "prod_mixer_01" })
  productId?: string | null;

  @ApiProperty({ example: 38500000 })
  priceKobo: number;

  @ApiPropertyOptional({ example: "https://images.unsplash.com/photo-1594385208974-2e75f8d7bb48" })
  imageUrl?: string;

  @ApiProperty({ example: "AVAILABLE" })
  status: string;

  @ApiPropertyOptional({ example: "2026-12-31T23:59:59Z" })
  reservedUntil?: string | null;
}

export class PublicPoolItemDto {
  @ApiProperty({ example: "pool_01" })
  id: string;

  @ApiProperty({ example: "Zanzibar Honeymoon Getaway Fund" })
  title: string;

  @ApiProperty({ example: 250000000 })
  priceKobo: number;

  @ApiProperty({ example: 250000000 })
  targetKobo: number;

  @ApiProperty({ example: 165000000 })
  raisedKobo: number;

  @ApiProperty({ example: "CASH" })
  mode: string;

  @ApiProperty({ example: "AVAILABLE" })
  status: string;

  @ApiPropertyOptional({ example: "2026-12-10T23:59:59Z" })
  deadline?: string | null;
}

export class PublicEventResponseDto {
  @ApiProperty({ example: "evt_wedding_01" })
  id: string;

  @ApiProperty({ example: "adaobi-and-chidi-2026" })
  slug: string;

  @ApiProperty({ example: "Adaobi & Chidi's Forever (#ChidAda26)" })
  name: string;

  @ApiProperty({ example: "WEDDING" })
  type: string;

  @ApiProperty({ example: "2026-12-12T10:00:00.000Z" })
  date: string;

  @ApiPropertyOptional({ example: "https://images.unsplash.com/photo-1519741497674-611481863552" })
  coverUrl?: string;

  @ApiProperty({ example: "PUBLIC" })
  visibility: string;

  @ApiProperty({ example: "PUBLISHED" })
  status: string;

  @ApiProperty({ example: true })
  moneyGiftsEnabled: boolean;

  @ApiProperty({ example: "NGN" })
  currency: string;

  @ApiProperty({ example: 165000000 })
  totalReceivedKobo: number;

  @ApiProperty({ example: 5 })
  giftCount: number;

  @ApiProperty({ example: 2 })
  rsvpYesCount: number;

  @ApiPropertyOptional({ example: "From meeting at University of Lagos..." })
  story?: string | null;

  @ApiProperty({ example: "Adaobi" })
  ownerFirstName: string;

  @ApiProperty({ example: true })
  allowPlusOne: boolean;

  @ApiProperty({ type: [PublicRegistryItemDto] })
  registry: PublicRegistryItemDto[];

  @ApiProperty({ type: [PublicPoolItemDto] })
  pools: PublicPoolItemDto[];
}

export class SubmitRsvpRequestDto {
  @ApiProperty({ example: "Emeka Chinedu" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: "emeka@givvly.store" })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: "+2348123456789" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: "YES", enum: ["YES", "NO", "MAYBE"] })
  @IsString()
  @IsNotEmpty()
  response: "YES" | "NO" | "MAYBE";

  @ApiPropertyOptional({ example: "Chioma Chinedu" })
  @IsOptional()
  @IsString()
  plusOneName?: string;
}

export class RsvpRecordResponseDto {
  @ApiProperty({ example: "rsvp_01" })
  id: string;

  @ApiProperty({ example: "evt_01" })
  eventId: string;

  @ApiProperty({ example: "Emeka Chinedu" })
  name: string;

  @ApiPropertyOptional({ example: "emeka@givvly.store" })
  email?: string | null;

  @ApiPropertyOptional({ example: "+2348123456789" })
  phone?: string | null;

  @ApiProperty({ example: "YES" })
  response: string;

  @ApiPropertyOptional({ example: "Chioma Chinedu" })
  plusOneName?: string | null;

  @ApiProperty({ example: "2026-11-03T10:00:00.000Z" })
  createdAt: Date;
}

export class CreateWallPostRequestDto {
  @ApiProperty({ example: "Uncle Jude & Family" })
  @IsString()
  @IsNotEmpty()
  authorName: string;

  @ApiPropertyOptional({ example: "jude.okafor@gmail.com" })
  @IsOptional()
  @IsString()
  authorEmail?: string;

  @ApiPropertyOptional({ example: "May God bless your home forever!" })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ example: [] })
  @IsOptional()
  media?: Array<{ url: string; type: "IMAGE" | "VIDEO" }>;
}

export class WallPostResponseDto {
  @ApiProperty({ example: "post_01" })
  id: string;

  @ApiProperty({ example: "Uncle Jude & Family" })
  authorName: string;

  @ApiPropertyOptional({ example: "May God bless your home forever!" })
  text?: string | null;

  @ApiProperty({ example: "VISIBLE" })
  status: string;

  @ApiProperty({ example: [] })
  media: Array<{ url: string; type: string }>;

  @ApiProperty({ example: "2026-11-03T10:00:00.000Z" })
  createdAt: Date;
}

export class PatchWallPostRequestDto {
  @ApiProperty({ example: "VISIBLE", enum: ["VISIBLE", "HIDDEN", "REMOVED"] })
  @IsString()
  @IsNotEmpty()
  status: "VISIBLE" | "HIDDEN" | "REMOVED";
}

export class UnlockEventRequestDto {
  @ApiProperty({ example: "1234" })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class KeepsakeSummaryResponseDto {
  @ApiProperty({ type: () => EventDetailResponseDto })
  event: EventDetailResponseDto;

  @ApiProperty({ example: 15000000 })
  totalReceivedKobo: number;

  @ApiProperty({ example: 5 })
  giftCount: number;

  @ApiProperty({ example: 2 })
  rsvpYesCount: number;

  @ApiProperty({ example: 4 })
  thankedCount: number;

  @ApiProperty({ type: () => [WallPostResponseDto], example: [] })
  highlights: WallPostResponseDto[];

  @ApiProperty({ example: true })
  keepsakePublished: boolean;
}

export type CreateEventDto = CreateEventRequestDto;
export type CreatePayoutAccountDto = CreatePayoutAccountRequestDto;
