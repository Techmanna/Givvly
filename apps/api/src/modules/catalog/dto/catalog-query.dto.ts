import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CatalogQueryDto {
  @ApiPropertyOptional({ example: "HOME", description: "Main category filter" })
  @IsOptional()
  @IsString()
  mainCategory?: string;

  @ApiPropertyOptional({ example: "BIRTHDAY", description: "Occasion filter (e.g. BIRTHDAY, WEDDING, ANNIVERSARY)" })
  @IsOptional()
  @IsString()
  occasion?: string;

  @ApiPropertyOptional({ example: "PARTNER", description: "Relationship filter (e.g. PARTNER, FRIEND, PARENT)" })
  @IsOptional()
  @IsString()
  relationship?: string;

  @ApiPropertyOptional({ example: "FEMALE", description: "Gender recipient filter" })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: "ADULT", description: "Age group filter" })
  @IsOptional()
  @IsString()
  ageGroup?: string;

  @ApiPropertyOptional({ example: "PHYSICAL", description: "PHYSICAL or DIGITAL" })
  @IsOptional()
  @IsString()
  giftType?: string;

  @ApiPropertyOptional({ example: "true", description: "Filter for combo gift hampers" })
  @IsOptional()
  isCombo?: string | boolean;

  @ApiPropertyOptional({ example: 5000000, description: "Maximum price in kobo" })
  @IsOptional()
  maxPriceKobo?: string | number;

  @ApiPropertyOptional({ example: "perfume", description: "Full text search query" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ["popularity", "price_asc", "price_desc", "newest"], example: "popularity" })
  @IsOptional()
  @IsString()
  sortBy?: "popularity" | "price_asc" | "price_desc" | "newest";

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  limit?: string | number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  offset?: string | number;
}

export class ComboItemDto {
  @ApiProperty({ example: "Scented Soy Candle" })
  name: string;

  @ApiProperty({ example: 1 })
  qty: number;

  @ApiPropertyOptional({ example: "Signature" })
  tag?: string;
}

export class CatalogProductResponseDto {
  @ApiProperty({ example: "a0000000-0000-0000-0000-000000000001" })
  id: string;

  @ApiProperty({ example: "luxury-scented-candle-box" })
  slug: string;

  @ApiProperty({ example: "Luxury Scented Candle Box" })
  name: string;

  @ApiProperty({ example: "Hand-poured soy wax candle with essential oils and gold packaging." })
  description: string;

  @ApiProperty({ example: 3500000, description: "Price in kobo (3500000 kobo = ₦35,000)" })
  priceKobo: number;

  @ApiProperty({ example: "HOME" })
  category: string;

  @ApiPropertyOptional({ example: "PHYSICAL" })
  giftType?: string;

  @ApiProperty({ example: ["BIRTHDAY", "ANNIVERSARY"] })
  occasions: string[];

  @ApiProperty({ example: ["FRIEND", "PARTNER"] })
  relationships: string[];

  @ApiPropertyOptional({ example: "https://cdn.givvly.store/uploads/products/candle.jpg" })
  imageUrl?: string;

  @ApiProperty({ example: "Givvly Curated" })
  vendorName: string;

  @ApiProperty({ example: true })
  inStock: boolean;

  @ApiProperty({ example: 4.9 })
  rating: number;

  @ApiProperty({ example: 18 })
  reviewCount: number;

  @ApiPropertyOptional({ example: true })
  isCombo?: boolean;

  @ApiPropertyOptional({ type: [ComboItemDto] })
  comboItems?: ComboItemDto[];

  @ApiPropertyOptional({ example: true })
  isDigital?: boolean;

  @ApiPropertyOptional({ example: "AIRTIME" })
  digitalKind?: string;
}

export class CatalogCollectionResponseDto {
  @ApiProperty({ example: "col-birthday" })
  id: string;

  @ApiProperty({ example: "birthday-bestsellers" })
  slug: string;

  @ApiProperty({ example: "Birthday Bestsellers" })
  title: string;

  @ApiProperty({ example: "Our most beloved birthday gifts, luxury boxes, and celebration packages." })
  description: string;

  @ApiProperty({ example: ["luxury-scented-candle-box", "leather-journal"] })
  productSlugs: string[];
}
