import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MediaStatus } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { StorageProviderRegistry } from "../../infra/storage/storage-provider.registry";
import { DiskStorageProvider } from "../../infra/storage/adapters/disk.storage";
import { CloudinaryStorageProvider } from "../../infra/storage/adapters/cloudinary.storage";
import { S3StorageProvider } from "../../infra/storage/adapters/s3.storage";
import {
  buildSafeStorageKey,
  EXTENSION_TO_MIME,
  getMediaKindFromMime,
  isAllowedMediaMime,
  resolveSafeDiskPath,
  validateFileMagicBytes,
  validateStorageKey,
  verifyUploadToken,
} from "../../infra/storage/file-security.util";
import {
  getMaxAllowedBytes,
  normalizeMediaPurpose,
  PresignUploadDto,
} from "./dto/presign-upload.dto";

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly storageRegistry: StorageProviderRegistry;
  private readonly diskProvider: DiskStorageProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() storageRegistry?: StorageProviderRegistry,
    @Optional() diskProvider?: DiskStorageProvider
  ) {
    this.diskProvider = diskProvider ?? new DiskStorageProvider(this.config);
    this.storageRegistry =
      storageRegistry ??
      new StorageProviderRegistry(
        this.config,
        this.diskProvider,
        new CloudinaryStorageProvider(this.config),
        new S3StorageProvider(this.config)
      );
  }

  /**
   * Request presigned URL / parameters for direct client upload
   */
  async presignUpload(
    dto: PresignUploadDto,
    user?: { id: string; role?: string }
  ) {
    const mime = (dto.mime || dto.contentType || "image/jpeg").toLowerCase();
    if (!isAllowedMediaMime(mime)) {
      throw new BadRequestException(
        "Only JPEG, PNG, WebP, GIF images and MP4, WebM, MOV videos are allowed"
      );
    }

    const purpose = normalizeMediaPurpose(dto.purpose);
    const kind = getMediaKindFromMime(mime);
    const maxBytes = getMaxAllowedBytes(purpose, mime);

    if (!Number.isInteger(dto.sizeBytes) || dto.sizeBytes <= 0) {
      throw new BadRequestException("File size must be a positive integer");
    }
    if (dto.sizeBytes > maxBytes) {
      throw new BadRequestException(
        `File size exceeds the maximum allowed (${Math.round(
          maxBytes / (1024 * 1024)
        )}MB) for ${purpose}`
      );
    }

    const mediaId = crypto.randomUUID();
    const key = buildSafeStorageKey(purpose, mediaId, mime);
    const provider = this.storageRegistry.getProvider(dto.provider);

    const [media, presigned] = await Promise.all([
      this.prisma.media.create({
        data: {
          id: mediaId,
          ownerUserId: user?.id,
          key,
          mime,
          sizeBytes: dto.sizeBytes,
          kind,
          purpose,
          status: MediaStatus.UPLOADING,
        },
      }),
      provider.createPresignedUpload({
        key,
        mime,
        sizeBytes: dto.sizeBytes,
        kind,
        purpose,
        expiresInSeconds: 300,
      }),
    ]);

    this.logger.log(
      `Presigned upload initialized: mediaId=${media.id}, provider=${provider.providerName}, purpose=${purpose}, mime=${mime}, kind=${kind}`
    );

    return {
      mediaId: media.id,
      key: media.key,
      uploadUrl: presigned.uploadUrl,
      publicUrl: presigned.publicUrl,
      url: presigned.publicUrl,
      method: presigned.method,
      headers: presigned.headers ?? { "Content-Type": mime },
      fields: presigned.fields,
      expiresIn: presigned.expiresIn,
      provider: provider.providerName,
      kind,
      mime,
    };
  }

  /**
   * Direct multipart file upload with binary magic-byte inspection and pluggable storage
   */
  async uploadDirectFile(
    params: {
      buffer: Buffer;
      mime: string;
      sizeBytes: number;
      purpose?: string;
      provider?: string;
    },
    user?: { id: string; role?: string }
  ) {
    const mime = (params.mime || "").toLowerCase();
    if (!isAllowedMediaMime(mime)) {
      throw new BadRequestException(
        "Only JPEG, PNG, WebP, GIF images and MP4, WebM, MOV videos are allowed"
      );
    }

    const purpose = normalizeMediaPurpose(params.purpose || "COVER_IMAGE");
    const kind = getMediaKindFromMime(mime);
    if (purpose === "AVATAR" && kind === "VIDEO") {
      throw new BadRequestException("Avatar uploads must be an image");
    }

    const actualSize = params.buffer?.length ?? 0;
    const maxBytes = getMaxAllowedBytes(purpose, mime);
    if (actualSize <= 0 || actualSize > maxBytes) {
      throw new BadRequestException(
        `File size must be between 1 byte and ${Math.round(
          maxBytes / (1024 * 1024)
        )}MB`
      );
    }

    // Verify actual binary magic bytes match declared MIME and contain no script/polyglot payloads
    validateFileMagicBytes(params.buffer, mime);

    const mediaId = crypto.randomUUID();
    const key = buildSafeStorageKey(purpose, mediaId, mime);
    const provider = this.storageRegistry.getProvider(params.provider);

    const uploaded = await provider.uploadFile({
      key,
      buffer: params.buffer,
      mime,
      sizeBytes: actualSize,
      kind,
      purpose,
    });

    const media = await this.prisma.media.create({
      data: {
        id: mediaId,
        ownerUserId: user?.id,
        key: uploaded.key,
        mime,
        sizeBytes: actualSize,
        kind,
        purpose,
        status: MediaStatus.READY,
      },
    });

    this.logger.log(
      `Direct media upload completed: mediaId=${media.id}, provider=${provider.providerName}, key=${media.key}`
    );

    return {
      mediaId: media.id,
      key: media.key,
      status: media.status,
      url: uploaded.url,
      publicUrl: uploaded.url,
      kind,
      mime,
      sizeBytes: actualSize,
      purpose,
      provider: provider.providerName,
    };
  }

  /**
   * Handle signed raw binary PUT upload for the DISK storage provider
   */
  async handleSignedDiskUpload(
    key: string,
    buffer: Buffer,
    query: {
      expires?: string;
      mime?: string;
      maxBytes?: string;
      sig?: string;
    }
  ) {
    validateStorageKey(key);

    const expires = Number(query.expires);
    const maxBytes = Number(query.maxBytes);
    const mime = (query.mime || "").toLowerCase();
    const sig = query.sig || "";

    if (
      !Number.isFinite(expires) ||
      !Number.isFinite(maxBytes) ||
      !isAllowedMediaMime(mime) ||
      !sig
    ) {
      throw new BadRequestException("Missing or invalid upload signature parameters");
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec > expires) {
      throw new ForbiddenException("Presigned upload URL has expired");
    }

    const isValidSig = verifyUploadToken(
      this.diskProvider.secretKey,
      { key, expires, mime, maxBytes },
      sig
    );
    if (!isValidSig) {
      throw new ForbiddenException("Invalid upload signature");
    }

    if (!Buffer.isBuffer(buffer) || buffer.length <= 0) {
      throw new BadRequestException("Uploaded file body is empty");
    }

    if (buffer.length > maxBytes) {
      throw new BadRequestException(
        `Uploaded payload (${buffer.length} bytes) exceeds declared size (${maxBytes} bytes)`
      );
    }

    // Verify binary magic bytes before writing to disk
    validateFileMagicBytes(buffer, mime);

    const kind = getMediaKindFromMime(mime);
    const uploaded = await this.diskProvider.uploadFile({
      key,
      buffer,
      mime,
      sizeBytes: buffer.length,
      kind,
      purpose: key.split("/")[1]?.toUpperCase() || "COVER_IMAGE",
    });

    if (typeof (this.prisma.media as any).updateMany === "function") {
      await this.prisma.media.updateMany({
        where: { key },
        data: {
          status: MediaStatus.READY,
          sizeBytes: buffer.length,
        },
      });
    }

    return {
      key: uploaded.key,
      url: uploaded.url,
      publicUrl: uploaded.url,
      status: MediaStatus.READY,
      kind,
      mime,
      sizeBytes: buffer.length,
    };
  }

  /**
   * Resolve safe local file path and MIME for streaming DISK-stored files
   */
  async resolveDiskFileForServing(key: string): Promise<{
    filePath: string;
    mime: string;
    sizeBytes: number;
    kind: "IMAGE" | "VIDEO";
  }> {
    validateStorageKey(key);
    const filePath = resolveSafeDiskPath(this.diskProvider.rootDirectory, key);

    let stat: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stat = await fs.stat(filePath);
    } catch {
      throw new NotFoundException("Requested media file was not found");
    }

    if (!stat.isFile()) {
      throw new NotFoundException("Requested media resource is not a file");
    }

    const extMatch = key.match(/\.[a-z0-9]+$/i);
    const ext = extMatch ? extMatch[0].toLowerCase() : ".jpg";
    const mime = EXTENSION_TO_MIME[ext] || "application/octet-stream";

    return {
      filePath,
      mime,
      sizeBytes: stat.size,
      kind: getMediaKindFromMime(mime),
    };
  }

  /**
   * Confirm upload complete, transition to READY
   */
  async completeUpload(
    mediaId: string,
    user?: { id: string; role?: string }
  ) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException(`Media with id '${mediaId}' not found`);
    }

    if (
      user &&
      user.role !== "ADMIN" &&
      media.ownerUserId &&
      media.ownerUserId !== user.id
    ) {
      throw new ForbiddenException("You do not own this media asset");
    }

    const updated =
      media.status === MediaStatus.READY
        ? media
        : await this.prisma.media.update({
            where: { id: mediaId },
            data: {
              status: MediaStatus.READY,
            },
          });

    const kind = (media.kind === "VIDEO" ? "VIDEO" : "IMAGE") as "IMAGE" | "VIDEO";
    const publicUrl = this.storageRegistry
      .getProvider()
      .getPublicUrl(updated.key, kind);

    this.logger.log(
      `Media upload completed: mediaId=${updated.id}, key=${updated.key}`
    );

    return {
      mediaId: updated.id,
      key: updated.key,
      status: updated.status,
      url: publicUrl,
      publicUrl,
      purpose: updated.purpose,
      kind,
    };
  }

  /**
   * Delete media asset from both storage provider and database
   */
  async deleteMedia(mediaId: string, user?: { id: string; role?: string }) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException(`Media '${mediaId}' not found`);
    }

    if (
      user &&
      user.role !== "ADMIN" &&
      media.ownerUserId &&
      media.ownerUserId !== user.id
    ) {
      throw new ForbiddenException("You do not own this media asset");
    }

    const kind = (media.kind === "VIDEO" ? "VIDEO" : "IMAGE") as "IMAGE" | "VIDEO";
    const provider = this.storageRegistry.getProvider();

    await Promise.all([
      provider.deleteFile(media.key, kind),
      this.prisma.media.delete({ where: { id: mediaId } }),
    ]);

    return { deleted: true, mediaId };
  }

  /**
   * Get media metadata by ID
   */
  async getMediaById(mediaId: string) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException(`Media '${mediaId}' not found`);
    }

    const kind = (media.kind === "VIDEO" ? "VIDEO" : "IMAGE") as "IMAGE" | "VIDEO";
    const url = this.storageRegistry
      .getProvider()
      .getPublicUrl(media.key, kind);

    return {
      ...media,
      url,
      publicUrl: url,
    };
  }

  getStorageInfo() {
    return {
      activeProvider: this.storageRegistry.getActiveProviderName(),
      availableProviders: this.storageRegistry.listProviders(),
    };
  }
}
