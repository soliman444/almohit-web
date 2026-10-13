import type { AuthContext } from "./auth.types";

export function isSuperAdmin(user: AuthContext | null) {
  return Boolean(user?.isSuperAdmin);
}

export function hasPermission(user: AuthContext | null, permission: string) {
  if (!user) return false;
  return isSuperAdmin(user) || user.permissions.has(permission);
}
