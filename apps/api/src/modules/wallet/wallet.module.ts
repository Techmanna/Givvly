import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infra/prisma/prisma.module";
import { RedisModule } from "../../infra/redis/redis.module";
import { PaymentsInfraModule } from "../../infra/payments/payments-infra.module";
import { AuthModule } from "../auth/auth.module";
import { LedgerModule } from "../ledger/ledger.module";
import { PayoutsModule } from "../payouts/payouts.module";
import { DigitalGiftsModule } from "../digital-gifts/digital-gifts.module";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    PaymentsInfraModule,
    AuthModule,
    LedgerModule,
    PayoutsModule,
    DigitalGiftsModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}

