import { Module, Global } from "@nestjs/common";
import { PaystackService } from "./paystack.service";

@Global()
@Module({
  providers: [PaystackService],
  exports: [PaystackService],
})
export class PaystackModule {}

