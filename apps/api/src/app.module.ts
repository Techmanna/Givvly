import * as path from "node:path";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { validateEnv } from "./config/env";
import { PrismaModule } from "./infra/prisma/prisma.module";
import { RedisModule } from "./infra/redis/redis.module";
import { RedisService } from "./infra/redis/redis.service";
import { RedisThrottlerStorage } from "./common/throttler/redis-throttler.storage";
import { AppThrottlerGuard } from "./common/throttler/app-throttler.guard";
import { SlugModule } from "./common/slug/slug.module";
import { PaystackModule } from "./infra/paystack/paystack.module";
import { PaymentsInfraModule } from "./infra/payments/payments-infra.module";
import { StorageInfraModule } from "./infra/storage/storage-infra.module";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { EventsModule } from "./modules/events/events.module";
import { LedgerModule } from "./modules/ledger/ledger.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { PayoutsModule } from "./modules/payouts/payouts.module";
import { RegistryModule } from "./modules/registry/registry.module";
import { PoolsModule } from "./modules/pools/pools.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { AdminModule } from "./modules/admin/admin.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { MediaModule } from "./modules/media/media.module";
import { DigitalGiftsModule } from "./modules/digital-gifts/digital-gifts.module";
import { UsersModule } from "./modules/users/users.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { AuditModule } from "./modules/audit/audit.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        ".env",
        "apps/api/.env",
        path.resolve(process.cwd(), "apps/api/.env"),
        path.resolve(__dirname, "../.env"),
        path.resolve(__dirname, "../../.env"),
      ],
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SlugModule,
    RedisModule,
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redisService: RedisService) => ({
        throttlers: [
          {
            name: "short",
            ttl: 10_000,
            limit: 25,
          },
          {
            name: "default",
            ttl: 60_000,
            limit: 120,
          },
        ],
        storage: new RedisThrottlerStorage(redisService),
      }),
    }),
    PaystackModule,
    PaymentsInfraModule,
    StorageInfraModule,
    HealthModule,
    AuthModule,
    EventsModule,
    LedgerModule,
    PaymentsModule,
    WebhooksModule,
    PayoutsModule,
    RegistryModule,
    PoolsModule,
    CatalogModule,
    OrdersModule,
    AdminModule,
    NotificationsModule,
    MediaModule,
    DigitalGiftsModule,
    UsersModule,
    WalletModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
