import { Body, Controller, HttpCode, Inject, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalSessionGuard } from "../auth/optional-session.guard";
import type { AuthContext } from "../auth/auth.types";
import { parsePlaceOrderInput } from "./checkout.input";
import { CheckoutService } from "./checkout.service";

@ApiTags("checkout")
@Controller("checkout")
@UseGuards(OptionalSessionGuard)
export class CheckoutController {
  constructor(@Inject(CheckoutService) private readonly checkout: CheckoutService) {}

  @Post("place-order")
  @HttpCode(200)
  placeOrder(@CurrentUser() user: AuthContext | null, @Body() body: Record<string, unknown>) {
    return this.checkout.placeOrder(user, parsePlaceOrderInput(body ?? {}));
  }
}
