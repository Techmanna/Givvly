import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiBearerAuth,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { DigitalGiftsService } from "./digital-gifts.service";
import {
  VerifyVoucherRequestDto,
  VerifyVoucherResponseDto,
  DigitalOrderFulfillmentResponseDto,
} from "./dto/digital-gift.dto";
import { Public, Roles } from "../../common/decorators/auth.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Role } from "@prisma/client";

@ApiTags("Digital Gifts & Instant Vouchers")
@Controller("digital-gifts")
export class DigitalGiftsController {
  constructor(private readonly digitalGiftsService: DigitalGiftsService) {}

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
