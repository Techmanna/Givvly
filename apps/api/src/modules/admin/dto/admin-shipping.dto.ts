import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";
import { z } from "zod";

const shippingZoneBaseSchema = z.object({
  code: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(120),
  areas: z.string().trim().min(2).max(500),
  deliveryNote: z.string().trim().max(300).optional().nullable(),
  etaLabel: z.string().trim().max(60).optional().nullable(),
  priceKobo: z.number().int().min(0),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export const createShippingZoneSchema = shippingZoneBaseSchema.extend({
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateShippingZoneSchema = shippingZoneBaseSchema.partial();

export class CreateShippingZoneDto {
  @ApiProperty({ example: "ZONE_A" })
  @IsString()
  code!: string;

  @ApiProperty({ example: "ZONE A" })
  @IsString()
  name!: string;

  @ApiProperty({ example: "Gbagada, Yaba, Iwaya" })
  @IsString()
  areas!: string;

  @ApiPropertyOptional({ example: "Receive at estate gate if bikes aren't allowed" })
  @IsOptional()
  @IsString()
  deliveryNote?: string | null;

  @ApiPropertyOptional({ example: "Within 48hrs" })
  @IsOptional()
  @IsString()
  etaLabel?: string | null;

  @ApiProperty({ example: 376300 })
  @IsInt()
  @Min(0)
  priceKobo!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateShippingZoneDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  areas?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  etaLabel?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  priceKobo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
