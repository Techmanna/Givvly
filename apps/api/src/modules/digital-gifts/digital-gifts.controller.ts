import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { DigitalGiftsService } from "./digital-gifts.service";
import {
  VerifyVoucherRequestDto,
  VerifyVoucherResponseDto,
  DigitalOrderFulfillmentResponseDto,
  PurchaseVtuDto,
} from "./dto/digital-gift.dto";
import { Public, Roles } from "../../common/decorators/auth.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Role } from "@prisma/client";
import { BillSpotVtuType } from "./digital-provider.interface";

@ApiTags("Digital Gifts & Instant Vouchers")
@Controller("digital-gifts")
export class DigitalGiftsController {
  constructor(private readonly digitalGiftsService: DigitalGiftsService) {}

  @Public()
  @Get("vtu/providers")
  @ApiOperation({
    summary: "Fetch cached BillSpot VTU providers for airtime or data",
  })
  @ApiQuery({
    name: "type",
    required: false,
    enum: ["airtime", "data"],
    description: "VTU type (airtime or data, defaults to airtime)",
  })
  async getVtuProviders(@Query("type") type?: BillSpotVtuType) {
    const normalizedType: BillSpotVtuType = type === "data" ? "data" : "airtime";
    return this.digitalGiftsService.getVtuProviders(normalizedType);
  }

  @Public()
  @Get("vtu/plans/:provider")
  @ApiOperation({
    summary: "Fetch cached BillSpot data plans for a specific telco provider",
  })
  @ApiParam({
    name: "provider",
    description: "Provider slug (mtn, airtel, glo, t2mobile)",
    example: "mtn",
  })
  async getVtuPlans(@Param("provider") provider: string) {
    return this.digitalGiftsService.getVtuPlans(provider);
  }

  @Post("vtu/purchase")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @ApiOperation({
    summary: "Execute a direct BillSpot VTU airtime or data purchase (Admin)",
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async purchaseVtu(
    @Body() dto: PurchaseVtuDto,
    @Headers("idempotency-key") idempotencyKey?: string
  ) {
    return this.digitalGiftsService.purchaseVtu(dto, idempotencyKey);
  }

  @Public()
  @Post("verify-voucher")
  @ApiOperation({ summary: "Verify validity and balance of a digital gift voucher" })
  @ApiOkResponse({
    description: "Voucher verification result.",
    type: VerifyVoucherResponseDto,
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async verifyVoucher(
    @Body() dto: VerifyVoucherRequestDto
  ): Promise<VerifyVoucherResponseDto> {
    return this.digitalGiftsService.verifyVoucher(dto.code) as any;
  }

  @Post("orders/:orderId/fulfill")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @ApiOperation({ summary: "Trigger digital fulfillment for an order (Admin)" })
  @ApiParam({ name: "orderId", description: "Order UUID" })
  @ApiOkResponse({
    description: "Digital fulfillment result.",
    type: DigitalOrderFulfillmentResponseDto,
  })
  async fulfillDigitalOrder(
    @Param("orderId") orderId: string
  ): Promise<DigitalOrderFulfillmentResponseDto> {
    return this.digitalGiftsService.fulfillDigitalOrder(orderId) as any;
  }
}
