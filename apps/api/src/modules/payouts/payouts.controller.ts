import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiBearerAuth,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { PayoutsService } from "./payouts.service";
import { CurrentUser, Roles } from "@/common/decorators/auth.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { PayoutStatus, Role } from "@prisma/client";

@ApiTags("Payouts & Host Transfers")
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiCookieAuth("givvly_at")
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get("payouts")
  @ApiOperation({ summary: "List payout transfer history for celebration host" })
  @ApiOkResponse({ description: "List of user payouts." })
  async getMyPayouts(
    @CurrentUser("id") userId: string,
    @Query("limit") limit?: string
  ) {
    return this.payoutsService.getUserPayouts(
      userId,
      limit ? Number(limit) : undefined
    );
  }

  @Post(["payouts/request", "payout-accounts/request"])
  @ApiOperation({ summary: "Request withdrawal transfer of cash gifts to verified payout account" })
  @ApiOkResponse({ description: "Payout transfer queued." })
  async requestPayout(
    @CurrentUser("id") userId: string,
    @Body() dto: { eventId: string }
  ) {
    return this.payoutsService.requestPayout(userId, dto.eventId);
  }

  @Roles(Role.ADMIN)
  @Get("admin/payouts")
  @ApiOperation({ summary: "List all platform host payouts with status filters (Admin)" })
  @ApiOkResponse({ description: "All host payouts." })
  async getAdminPayouts(@Query("status") status?: PayoutStatus) {
    return this.payoutsService.getAdminPayouts(status);
  }

  @Roles(Role.ADMIN)
  @Post("admin/payouts/:id/retry")
  @ApiOperation({ summary: "Manually re-trigger a failed host payout transfer (Admin)" })
  @ApiParam({ name: "id", description: "Payout record UUID" })
  @ApiOkResponse({ description: "Payout transfer re-initiated." })
  async retryPayout(@Param("id") id: string) {
    const res = await this.payoutsService.processPayout(id);
    return {
      id: res.id,
      status: (res.status === "SUCCESS" ? "SENT" : res.status) as "SENT",
    };
  }
}
