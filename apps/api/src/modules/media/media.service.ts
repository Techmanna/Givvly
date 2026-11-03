import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { MediaStatus } from "@prisma/client";
import { PresignUploadDto } from "./dto/presign-upload.dto";
import * as crypto from "crypto";

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly cdnBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {
    this.cdnBaseUrl =
      this.config.get<string>("CDN_BASE_URL") || "https://cdn.givvly.ng";
  }

  /**
   * Request presigned URL for direct client upload
   */
  async presignUpload(
    dto: PresignUploadDto,
    user?: { id: string; role?: string }
  ) {
    const ext = EXTENSION_MAP[dto.mime] || ".jpg";
    const mediaId = crypto.randomUUID();
    const folder = dto.purpose.toLowerCase();
    const key = `uploads/${folder}/${mediaId}${ext}`;

    const media = await this.prisma.media.create({
      data: {
        id: mediaId,
        ownerUserId: user?.id,
        key,
        mime: dto.mime,
        sizeBytes: dto.sizeBytes,
        purpose: dto.purpose,
        status: MediaStatus.UPLOADING,
      },
    });

    // In production, this can call @aws-sdk/s3-request-presigner
    // In dev / cloud environment, we produce the signed PUT URL
    const uploadUrl = `${this.cdnBaseUrl}/raw-upload/${key}?sig=${crypto
      .createHmac("sha256", "presign_secret_key")
      .update(key)
      .digest("hex")}`;

    this.logger.log(
      `Presigned upload initialized: mediaId=${media.id}, purpose=${dto.purpose}, mime=${dto.mime}`
    );

    return {
      mediaId: media.id,
      key: media.key,
      uploadUrl,
      method: "PUT",
      headers: {
        "Content-Type": dto.mime,
      },
      expiresIn: 300, // 5 minutes
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

    const updated = await this.prisma.media.update({
      where: { id: mediaId },
      data: {
        status: MediaStatus.READY,
      },
    });

    const publicUrl = `${this.cdnBaseUrl}/${updated.key}`;

    this.logger.log(`Media upload completed: mediaId=${updated.id}, key=${updated.key}`);

    return {
      mediaId: updated.id,
      key: updated.key,
      status: updated.status,
      url: publicUrl,
      purpose: updated.purpose,
    };
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

    return {
      ...media,
      url: `${this.cdnBaseUrl}/${media.key}`,
    };
  }
}

