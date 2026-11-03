import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { PrismaModule } from "../../infra/prisma/prisma.module";
import { PaymentsInfraModule } from "../../infra/payments/payments-infra.module";

@Module({
  imports: [PrismaModule, PaymentsInfraModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

