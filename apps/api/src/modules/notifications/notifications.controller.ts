import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import {
  UpdateNotificationPreferencesDto,
  updateNotificationPreferencesSchema,
  NotificationsListResponseDto,
  NotificationResponseDto,
  NotificationPrefItemDto,
} from "./dto/notification-preferences.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/auth.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";

@ApiTags("Notifications & Communication Preferences")
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth("givvly_at")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("notifications")
  @ApiOperation({ summary: "Get notifications for authenticated user" })
  @ApiQuery({ name: "unread", required: false, type: Boolean })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiOkResponse({
    description: "List of notifications, unread count, and pagination metadata.",
    type: NotificationsListResponseDto,
  })
  async getNotifications(
    @CurrentUser() user: { id: string },
    @Query("unread") unread?: string,
    @Query("limit") limit?: string,
    @Query("page") page?: string
  ): Promise<NotificationsListResponseDto> {
    const isUnread = unread === "true" || unread === "1";
    const take = limit ? Number(limit) : 20;
    const pageNum = page ? Number(page) : 1;
    return this.notificationsService.getNotifications(
      user.id,
      isUnread,
      take,
      pageNum
    ) as any;
  }

  @Patch("notifications/:id/read")
  @ApiOperation({ summary: "Mark a notification as read" })
  @ApiParam({ name: "id", description: "Notification UUID" })
  @ApiOkResponse({
    description: "Notification updated.",
    type: NotificationResponseDto,
  })
  async markAsRead(
    @Param("id") id: string,
    @CurrentUser() user: { id: string }
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(id, user.id) as any;
  }

  @Post("notifications/read-all")
  @ApiOperation({ summary: "Mark all notifications as read" })
  @ApiOkResponse({ description: "All notifications marked as read." })
  async markAllAsRead(@CurrentUser() user: { id: string }) {
    await this.notificationsService.markAllAsRead(user.id);
    return { success: true };
  }

  @Get("me/notification-preferences")
  @ApiOperation({ summary: "Get user notification preferences across channels" })
  @ApiOkResponse({
    description: "User notification preferences.",
  })
  async getPreferences(@CurrentUser() user: { id: string }) {
    const rawPrefs = await this.notificationsService.getPreferences(user.id);
    const emailPref = rawPrefs.find((p) => p.channel === "EMAIL");
    const whatsappPref = rawPrefs.find(
      (p) => p.channel === "WHATSAPP" || p.channel === "SMS"
    );
    const inAppPref = rawPrefs.find((p) => p.channel === "IN_APP");

    return {
      email: emailPref ? emailPref.enabled : true,
      whatsappOrSms: whatsappPref ? whatsappPref.enabled : true,
      inApp: inAppPref ? inAppPref.enabled : true,
      prefs: rawPrefs,
    };
  }

  @Get("notifications/preferences")
  @ApiOperation({ summary: "Get user notification preferences (alias)" })
  async getPreferencesAlias(@CurrentUser() user: { id: string }) {
    return this.getPreferences(user);
  }

  @Put("me/notification-preferences")
  @ApiOperation({ summary: "Update user notification opt-in/opt-out preferences" })
  @ApiOkResponse({ description: "Preferences updated." })
  @UsePipes(new ZodValidationPipe(updateNotificationPreferencesSchema))
  async updatePreferences(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateNotificationPreferencesDto
  ) {
    await this.notificationsService.updatePreferences(user.id, dto);
    return this.getPreferences(user);
  }

  @Put("notifications/preferences")
  @ApiOperation({ summary: "Update user notification preferences (alias)" })
  @UsePipes(new ZodValidationPipe(updateNotificationPreferencesSchema))
  async updatePreferencesAlias(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateNotificationPreferencesDto
  ) {
    return this.updatePreferences(user, dto);
  }

  @Patch("notifications/preferences")
  @ApiOperation({ summary: "Patch user notification preferences (alias)" })
  @UsePipes(new ZodValidationPipe(updateNotificationPreferencesSchema))
  async patchPreferencesAlias(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateNotificationPreferencesDto
  ) {
    return this.updatePreferences(user, dto);
  }
}
