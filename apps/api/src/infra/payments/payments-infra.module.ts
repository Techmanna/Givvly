import { Module, Global } from "@nestjs/common";
import { MonnifyModule } from "@/infra/monnify/monnify.module";
import { PaystackModule } from "@/infra/paystack/paystack.module";
import { MonnifyGateway } from "./adapters/monnify.gateway";
import { PaystackGateway } from "./adapters/paystack.gateway";
import { PaymentGatewayRegistry } from "./payment-gateway.registry";

@Global()
@Module({
  imports: [MonnifyModule, PaystackModule],
  providers: [MonnifyGateway, PaystackGateway, PaymentGatewayRegistry],
  exports: [PaymentGatewayRegistry, MonnifyGateway, PaystackGateway],
})
export class PaymentsInfraModule {}

