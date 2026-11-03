import {
  Controller,
  Post,
  Get,
  Patch,
  Put,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { EventsService } from "./events.service";
import {
  CreateEventRequestDto,
  UpdateEventRequestDto,
  UpdateInviteTemplateRequestDto,
  UpdateKeepsakeSummaryRequestDto,
  CreatePayoutAccountRequestDto,
  ResolveBankAccountRequestDto,
  ResolveBankAccountResponseDto,
  KeepsakeSummaryResponseDto,
  EventDetailResponseDto,
  PublishEventResponseDto,
  PayoutAccountResponseDto,
  BankOptionResponseDto,
  PublicEventResponseDto,
  SubmitRsvpRequestDto,
  RsvpRecordResponseDto,
  CreateWallPostRequestDto,
  WallPostResponseDto,
  PatchWallPostRequestDto,
  UnlockEventRequestDto,
} from "./dto/events.dto";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { CurrentUser, Public } from "@/common/decorators/auth.decorator";

@ApiTags("Events & Celebration Registries")
@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // --- Public Guest Access ---

  @Public()
  @Get("public/events/:slug")
  @ApiOperation({ summary: "Get public event details by slug for guests" })
  @ApiOkResponse({
    description: "Full public celebration details with registry and pools.",
    type: PublicEventResponseDto,
  })
  async getPublicEvent(
    @Param("slug") slug: string
  ): Promise<PublicEventResponseDto> {
    return this.eventsService.getPublicEvent(slug) as any;
  }

  @Public()
  @Get("public/events")
  @ApiOperation({ summary: "List public celebration events directory" })
  @ApiOkResponse({
    description: "Directory of public celebration events.",
    type: [PublicEventResponseDto],
  })
  async getPublicEvents(): Promise<PublicEventResponseDto[]> {
    return this.eventsService.getPublicEventsList() as any;
  }

  @Public()
  @Post("public/events/:slug/unlock")
  @ApiOperation({ summary: "Unlock private celebration with access code" })
  @ApiOkResponse({ description: "Unlock verification result." })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async unlockPublicEvent(
    @Param("slug") slug: string,
    @Body() dto: UnlockEventRequestDto
  ): Promise<{ unlocked: boolean }> {
    return this.eventsService.unlockPublicEvent(slug, dto.code);
  }

  @Public()
  @Get("public/events/:slug/wall")
  @ApiOperation({ summary: "Get public wall of love messages for an event" })
  @ApiOkResponse({
    description: "List of visible celebratory wishes.",
    type: [WallPostResponseDto],
  })
  async getPublicWall(
    @Param("slug") slug: string
  ): Promise<WallPostResponseDto[]> {
    return this.eventsService.getPublicWall(slug) as any;
  }

  @Public()
  @Post("public/events/:slug/wall")
  @ApiOperation({ summary: "Post a message or wish to the event Wall of Love" })
  @ApiCreatedResponse({
    description: "Wish successfully posted to wall.",
    type: WallPostResponseDto,
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async createPublicWallPost(
    @Param("slug") slug: string,
    @Body() dto: CreateWallPostRequestDto
  ): Promise<WallPostResponseDto> {
    return this.eventsService.createPublicWallPost(slug, dto) as any;
  }

  @Public()
  @Post("public/events/:slug/rsvps")
  @ApiOperation({ summary: "Submit guest RSVP attendance response" })
  @ApiCreatedResponse({
    description: "RSVP response recorded.",
    type: RsvpRecordResponseDto,
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async submitPublicRsvp(
    @Param("slug") slug: string,
    @Body() dto: SubmitRsvpRequestDto
  ): Promise<RsvpRecordResponseDto> {
    return this.eventsService.submitPublicRsvp(slug, dto) as any;
  }

  // --- Authenticated Host Management ---

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Get("events")
  @ApiOperation({ summary: "Get all events owned by current user" })
  @ApiOkResponse({
    description: "List of user events.",
    type: [EventDetailResponseDto],
  })
  async getMyEvents(
    @CurrentUser("id") userId: string
  ): Promise<EventDetailResponseDto[]> {
    return this.eventsService.getMyEvents(userId) as any;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Post("events")
  @ApiOperation({ summary: "Create a new celebration event in draft status" })
  @ApiCreatedResponse({
    description: "Celebration created in DRAFT.",
    type: EventDetailResponseDto,
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async createEvent(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateEventRequestDto
  ): Promise<EventDetailResponseDto> {
    return this.eventsService.createEvent(userId, dto) as any;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Get("events/:id")
  @ApiOperation({ summary: "Get event details by ID" })
  @ApiOkResponse({
    description: "Detailed event information.",
    type: EventDetailResponseDto,
  })
  async getEventDetail(
    @CurrentUser("id") userId: string,
    @Param("id") eventId: string
  ): Promise<EventDetailResponseDto> {
    return this.eventsService.getEventDetail(userId, eventId) as any;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Get("events/:id/stats")
  @ApiOperation({ summary: "Get event statistical metrics" })
  async getEventStats(
    @CurrentUser("id") userId: string,
    @Param("id") eventId: string
  ) {
    return this.eventsService.getEventStats(userId, eventId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Patch("events/:id")
  @ApiOperation({ summary: "Update celebration event details" })
  @ApiOkResponse({
    description: "Updated event details.",
    type: EventDetailResponseDto,
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async updateEvent(
    @CurrentUser("id") userId: string,
    @Param("id") eventId: string,
    @Body() dto: UpdateEventRequestDto
  ): Promise<EventDetailResponseDto> {
    return this.eventsService.updateEvent(userId, eventId, dto) as any;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Put("events/:id/invite")
  @ApiOperation({ summary: "Update event digital invite template design and schedule" })
  @ApiOkResponse({
    description: "Event with updated invite template.",
    type: EventDetailResponseDto,
  })
  async updateInviteTemplate(
    @CurrentUser("id") userId: string,
    @Param("id") eventId: string,
    @Body() dto: UpdateInviteTemplateRequestDto
  ): Promise<EventDetailResponseDto> {
    return this.eventsService.updateInviteTemplate(userId, eventId, dto) as any;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Get("events/:id/summary")
  @ApiOperation({ summary: "Get celebration keepsake summary with wall highlights" })
  @ApiOkResponse({
    description: "Celebration keepsake summary.",
    type: KeepsakeSummaryResponseDto,
  })
  async getKeepsakeSummary(
    @CurrentUser("id") userId: string,
    @Param("id") eventId: string
  ): Promise<KeepsakeSummaryResponseDto> {
    return this.eventsService.getKeepsakeSummary(userId, eventId) as any;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Patch("events/:id/summary")
  @ApiOperation({ summary: "Update keepsake publication status" })
  @ApiOkResponse({
    description: "Updated keepsake summary.",
    type: KeepsakeSummaryResponseDto,
  })
  async updateKeepsakePublished(
    @CurrentUser("id") userId: string,
    @Param("id") eventId: string,
    @Body() dto: UpdateKeepsakeSummaryRequestDto
  ): Promise<KeepsakeSummaryResponseDto> {
    return this.eventsService.updateKeepsakePublished(userId, eventId, dto.keepsakePublished) as any;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Get("events/:id/rsvps")
  @ApiOperation({ summary: "Get event guest list RSVPs" })
  @ApiOkResponse({
    description: "Guest list RSVP records.",
    type: [RsvpRecordResponseDto],
  })
  async getEventRsvps(
    @CurrentUser("id") userId: string,
    @Param("id") eventId: string
  ): Promise<RsvpRecordResponseDto[]> {
    return this.eventsService.getEventRsvps(userId, eventId) as any;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Get("events/:id/rsvps/export")
  @ApiOperation({ summary: "Export guest list RSVPs as CSV" })
  async exportEventRsvpsCsv(
    @CurrentUser("id") userId: string,
    @Param("id") eventId: string
  ) {
    return this.eventsService.exportEventRsvpsCsv(userId, eventId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Get("events/:id/wall")
  @ApiOperation({ summary: "Get all wall posts for moderation" })
  @ApiOkResponse({
    description: "Wall posts.",
    type: [WallPostResponseDto],
  })
  async getEventWall(
    @CurrentUser("id") userId: string,
    @Param("id") eventId: string
  ): Promise<WallPostResponseDto[]> {
    return this.eventsService.getEventWall(userId, eventId) as any;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Patch("events/:id/wall/:postId")
  @ApiOperation({ summary: "Moderate a wall post (VISIBLE, HIDDEN, REMOVED)" })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async moderateWallPost(
    @CurrentUser("id") userId: string,
    @Param("id") eventId: string,
    @Param("postId") postId: string,
    @Body() dto: PatchWallPostRequestDto
  ): Promise<WallPostResponseDto> {
    return this.eventsService.moderateWallPost(
      userId,
      eventId,
      postId,
      dto.status
    ) as any;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Post("events/:id/publish")
  @ApiOperation({ summary: "Publish an event (generates immutable public slug)" })
  @ApiOkResponse({
    description: "Event published successfully.",
    type: PublishEventResponseDto,
  })
  async publishEvent(
    @CurrentUser("id") userId: string,
    @Param("id") eventId: string
  ): Promise<PublishEventResponseDto> {
    return this.eventsService.publishEvent(userId, eventId) as any;
  }

  // --- Payout Accounts (Supports both singular & plural paths) ---

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Get(["payout-account", "payout-accounts"])
  @ApiOperation({ summary: "Get default linked payout account" })
  @ApiOkResponse({
    description: "Masked payout account details.",
    type: PayoutAccountResponseDto,
  })
  async getPayoutAccount(
    @CurrentUser("id") userId: string
  ): Promise<PayoutAccountResponseDto | null> {
    return this.eventsService.getPayoutAccount(userId) as any;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Post(["payout-account", "payout-accounts"])
  @ApiOperation({ summary: "Save and encrypt new NUBAN payout account" })
  @ApiCreatedResponse({
    description: "Payout account saved and encrypted.",
    type: PayoutAccountResponseDto,
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async savePayoutAccount(
    @CurrentUser("id") userId: string,
    @Body() dto: CreatePayoutAccountRequestDto
  ): Promise<PayoutAccountResponseDto> {
    return this.eventsService.savePayoutAccount(userId, dto) as any;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Post(["payout-account/resolve", "payout-accounts/resolve"])
  @ApiOperation({ summary: "Resolve NUBAN account name via Paystack" })
  @ApiOkResponse({
    description: "Account holder name and account details.",
    type: ResolveBankAccountResponseDto,
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async resolveBankAccount(
    @Body() dto: ResolveBankAccountRequestDto
  ): Promise<ResolveBankAccountResponseDto> {
    return this.eventsService.resolveBankAccount(dto);
  }

  @Public()
  @Get("banks")
  @ApiOperation({ summary: "List supported Nigerian commercial banks" })
  @ApiOkResponse({
    description: "List of banks with CBN codes.",
    type: [BankOptionResponseDto],
  })
  getBanks(): BankOptionResponseDto[] {
    return [
      { code: "058", name: "Guaranty Trust Bank" },
      { code: "011", name: "First Bank of Nigeria" },
      { code: "033", name: "United Bank for Africa" },
      { code: "057", name: "Zenith Bank" },
      { code: "232", name: "Sterling Bank" },
      { code: "044", name: "Access Bank" },
      { code: "035", name: "Wema Bank" },
      { code: "070", name: "Fidelity Bank" },
      { code: "214", name: "First City Monument Bank" },
      { code: "100004", name: "Opay" },
      { code: "100033", name: "PalmPay" },
      { code: "090110", name: "Kuda Bank" },
    ];
  }
}
