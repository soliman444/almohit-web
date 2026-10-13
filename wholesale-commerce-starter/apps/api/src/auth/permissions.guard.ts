import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "./auth.service";
import type { AuthedRequest } from "./optional-session.guard";
import { PERMISSION_KEY } from "./require-permission.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  canActivate(context: ExecutionContext) {
    const permission = this.reflector.getAllAndOverride<string | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permission) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    if (!this.auth.hasPermission(request.authUser ?? null, permission)) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "Permission denied" });
    }
    return true;
  }
}
