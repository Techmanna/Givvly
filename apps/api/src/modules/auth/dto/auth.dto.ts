import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { Role, UserStatus } from "@prisma/client";

export class RegisterRequestDto {
  @ApiProperty({ example: "Tola Adebayo", description: "Full name of the user" })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @ApiProperty({ example: "tola@example.com", description: "Valid email address" })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: "+2348012345678", description: "Phone number" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: "SecretP@ssw0rd123!", description: "Password (minimum 8 characters)" })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: true, description: "Terms and conditions acceptance" })
  @IsOptional()
  @IsBoolean()
  acceptTerms?: boolean;

  @ApiPropertyOptional({ example: true, description: "Terms and conditions acceptance alias" })
  @IsOptional()
  @IsBoolean()
  terms?: boolean;
}

export class ResendVerificationRequestDto {
  @ApiProperty({ example: "tola@example.com", description: "Account email address" })
  @IsEmail()
  email: string;
}

export class VerifyEmailRequestDto {
  @ApiProperty({ example: "tok_verify_xyz", description: "Email verification token" })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class LoginRequestDto {
  @ApiProperty({ example: "tola@example.com", description: "Account email address" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "SecretP@ssw0rd123!", description: "Account password" })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ForgotPasswordRequestDto {
  @ApiProperty({ example: "tola@example.com", description: "Account email address" })
  @IsEmail()
  email: string;
}

export class ResetPasswordRequestDto {
  @ApiProperty({ example: "tok_password_reset_xyz", description: "Password reset token" })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: "NewSecretP@ssw0rd!", description: "New password (minimum 8 characters)" })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class UserProfileResponseDto {
  @ApiProperty({ example: "a0000000-0000-0000-0000-000000000001" })
  id: string;

  @ApiProperty({ example: "tola@example.com" })
  email: string;

  @ApiProperty({ example: "Tola Adebayo" })
  name: string;

  @ApiPropertyOptional({ example: "+2348012345678" })
  phone?: string | null;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status: UserStatus;

  @ApiPropertyOptional({ example: "2026-11-03T11:00:00.000Z" })
  emailVerifiedAt?: Date | null;

  @ApiPropertyOptional({ example: "uploads/avatars/user-1.jpg" })
  avatarKey?: string | null;

  @ApiProperty({ example: "2026-11-03T10:00:00.000Z" })
  createdAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserProfileResponseDto })
  user: UserProfileResponseDto;
}

export class MessageResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiPropertyOptional({ example: "Operation completed successfully" })
  message?: string;
}

