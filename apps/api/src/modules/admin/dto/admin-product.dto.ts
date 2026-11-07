import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsArray,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  IsUrl,
  IsUUID,
} from "class-validator";
import { z } from "zod";
import { isSafeMediaUrl } from "../../../infra/storage/file-security.util";

const safeMediaUrlSchema = z
  .string()
  .trim()
  .refine((val) => !val || isSafeMediaUrl(val), {
    message: "Invalid or unsafe media URL",
  });

export const createProductSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().min(5).max(2000),
    priceKobo: z.coerce.number().int().min(100),
    category: z.string().optional(),
    occasions: z.array(z.string()).default([]),
    relationships: z.array(z.string()).default([]),
    images: z.array(safeMediaUrlSchema).max(10).optional(),
    imageUrl: safeMediaUrlSchema.optional(),
    stock: z.coerce.number().int().min(0).nullable().optional(),
    inStock: z.boolean().optional(),
    isCombo: z.boolean().optional(),
    comboItems: z.any().optional(),
    isDigital: z.boolean().default(false),
    digitalKind: z.string().optional(),
    slug: z.string().trim().min(2).max(120).optional(),
  })
  .transform((data) => ({
    ...data,
    title: (data.name || data.title || "Curated Celebration Gift").trim(),
    images:
      data.images && data.images.length > 0
        ? data.images
        : data.imageUrl
          ? [data.imageUrl]
          : ["/images/gifts/box-luxury.jpg"],
    stock:
      data.stock !== undefined
        ? data.stock
        : data.inStock === false
          ? 0
          : 50,
  }));

export class CreateProductDto {
  @ApiPropertyOptional({ example: "Luxury Silk Robe & Scented Candle Set" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: "Luxury Silk Robe & Scented Candle Set" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: "Premium Mulberry silk loungewear paired with artisanal organic vanilla candle." })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  description: string;

  @ApiProperty({ example: 4500000, description: "Price in kobo (₦45,000)" })
  @IsInt()
  @IsPositive()
  priceKobo: number;

  @ApiPropertyOptional({ example: ["BIRTHDAY", "ANNIVERSARY"], default: [] })
  @IsOptional()
  @IsArray()
  occasions: string[] = [];

  @ApiPropertyOptional({ example: ["PARTNER", "FRIEND"], default: [] })
  @IsOptional()
  @IsArray()
  relationships: string[] = [];

  @ApiPropertyOptional({ example: ["https://cdn.givvly.vercel.app/uploads/products/robe.jpg"] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional({ example: "/images/gifts/box-luxury.jpg" })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 25, nullable: true, description: "Inventory count (null if untracked)" })
  @IsOptional()
  stock?: number | null = null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isDigital?: boolean = false;

  @ApiPropertyOptional({ example: "VOUCHER" })
  @IsOptional()
  @IsString()
  digitalKind?: string;

  @ApiPropertyOptional({ example: "luxury-silk-robe-candle-set" })
  @IsOptional()
  @IsString()
  slug?: string;
}

export const updateProductSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().min(5).max(2000).optional(),
    priceKobo: z.coerce.number().int().min(100).optional(),
    category: z.string().optional(),
    occasions: z.array(z.string()).optional(),
    relationships: z.array(z.string()).optional(),
    images: z.array(safeMediaUrlSchema).max(10).optional(),
    imageUrl: safeMediaUrlSchema.optional(),
    stock: z.coerce.number().int().min(0).nullable().optional(),
    inStock: z.boolean().optional(),
    isCombo: z.boolean().optional(),
    comboItems: z.any().optional(),
    isDigital: z.boolean().optional(),
    digitalKind: z.string().optional(),
    slug: z.string().trim().min(2).max(120).optional(),
    active: z.boolean().optional(),
  })
  .transform((data) => ({
    ...data,
    title: data.name ?? data.title,
    images:
      data.images !== undefined
        ? data.images
        : data.imageUrl !== undefined
          ? [data.imageUrl]
          : undefined,
    stock:
      data.stock !== undefined
        ? data.stock
        : data.inStock !== undefined
          ? data.inStock
            ? 50
            : 0
          : undefined,
  }));

export class UpdateProductDto {
  @ApiPropertyOptional({ example: "Luxury Silk Robe" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: "Luxury Silk Robe" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "Updated description..." })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 4800000 })
  @IsOptional()
  @IsInt()
  priceKobo?: number;

  @ApiPropertyOptional({ example: ["BIRTHDAY"] })
  @IsOptional()
  @IsArray()
  occasions?: string[];

  @ApiPropertyOptional({ example: ["FRIEND"] })
  @IsOptional()
  @IsArray()
  relationships?: string[];

  @ApiPropertyOptional({ example: ["https://cdn.givvly.vercel.app/uploads/products/robe2.jpg"] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional({ example: "/images/gifts/box-luxury.jpg" })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  stock?: number | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDigital?: boolean;

  @ApiPropertyOptional({ example: "VOUCHER" })
  @IsOptional()
  @IsString()
  digitalKind?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export const createCollectionSchema = z.object({
  name: z.string().trim().min(3).max(80),
  slug: z.string().trim().min(3).max(80),
  kind: z.string().trim().default("OCCASION"),
  productIds: z.array(z.string().uuid()).default([]),
});

export class CreateCollectionDto {
  @ApiProperty({ example: "Birthday Bestsellers" })
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: "birthday-bestsellers" })
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  slug: string;

  @ApiPropertyOptional({ example: "OCCASION", default: "OCCASION" })
  @IsOptional()
  @IsString()
  kind?: string = "OCCASION";

  @ApiPropertyOptional({ example: ["a0000000-0000-0000-0000-000000000001"], default: [] })
  @IsOptional()
  @IsArray()
  productIds: string[] = [];
}
