import * as path from "node:path";
import * as crypto from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import { StorageMediaKind } from "./storage-provider.interface";

export const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_VIDEO_MIMES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const ALLOWED_MEDIA_MIMES = [
  ...ALLOWED_IMAGE_MIMES,
  ...ALLOWED_VIDEO_MIMES,
] as const;

export type AllowedMediaMime = (typeof ALLOWED_MEDIA_MIMES)[number];

export const MIME_TO_EXTENSION: Record<AllowedMediaMime, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export const EXTENSION_TO_MIME: Record<string, AllowedMediaMime> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

const STRICT_STORAGE_KEY_REGEX =
  /^uploads\/[a-z0-9_]+\/[a-zA-Z0-9_-]+\.(jpg|png|webp|gif|mp4|webm|mov)$/;

const DANGEROUS_HEADER_PATTERNS = [
  /<script\b/i,
  /<svg\b/i,
  /<!doctype\s+html/i,
  /<html\b/i,
  /<\?xml\b/i,
  /<\?php\b/i,
  /javascript:/i,
  /onerror\s*=/i,
  /onload\s*=/i,
];

export function isAllowedMediaMime(mime: string): mime is AllowedMediaMime {
  return (ALLOWED_MEDIA_MIMES as readonly string[]).includes(mime);
}

export function getMediaKindFromMime(mime: string): StorageMediaKind {
  if ((ALLOWED_VIDEO_MIMES as readonly string[]).includes(mime)) {
    return "VIDEO";
  }
  return "IMAGE";
}

export function getExtensionForMime(mime: string): string {
  if (!isAllowedMediaMime(mime)) {
    throw new BadRequestException(`Unsupported media MIME type '${mime}'`);
  }
  return MIME_TO_EXTENSION[mime];
}

/**
 * Validates binary magic bytes against the expected MIME type and blocks
 * disguised scripts, SVG/HTML polyglots, or mismatched file formats.
 */
export function validateFileMagicBytes(
  buffer: Buffer,
  expectedMime: string
): void {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    throw new BadRequestException(
      "Invalid or corrupted media file: file is empty or truncated"
    );
  }

  if (!isAllowedMediaMime(expectedMime)) {
    throw new BadRequestException(
      `Unsupported media MIME type '${expectedMime}'`
    );
  }

  // Inspect initial bytes for embedded HTML/SVG/Script polyglot payloads
  const headText = buffer.subarray(0, Math.min(buffer.length, 512)).toString("utf8");
  for (const pattern of DANGEROUS_HEADER_PATTERNS) {
    if (pattern.test(headText)) {
      throw new BadRequestException(
        "Security violation: executable or markup content detected inside media file"
      );
    }
  }

  const matchesSignature = checkMagicSignature(buffer, expectedMime);
  if (!matchesSignature) {
    throw new BadRequestException(
      `File binary signature does not match declared MIME type '${expectedMime}'`
    );
  }
}

function checkMagicSignature(buffer: Buffer, mime: AllowedMediaMime): boolean {
  switch (mime) {
    case "image/jpeg":
      // FF D8 FF
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

    case "image/png":
      // 89 50 4E 47 0D 0A 1A 0A
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );

    case "image/webp":
      // "RIFF" at 0..3 and "WEBP" at 8..11
      return (
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );

    case "image/gif": {
      // "GIF87a" or "GIF89a"
      const sig = buffer.subarray(0, 6).toString("ascii");
      return sig === "GIF87a" || sig === "GIF89a";
    }

    case "video/mp4":
    case "video/quicktime": {
      // ISO BMFF / QuickTime container: bytes 4..7 are typically 'ftyp', 'moov', 'mdat', 'wide', or 'free'
      const boxType = buffer.subarray(4, 8).toString("ascii");
      return (
        boxType === "ftyp" ||
        boxType === "moov" ||
        boxType === "mdat" ||
        boxType === "wide" ||
        boxType === "free"
      );
    }

    case "video/webm":
      // EBML header: 1A 45 DF A3
      return (
        buffer[0] === 0x1a &&
        buffer[1] === 0x45 &&
        buffer[2] === 0xdf &&
        buffer[3] === 0xa3
      );

    default:
      return false;
  }
}

/**
 * Generates a canonical, traversal-safe storage key using server-generated UUIDs.
 */
export function buildSafeStorageKey(
  purpose: string,
  mediaId: string,
  mime: string
): string {
  const safePurpose = purpose
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 32);
  const safeId = mediaId.replace(/[^a-zA-Z0-9_-]/g, "");
  const ext = getExtensionForMime(mime);

  if (!safePurpose || !safeId) {
    throw new BadRequestException("Invalid storage key parameters");
  }

  const key = `uploads/${safePurpose}/${safeId}${ext}`;
  validateStorageKey(key);
  return key;
}

/**
 * Validates that a storage key strictly adheres to `uploads/<folder>/<id>.<ext>`
 * with zero path traversal sequences or control characters.
 */
export function validateStorageKey(key: string): void {
  if (
    !key ||
    typeof key !== "string" ||
    key.includes("..") ||
    key.includes("\0") ||
    key.includes("\\") ||
    !STRICT_STORAGE_KEY_REGEX.test(key)
  ) {
    throw new BadRequestException("Invalid or unsafe media storage key");
  }
}

/**
 * Resolves a storage key within `baseDir` and verifies the target path cannot escape `baseDir`.
 */
export function resolveSafeDiskPath(baseDir: string, key: string): string {
  validateStorageKey(key);
  const rootPath = path.resolve(baseDir);
  const resolvedTarget = path.resolve(rootPath, key);

  if (
    resolvedTarget !== rootPath &&
    !resolvedTarget.startsWith(rootPath + path.sep)
  ) {
    throw new BadRequestException("Path traversal attempt blocked");
  }

  return resolvedTarget;
}

/**
 * Signs a presigned upload token with HMAC-SHA256.
 */
export function signUploadToken(
  secret: string,
  payload: { key: string; expires: number; mime: string; maxBytes: number }
): string {
  const data = `${payload.key}:${payload.expires}:${payload.mime}:${payload.maxBytes}`;
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

/**
 * Verifies a presigned upload token using constant-time comparison.
 */
export function verifyUploadToken(
  secret: string,
  payload: { key: string; expires: number; mime: string; maxBytes: number },
  signature: string
): boolean {
  if (!signature || typeof signature !== "string") {
    return false;
  }
  const expected = signUploadToken(secret, payload);
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Validates that a media URL or asset path is free of XSS / protocol injection.
 */
export function isSafeMediaUrl(url: string): boolean {
  if (!url || typeof url !== "string" || url.length > 2048) {
    return false;
  }
  const trimmed = url.trim();
  if (
    /[\u0000-\u001F\u007F<>"'`]/.test(trimmed) ||
    /^(javascript|data|vbscript|file):/i.test(trimmed)
  ) {
    return false;
  }
  if (trimmed.startsWith("/")) {
    return !trimmed.startsWith("//") && !trimmed.includes("..");
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

