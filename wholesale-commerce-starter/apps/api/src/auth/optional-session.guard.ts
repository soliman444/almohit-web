import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import type { AuthContext } from "./auth.types";

export type AuthedRequest = Request & { authUser?: AuthContext | null };

@Injectable()
export class OptionalSessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const token = request.cookies?.[this.auth.cookieName()] as string | undefined;
    request.authUser = await this.auth.resolveSession(token);
    return true;
  }
}
