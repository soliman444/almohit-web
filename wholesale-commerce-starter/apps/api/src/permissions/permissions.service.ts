import { ForbiddenException, Injectable } from "@nestjs/common";
import { hasPermission, isSuperAdmin } from "../auth/auth-policy";
import type { AuthContext } from "../auth/auth.types";

@Injectable()
export class PermissionsService {
  isSuperAdmin(user: AuthContext | null) {
    return isSuperAdmin(user);
  }

  hasPermission(user: AuthContext | null, permission: string) {
    return hasPermission(user, permission);
  }

  requirePermission(user: AuthContext | null, permission: string) {
    if (!this.hasPermission(user, permission)) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "Permission denied" });
    }
  }
}
