import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { hasPermission } from "../auth/auth-policy";
import type { AuthContext } from "../auth/auth.types";
import { PrismaService } from "../common/prisma.service";
import {
  AUTH_REQUIRED,
  BUSINESS_REQUEST_NOT_FOUND,
  BUSINESS_REQUEST_NOT_PENDING,
  PERMISSION_DENIED,
  WHOLESALE_PRICE_GROUP_MISSING,
} from "./business-requests.errors";

@Injectable()
export class BusinessRequestsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async approve(user: AuthContext | null, requestId: string) {
    const admin = this.requireApprover(user);

    return this.prisma.client.$transaction(async (tx) => {
      const request = await tx.businessRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new NotFoundException(BUSINESS_REQUEST_NOT_FOUND);
      }

      if (request.status !== "PENDING") {
        throw new ConflictException(BUSINESS_REQUEST_NOT_PENDING);
      }

      const wholesale = await tx.priceGroup.findUnique({
        where: { slug: "wholesale" },
        select: { id: true },
      });

      if (!wholesale) {
        throw new ConflictException(WHOLESALE_PRICE_GROUP_MISSING);
      }

      const now = new Date();

      await tx.businessRequest.update({
        where: { id: request.id },
        data: {
          status: "APPROVED",
          reviewedById: admin.id,
          reviewedAt: now,
          rejectionReason: null,
        },
      });

      await tx.customer.update({
        where: { id: request.customerId },
        data: {
          businessStatus: "APPROVED",
          priceGroupId: wholesale.id,
          businessName: request.businessName,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: "BUSINESS_REQUEST_APPROVED",
          entityType: "BusinessRequest",
          entityId: request.id,
        },
      });

      await tx.integrationJob.create({
        data: {
          type: "ODOO_CUSTOMER_SYNC",
          entityId: request.customerId,
          dedupeKey: `ODOO_CUSTOMER_SYNC:${request.id}`,
        },
      });

      return {
        data: {
          requestId: request.id,
          customerId: request.customerId,
          status: "APPROVED" as const,
        },
      };
    });
  }

  private requireApprover(user: AuthContext | null) {
    if (!user) {
      throw new UnauthorizedException(AUTH_REQUIRED);
    }

    if (!hasPermission(user, "customer.approve")) {
      throw new ForbiddenException(PERMISSION_DENIED);
    }

    return user;
  }
}
