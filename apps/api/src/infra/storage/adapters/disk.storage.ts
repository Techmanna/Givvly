import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Injectable, Logger } from "@nestjs/common";
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
  resolveSafeDiskPath,
  signUploadToken,
  validateFileMagicBytes,
  validateStorageKey,
} from "../file-security.util";

@Injectable()
export class DiskStorageProvider implements StorageProvider {
  readonly providerName = "DISK";
  private readonly logger = new Logger(DiskStorageProvider.name);
  private readonly baseDir: string;
  private readonly apiUrl: string;
  private readonly cdnBaseUrl: string;
  private readonly presignSecret: string;

  constructor(private readonly config: ConfigService) {
    const configuredDir =
      this.config.get<string>("STORAGE_DISK_DIR") || "uploads";
    this.baseDir = path.isAbsolute(configuredDir)
      ? configuredDir
      : path.resolve(process.cwd(), configuredDir);
    this.apiUrl = (
      this.config.get<string>("API_URL") || "http://localhost:4000"
    ).replace(/\/$/, "");
    const rawCdn = this.config.get<string>("CDN_BASE_URL") || "";
    this.cdnBaseUrl = rawCdn.startsWith("http") ? rawCdn.replace(/\/$/, "") : "";
    this.presignSecret =
      this.config.get<string>("PRESIGN_SECRET_KEY") ||
      "givvly_presign_hmac_secret_key_32b";
  }

  get rootDirectory(): string {
    return this.baseDir;
  }

  get secretKey(): string {
    return this.presignSecret;
  }

  async uploadFile(params: StorageUploadParams): Promise<StorageUploadResult> {
    validateStorageKey(params.key);
    validateFileMagicBytes(params.buffer, params.mime);

    const filePath = resolveSafeDiskPath(this.baseDir, params.key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, params.buffer, { mode: 0o644 });

    const url = this.getPublicUrl(params.key, params.kind);
    this.logger.log(
      `Saved file to local disk: key=${params.key}, size=${params.buffer.length}`
    );

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
    validateStorageKey(params.key);
    const expiresIn = params.expiresInSeconds ?? 300;
    const expires = Math.floor(Date.now() / 1000) + expiresIn;
    const sig = signUploadToken(this.presignSecret, {
      key: params.key,
      expires,
      mime: params.mime,
      maxBytes: params.sizeBytes,
    });

    const query = new URLSearchParams({
      expires: String(expires),
      mime: params.mime,
      maxBytes: String(params.sizeBytes),
      sig,
    }).toString();

    const uploadUrl = this.cdnBaseUrl
      ? `${this.cdnBaseUrl}/raw-upload/${params.key}?${query}`
      : `${this.apiUrl}/api/v1/uploads/raw/${params.key}?${query}`;

    return {
      uploadUrl,
      method: "PUT",
      key: params.key,
      publicUrl: this.getPublicUrl(params.key, params.kind),
      provider: this.providerName,
      headers: {
        "Content-Type": params.mime,
      },
      expiresIn,
    };
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = resolveSafeDiskPath(this.baseDir, key);
    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err?.code !== "ENOENT") {
        throw err;
      }
    }
  }

  getPublicUrl(key: string, _kind?: StorageMediaKind): string {
    validateStorageKey(key);
    if (this.cdnBaseUrl) {
      return `${this.cdnBaseUrl}/${key}`;
    }
    return `${this.apiUrl}/api/v1/uploads/files/${key}`;
  }
}

