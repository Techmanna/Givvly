import { Global, Module } from "@nestjs/common";
import { MonnifyService } from "./monnify.service";

@Global()
@Module({
  providers: [MonnifyService],
  exports: [MonnifyService],
})
export class MonnifyModule {}
