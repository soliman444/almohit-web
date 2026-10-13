import { Body, Controller, Header, HttpCode, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalSessionGuard } from "../auth/optional-session.guard";
import type { AuthContext } from "../auth/auth.types";
import { parseRecordPaymentInput } from "./payments.input";
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@Controller("orders")
@UseGuards(OptionalSessionGuard)
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Post(":orderId/payments")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  record(
    @CurrentUser() user: AuthContext | null,
    @Param("orderId") orderId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.payments.recordManualPayment(user, orderId, parseRecordPaymentInput(body ?? {}));
  }
}
