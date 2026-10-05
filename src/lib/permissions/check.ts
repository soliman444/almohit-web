import { prisma } from "@/lib/db/prisma";
import type { PermissionKey } from "./permissions";

export async function userHasPermission(userId: string, permission: PermissionKey) {
  const match = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        permissions: {
          some: { permission: { key: permission } },
        },
      },
    },
    select: { userId: true },
  });

  return Boolean(match);
}
