import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthedRequest } from "./optional-session.guard";

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  return context.switchToHttp().getRequest<AuthedRequest>().authUser ?? null;
});
