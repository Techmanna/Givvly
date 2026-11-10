import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsPositive, IsString } from "class-validator";
import { z } from "zod";
import { MediaStatus } from "@prisma/client";
import {
  ALLOWED_MEDIA_MIMES,
  AllowedMediaMime,
  getMediaKindFromMime,
} from "../../../infra/storage/file-security.util";

export const CANONICAL_MEDIA_PURPOSES = [
  "COVER_IMAGE",
  "WALL_POST",
  "AVATAR",
  "PRODUCT",
  "DISPUTE",
  "REGISTRY_ITEM",
] as const;

export const MEDIA_PURPOSE_INPUTS = [
  ...CANONICAL_MEDIA_PURPOSES,
  "EVENT_COVER",
  "WALL_PHOTO",
  "DISPUTE_PHOTO",
  "PRODUCT_MEDIA",
] as const;

export type CanonicalMediaPurpose = (typeof CANONICAL_MEDIA_PURPOSES)[number];
export type MediaPurpose = (typeof MEDIA_PURPOSE_INPUTS)[number];

export const ALLOWED_MIME_TYPES = ALLOWED_MEDIA_MIMES;

const PURPOSE_ALIAS_MAP: Record<MediaPurpose, CanonicalMediaPurpose> = {
  COVER_IMAGE: "COVER_IMAGE",
  EVENT_COVER: "COVER_IMAGE",
  WALL_POST: "WALL_POST",
  WALL_PHOTO: "WALL_POST",
  AVATAR: "AVATAR",
  PRODUCT: "PRODUCT",
  PRODUCT_MEDIA: "PRODUCT",
  DISPUTE: "DISPUTE",
  DISPUTE_PHOTO: "DISPUTE",
  REGISTRY_ITEM: "REGISTRY_ITEM",
};

export function normalizeMediaPurpose(
  purpose: string
): CanonicalMediaPurpose {
  const upper = purpose?.toUpperCase() as MediaPurpose;
  return PURPOSE_ALIAS_MAP[upper] || "COVER_IMAGE";
}

export const MAX_IMAGE_SIZE_BYTES_BY_PURPOSE: Record<
  CanonicalMediaPurpose,
  number
> = {
  COVER_IMAGE: 10 * 1024 * 1024, // 10 MB
  WALL_POST: 8 * 1024 * 1024,    // 8 MB
  AVATAR: 2 * 1024 * 1024,       // 2 MB
  PRODUCT: 10 * 1024 * 1024,     // 10 MB
  DISPUTE: 10 * 1024 * 1024,     // 10 MB
  REGISTRY_ITEM: 5 * 1024 * 1024, // 5 MB
};

export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export function getMaxAllowedBytes(
  purpose: CanonicalMediaPurpose,
  mime: string
): number {
  if (getMediaKindFromMime(mime) === "VIDEO") {
    return MAX_VIDEO_SIZE_BYTES;
  }
  return MAX_IMAGE_SIZE_BYTES_BY_PURPOSE[purpose] ?? 5 * 1024 * 1024;
}

export const presignUploadSchema = z
  .object({
    purpose: z.enum(MEDIA_PURPOSE_INPUTS),
    mime: z
      .enum(ALLOWED_MIME_TYPES, {
        errorMap: () => ({
          message:
            "Only JPEG, PNG, WebP, GIF images and MP4, WebM, MOV videos are allowed",
        }),
      })
      .optional(),
    contentType: z
      .enum(ALLOWED_MIME_TYPES, {
        errorMap: () => ({
          message:
            "Only JPEG, PNG, WebP, GIF images and MP4, WebM, MOV videos are allowed",
        }),
      })
      .optional(),
    fileName: z
      .string()
      .trim()
      .max(255)
      .refine((val) => !/[\u0000-\u001F\u007F]/.test(val), {
        message: "Invalid characters in file name",
      })
      .optional(),
    sizeBytes: z.coerce.number().int().positive(),
    provider: z.enum(["DISK", "CLOUDINARY", "S3"]).optional(),
  })
  .refine((data) => Boolean(data.mime || data.contentType), {
    message: "Media MIME type (mime or contentType) is required",
    path: ["mime"],
  })
  .refine(
    (data) => {
      const resolvedMime = (data.mime || data.contentType)!;
      if (data.purpose === "AVATAR" && getMediaKindFromMime(resolvedMime) === "VIDEO") {
        return false;
      }
      return true;
    },
    {
      message: "Avatar uploads must be an image (JPEG, PNG, WebP, or GIF)",
      path: ["mime"],
    }
  )
  .refine(
    (data) => {
      const resolvedMime = (data.mime || data.contentType)!;
      const canonicalPurpose = normalizeMediaPurpose(data.purpose);
      const maxBytes = getMaxAllowedBytes(canonicalPurpose, resolvedMime);
      return data.sizeBytes <= maxBytes;
    },
    (data) => {
      const resolvedMime = (data.mime || data.contentType || "image/jpeg")!;
      const canonicalPurpose = normalizeMediaPurpose(data.purpose);
      const maxBytes = getMaxAllowedBytes(canonicalPurpose, resolvedMime);
      return {
        message: `File size exceeds the limit of ${Math.round(
          maxBytes / (1024 * 1024)
        )}MB for ${canonicalPurpose}`,
        path: ["sizeBytes"],
      };
    }
  )
  .transform((data) => {
    const resolvedMime = (data.mime || data.contentType)!;
    return {
      purpose: normalizeMediaPurpose(data.purpose),
      mime: resolvedMime,
      contentType: resolvedMime,
      fileName: data.fileName,
      sizeBytes: data.sizeBytes,
      provider: data.provider,
    };
  });

export class PresignUploadDto {
  @ApiProperty({
    enum: MEDIA_PURPOSE_INPUTS,
    example: "COVER_IMAGE",
    description:
      "Intended media purpose: COVER_IMAGE (or EVENT_COVER), WALL_POST (or WALL_PHOTO), AVATAR, PRODUCT, DISPUTE, REGISTRY_ITEM",
  })
  @IsEnum(MEDIA_PURPOSE_INPUTS)
  purpose: MediaPurpose;

  @ApiPropertyOptional({
    enum: ALLOWED_MIME_TYPES,
    example: "image/jpeg",
    description:
      "MIME type (image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm, video/quicktime)",
  })
  @IsOptional()
  @IsEnum(ALLOWED_MIME_TYPES)
  mime?: AllowedMediaMime;

  @ApiPropertyOptional({
    enum: ALLOWED_MIME_TYPES,
    example: "image/jpeg",
    description: "Alias for mime used by client SDK",
  })
  @IsOptional()
  @IsEnum(ALLOWED_MIME_TYPES)
  contentType?: AllowedMediaMime;

  @ApiPropertyOptional({
    example: "celebration-cover.jpg",
    description: "Original client file name (optional, sanitized)",
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiProperty({
    example: 1048576,
    description: "File size in bytes (up to 10MB for images, 50MB for videos)",
  })
  @IsInt()
  @IsPositive()
  sizeBytes: number;

  @ApiPropertyOptional({
    enum: ["DISK", "CLOUDINARY", "S3"],
    description: "Optional storage provider override",
  })
  @IsOptional()
  @IsString()
  provider?: "DISK" | "CLOUDINARY" | "S3";
}

export class PresignUploadResponseDto {
  @ApiProperty({ example: "a0000000-0000-0000-0000-000000000001" })
  mediaId: string;

  @ApiProperty({ example: "uploads/cover_image/a0000000...jpg" })
  key: string;

  @ApiProperty({ example: "https://cdn.givvly.store/raw-upload/uploads/cover_image/..." })
  uploadUrl: string;

  @ApiProperty({ example: "https://cdn.givvly.store/uploads/cover_image/a0000000...jpg" })
  publicUrl: string;

  @ApiProperty({ example: "PUT" })
  method: string;

  @ApiPropertyOptional({ example: { "Content-Type": "image/jpeg" } })
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: "Multipart fields when method is POST (e.g. Cloudinary)" })
  fields?: Record<string, string>;

  @ApiProperty({ example: 300, description: "Upload token expiry in seconds" })
  expiresIn: number;

  @ApiProperty({ example: "DISK" })
  provider: string;

  @ApiProperty({ example: "IMAGE", enum: ["IMAGE", "VIDEO"] })
  kind: "IMAGE" | "VIDEO";
}

export class CompleteUploadResponseDto {
  @ApiProperty({ example: "a0000000-0000-0000-0000-000000000001" })
  mediaId: string;

  @ApiProperty({ example: "uploads/cover_image/a0000000...jpg" })
  key: string;

  @ApiProperty({ enum: MediaStatus, example: MediaStatus.READY })
  status: MediaStatus;

  @ApiProperty({ example: "https://cdn.givvly.store/uploads/cover_image/a0000000...jpg" })
  url: string;

  @ApiProperty({ example: "https://cdn.givvly.store/uploads/cover_image/a0000000...jpg" })
  publicUrl: string;

  @ApiProperty({ example: "COVER_IMAGE" })
  purpose: string;

  @ApiProperty({ example: "IMAGE", enum: ["IMAGE", "VIDEO"] })
  kind: "IMAGE" | "VIDEO";
}
