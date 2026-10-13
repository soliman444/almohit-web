import { Global, Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OptionalSessionGuard } from "./optional-session.guard";
import { PermissionsGuard } from "./permissions.guard";
import { SessionAuthGuard } from "./session-auth.guard";

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, OptionalSessionGuard, SessionAuthGuard, PermissionsGuard],
  exports: [AuthService, OptionalSessionGuard, SessionAuthGuard, PermissionsGuard],
})
export class AuthModule {}
