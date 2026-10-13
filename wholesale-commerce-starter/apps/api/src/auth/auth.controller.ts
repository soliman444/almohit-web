import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { AuthMeResponse } from "@almohit/contracts";
import { CurrentUser } from "./current-user.decorator";
import { OptionalSessionGuard } from "./optional-session.guard";
import type { AuthContext } from "./auth.types";

@ApiTags("auth")
@Controller("auth")
@UseGuards(OptionalSessionGuard)
export class AuthController {
  @Get("me")
  me(@CurrentUser() user: AuthContext | null): AuthMeResponse {
    if (!user || user.status !== "ACTIVE") {
      return { authenticated: false, user: null };
    }

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      roles: user.roles,
      permissions: [...user.permissions],
      isSuperAdmin: user.isSuperAdmin,
    };
  }
}
