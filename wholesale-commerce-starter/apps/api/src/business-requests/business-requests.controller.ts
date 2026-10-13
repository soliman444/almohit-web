import { Controller, Header, HttpCode, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalSessionGuard } from "../auth/optional-session.guard";
import type { AuthContext } from "../auth/auth.types";
import { BusinessRequestsService } from "./business-requests.service";

@ApiTags("business-requests")
@Controller("admin/business-requests")
@UseGuards(OptionalSessionGuard)
export class BusinessRequestsController {
  constructor(@Inject(BusinessRequestsService) private readonly requests: BusinessRequestsService) {}

  @Post(":requestId/approve")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  approve(@CurrentUser() user: AuthContext | null, @Param("requestId") requestId: string) {
    return this.requests.approve(user, requestId);
  }
}
