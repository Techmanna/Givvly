import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { EmailService } from "./email.service";
import { EmailRecommendationService } from "./email-recommendation.service";
import { PrismaModule } from "../../infra/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService, EmailRecommendationService],
  exports: [NotificationsService, EmailService, EmailRecommendationService],
})
export class NotificationsModule {}

