import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class VerifyVoucherRequestDto {
  @ApiProperty({ example: "GV-A1B2-C3D4-E5F6", description: "Voucher code starting with GV-" })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  code: string;
}

export class VerifyVoucherResponseDto {
  @ApiProperty({ example: true })
  valid: boolean;

  @ApiProperty({ example: "GV-A1B2-C3D4-E5F6" })
  code: string;

  @ApiProperty({ example: "ACTIVE" })
  status: string;

  @ApiProperty({ example: "2027-11-03T11:00:00.000Z" })
  expiresAt: Date;
}

export class DigitalOrderFulfillmentResponseDto {
  @ApiProperty({ example: true })
  fulfilled: boolean;

  @ApiProperty({ example: true })
  allDigital: boolean;

  @ApiProperty({ example: "GV-2026-ABC123" })
  orderNumber: string;

  @ApiProperty({
    example: [
      {
        item: "₦10,000 Luxury Spa Gift Card",
        voucher: {
          voucherCode: "GV-A1B2-C3D4-E5F6",
          pin: "1234",
          expiresAt: "2027-11-03T11:00:00.000Z",
          instructions: "Redeem online",
        },
      },
    ],
  })
  fulfillmentResults: any[];
}

