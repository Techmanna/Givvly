import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength, MaxLength } from "class-validator";
import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  phone: z.string().trim().min(7).max(20).optional(),
});

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "Adaobi Okafor" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({ example: "08031234567" })
  @IsOptional()
  @IsString()
  phone?: string;
}

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export class ChangePasswordDto {
  @ApiProperty({ example: "OldPassword123!" })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: "NewPassword123!" })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

