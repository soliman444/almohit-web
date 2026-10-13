import { Body, Controller, Get, Header, HttpCode, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalSessionGuard } from "../auth/optional-session.guard";
import type { AuthContext } from "../auth/auth.types";
import { parseCancelInput, parseStatusUpdate } from "./orders.input";
import { OrdersService } from "./orders.service";

@ApiTags("orders")
@Controller("orders")
@UseGuards(OptionalSessionGuard)
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  list(@CurrentUser() user: AuthContext | null, @Query() query: Record<string, string | undefined>) {
    return this.orders.list(user, query ?? {});
  }

  @Patch(":orderId/status")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  updateStatus(
    @CurrentUser() user: AuthContext | null,
    @Param("orderId") orderId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.orders.updateStatus(user, orderId, parseStatusUpdate(body ?? {}));
  }

  @Post(":orderId/cancel")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  cancel(
    @CurrentUser() user: AuthContext | null,
    @Param("orderId") orderId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.orders.cancel(user, orderId, parseCancelInput(body ?? {}));
  }

  @Get(":orderNumber")
  @Header("Cache-Control", "private, no-store")
  detail(@CurrentUser() user: AuthContext | null, @Param("orderNumber") orderNumber: string) {
    return this.orders.getByNumber(user, orderNumber);
  }
}
