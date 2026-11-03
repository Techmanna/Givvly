import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiHeader,
} from "@nestjs/swagger";
import { Request } from "express";
import { WebhooksService } from "./webhooks.service";
import { Public } from "@/common/decorators/auth.decorator";

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@ApiTags("Webhooks (Payment Gateways & Providers)")
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post("paystack")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Handle inbound Paystack webhook events (HMAC-SHA512 verified)" })
  @ApiHeader({ name: "x-paystack-signature", description: "HMAC SHA-512 signature of the raw body" })
  @ApiOkResponse({ description: "Webhook acknowledged and queued." })
  async handlePaystackWebhook(
    @Headers("x-paystack-signature") signature: string | undefined,
    @Req() req: RawBodyRequest
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    return this.webhooksService.handlePaystackWebhook(
      signature,
      rawBody,
      req.body
    );
  }

  @Public()
  @Post(":provider")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Handle generic decoupled payment gateway webhook (e.g. stripe, paystack)" })
  @ApiParam({ name: "provider", description: "Gateway provider name (paystack, stripe)" })
  @ApiOkResponse({ description: "Webhook parsed and dispatched." })
  async handleGenericWebhook(
    @Param("provider") provider: string,
    @Req() req: RawBodyRequest
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    return this.webhooksService.handleWebhook(
      provider,
      req.headers,
      rawBody,
      req.body
    );
  }
}
