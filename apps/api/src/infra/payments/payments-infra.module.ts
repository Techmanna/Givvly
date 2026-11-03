import { Module, Global } from "@nestjs/common";
import { PaystackModule } from "@/infra/paystack/paystack.module";
import { PaystackGateway } from "./adapters/paystack.gateway";
import { PaymentGatewayRegistry } from "./payment-gateway.registry";

@Global()
@Module({
  imports: [PaystackModule],
  providers: [PaystackGateway, PaymentGatewayRegistry],
  exports: [PaymentGatewayRegistry, PaystackGateway],
})
export class PaymentsInfraModule {}

