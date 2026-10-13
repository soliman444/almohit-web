import type { RecordManualPaymentResponse } from "@almohit/contracts";
import { Prisma } from "@almohit/database";
import {
  BadRequestException,
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
  ORDER_CANCELLED,
  ORDER_NOT_FOUND,
  OVERPAY,
  PERMISSION_DENIED,
} from "./payments.errors";
import type { PaymentMethodName } from "./payments.rules";
import { paidTotal, paymentStatusFromPaid, remainingPayable, wouldOverpay } from "./payments.rules";

const TX = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  timeout: 20_000,
  maxWait: 10_000,
} as const;

@Injectable()
export class PaymentsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async recordManualPayment(
    user: AuthContext | null,
    orderId: string,
    input: { amount: Prisma.Decimal; method: PaymentMethodName; reference: string | null; markPaid: boolean },
  ): Promise<RecordManualPaymentResponse> {
    this.requireStaff(user);

    return this.prisma.client.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, orderId);
      if (order.status === "CANCELLED") throw new BadRequestException(ORDER_CANCELLED);

      const paid = paidTotal(order.payments);
      if (wouldOverpay(input.amount, paid, order.total)) throw new BadRequestException(OVERPAY);

      const created = await tx.payment.create({
        data: {
          orderId: order.id,
          amount: input.amount,
          method: input.method,
          status: input.markPaid ? "PAID" : "PENDING",
          reference: input.reference,
          paidAt: input.markPaid ? new Date() : null,
        },
      });

      const payments = await tx.payment.findMany({ where: { orderId: order.id } });
      const nextPaid = paidTotal(payments);
      const paymentStatus = paymentStatusFromPaid(nextPaid, order.total);
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus } });

      const currency = order.currency;
      return {
        payment: {
          id: created.id,
          amount: serializeMoney(created.amount, currency),
          method: created.method,
          status: created.status,
          reference: created.reference,
          createdAt: created.createdAt.toISOString(),
        },
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          paymentStatus,
          paidAmount: serializeMoney(nextPaid, currency),
          remainingAmount: serializeMoney(remainingPayable(nextPaid, order.total), currency),
        },
      };
    }, TX);
  }

  private requireStaff(user: AuthContext | null) {
    if (!user) throw new UnauthorizedException(AUTH_REQUIRED);
    if (!hasPermission(user, "payment.update")) throw new ForbiddenException(PERMISSION_DENIED);
    return user;
  }

  private async lockOrder(tx: Prisma.TransactionClient, orderId: string) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE
    `;
    if (!rows[0]) throw new NotFoundException(ORDER_NOT_FOUND);
    const order = await tx.order.findUnique({
      where: { id: rows[0].id },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException(ORDER_NOT_FOUND);
    return order;
  }
}
