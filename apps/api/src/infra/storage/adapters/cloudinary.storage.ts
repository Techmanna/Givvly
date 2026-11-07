import * as crypto from "node:crypto";
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  StorageMediaKind,
  StoragePresignParams,
  StoragePresignResult,
  StorageProvider,
  StorageUploadParams,
  StorageUploadResult,
} from "../storage-provider.interface";
import {
  validateFileMagicBytes,
  validateStorageKey,
} from "../file-security.util";

@Injectable()
export class CloudinaryStorageProvider implements StorageProvider {
  readonly providerName = "CLOUDINARY";
  private readonly logger = new Logger(CloudinaryStorageProvider.name);
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseFolder: string;

  constructor(private readonly config: ConfigService) {
    this.cloudName = this.config.get<string>("CLOUDINARY_CLOUD_NAME") || "";
    this.apiKey = this.config.get<string>("CLOUDINARY_API_KEY") || "";
    this.apiSecret = this.config.get<string>("CLOUDINARY_API_SECRET") || "";
    this.baseFolder = this.config.get<string>("CLOUDINARY_FOLDER") || "givvly";
  }

  private ensureConfigured(): void {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new InternalServerErrorException(
        "Cloudinary storage provider is not configured (missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET)"
      );
    }
  }

  private signParams(params: Record<string, string | number>): string {
    const serialized = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    return crypto
      .createHash("sha1")
      .update(`${serialized}${this.apiSecret}`)
      .digest("hex");
  }

  private toPublicId(key: string): string {
    validateStorageKey(key);
    const withoutExt = key.replace(/\.[a-z0-9]+$/i, "");
    return `${this.baseFolder}/${withoutExt}`;
  }

  async uploadFile(params: StorageUploadParams): Promise<StorageUploadResult> {
    this.ensureConfigured();
    validateStorageKey(params.key);
    validateFileMagicBytes(params.buffer, params.mime);

    const resourceType = params.kind === "VIDEO" ? "video" : "image";
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = this.toPublicId(params.key);
    const signature = this.signParams({
      public_id: publicId,
      timestamp,
    });

    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      this.cloudName
    )}/${resourceType}/upload`;

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(params.buffer)], {
      type: params.mime,
    });
    formData.append("file", blob, params.key.split("/").pop() || "upload");
    formData.append("api_key", this.apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("public_id", publicId);
    formData.append("signature", signature);

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        `Cloudinary upload failed (${response.status}): ${errorText}`
      );
      throw new InternalServerErrorException(
        "Failed to upload media to Cloudinary storage"
      );
    }

    const data = (await response.json()) as { secure_url?: string };
    const url = data.secure_url || this.getPublicUrl(params.key, params.kind);

    return {
      key: params.key,
      url,
      provider: this.providerName,
      sizeBytes: params.buffer.length,
      mime: params.mime,
      kind: params.kind,
    };
  }

  async createPresignedUpload(
    params: StoragePresignParams
  ): Promise<StoragePresignResult> {
    this.ensureConfigured();
    validateStorageKey(params.key);

    const resourceType = params.kind === "VIDEO" ? "video" : "image";
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = this.toPublicId(params.key);
    const signature = this.signParams({
      public_id: publicId,
      timestamp,
    });

    const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      this.cloudName
    )}/${resourceType}/upload`;

    return {
      uploadUrl,
      method: "POST",
      key: params.key,
      publicUrl: this.getPublicUrl(params.key, params.kind),
      provider: this.providerName,
      fields: {
        api_key: this.apiKey,
        timestamp: String(timestamp),
        public_id: publicId,
        signature,
      },
      expiresIn: params.expiresInSeconds ?? 300,
    };
  }

  async deleteFile(key: string, kind: StorageMediaKind = "IMAGE"): Promise<void> {
    this.ensureConfigured();
    const resourceType = kind === "VIDEO" ? "video" : "image";
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = this.toPublicId(key);
    const signature = this.signParams({
      public_id: publicId,
      timestamp,
    });

    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      this.cloudName
    )}/${resourceType}/destroy`;

    const body = new URLSearchParams({
      public_id: publicId,
      api_key: this.apiKey,
      timestamp: String(timestamp),
      signature,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      this.logger.warn(`Cloudinary delete warning for key=${key}: ${response.status}`);
    }
  }

  getPublicUrl(key: string, kind: StorageMediaKind = "IMAGE"): string {
    validateStorageKey(key);
    const resourceType = kind === "VIDEO" ? "video" : "image";
    const cloud = this.cloudName || "givvly";
    return `https://res.cloudinary.com/${encodeURIComponent(
      cloud
    )}/${resourceType}/upload/${this.baseFolder}/${key}`;
  }
}

