import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import type { AuthContext } from "../auth/auth.types";
import { CustomersService } from "./customers.service";

@ApiTags("customers")
@Controller("customers")
@UseGuards(SessionAuthGuard)
export class CustomersController {
  constructor(@Inject(CustomersService) private readonly customers: CustomersService) {}

  @Get("me")
  me(@CurrentUser() user: AuthContext) {
    return this.customers.profile(user) ?? { customer: null };
  }

  @Get("me/business-status")
  businessStatus(@CurrentUser() user: AuthContext) {
    return this.customers.businessStatus(user);
  }
}
