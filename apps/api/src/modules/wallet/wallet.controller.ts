import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/auth.decorator";
import { WalletService } from "./wallet.service";
import {
  SetWalletPinDto,
  WalletBalanceTransferDto,
  WalletPayOrderDto,
  WalletTopUpDto,
  WalletUpgradeKycDto,
  WalletVerifyTopUpDto,
  WalletWithdrawDto,
} from "./dto/wallet.dto";

@ApiTags("Digital Wallet (CBN Tiered KYC & Event-Sourced Ledger)")
@Controller("wallet")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth("givvly_at")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({
    summary:
      "Get Wallet Summary, CBN Tier limits, PIN status, and paginated immutable ledger history",
  })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  async getWalletSummary(
    @CurrentUser() user: { id: string },
    @Query("page") page?: number,
    @Query("limit") limit?: number
  ) {
    return this.walletService.getWalletSummary(user.id, page, limit);
  }

  @Get("audit-replay")
  @ApiOperation({
    summary:
      "Event Sourcing Reproducibility: Replay immutable ledger events from start to reconstruct balance at any timestamp",
  })
  @ApiQuery({
    name: "asOf",
    required: false,
    description: "ISO 8601 timestamp to replay up to (defaults to now)",
  })
  async auditAndReplayWallet(
    @CurrentUser() user: { id: string },
    @Query("asOf") asOf?: string
  ) {
    return this.walletService.auditAndReplayWallet(user.id, asOf);
  }

  @Post("pin")
  @ApiOperation({
    summary: "Set or update 4-digit Wallet Transaction PIN (Argon2id hashed)",
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async setTransactionPin(
    @CurrentUser() user: { id: string },
    @Body() dto: SetWalletPinDto
  ) {
    return this.walletService.setTransactionPin(user.id, dto);
  }

  @Post("kyc/upgrade")
  @ApiOperation({
    summary:
      "Upgrade Wallet to CBN Tier 3 (Enhanced KYC: 11-digit BVN + Residential Address) for unlimited max balance",
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async upgradeToTier3(
    @CurrentUser() user: { id: string },
    @Body() dto: WalletUpgradeKycDto
  ) {
    return this.walletService.upgradeToTier3(user.id, dto);
  }

  @Post("topup")
  @ApiOperation({
    summary: "Initialize Wallet funding via Paystack (enforcing CBN max balance limits)",
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async initializeTopUp(
    @CurrentUser() user: { id: string; email: string; name?: string },
    @Body() dto: WalletTopUpDto
  ) {
    return this.walletService.initializeTopUp(user, dto);
  }

  @Post("topup/verify")
  @ApiOperation({
    summary: "Verify Paystack wallet top-up and credit user's ledger account idempotently",
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async verifyTopUp(
    @CurrentUser() user: { id: string },
    @Body() dto: WalletVerifyTopUpDto
  ) {
    return this.walletService.verifyTopUp(user.id, dto.reference, dto.simulateDev);
  }

  @Post("balance_transfer")
  @ApiOperation({
    summary:
      "Transfer balance between two Givvly digital wallets (Chapter 27 spec: POST /v1/wallet/balance_transfer)",
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async balanceTransfer(
    @CurrentUser() user: { id: string },
    @Body() dto: WalletBalanceTransferDto,
    @Headers("idempotency-key") idempotencyKey?: string
  ) {
    if (idempotencyKey && !dto.transaction_id) {
      dto.transaction_id = idempotencyKey;
    }
    return this.walletService.transferBalance(user.id, dto);
  }

  @Post("pay-order")
  @ApiOperation({
    summary:
      "Pay for a Gift Order or BillSpot VTU Order using Givvly Wallet via Try-Confirm/Cancel (TC/C)",
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async payOrderWithWallet(
    @CurrentUser() user: { id: string },
    @Body() dto: WalletPayOrderDto,
    @Headers("idempotency-key") idempotencyKey?: string
  ) {
    if (idempotencyKey && !dto.transaction_id) {
      dto.transaction_id = idempotencyKey;
    }
    return this.walletService.payOrderWithWallet(user.id, dto);
  }

  @Post("withdraw")
  @ApiOperation({
    summary:
      "Withdraw wallet balance to verified Nigerian Bank Account via Try-Confirm/Cancel (TC/C)",
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async withdrawToBank(
    @CurrentUser() user: { id: string },
    @Body() dto: WalletWithdrawDto,
    @Headers("idempotency-key") idempotencyKey?: string
  ) {
    if (idempotencyKey && !dto.transaction_id) {
      dto.transaction_id = idempotencyKey;
    }
    return this.walletService.withdrawToBank(user.id, dto);
  }
}

