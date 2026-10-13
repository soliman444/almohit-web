import crypto from "node:crypto";
import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { SESSION_COOKIE_NAME } from "@almohit/config";
import { PrismaService } from "../common/prisma.service";
import { hasPermission, isSuperAdmin } from "./auth-policy";
import type { AuthContext } from "./auth.types";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  cookieName() {
    return process.env.SESSION_COOKIE_NAME ?? SESSION_COOKIE_NAME;
  }

  hashSessionToken(token: string) {
    return hashToken(token);
  }

  async resolveSession(token: string | undefined | null): Promise<AuthContext | null> {
    if (!token) return null;

    const session = await this.prisma.client.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: {
          include: {
            customer: { include: { priceGroup: true } },
            roles: {
              include: {
                role: {
                  include: {
                    permissions: { include: { permission: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session || session.expiresAt <= new Date() || session.user.deletedAt) {
      if (session) {
        await this.prisma.client.session.delete({ where: { id: session.id } }).catch(() => undefined);
      }
      return null;
    }

    const permissions = new Set(
      session.user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key)),
    );
    const roles = session.user.roles.map(({ role }) => role.slug);
    const superAdmin = roles.includes("super-admin");

    return {
      sessionId: session.id,
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      status: session.user.status,
      phone: session.user.phone,
      roles,
      permissions,
      isSuperAdmin: superAdmin,
      customer: session.user.customer
        ? {
            id: session.user.customer.id,
            businessStatus: session.user.customer.businessStatus,
            priceGroupId: session.user.customer.priceGroupId,
            priceGroup: session.user.customer.priceGroup
              ? { status: session.user.customer.priceGroup.status, name: session.user.customer.priceGroup.name }
              : null,
            companyName: session.user.customer.companyName,
            businessName: session.user.customer.businessName,
          }
        : null,
    };
  }

  isSuperAdmin(user: AuthContext | null) {
    return isSuperAdmin(user);
  }

  hasPermission(user: AuthContext | null, permission: string) {
    return hasPermission(user, permission);
  }

  requirePermission(user: AuthContext | null, permission: string) {
    if (!hasPermission(user, permission)) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "Permission denied" });
    }
  }
}
