import { Injectable, Logger } from "@nestjs/common";
import {
  DigitalFulfillmentProvider,
  DigitalTopUpParams,
  DigitalTopUpResult,
  DigitalVoucherParams,
  DigitalVoucherResult,
} from "../digital-provider.interface";
import * as crypto from "crypto";

@Injectable()
export class StandardDigitalProvider implements DigitalFulfillmentProvider {
  private readonly logger = new Logger(StandardDigitalProvider.name);

  async fulfillTopUp(params: DigitalTopUpParams): Promise<DigitalTopUpResult> {
    const operatorReference = `top_${crypto.randomBytes(8).toString("hex")}`;
    this.logger.log(
      `[DIGITAL TOP-UP] Successfully delivered ${params.amountSubunits} subunits to ${params.phoneNumber} via ${params.operator} (ref: ${operatorReference})`
    );

    return {
      success: true,
      operatorReference,
      deliveredTo: params.phoneNumber,
      deliveredAt: new Date(),
    };
  }

  async generateVoucher(params: DigitalVoucherParams): Promise<DigitalVoucherResult> {
    const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part3 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const voucherCode = `GV-${part1}-${part2}-${part3}`;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year validity

    this.logger.log(
      `[DIGITAL VOUCHER] Generated ${params.kind} voucher code '${voucherCode}' for ${params.title} (amount: ${params.amountSubunits})`
    );

    return {
      success: true,
      voucherCode,
      pin,
      expiresAt,
      instructions: `Redeem this voucher code at checkout or present the code upon redemption. Valid for 1 year.`,
    };
  }
}

