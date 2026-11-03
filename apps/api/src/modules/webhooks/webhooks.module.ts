import { Module } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";
import { WebhooksController } from "./webhooks.controller";
import { DigitalGiftsModule } from "../digital-gifts/digital-gifts.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [DigitalGiftsModule, NotificationsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}

