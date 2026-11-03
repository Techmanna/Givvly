import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiBearerAuth,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { RegistryService } from "./registry.service";
import {
  PurchaseItemGiftDto,
  purchaseItemGiftSchema,
  ReservationResponseDto,
  RegistryGiftInitResponseDto,
  ReleasedReservationsResponseDto,
} from "./dto/purchase-item.dto";
import { Public, CurrentUser } from "@/common/decorators/auth.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";

@ApiTags("Registry & Reservation Engine")
@Controller()
export class RegistryController {
  constructor(private readonly registryService: RegistryService) {}

  // --- Host Registry Management ---

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Get("events/:id/registry")
  @ApiOperation({ summary: "Get celebration registry and pools for host" })
  @ApiParam({ name: "id", description: "Event ID or Slug" })
  @ApiOkResponse({ description: "Host registry list and pools." })
  async getOwnerRegistry(
    @Param("id") eventId: string,
    @CurrentUser("id") userId: string,
    @Query("includePools") includePools?: string
  ) {
    const shouldIncludePools = includePools === "true" || includePools === "1";
    return this.registryService.getOwnerRegistry(eventId, userId, shouldIncludePools);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Post("events/:id/registry")
  @ApiOperation({ summary: "Add registry item or crowdfunding pool to event" })
  @ApiParam({ name: "id", description: "Event ID or Slug" })
  @ApiCreatedResponse({ description: "Item or pool added." })
  async createOwnerRegistryItem(
    @Param("id") eventId: string,
    @CurrentUser("id") userId: string,
    @Body()
    body: {
      title: string;
      priceKobo: number;
      productId?: string;
      isPool?: boolean;
      poolMode?: "PRODUCT" | "CASH";
      deadline?: string;
    }
  ) {
    return this.registryService.createOwnerRegistryItem(eventId, userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Patch("events/:id/registry/:itemId")
  @ApiOperation({ summary: "Update registry item or pool" })
  @ApiParam({ name: "id", description: "Event ID or Slug" })
  @ApiParam({ name: "itemId", description: "Registry item or pool ID" })
  @ApiOkResponse({ description: "Item or pool updated." })
  async updateOwnerRegistryItem(
    @Param("id") eventId: string,
    @Param("itemId") itemId: string,
    @CurrentUser("id") userId: string,
    @Body() body: { mode?: "PRODUCT" | "CASH"; status?: "AVAILABLE" | "RESERVED" | "CLAIMED" }
  ) {
    return this.registryService.updateOwnerRegistryItem(eventId, itemId, userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @Delete("events/:id/registry/:itemId")
  @ApiOperation({ summary: "Remove registry item or pool from celebration" })
  @ApiParam({ name: "id", description: "Event ID or Slug" })
  @ApiParam({ name: "itemId", description: "Registry item or pool ID" })
  @ApiOkResponse({ description: "Item or pool removed." })
  async deleteOwnerRegistryItem(
    @Param("id") eventId: string,
    @Param("itemId") itemId: string,
    @CurrentUser("id") userId: string
  ) {
    return this.registryService.deleteOwnerRegistryItem(eventId, itemId, userId);
  }

  // --- Public Guest Access ---

  @Public()
  @Post("public/events/:slug/registry/:id/reserve")
  @ApiOperation({ summary: "Reserve a physical registry item for 10 minutes" })
  @ApiParam({ name: "slug", description: "Event slug" })
  @ApiParam({ name: "id", description: "Registry item UUID" })
  @ApiOkResponse({
    description: "Item reserved successfully with hold token.",
    type: ReservationResponseDto,
  })
  async reserveItem(
    @Param("slug") slug: string,
    @Param("id") itemId: string
  ): Promise<ReservationResponseDto> {
    return this.registryService.reserveItem(slug, itemId) as any;
  }

  @Public()
  @Post("public/events/:slug/gifts/item")
  @ApiOperation({ summary: "Initialize purchase payment for a reserved registry item" })
  @ApiParam({ name: "slug", description: "Event slug" })
  @ApiCreatedResponse({
    description: "Payment initialized and hold extended.",
    type: RegistryGiftInitResponseDto,
  })
  @UsePipes(new ZodValidationPipe(purchaseItemGiftSchema))
  async purchaseItem(
    @Param("slug") slug: string,
    @Body() dto: PurchaseItemGiftDto,
    @CurrentUser("id") userId?: string
  ): Promise<RegistryGiftInitResponseDto> {
    return this.registryService.purchaseRegistryItem(slug, dto, userId) as any;
  }

  @Public()
  @Post("public/events/registry/release-expired")
  @ApiOperation({ summary: "Trigger sweeper to release expired registry item reservations" })
  @ApiOkResponse({
    description: "Count of released expired holds.",
    type: ReleasedReservationsResponseDto,
  })
  async releaseExpired(): Promise<ReleasedReservationsResponseDto> {
    return this.registryService.releaseExpiredReservations();
  }
}
