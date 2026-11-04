import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

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

export class PurchaseVtuDto {
  @ApiPropertyOptional({ example: "08166551496" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: ["08166551496", "08012345678"],
    description: "Send to multiple numbers at once (max 50, same amount each)",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  phones?: string[];

  @ApiProperty({ example: 1000, description: "Amount in Naira (NGN)" })
  @IsNumber()
  @Min(50)
  amount: number;

  @ApiProperty({ example: "mtn", enum: ["mtn", "airtel", "glo", "t2mobile"] })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiPropertyOptional({ example: "airtime", enum: ["airtime", "data"] })
  @IsOptional()
  @IsIn(["airtime", "data"])
  type?: "airtime" | "data";

  @ApiPropertyOptional({ example: "KUD-DAT-MTND-008" })
  @IsOptional()
  @IsString()
  bill_item_identifier?: string;

  @ApiPropertyOptional({ example: "req-abc-001" })
  @IsOptional()
  @IsString()
  idempotency_key?: string;
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
