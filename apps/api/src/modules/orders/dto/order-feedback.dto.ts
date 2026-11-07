import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  Min,
  Max,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  MinLength,
  MaxLength,
} from "class-validator";
import { z } from "zod";
import { DisputeStatus } from "@prisma/client";
import { isSafeMediaUrl } from "../../../infra/storage/file-security.util";

export const reviewOrderSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export class ReviewOrderDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: "Rating score between 1 and 5 stars" })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: "Gorgeous packaging and prompt delivery! The recipient was overjoyed." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export const disputeOrderSchema = z.object({
  type: z.enum(["DAMAGED", "WRONG_ITEM", "NOT_DELIVERED", "OTHER"]),
  description: z.string().trim().min(20).max(1000),
  photos: z
    .array(
      z
        .string()
        .trim()
        .refine((v) => isSafeMediaUrl(v), {
          message: "Each evidence file must be a valid uploaded media URL",
        })
    )
    .max(5)
    .optional(),
});

export class DisputeOrderDto {
  @ApiProperty({
    enum: ["DAMAGED", "WRONG_ITEM", "NOT_DELIVERED", "OTHER"],
    example: "DAMAGED",
    description: "Category of order issue",
  })
  @IsEnum(["DAMAGED", "WRONG_ITEM", "NOT_DELIVERED", "OTHER"])
  type: "DAMAGED" | "WRONG_ITEM" | "NOT_DELIVERED" | "OTHER";

  @ApiProperty({
    example: "The keepsake box arrived with a torn satin ribbon and cracked inner seal.",
    description: "Detailed description of the issue (minimum 20 characters)",
  })
  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  description: string;

  @ApiPropertyOptional({
    example: ["https://cdn.givvly.vercel.app/uploads/dispute/photo1.jpg"],
    description: "Evidence photos (max 5)",
  })
  @IsOptional()
  @IsArray()
  photos?: string[];
}

export class ReviewResponseDto {
  @ApiProperty({ example: "rev_01J8ZX..." })
  id: string;

  @ApiProperty({ example: "ord_01J8ZX..." })
  orderId: string;

  @ApiProperty({ example: 5 })
  rating: number;

  @ApiPropertyOptional({ example: "Gorgeous packaging!" })
  comment?: string | null;

  @ApiProperty({ example: "2026-11-03T11:00:00.000Z" })
  createdAt: Date;
}

export class DisputeResponseDto {
  @ApiProperty({ example: "disp_01J8ZX..." })
  id: string;

  @ApiProperty({ example: "ord_01J8ZX..." })
  orderId: string;

  @ApiProperty({ example: "DAMAGED" })
  type: string;

  @ApiProperty({ example: "The keepsake box arrived with a torn satin ribbon." })
  description: string;

  @ApiProperty({ enum: DisputeStatus, example: DisputeStatus.OPEN })
  status: DisputeStatus;

  @ApiProperty({ example: "2026-11-03T11:00:00.000Z" })
  createdAt: Date;
}
