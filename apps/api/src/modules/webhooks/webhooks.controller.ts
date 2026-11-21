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
import { SkipThrottle } from "@nestjs/throttler";
import { WebhooksService } from "./webhooks.service";
import { Public } from "@/common/decorators/auth.decorator";

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@ApiTags("Webhooks (Payment Gateways & Providers)")
@SkipThrottle()
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post("flutterwave")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Handle inbound Flutterwave webhook events (verif-hash verified)" })
  @ApiHeader({ name: "verif-hash", description: "Flutterwave webhook secret hash" })
  @ApiOkResponse({ description: "Webhook acknowledged and queued." })
  async handleFlutterwaveWebhook(@Req() req: RawBodyRequest) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    return this.webhooksService.handleWebhook(
      "FLUTTERWAVE",
      req.headers as Record<string, string | string[] | undefined>,
      rawBody,
      req.body
    );
  }

  @Public()
  @Post("monnify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Handle inbound Monnify webhook events (HMAC-SHA512 verified)" })
  @ApiHeader({ name: "monnify-signature", description: "HMAC SHA-512 signature of the raw body" })
  @ApiOkResponse({ description: "Webhook acknowledged and queued." })
  async handleMonnifyWebhook(@Req() req: RawBodyRequest) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    return this.webhooksService.handleWebhook(
      "MONNIFY",
      req.headers as Record<string, string | string[] | undefined>,
      rawBody,
      req.body
    );
  }

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
