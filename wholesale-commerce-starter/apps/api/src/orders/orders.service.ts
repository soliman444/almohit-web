import type {
  OrderDetailDto,
  OrderDetailResponse,
  OrderListResponse,
  OrderStatusMutationResponse,
  OrderStatusName,
  OrderSummaryDto,
} from "@almohit/contracts";
import { Prisma } from "@almohit/database";
import {
  BadRequestException,
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
import { serializeMoney } from "../pricing/pricing-money";
import {
  AUTH_REQUIRED,
  CUSTOMER_REQUIRED,
  INVENTORY_CONFLICT,
  ORDER_CANNOT_CANCEL,
  ORDER_CONFLICT,
  ORDER_NOT_FOUND,
  ORDER_STATUS_INVALID,
  PERMISSION_DENIED,
} from "./orders.errors";
import {
  canTransition,
  paginationMeta,
  paidTotal,
  parseAttributeSnapshot,
  parseOrderListQuery,
  remainingPayable,
} from "./orders.rules";

const TX = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  timeout: 20_000,
  maxWait: 10_000,
} as const;

const listSelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  createdAt: true,
  total: true,
  currency: true,
  _count: { select: { items: true } },
  payments: {
    select: { method: true, status: true, createdAt: true },
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
    take: 1,
  },
} satisfies Prisma.OrderSelect;

const detailSelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  subtotal: true,
  discount: true,
  shipping: true,
  tax: true,
  total: true,
  currency: true,
  shippingName: true,
  shippingPhone: true,
  shippingLine1: true,
  shippingLine2: true,
  shippingCity: true,
  shippingRegion: true,
  shippingPostal: true,
  shippingCountry: true,
  customerNotes: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      productName: true,
      variantName: true,
      sku: true,
      attributesSnapshot: true,
      quantity: true,
      unitPrice: true,
      total: true,
    },
    orderBy: { id: "asc" as const },
  },
  history: {
    select: {
      id: true,
      toStatus: true,
      notes: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
  },
  payments: {
    select: {
      method: true,
      status: true,
      amount: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
  },
} satisfies Prisma.OrderSelect;

type ListRow = Prisma.OrderGetPayload<{ select: typeof listSelect }>;
type DetailRow = Prisma.OrderGetPayload<{ select: typeof detailSelect }>;
type LockedOrder = Prisma.OrderGetPayload<{ include: { items: true } }>;

@Injectable()
export class OrdersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(user: AuthContext | null, query: Record<string, unknown>): Promise<OrderListResponse> {
    const customer = this.requireCustomer(user);
    const { page, pageSize } = parseOrderListQuery(query);
    const where = { customerId: customer.id };
    const [total, orders] = await Promise.all([
      this.prisma.client.order.count({ where }),
      this.prisma.client.order.findMany({
        where,
        select: listSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data: orders.map(toSummary),
      meta: paginationMeta(total, page, pageSize),
    };
  }

  async getByNumber(user: AuthContext | null, orderNumber: string): Promise<OrderDetailResponse> {
    const customer = this.requireCustomer(user);
    const order = await this.prisma.client.order.findFirst({
      where: { orderNumber, customerId: customer.id },
      select: detailSelect,
    });
    if (!order) throw new NotFoundException(ORDER_NOT_FOUND);
    return { data: toDetail(order) };
  }

  async updateStatus(
    user: AuthContext | null,
    orderId: string,
    input: { status: OrderStatusName; notes: string | null },
  ): Promise<OrderStatusMutationResponse> {
    const actor = this.requireUser(user);
    const permission = input.status === "CANCELLED" ? "order.cancel" : "order.update";
    if (!hasPermission(actor, permission)) throw new ForbiddenException(PERMISSION_DENIED);
    return this.transition(orderId, input.status, actor.id, input.notes);
  }

  async cancel(
    user: AuthContext | null,
    orderId: string,
    input: { notes: string | null },
  ): Promise<OrderStatusMutationResponse> {
    const actor = this.requireUser(user);
    if (hasPermission(actor, "order.cancel")) {
      return this.transition(orderId, "CANCELLED", actor.id, input.notes);
    }
    if (!actor.customer) throw new ForbiddenException(CUSTOMER_REQUIRED);
    return this.transition(orderId, "CANCELLED", actor.id, input.notes, actor.customer.id);
  }

  private async transition(
    orderId: string,
    toStatus: OrderStatusName,
    actorId: string,
    notes: string | null,
    ownerCustomerId?: string,
  ): Promise<OrderStatusMutationResponse> {
    return this.prisma.client.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, orderId, ownerCustomerId);
      if (!canTransition(order.status, toStatus)) {
        throw new BadRequestException(toStatus === "CANCELLED" ? ORDER_CANNOT_CANCEL : ORDER_STATUS_INVALID);
      }

      if (toStatus === "CANCELLED") {
        for (const item of order.items) {
          if (item.variantId || item.productId) {
            await releaseReservation(tx, { productId: item.productId, variantId: item.variantId }, item.quantity);
          }
        }
      }
      if (toStatus === "DELIVERED") {
        for (const item of order.items) {
          if (item.variantId || item.productId) {
            await fulfillStock(tx, { productId: item.productId, variantId: item.variantId }, item.quantity);
          }
        }
      }

      const moved = await tx.$executeRaw`
        UPDATE orders
        SET status = ${toStatus}::"OrderStatus", updated_at = NOW()
        WHERE id = ${order.id} AND status = ${order.status}::"OrderStatus"
      `;
      if (moved !== 1) throw new ConflictException(ORDER_CONFLICT);

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus,
          changedBy: actorId,
          notes,
        },
      });

      return {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: toStatus,
        },
      };
    }, TX);
  }

  private async lockOrder(tx: Prisma.TransactionClient, orderId: string, ownerCustomerId?: string) {
    const rows = ownerCustomerId
      ? await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM orders
          WHERE id = ${orderId} AND customer_id = ${ownerCustomerId}
          FOR UPDATE
        `
      : await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE
        `;
    if (!rows[0]) throw new NotFoundException(ORDER_NOT_FOUND);
    const order = await tx.order.findUnique({
      where: { id: rows[0].id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException(ORDER_NOT_FOUND);
    return order as LockedOrder;
  }

  private requireUser(user: AuthContext | null) {
    if (!user) throw new UnauthorizedException(AUTH_REQUIRED);
    return user;
  }

  private requireCustomer(user: AuthContext | null) {
    if (!user) throw new UnauthorizedException(AUTH_REQUIRED);
    if (!user.customer) throw new ForbiddenException(CUSTOMER_REQUIRED);
    return user.customer;
  }
}

async function releaseReservation(
  tx: Prisma.TransactionClient,
  unit: { productId?: string | null; variantId?: string | null },
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new ConflictException(INVENTORY_CONFLICT);
  const rows = unit.variantId
    ? await tx.$executeRaw`
        UPDATE inventory
        SET reserved_quantity = reserved_quantity - ${quantity}
        WHERE variant_id = ${unit.variantId}
          AND reserved_quantity >= ${quantity}
      `
    : await tx.$executeRaw`
        UPDATE inventory
        SET reserved_quantity = reserved_quantity - ${quantity}
        WHERE product_id = ${unit.productId}
          AND variant_id IS NULL
          AND reserved_quantity >= ${quantity}
      `;
  if (rows !== 1) throw new ConflictException(INVENTORY_CONFLICT);
}

async function fulfillStock(
  tx: Prisma.TransactionClient,
  unit: { productId?: string | null; variantId?: string | null },
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new ConflictException(INVENTORY_CONFLICT);
  const rows = unit.variantId
    ? await tx.$executeRaw`
        UPDATE inventory
        SET quantity = quantity - ${quantity},
            reserved_quantity = reserved_quantity - ${quantity}
        WHERE variant_id = ${unit.variantId}
          AND quantity >= ${quantity}
          AND reserved_quantity >= ${quantity}
      `
    : await tx.$executeRaw`
        UPDATE inventory
        SET quantity = quantity - ${quantity},
            reserved_quantity = reserved_quantity - ${quantity}
        WHERE product_id = ${unit.productId}
          AND variant_id IS NULL
          AND quantity >= ${quantity}
          AND reserved_quantity >= ${quantity}
      `;
  if (rows !== 1) throw new ConflictException(INVENTORY_CONFLICT);
}

function toSummary(order: ListRow): OrderSummaryDto {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    itemCount: order._count.items,
    total: serializeMoney(order.total, order.currency),
    payment: {
      method: order.payments[0]?.method ?? null,
      status: order.paymentStatus,
    },
  };
}

function toDetail(order: DetailRow): OrderDetailDto {
  const paid = paidTotal(order.payments);
  const remaining = remainingPayable(paid, order.total);
  const currency = order.currency;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    customerNotes: order.customerNotes,
    shipping: {
      recipient: order.shippingName,
      phone: order.shippingPhone,
      line1: order.shippingLine1,
      line2: order.shippingLine2,
      city: order.shippingCity,
      region: order.shippingRegion,
      postalCode: order.shippingPostal,
      country: order.shippingCountry,
    },
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      variantName: item.variantName,
      sku: item.sku,
      attributes: parseAttributeSnapshot(item.attributesSnapshot),
      quantity: item.quantity,
      unitPrice: serializeMoney(item.unitPrice, currency),
      lineTotal: serializeMoney(item.total, currency),
    })),
    totals: {
      subtotal: serializeMoney(order.subtotal, currency),
      discount: serializeMoney(order.discount, currency),
      shipping: serializeMoney(order.shipping, currency),
      tax: serializeMoney(order.tax, currency),
      total: serializeMoney(order.total, currency),
    },
    payment: {
      method: order.payments[0]?.method ?? null,
      status: order.paymentStatus,
      paidAmount: serializeMoney(paid, currency),
      remainingAmount: serializeMoney(remaining, currency),
    },
    history: order.history.map((entry) => ({
      id: entry.id,
      status: entry.toStatus,
      createdAt: entry.createdAt.toISOString(),
      notes: entry.notes,
    })),
  };
}
