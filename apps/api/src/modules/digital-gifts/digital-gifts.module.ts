import { Module } from "@nestjs/common";
import { DigitalGiftsController } from "./digital-gifts.controller";
import { DigitalGiftsService } from "./digital-gifts.service";
import { StandardDigitalProvider } from "./adapters/standard-digital-provider";
import { BillSpotProvider } from "./adapters/billspot.provider";
import { PrismaModule } from "../../infra/prisma/prisma.module";
import { RedisModule } from "../../infra/redis/redis.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, RedisModule, NotificationsModule, AuthModule],
  controllers: [DigitalGiftsController],
  providers: [DigitalGiftsService, StandardDigitalProvider, BillSpotProvider],
  exports: [DigitalGiftsService, BillSpotProvider],
})
export class DigitalGiftsModule {}
