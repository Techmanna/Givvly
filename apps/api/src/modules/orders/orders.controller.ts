import {
  Body,
  Controller,
  Get,
  Param,
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
import { OrdersService } from "./orders.service";
import {
  CreateOrderDto,
  createOrderSchema,
  OrderResponseDto,
  OrderPaymentInitResponseDto,
  PublicOrderTrackingResponseDto,
} from "./dto/create-order.dto";
import {
  ReviewOrderDto,
  reviewOrderSchema,
  DisputeOrderDto,
  disputeOrderSchema,
  ReviewResponseDto,
  DisputeResponseDto,
} from "./dto/order-feedback.dto";
import { Public, CurrentUser } from "../../common/decorators/auth.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { OrderStatus } from "@prisma/client";

@ApiTags("Orders & Fulfillment")
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post("orders")
  @ApiOperation({ summary: "Direct checkout / Create gift box order" })
  @ApiCreatedResponse({
    description: "Order created and checkout payment initialized with gateway.",
    type: OrderPaymentInitResponseDto,
  })
  @UsePipes(new ZodValidationPipe(createOrderSchema))
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user?: { id: string; email: string; name?: string }
  ): Promise<OrderPaymentInitResponseDto> {
    return this.ordersService.createOrder(dto, user) as any;
  }

  @Public()
  @Post("orders/:id/pay")
  @ApiOperation({ summary: "Re-initialize payment for a PENDING_PAYMENT order" })
  @ApiParam({ name: "id", description: "Order UUID" })
  @ApiOkResponse({ description: "Fresh payment authorization details." })
  async repayOrder(
    @Param("id") orderId: string,
    @CurrentUser() user?: { id: string; email: string }
  ) {
    return this.ordersService.repayOrder(orderId, user);
  }

  @Public()
  @Post("orders/:id/verify")
  @ApiOperation({ summary: "Verify and confirm payment for an order" })
  @ApiParam({ name: "id", description: "Order UUID" })
  @ApiOkResponse({ description: "Verified order status." })
  async verifyOrderPayment(@Param("id") orderId: string) {
    return this.ordersService.verifyOrderPayment(orderId);
  }

  @Get("orders")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @ApiOperation({ summary: "List orders placed by currently authenticated buyer" })
  @ApiOkResponse({
    description: "List of buyer orders.",
    type: [OrderResponseDto],
  })
  async getBuyerOrders(
    @CurrentUser() user: { id: string },
    @Query("status") status?: OrderStatus
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.getBuyerOrders(user.id, status) as any;
  }

  @Get("orders/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @ApiOperation({ summary: "Get order details by ID" })
  @ApiParam({ name: "id", description: "Order UUID" })
  @ApiOkResponse({
    description: "Detailed order information.",
    type: OrderResponseDto,
  })
  async getOrderById(
    @Param("id") orderId: string,
    @CurrentUser() user: { id: string; role: string }
  ): Promise<OrderResponseDto> {
    return this.ordersService.getOrderById(orderId, user) as any;
  }

  @Post("orders/:id/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @ApiOperation({ summary: "Cancel order before packaging begins" })
  @ApiParam({ name: "id", description: "Order UUID" })
  @ApiOkResponse({
    description: "Order cancelled and inventory restored.",
    type: OrderResponseDto,
  })
  async cancelOrder(
    @Param("id") orderId: string,
    @CurrentUser() user: { id: string; role: string },
    @Body("reason") reason?: string
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelOrder(orderId, user, reason) as any;
  }

  @Post("orders/:id/review")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @ApiOperation({ summary: "Submit customer review for a DELIVERED order" })
  @ApiParam({ name: "id", description: "Order UUID" })
  @ApiCreatedResponse({
    description: "Review recorded and product ratings recalculated.",
    type: ReviewResponseDto,
  })
  @UsePipes(new ZodValidationPipe(reviewOrderSchema))
  async createReview(
    @Param("id") orderId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ReviewOrderDto
  ): Promise<ReviewResponseDto> {
    return this.ordersService.createReview(orderId, user.id, dto) as any;
  }

  @Post("orders/:id/disputes")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @ApiOperation({ summary: "Open dispute on a shipped or delivered order (within 14 days)" })
  @ApiParam({ name: "id", description: "Order UUID" })
  @ApiCreatedResponse({
    description: "Dispute opened and order status updated to DISPUTED.",
    type: DisputeResponseDto,
  })
  @UsePipes(new ZodValidationPipe(disputeOrderSchema))
  async createDispute(
    @Param("id") orderId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: DisputeOrderDto
  ): Promise<DisputeResponseDto> {
    return this.ordersService.createDispute(orderId, user.id, dto) as any;
  }

  @Public()
  @Get("public/track/:token")
  @ApiOperation({ summary: "Public order tracking timeline by unguessable tracking token" })
  @ApiParam({ name: "token", description: "Unguessable tracking token" })
  @ApiOkResponse({
    description: "Sanitized tracking history and live fulfillment status.",
    type: PublicOrderTrackingResponseDto,
  })
  async trackOrderPublic(
    @Param("token") token: string
  ): Promise<PublicOrderTrackingResponseDto> {
    return this.ordersService.trackOrderByToken(token) as any;
  }

  @Public()
  @Get("orders/track/:token")
  @ApiOperation({ summary: "Public order tracking timeline alias" })
  @ApiParam({ name: "token", description: "Unguessable tracking token" })
  @ApiOkResponse({
    description: "Sanitized tracking history and live fulfillment status.",
    type: PublicOrderTrackingResponseDto,
  })
  async trackOrderByTokenAlias(
    @Param("token") token: string
  ): Promise<PublicOrderTrackingResponseDto> {
    return this.ordersService.trackOrderByToken(token) as any;
  }
}
