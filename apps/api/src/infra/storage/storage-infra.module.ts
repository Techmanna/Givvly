import { Global, Module } from "@nestjs/common";
import { DiskStorageProvider } from "./adapters/disk.storage";
import { CloudinaryStorageProvider } from "./adapters/cloudinary.storage";
import { S3StorageProvider } from "./adapters/s3.storage";
import { StorageProviderRegistry } from "./storage-provider.registry";

@Global()
@Module({
  providers: [
    DiskStorageProvider,
    CloudinaryStorageProvider,
    S3StorageProvider,
    StorageProviderRegistry,
  ],
  exports: [
    DiskStorageProvider,
    CloudinaryStorageProvider,
    S3StorageProvider,
    StorageProviderRegistry,
  ],
})
export class StorageInfraModule {}

