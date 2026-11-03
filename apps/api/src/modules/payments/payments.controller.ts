import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
} from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import {
  CreateMoneyGiftDto,
  createMoneyGiftSchema,
  MoneyGiftInitResponseDto,
  PaymentStatusResponseDto,
} from "./dto/create-money-gift.dto";
import { Public, CurrentUser } from "@/common/decorators/auth.decorator";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";

@ApiTags("Payments & Money Gifting")
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post("public/events/:slug/gifts/money")
  @ApiOperation({ summary: "Initialize a money gift contribution for an event" })
  @ApiParam({ name: "slug", description: "Public unique event slug" })
  @ApiCreatedResponse({
    description: "Gift created and payment checkout initialized with gateway.",
    type: MoneyGiftInitResponseDto,
  })
  @UsePipes(new ZodValidationPipe(createMoneyGiftSchema))
  async initializeMoneyGift(
    @Param("slug") slug: string,
    @Body() dto: CreateMoneyGiftDto,
    @CurrentUser("id") userId?: string
  ): Promise<MoneyGiftInitResponseDto> {
    return this.paymentsService.initializeMoneyGift(slug, dto, userId) as any;
  }

  @Public()
  @Get("payments/:reference")
  @ApiOperation({ summary: "Check payment status and receipt by reference" })
  @ApiParam({ name: "reference", description: "Unique payment transaction reference" })
  @ApiOkResponse({
    description: "Current payment transaction status.",
    type: PaymentStatusResponseDto,
  })
  async getPaymentByReference(
    @Param("reference") reference: string
  ): Promise<PaymentStatusResponseDto> {
    return this.paymentsService.getPaymentByReference(reference) as any;
  }
}
