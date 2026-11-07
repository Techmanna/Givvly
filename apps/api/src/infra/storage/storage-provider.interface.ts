export type StorageMediaKind = "IMAGE" | "VIDEO";

export interface StorageUploadParams {
  key: string;
  buffer: Buffer;
  mime: string;
  sizeBytes: number;
  kind: StorageMediaKind;
  purpose: string;
}

export interface StorageUploadResult {
  key: string;
  url: string;
  provider: string;
  sizeBytes: number;
  mime: string;
  kind: StorageMediaKind;
}

export interface StoragePresignParams {
  key: string;
  mime: string;
  sizeBytes: number;
  kind: StorageMediaKind;
  purpose: string;
  expiresInSeconds?: number;
}

export interface StoragePresignResult {
  uploadUrl: string;
  method: "PUT" | "POST";
  key: string;
  publicUrl: string;
  provider: string;
  headers?: Record<string, string>;
  fields?: Record<string, string>;
  expiresIn: number;
}

export interface StorageProvider {
  /**
   * Unique identifier of the storage adapter (e.g., "DISK", "CLOUDINARY", "S3")
   */
  readonly providerName: string;

  /**
   * Upload a validated binary buffer directly to the underlying storage
   */
  uploadFile(params: StorageUploadParams): Promise<StorageUploadResult>;

  /**
   * Generate a presigned upload descriptor for direct client-to-storage upload
   */
  createPresignedUpload(params: StoragePresignParams): Promise<StoragePresignResult>;

  /**
   * Delete a stored object by key
   */
  deleteFile(key: string, kind?: StorageMediaKind): Promise<void>;

  /**
   * Resolve the public URL for a stored object key
   */
  getPublicUrl(key: string, kind?: StorageMediaKind): string;
}

