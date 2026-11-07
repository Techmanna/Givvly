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

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function getSigningKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string
): Buffer {
  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

@Injectable()
export class S3StorageProvider implements StorageProvider {
  readonly providerName = "S3";
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>("S3_BUCKET") || "";
    this.region = this.config.get<string>("S3_REGION") || "us-east-1";
    this.endpoint = (this.config.get<string>("S3_ENDPOINT") || "").replace(
      /\/$/,
      ""
    );
    this.accessKeyId = this.config.get<string>("S3_ACCESS_KEY_ID") || "";
    this.secretAccessKey =
      this.config.get<string>("S3_SECRET_ACCESS_KEY") || "";
    this.publicBaseUrl = (
      this.config.get<string>("S3_PUBLIC_BASE_URL") || ""
    ).replace(/\/$/, "");
  }

  private ensureConfigured(): void {
    if (!this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      throw new InternalServerErrorException(
        "S3 storage provider is not configured (missing S3_BUCKET, S3_ACCESS_KEY_ID, or S3_SECRET_ACCESS_KEY)"
      );
    }
  }

  private getObjectEndpoint(key: string): {
    url: URL;
    host: string;
    canonicalUri: string;
  } {
    validateStorageKey(key);
    const encodedKey = key
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    if (this.endpoint) {
      const base = new URL(this.endpoint);
      const canonicalUri =
        base.pathname.replace(/\/$/, "") + `/${this.bucket}/${encodedKey}`;
      const fullUrl = new URL(`${this.endpoint}/${this.bucket}/${encodedKey}`);
      return { url: fullUrl, host: fullUrl.host, canonicalUri };
    }

    const host = `${this.bucket}.s3.${this.region}.amazonaws.com`;
    const canonicalUri = `/${encodedKey}`;
    const fullUrl = new URL(`https://${host}${canonicalUri}`);
    return { url: fullUrl, host, canonicalUri };
  }

  async uploadFile(params: StorageUploadParams): Promise<StorageUploadResult> {
    this.ensureConfigured();
    validateStorageKey(params.key);
    validateFileMagicBytes(params.buffer, params.mime);

    const { url, host, canonicalUri } = this.getObjectEndpoint(params.key);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256Hex(params.buffer);

    const canonicalHeaders =
      `content-type:${params.mime}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = [
      "PUT",
      canonicalUri,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join("\n");

    const signingKey = getSigningKey(
      this.secretAccessKey,
      dateStamp,
      this.region,
      "s3"
    );
    const signature = crypto
      .createHmac("sha256", signingKey)
      .update(stringToSign, "utf8")
      .digest("hex");

    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(url.toString(), {
      method: "PUT",
      headers: {
        "Content-Type": params.mime,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        Authorization: authorization,
      },
      body: new Uint8Array(params.buffer),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`S3 upload failed (${response.status}): ${errText}`);
      throw new InternalServerErrorException(
        "Failed to upload media to S3 storage"
      );
    }

    return {
      key: params.key,
      url: this.getPublicUrl(params.key, params.kind),
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

    const expiresIn = params.expiresInSeconds ?? 300;
    const { url, host, canonicalUri } = this.getObjectEndpoint(params.key);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;

    const queryParams = new URLSearchParams({
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${this.accessKeyId}/${credentialScope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": String(expiresIn),
      "X-Amz-SignedHeaders": "content-type;host",
    });
    queryParams.sort();

    const canonicalHeaders = `content-type:${params.mime}\nhost:${host}\n`;
    const canonicalRequest = [
      "PUT",
      canonicalUri,
      queryParams.toString(),
      canonicalHeaders,
      "content-type;host",
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join("\n");

    const signingKey = getSigningKey(
      this.secretAccessKey,
      dateStamp,
      this.region,
      "s3"
    );
    const signature = crypto
      .createHmac("sha256", signingKey)
      .update(stringToSign, "utf8")
      .digest("hex");

    queryParams.set("X-Amz-Signature", signature);
    url.search = queryParams.toString();

    return {
      uploadUrl: url.toString(),
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
    this.ensureConfigured();
    validateStorageKey(key);

    const { url, host, canonicalUri } = this.getObjectEndpoint(key);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256Hex("");

    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = [
      "DELETE",
      canonicalUri,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join("\n");

    const signingKey = getSigningKey(
      this.secretAccessKey,
      dateStamp,
      this.region,
      "s3"
    );
    const signature = crypto
      .createHmac("sha256", signingKey)
      .update(stringToSign, "utf8")
      .digest("hex");

    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers: {
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        Authorization: authorization,
      },
    });

    if (!response.ok && response.status !== 404) {
      this.logger.warn(`S3 delete warning for key=${key}: ${response.status}`);
    }
  }

  getPublicUrl(key: string, _kind?: StorageMediaKind): string {
    validateStorageKey(key);
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${key}`;
    }
    if (this.endpoint) {
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    const bucket = this.bucket || "givvly-media";
    return `https://${bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

