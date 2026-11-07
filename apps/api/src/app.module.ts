import * as path from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env";
import { PrismaModule } from "./infra/prisma/prisma.module";
import { RedisModule } from "./infra/redis/redis.module";
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
    PrismaModule,
    RedisModule,
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
  ],
})
export class AppModule {}
