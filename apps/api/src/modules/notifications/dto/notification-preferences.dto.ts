import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsString, IsBoolean, IsArray, ValidateNested, MinLength, MaxLength, IsOptional } from "class-validator";
import { Type } from "class-transformer";
import { z } from "zod";
import { Channel, NotifStatus } from "@prisma/client";

export const notificationPrefItemSchema = z.object({
  channel: z.nativeEnum(Channel),
  category: z.string().trim().min(2).max(40),
  enabled: z.boolean(),
});

export const updateNotificationPreferencesSchema = z.object({
  prefs: z.array(notificationPrefItemSchema).optional(),
  email: z.boolean().optional(),
  whatsappOrSms: z.boolean().optional(),
  inApp: z.boolean().optional(),
});

export class NotificationPrefItemDto {
  @ApiProperty({ enum: Channel, example: Channel.EMAIL })
  @IsEnum(Channel)
  channel: Channel;

  @ApiProperty({ example: "GIFTS", description: "Category: GIFTS, ORDERS, SECURITY, MARKETING" })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  category: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ type: [NotificationPrefItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationPrefItemDto)
  prefs?: NotificationPrefItemDto[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  whatsappOrSms?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;
}

export class NotificationResponseDto {
  @ApiProperty({ example: "notif_01J8ZX..." })
  id: string;

  @ApiProperty({ enum: Channel, example: Channel.IN_APP })
  channel: Channel;

  @ApiProperty({ example: "HOST_GIFT_RECEIVED" })
  type: string;

  @ApiProperty({ example: "New Gift: ₦50,000 from Chidi!" })
  title: string;

  @ApiProperty({ example: "Chidi just gifted you ₦50,000 for your wedding." })
  body: string;

  @ApiProperty({ enum: NotifStatus, example: NotifStatus.SENT })
  status: NotifStatus;

  @ApiPropertyOptional({ example: false })
  read?: boolean;

  @ApiPropertyOptional({ example: "/events/my-slug" })
  href?: string;

  @ApiPropertyOptional({ example: "2026-11-03T11:30:00.000Z" })
  readAt?: Date | null;

  @ApiProperty({ example: "2026-11-03T11:00:00.000Z" })
  createdAt: Date;
}

export class NotificationsListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  notifications: NotificationResponseDto[];

  @ApiProperty({ example: 3, description: "Number of unread notifications" })
  unreadCount: number;

  @ApiPropertyOptional({ example: 25 })
  total?: number;

  @ApiPropertyOptional({ example: 1 })
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  limit?: number;

  @ApiPropertyOptional({ example: 2 })
  totalPages?: number;

  @ApiPropertyOptional({ example: true })
  hasMore?: boolean;
}
