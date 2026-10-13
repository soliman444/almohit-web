import type {
  AdminOrderDetailDto,
  AdminOrderDetailResponse,
  AdminOrderListItemDto,
  AdminOrderListResponse,
  AdminOrderSummaryResponse,
  UpdateAdminOrderNotesResponse,
} from "@almohit/contracts";
import { Prisma } from "@almohit/database";
import { ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { hasPermission } from "../auth/auth-policy";
import type { AuthContext } from "../auth/auth.types";
import { PrismaService } from "../common/prisma.service";
import { serializeMoney } from "../pricing/pricing-money";
import { parseAdminOrderListQuery } from "./admin-orders.input";
import { AUTH_REQUIRED, ORDER_NOT_FOUND, PERMISSION_DENIED } from "./orders.errors";
import { paginationMeta, paidTotal, remainingPayable } from "./orders.rules";

const listSelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  createdAt: true,
  total: true,
  currency: true,
  customer: {
    select: {
      id: true,
      companyName: true,
      user: { select: { name: true, email: true } },
    },
  },
  _count: { select: { items: true } },
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
  adminNotes: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      companyName: true,
      user: { select: { name: true, email: true } },
    },
  },
  items: {
    select: {
      id: true,
      productName: true,
      variantName: true,
      sku: true,
      quantity: true,
      unitPrice: true,
      total: true,
    },
    orderBy: { id: "asc" as const },
  },
  payments: {
    select: {
      id: true,
      method: true,
      status: true,
      amount: true,
      reference: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
  history: {
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      notes: true,
      createdAt: true,
      actor: { select: { name: true } },
    },
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
  },
} satisfies Prisma.OrderSelect;

type ListRow = Prisma.OrderGetPayload<{ select: typeof listSelect }>;
type DetailRow = Prisma.OrderGetPayload<{ select: typeof detailSelect }>;

@Injectable()
export class AdminOrdersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(user: AuthContext | null, query: Record<string, unknown>): Promise<AdminOrderListResponse> {
    this.requireViewer(user);
    const parsed = parseAdminOrderListQuery(query);
    const where = this.where(parsed);
    const [total, orders] = await Promise.all([
      this.prisma.client.order.count({ where }),
      this.prisma.client.order.findMany({
        where,
        select: listSelect,
        orderBy: { createdAt: "desc" },
        skip: (parsed.page - 1) * parsed.pageSize,
        take: parsed.pageSize,
      }),
    ]);
    return {
      data: orders.map(toListItem),
      meta: paginationMeta(total, parsed.page, parsed.pageSize),
    };
  }

  async getById(user: AuthContext | null, orderId: string): Promise<AdminOrderDetailResponse> {
    this.requireViewer(user);
    const order = await this.prisma.client.order.findUnique({
      where: { id: orderId },
      select: detailSelect,
    });
    if (!order) throw new NotFoundException(ORDER_NOT_FOUND);
    return { data: toDetail(order) };
  }

  async summary(user: AuthContext | null): Promise<AdminOrderSummaryResponse> {
    this.requireViewer(user);
    const total = await this.prisma.client.order.count();
    return { total };
  }

  async updateAdminNotes(
    user: AuthContext | null,
    orderId: string,
    adminNotes: string | null,
  ): Promise<UpdateAdminOrderNotesResponse> {
    this.requireEditor(user);
    const current = await this.prisma.client.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, adminNotes: true },
    });
    if (!current) throw new NotFoundException(ORDER_NOT_FOUND);
    const updated = await this.prisma.client.order.update({
      where: { id: orderId },
      data: { adminNotes },
      select: { id: true, orderNumber: true, adminNotes: true },
    });
    return {
      order: {
        id: updated.id,
        orderNumber: updated.orderNumber,
        adminNotes: updated.adminNotes,
      },
      previousAdminNotes: current.adminNotes,
    };
  }

  private requireViewer(user: AuthContext | null) {
    if (!user) throw new UnauthorizedException(AUTH_REQUIRED);
    if (!hasPermission(user, "order.view")) throw new ForbiddenException(PERMISSION_DENIED);
    return user;
  }

  private requireEditor(user: AuthContext | null) {
    if (!user) throw new UnauthorizedException(AUTH_REQUIRED);
    if (!hasPermission(user, "order.update")) throw new ForbiddenException(PERMISSION_DENIED);
    return user;
  }

  private where(query: ReturnType<typeof parseAdminOrderListQuery>): Prisma.OrderWhereInput {
    const filters: Prisma.OrderWhereInput[] = [];
    if (query.q) {
      filters.push({
        OR: [
          { orderNumber: { contains: query.q, mode: "insensitive" } },
          { customer: { user: { name: { contains: query.q, mode: "insensitive" } } } },
          { customer: { user: { email: { contains: query.q, mode: "insensitive" } } } },
        ],
      });
    }
    if (query.status) filters.push({ status: query.status });
    if (query.payment) filters.push({ paymentStatus: query.payment });
    if (!filters.length) return {};
    return { AND: filters };
  }
}

function toCustomer(customer: ListRow["customer"] | DetailRow["customer"]) {
  return {
    id: customer.id,
    name: customer.user.name,
    email: customer.user.email,
    companyName: customer.companyName,
  };
}

function toListItem(order: ListRow): AdminOrderListItemDto {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt.toISOString(),
    itemCount: order._count.items,
    customer: toCustomer(order.customer),
    total: serializeMoney(order.total, order.currency),
  };
}

function toDetail(order: DetailRow): AdminOrderDetailDto {
  const paid = paidTotal(order.payments);
  const currency = order.currency;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    customerNotes: order.customerNotes,
    adminNotes: order.adminNotes,
    customer: toCustomer(order.customer),
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
      quantity: item.quantity,
      unitPrice: serializeMoney(item.unitPrice, currency),
      lineTotal: serializeMoney(item.total, currency),
    })),
    payments: order.payments.map((payment) => ({
      id: payment.id,
      method: payment.method,
      status: payment.status,
      amount: serializeMoney(payment.amount, currency),
      reference: payment.reference,
      createdAt: payment.createdAt.toISOString(),
    })),
    history: order.history.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      notes: entry.notes,
      createdAt: entry.createdAt.toISOString(),
      actorName: entry.actor?.name ?? null,
    })),
    totals: {
      subtotal: serializeMoney(order.subtotal, currency),
      discount: serializeMoney(order.discount, currency),
      shipping: serializeMoney(order.shipping, currency),
      tax: serializeMoney(order.tax, currency),
      total: serializeMoney(order.total, currency),
    },
    paidAmount: serializeMoney(paid, currency),
    remainingAmount: serializeMoney(remainingPayable(paid, order.total), currency),
  };
}
