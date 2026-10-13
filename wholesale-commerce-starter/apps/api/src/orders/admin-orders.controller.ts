import { Body, Controller, Get, Header, HttpCode, Inject, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalSessionGuard } from "../auth/optional-session.guard";
import type { AuthContext } from "../auth/auth.types";
import { parseAdminNotesInput } from "./admin-orders.input";
import { AdminOrdersService } from "./admin-orders.service";

@ApiTags("admin-orders")
@Controller("admin/orders")
@UseGuards(OptionalSessionGuard)
export class AdminOrdersController {
  constructor(@Inject(AdminOrdersService) private readonly orders: AdminOrdersService) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  list(@CurrentUser() user: AuthContext | null, @Query() query: Record<string, string | undefined>) {
    return this.orders.list(user, query ?? {});
  }

  @Get("summary")
  @Header("Cache-Control", "private, no-store")
  summary(@CurrentUser() user: AuthContext | null) {
    return this.orders.summary(user);
  }

  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  detail(@CurrentUser() user: AuthContext | null, @Param("id") id: string) {
    return this.orders.getById(user, id);
  }

  @Patch(":orderId/notes")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  updateNotes(
    @CurrentUser() user: AuthContext | null,
    @Param("orderId") orderId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.orders.updateAdminNotes(user, orderId, parseAdminNotesInput(body ?? {}));
  }
}
