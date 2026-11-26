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
import { AdminService } from "./admin.service";
import {
  CreateProductDto,
  createProductSchema,
  UpdateProductDto,
  updateProductSchema,
  BulkDeleteProductsDto,
  bulkDeleteProductsSchema,
  BulkUpdateStockDto,
  bulkUpdateStockSchema,
  CreateCollectionDto,
  createCollectionSchema,
  CreateAdminVendorDto,
  createAdminVendorSchema,
  UpdateAdminVendorDto,
  updateAdminVendorSchema,
  ForwardOrderToVendorDto,
  forwardOrderToVendorSchema,
} from "./dto/admin-product.dto";
import {
  CreateShippingZoneDto,
  createShippingZoneSchema,
  UpdateShippingZoneDto,
  updateShippingZoneSchema,
} from "./dto/admin-shipping.dto";
import {
  UpdateOrderStatusDto,
  updateOrderStatusSchema,
} from "./dto/admin-orders.dto";
import {
  UpdateAdminEventStatusDto,
  updateAdminEventStatusSchema,
} from "./dto/admin-events.dto";
import {
  ResolveDisputeDto,
  resolveDisputeSchema,
  IssueRefundDto,
  issueRefundSchema,
} from "./dto/admin-disputes.dto";
import {
  provideBespokeQuoteSchema,
  ProvideBespokeQuoteInput,
} from "../orders/dto/bespoke-wish.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles, CurrentUser } from "../../common/decorators/auth.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Role, OrderStatus, DisputeStatus, UserStatus } from "@prisma/client";

@ApiTags("Admin Console (Operations, Catalog & Users)")
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
@ApiCookieAuth("givvly_at")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== PRODUCTS ====================

  @Get("products")
  @ApiOperation({ summary: "List and search all products across the platform" })
  @ApiOkResponse({ description: "Paginated catalog products." })
  async getProducts(
    @Query("active") active?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    const isActive =
      active !== undefined ? active === "true" || active === "1" : undefined;
    return this.adminService.getProducts({
      active: isActive,
      search,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Post("products")
  @ApiOperation({ summary: "Create a new catalog product" })
  @ApiCreatedResponse({ description: "Product created successfully and audit logged." })
  @UsePipes(new ZodValidationPipe(createProductSchema))
  async createProduct(
    @Body() dto: CreateProductDto,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.createProduct(dto, admin.id);
  }

  @Patch("products/:id")
  @ApiOperation({ summary: "Update product attributes, stock, or pricing" })
  @ApiParam({ name: "id", description: "Product UUID" })
  @ApiOkResponse({ description: "Product updated successfully and audit logged." })
  @UsePipes(new ZodValidationPipe(updateProductSchema))
  async updateProduct(
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.updateProduct(id, dto, admin.id);
  }

  @Delete("products/:id")
  @ApiOperation({ summary: "Deactivate (soft delete) a product" })
  @ApiParam({ name: "id", description: "Product UUID" })
  @ApiOkResponse({ description: "Product deactivated." })
  async deleteProduct(
    @Param("id") id: string,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.deleteProduct(id, admin.id);
  }

  @Post("products/bulk-delete")
  @ApiOperation({ summary: "Bulk delete / deactivate products" })
  @ApiOkResponse({ description: "Products deleted / deactivated in bulk." })
  @UsePipes(new ZodValidationPipe(bulkDeleteProductsSchema))
  async bulkDeleteProducts(
    @Body() dto: BulkDeleteProductsDto,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.bulkDeleteProducts(dto.ids, dto.permanent, admin.id);
  }

  @Post("products/bulk-stock")
  @ApiOperation({ summary: "Bulk update product stock status" })
  @ApiOkResponse({ description: "Product stock statuses updated in bulk." })
  @UsePipes(new ZodValidationPipe(bulkUpdateStockSchema))
  async bulkUpdateProductStock(
    @Body() dto: BulkUpdateStockDto,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.bulkUpdateProductStock(dto.ids, dto.inStock, admin.id);
  }

  // ==================== COLLECTIONS ====================

  @Get("collections")
  @ApiOperation({ summary: "List gift collections" })
  @ApiOkResponse({ description: "All collections." })
  async getCollections() {
    return this.adminService.getCollections();
  }

  @Post("collections")
  @ApiOperation({ summary: "Create a gift collection" })
  @ApiCreatedResponse({ description: "Collection created." })
  @UsePipes(new ZodValidationPipe(createCollectionSchema))
  async createCollection(
    @Body() dto: CreateCollectionDto,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.createCollection(dto, admin.id);
  }

  @Patch("collections/:id")
  @ApiOperation({ summary: "Update a gift collection" })
  @ApiParam({ name: "id", description: "Collection UUID" })
  @ApiOkResponse({ description: "Collection updated." })
  async updateCollection(
    @Param("id") id: string,
    @Body() dto: Partial<CreateCollectionDto>,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.updateCollection(id, dto, admin.id);
  }

  // ==================== ORDERS ====================

  @Get("orders")
  @ApiOperation({ summary: "List and filter all platform orders" })
  @ApiOkResponse({ description: "Paginated orders list." })
  async getOrders(
    @Query("status") status?: OrderStatus,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.adminService.getOrders({
      status,
      search,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get("orders/quotes")
  @ApiOperation({ summary: "List and filter all bespoke wish packages requiring quotation" })
  @ApiOkResponse({ description: "Paginated bespoke wish orders." })
  async getBespokeWishQuotes(
    @Query("status") status?: OrderStatus,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.adminService.getBespokeWishQuotes({
      status,
      search,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get("orders/:id")
  @ApiOperation({ summary: "Get detailed order information by ID" })
  @ApiParam({ name: "id", description: "Order UUID" })
  @ApiOkResponse({ description: "Full order details including items, payment, and status history." })
  async getOrderById(@Param("id") id: string) {
    return this.adminService.getOrderById(id);
  }

  @Patch("orders/:id/status")
  @ApiOperation({ summary: "Advance order lifecycle status (PACKED -> SHIPPED -> DELIVERED)" })
  @ApiParam({ name: "id", description: "Order UUID" })
  @ApiOkResponse({ description: "Order status transitioned and history appended." })
  @UsePipes(new ZodValidationPipe(updateOrderStatusSchema))
  async updateOrderStatus(
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.updateOrderStatus(id, dto, admin.id);
  }

  @Post("orders/:id/provide-quote")
  @ApiOperation({ summary: "Provide official pricing quote for a bespoke wish package" })
  @ApiParam({ name: "id", description: "Order UUID" })
  @ApiOkResponse({ description: "Quote provided and customer notified via email." })
  @UsePipes(new ZodValidationPipe(provideBespokeQuoteSchema))
  async provideBespokeQuote(
    @Param("id") id: string,
    @Body() dto: ProvideBespokeQuoteInput,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.provideBespokeQuote(id, dto, admin.id);
  }

  // ==================== USERS ====================

  @Get("users")
  @ApiOperation({ summary: "Search and list registered users" })
  @ApiOkResponse({ description: "Paginated list of users." })
  async getUsers(
    @Query("search") search?: string,
    @Query("status") status?: UserStatus,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.adminService.getUsers({
      search,
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get("users/:id")
  @ApiOperation({ summary: "Get full user profile, KYC tier, stats, events, orders, and transactions" })
  @ApiParam({ name: "id", description: "User UUID" })
  async getUserDetail(@Param("id") id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch("users/:id/suspend")
  @ApiOperation({ summary: "Suspend a user account" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiOkResponse({ description: "User suspended." })
  async suspendUser(
    @Param("id") id: string,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.suspendUser(id, admin.id);
  }

  @Patch("users/:id/restore")
  @ApiOperation({ summary: "Restore a suspended user account" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiOkResponse({ description: "User restored." })
  async restoreUser(
    @Param("id") id: string,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.restoreUser(id, admin.id);
  }

  // ==================== DISPUTES & REFUNDS ====================

  @Get("disputes")
  @ApiOperation({ summary: "List customer disputes" })
  @ApiOkResponse({ description: "List of open/resolved disputes." })
  async getDisputes(@Query("status") status?: DisputeStatus) {
    return this.adminService.getDisputes(status);
  }

  @Patch("disputes/:id")
  @ApiOperation({ summary: "Resolve a customer dispute (RESOLVED_REFUND or RESOLVED_REJECTED)" })
  @ApiParam({ name: "id", description: "Dispute UUID" })
  @ApiOkResponse({ description: "Dispute resolved and order updated." })
  @UsePipes(new ZodValidationPipe(resolveDisputeSchema))
  async resolveDispute(
    @Param("id") id: string,
    @Body() dto: ResolveDisputeDto,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.resolveDispute(id, dto, admin.id);
  }

  @Post("refunds")
  @ApiOperation({ summary: "Issue refund and post double-entry refund ledger transaction" })
  @ApiCreatedResponse({ description: "Payment refunded and balanced ledger transaction captured." })
  @UsePipes(new ZodValidationPipe(issueRefundSchema))
  async issueRefund(
    @Body() dto: IssueRefundDto,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.issueRefund(dto, admin.id);
  }

  // ==================== LEDGER & TRIAL BALANCE ====================

  @Get("ledger")
  @ApiOperation({ summary: "Inspect financial ledger entries and verify trial balance" })
  @ApiOkResponse({ description: "System trial balance and recent double-entry ledger postings." })
  async getLedgerReport() {
    return this.adminService.getLedgerReport();
  }

  // ==================== MODERATION ====================

  @Get("moderation")
  @ApiOperation({ summary: "List celebration Wall of Love posts pending moderation" })
  @ApiOkResponse({ description: "Wall posts for moderation." })
  async getModerationQueue() {
    return this.adminService.getModerationQueue();
  }

  @Patch("moderation/:id")
  @ApiOperation({ summary: "Approve or remove a Wall of Love post" })
  @ApiParam({ name: "id", description: "Wall post UUID" })
  @ApiOkResponse({ description: "Wall post moderation status updated." })
  async resolveModerationItem(
    @Param("id") id: string,
    @Body() body: { status: "APPROVED" | "REMOVED" },
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.resolveModerationItem(id, body.status, admin.id);
  }

  // ==================== CELEBRATIONS & EVENTS ====================

  @Get("events")
  @ApiOperation({ summary: "List all celebration events across the platform with metrics" })
  @ApiOkResponse({ description: "All events with computed gift and attendance stats." })
  async getEvents(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.adminService.getEvents({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get("events/:id")
  @ApiOperation({ summary: "Get full celebration insights, transactions, and activity" })
  async getEventDetail(@Param("id") id: string) {
    return this.adminService.getEventDetail(id);
  }

  @Patch("events/:id/status")
  @ApiOperation({ summary: "Update a celebration status (publish, close/block, or archive)" })
  @UsePipes(new ZodValidationPipe(updateAdminEventStatusSchema))
  async updateEventStatus(
    @Param("id") id: string,
    @Body() dto: UpdateAdminEventStatusDto,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.updateEventStatus(id, dto, admin.id);
  }

  @Delete("events/:id")
  @ApiOperation({ summary: "Delete a celebration that has no financial records" })
  async deleteEvent(
    @Param("id") id: string,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.deleteEvent(id, admin.id);
  }

  // ==================== PAYMENTS ====================

  @Get("payments")
  @ApiOperation({ summary: "List payment inflows from gifts and hampers" })
  @ApiOkResponse({ description: "Payment records." })
  async getPayments(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.adminService.getPayments({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  // ==================== VENDORS (LEGACY PARTNERS) ====================

  @Get("vendors")
  @ApiOperation({ summary: "List vendors" })
  @ApiOkResponse({ description: "Vendors." })
  async getVendors(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.adminService.getVendors({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Post("vendors")
  @ApiOperation({ summary: "Create a new vendor" })
  @UsePipes(new ZodValidationPipe(createAdminVendorSchema))
  async createVendor(
    @Body() dto: CreateAdminVendorDto,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.createVendor(dto, admin.id);
  }

  @Patch("vendors/:id")
  @ApiOperation({ summary: "Update an existing vendor" })
  @UsePipes(new ZodValidationPipe(updateAdminVendorSchema))
  async updateVendor(
    @Param("id") id: string,
    @Body() dto: UpdateAdminVendorDto,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.updateVendor(id, dto, admin.id);
  }

  @Delete("vendors/:id")
  @ApiOperation({ summary: "Delete a vendor" })
  async deleteVendor(
    @Param("id") id: string,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.deleteVendor(id, admin.id);
  }

  @Post("orders/:id/forward-vendor")
  @ApiOperation({ summary: "Forward order details to a vendor via email or WhatsApp" })
  @UsePipes(new ZodValidationPipe(forwardOrderToVendorSchema))
  async forwardOrderToVendor(
    @Param("id") id: string,
    @Body() dto: ForwardOrderToVendorDto,
    @CurrentUser() admin: { id: string }
  ) {
    return this.adminService.forwardOrderToVendor(id, dto, admin.id);
  }

  // ==================== SHIPPING ZONES ====================

  @Get("shipping-zones")
  @ApiOperation({ summary: "List all shipping zones (enabled and disabled)" })
  async listShippingZones() {
    return this.adminService.listShippingZones();
  }

  @Post("shipping-zones")
  @ApiOperation({ summary: "Create a new shipping zone" })
  @UsePipes(new ZodValidationPipe(createShippingZoneSchema))
  async createShippingZone(@Body() dto: CreateShippingZoneDto) {
    return this.adminService.createShippingZone(dto);
  }

  @Patch("shipping-zones/:id")
  @ApiOperation({ summary: "Update a shipping zone price, areas, or enabled status" })
  @UsePipes(new ZodValidationPipe(updateShippingZoneSchema))
  async updateShippingZone(
    @Param("id") id: string,
    @Body() dto: UpdateShippingZoneDto
  ) {
    return this.adminService.updateShippingZone(id, dto);
  }

  @Delete("shipping-zones/:id")
  @ApiOperation({ summary: "Delete a shipping zone" })
  async deleteShippingZone(@Param("id") id: string) {
    return this.adminService.deleteShippingZone(id);
  }

  @Get("settings")
  @ApiOperation({ summary: "Get platform settings (event auto-archive lifecycle)" })
  async getPlatformSettings() {
    return this.adminService.getPlatformSettings();
  }

  @Patch("settings")
  @ApiOperation({ summary: "Update platform settings (event auto-archive lifecycle)" })
  async updatePlatformSettings(
    @Body()
    dto: { autoArchiveEnabled?: boolean; archiveAfterHours?: number },
    @CurrentUser("id") adminId?: string
  ) {
    return this.adminService.updatePlatformSettings(dto, adminId);
  }
}
