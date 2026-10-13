import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { OptionalSessionGuard, type AuthedRequest } from "./optional-session.guard";

@Injectable()
export class SessionAuthGuard extends OptionalSessionGuard implements CanActivate {
  override async canActivate(context: ExecutionContext) {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    if (!request.authUser || request.authUser.status !== "ACTIVE") {
      throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Authentication required" });
    }
    return true;
  }
}
