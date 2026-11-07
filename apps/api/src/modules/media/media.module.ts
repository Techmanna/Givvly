import { Module } from "@nestjs/common";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { StorageInfraModule } from "../../infra/storage/storage-infra.module";

@Module({
  imports: [StorageInfraModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
