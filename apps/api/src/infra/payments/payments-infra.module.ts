import { Module, Global } from "@nestjs/common";
import { FlutterwaveModule } from "@/infra/flutterwave/flutterwave.module";
import { MonnifyModule } from "@/infra/monnify/monnify.module";
import { PaystackModule } from "@/infra/paystack/paystack.module";
import { FlutterwaveGateway } from "./adapters/flutterwave.gateway";
import { MonnifyGateway } from "./adapters/monnify.gateway";
import { PaystackGateway } from "./adapters/paystack.gateway";
import { PaymentGatewayRegistry } from "./payment-gateway.registry";

@Global()
@Module({
  imports: [FlutterwaveModule, MonnifyModule, PaystackModule],
  providers: [
    FlutterwaveGateway,
    MonnifyGateway,
    PaystackGateway,
    PaymentGatewayRegistry,
  ],
  exports: [
    PaymentGatewayRegistry,
    FlutterwaveGateway,
    MonnifyGateway,
    PaystackGateway,
  ],
})
export class PaymentsInfraModule {}

