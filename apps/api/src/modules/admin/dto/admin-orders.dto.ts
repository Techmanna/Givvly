import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { z } from "zod";
import { OrderStatus } from "@prisma/client";

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().trim().max(300).optional(),
});

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.PACKED,
    description: "Legal next order lifecycle status",
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({
    example: "Order carefully packaged into Blush & Gold Keepsake Box",
    description: "Fulfillment note appended to OrderStatusHistory",
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
