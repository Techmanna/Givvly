import { Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StorageProvider } from "./storage-provider.interface";
import { DiskStorageProvider } from "./adapters/disk.storage";
import { CloudinaryStorageProvider } from "./adapters/cloudinary.storage";
import { S3StorageProvider } from "./adapters/s3.storage";

@Injectable()
export class StorageProviderRegistry {
  private readonly logger = new Logger(StorageProviderRegistry.name);
  private readonly providers = new Map<string, StorageProvider>();
  private activeProviderName = "DISK";

  constructor(
    @Optional() private readonly config?: ConfigService,
    @Optional() diskProvider?: DiskStorageProvider,
    @Optional() cloudinaryProvider?: CloudinaryStorageProvider,
    @Optional() s3Provider?: S3StorageProvider
  ) {
    if (diskProvider) {
      this.registerProvider(diskProvider);
    }
    if (cloudinaryProvider) {
      this.registerProvider(cloudinaryProvider);
    }
    if (s3Provider) {
      this.registerProvider(s3Provider);
    }

    const configured = this.config?.get<string>("STORAGE_PROVIDER");
    if (configured && this.providers.has(configured.toUpperCase())) {
      this.activeProviderName = configured.toUpperCase();
    }
  }

  /**
   * Register a storage provider adapter so the system can scale to additional backends
   */
  registerProvider(provider: StorageProvider): void {
    const key = provider.providerName.toUpperCase();
    this.providers.set(key, provider);
    this.logger.log(`Registered storage provider '${key}'`);
  }

  /**
   * Switch the active default storage provider at runtime
   */
  setActiveProvider(providerName: string): void {
    const key = providerName.toUpperCase();
    if (!this.providers.has(key)) {
      throw new NotFoundException(
        `Storage provider '${key}' is not registered. Available: [${this.listProviders().join(", ")}]`
      );
    }
    this.activeProviderName = key;
    this.logger.log(`Switched active storage provider to '${key}'`);
  }

  getActiveProviderName(): string {
    return this.activeProviderName;
  }

  /**
   * Resolve storage provider by name or return the currently active provider
   */
  getProvider(providerName?: string): StorageProvider {
    const name = (providerName || this.activeProviderName).toUpperCase();
    const provider = this.providers.get(name);

    if (!provider) {
      throw new NotFoundException(
        `Storage provider '${name}' is not registered. Available: [${this.listProviders().join(", ")}]`
      );
    }

    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

