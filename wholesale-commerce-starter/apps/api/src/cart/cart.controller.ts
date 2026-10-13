import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalSessionGuard } from "../auth/optional-session.guard";
import type { AuthContext } from "../auth/auth.types";
import { CartService } from "./cart.service";

@ApiTags("cart")
@Controller("cart")
@UseGuards(OptionalSessionGuard)
export class CartController {
  constructor(@Inject(CartService) private readonly carts: CartService) {}

  @Get()
  get(@CurrentUser() user: AuthContext | null) {
    return this.carts.getCurrentCart(user);
  }

  @Post("items")
  @HttpCode(200)
  add(@CurrentUser() user: AuthContext | null, @Body() body: Record<string, unknown>) {
    return this.carts.addItem(user, body ?? {});
  }

  @Patch("items/:itemId")
  update(
    @CurrentUser() user: AuthContext | null,
    @Param("itemId") itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.carts.updateItem(user, itemId, body ?? {});
  }

  @Delete("items/:itemId")
  remove(@CurrentUser() user: AuthContext | null, @Param("itemId") itemId: string) {
    return this.carts.removeItem(user, itemId);
  }

  @Delete()
  clear(@CurrentUser() user: AuthContext | null) {
    return this.carts.clear(user);
  }
}
