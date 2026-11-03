import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { PrismaModule } from "../../infra/prisma/prisma.module";
import { LedgerModule } from "../ledger/ledger.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, LedgerModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

