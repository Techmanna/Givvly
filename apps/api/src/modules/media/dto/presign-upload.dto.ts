import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsPositive } from "class-validator";
import { z } from "zod";
import { MediaStatus } from "@prisma/client";

export const MEDIA_PURPOSES = [
  "COVER_IMAGE",
  "WALL_POST",
  "AVATAR",
  "PRODUCT",
  "DISPUTE",
] as const;

export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_SIZE_BYTES_BY_PURPOSE: Record<MediaPurpose, number> = {
  COVER_IMAGE: 5 * 1024 * 1024, // 5 MB
  WALL_POST: 8 * 1024 * 1024,   // 8 MB
  AVATAR: 2 * 1024 * 1024,      // 2 MB
  PRODUCT: 5 * 1024 * 1024,     // 5 MB
  DISPUTE: 5 * 1024 * 1024,     // 5 MB
};

export const presignUploadSchema = z
  .object({
    purpose: z.enum(MEDIA_PURPOSES),
    mime: z.enum(ALLOWED_MIME_TYPES, {
      errorMap: () => ({
        message: "Only JPEG, PNG, and WebP images are allowed",
      }),
    }),
    sizeBytes: z.number().int().positive(),
  })
  .refine(
    (data) => data.sizeBytes <= MAX_SIZE_BYTES_BY_PURPOSE[data.purpose],
    (data) => ({
      message: `File size exceeds the limit of ${
        MAX_SIZE_BYTES_BY_PURPOSE[data.purpose] / (1024 * 1024)
      }MB for ${data.purpose}`,
      path: ["sizeBytes"],
    })
  );

export class PresignUploadDto {
  @ApiProperty({
    enum: MEDIA_PURPOSES,
    example: "COVER_IMAGE",
    description: "Intended media purpose: COVER_IMAGE, WALL_POST, AVATAR, PRODUCT, DISPUTE",
  })
  @IsEnum(MEDIA_PURPOSES)
  purpose: MediaPurpose;

  @ApiProperty({
    enum: ALLOWED_MIME_TYPES,
    example: "image/jpeg",
    description: "MIME type (image/jpeg, image/png, image/webp)",
  })
  @IsEnum(ALLOWED_MIME_TYPES)
  mime: "image/jpeg" | "image/png" | "image/webp";

  @ApiProperty({
    example: 1048576,
    description: "File size in bytes (max 5MB for cover, 8MB for wall, 2MB for avatar)",
  })
  @IsInt()
  @IsPositive()
  sizeBytes: number;
}

export class PresignUploadResponseDto {
  @ApiProperty({ example: "a0000000-0000-0000-0000-000000000001" })
  mediaId: string;

  @ApiProperty({ example: "uploads/cover_image/a0000000...jpg" })
  key: string;

  @ApiProperty({ example: "https://cdn.givvly.ng/raw-upload/uploads/cover_image/..." })
  uploadUrl: string;

  @ApiProperty({ example: "PUT" })
  method: string;

  @ApiProperty({ example: { "Content-Type": "image/jpeg" } })
  headers: Record<string, string>;

  @ApiProperty({ example: 300, description: "Upload token expiry in seconds" })
  expiresIn: number;
}

export class CompleteUploadResponseDto {
  @ApiProperty({ example: "a0000000-0000-0000-0000-000000000001" })
  mediaId: string;

  @ApiProperty({ example: "uploads/cover_image/a0000000...jpg" })
  key: string;

  @ApiProperty({ enum: MediaStatus, example: MediaStatus.READY })
  status: MediaStatus;

  @ApiProperty({ example: "https://cdn.givvly.ng/uploads/cover_image/a0000000...jpg" })
  url: string;

  @ApiProperty({ example: "COVER_IMAGE" })
  purpose: string;
}
