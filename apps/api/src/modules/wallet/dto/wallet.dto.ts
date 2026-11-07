import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from "class-validator";

export type CbnKycTier = "TIER_1" | "TIER_2" | "TIER_3";

export interface CbnTierPolicy {
  tier: CbnKycTier;
  label: string;
  singleTransactionLimitKobo: number;
  dailyCumulativeLimitKobo: number;
  maxBalanceKobo: number | null; // null = unlimited (Tier 3)
}

/**
 * Central Bank of Nigeria (CBN) Three-Tiered KYC Regulatory Limits (in Kobo)
 */
export const CBN_KYC_POLICIES: Record<CbnKycTier, CbnTierPolicy> = {
  TIER_1: {
    tier: "TIER_1",
    label: "CBN Tier 1 (Basic Verification)",
    singleTransactionLimitKobo: 5_000_000, // ₦50,000
    dailyCumulativeLimitKobo: 30_000_000, // ₦300,000
    maxBalanceKobo: 30_000_000, // ₦300,000
  },
  TIER_2: {
    tier: "TIER_2",
    label: "CBN Tier 2 (NUBAN Bank Verified)",
    singleTransactionLimitKobo: 20_000_000, // ₦200,000
    dailyCumulativeLimitKobo: 50_000_000, // ₦500,000
    maxBalanceKobo: 50_000_000, // ₦500,000
  },
  TIER_3: {
    tier: "TIER_3",
    label: "CBN Tier 3 (Enhanced KYC Verified)",
    singleTransactionLimitKobo: 500_000_000, // ₦5,000,000
    dailyCumulativeLimitKobo: 500_000_000, // ₦5,000,000
    maxBalanceKobo: null, // Unlimited
  },
};

export class SetWalletPinDto {
  @ApiProperty({ example: "1234", description: "4-digit numeric transaction PIN" })
  @IsString()
  @Matches(/^\d{4}$/, { message: "Transaction PIN must be exactly 4 digits" })
  pin: string;

  @ApiPropertyOptional({
    example: "0000",
    description: "Current 4-digit PIN (required if changing an existing PIN)",
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: "Current PIN must be 4 digits" })
  currentPin?: string;
}

export class WalletTopUpDto {
  @ApiProperty({
    example: 1000000,
    description: "Amount to fund in Kobo (1,000,000 kobo = ₦10,000)",
  })
  @IsInt()
  @Min(10000) // Min ₦100
  @Max(500000000) // Max ₦5,000,000
  amountKobo: number;
}

export class WalletVerifyTopUpDto {
  @ApiProperty({ example: "wal_topup_1793700000_abc123" })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiPropertyOptional({
    example: true,
    description: "In non-production/sandbox environments, simulate Paystack confirmation",
  })
  @IsOptional()
  @IsBoolean()
  simulateDev?: boolean;
}

export class WalletUpgradeKycDto {
  @ApiProperty({
    example: "22234567890",
    description: "11-digit Bank Verification Number (BVN) for CBN Tier 3 Enhanced KYC",
  })
  @IsString()
  @Matches(/^\d{11}$/, { message: "BVN must be exactly 11 digits" })
  bvn: string;

  @ApiPropertyOptional({
    example: "12345678901",
    description: "Optional 11-digit National Identification Number (NIN)",
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: "NIN must be 11 digits" })
  nin?: string;

  @ApiProperty({
    example: "14 Admiralty Way, Lekki Phase 1, Lagos",
    description: "Verified Nigerian residential address for CBN Tier 3 compliance",
  })
  @IsString()
  @MinLength(6, { message: "Please enter a valid Nigerian residential address" })
  residentialAddress: string;
}

export class WalletWithdrawDto {
  @ApiProperty({
    example: 500000,
    description: "Withdrawal amount in Kobo (min 50,000 kobo = ₦500)",
  })
  @IsInt()
  @Min(50000)
  amountKobo: number;

  @ApiPropertyOptional({
    example: "1234",
    description: "4-digit Wallet Transaction PIN",
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: "Transaction PIN must be 4 digits" })
  pin?: string;

  @ApiPropertyOptional({ example: "wd-idemp-001" })
  @IsOptional()
  @IsString()
  transaction_id?: string;
}

export class WalletBalanceTransferDto {
  @ApiPropertyOptional({
    example: "usr_adaobi_01",
    description: "Source account (defaults to authenticated user)",
  })
  @IsOptional()
  @IsString()
  from_account?: string;

  @ApiProperty({
    example: "amara@givvly.ng",
    description: "Recipient Givvly email address or User ID",
  })
  @IsString()
  @IsNotEmpty()
  to_account: string;

  @ApiProperty({
    example: "500000",
    description: "Amount in Kobo as string (to prevent floating-point precision loss)",
  })
  @IsString()
  @Matches(/^\d+$/, {
    message: "amount must be an integer string in kobo (e.g. '500000' for ₦5,000)",
  })
  amount: string;

  @ApiPropertyOptional({ example: "NGN", default: "NGN" })
  @IsOptional()
  @IsString()
  currency?: string = "NGN";

  @ApiProperty({
    example: "01589980-2664-11ec-9621-0242ac130002",
    description: "Unique idempotency key for the transfer command",
  })
  @IsString()
  @IsNotEmpty()
  transaction_id: string;

  @ApiPropertyOptional({ example: "1234", description: "4-digit Transaction PIN" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: "Transaction PIN must be 4 digits" })
  pin?: string;

  @ApiPropertyOptional({ example: "Happy Birthday gift transfer!" })
  @IsOptional()
  @IsString()
  note?: string;
}

export class WalletPayOrderDto {
  @ApiProperty({ example: "a0000000-0000-0000-0000-000000000001" })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({ example: "1234" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: "Transaction PIN must be 4 digits" })
  pin?: string;

  @ApiPropertyOptional({ example: "tx-ord-pay-001" })
  @IsOptional()
  @IsString()
  transaction_id?: string;
}

