import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { PlaceOrderRequest, PlaceOrderResponse } from "@almohit/contracts";
import { Prisma } from "@almohit/database";
import { canSeeProductPrices } from "@almohit/validation";
import type { AuthContext } from "../auth/auth.types";
import { isUniqueConstraintError, selectionError } from "../cart/cart.rules";
import { PrismaService } from "../common/prisma.service";
import { PricingService } from "../pricing/pricing.service";
import {
  ADDRESS_NOT_FOUND,
  AUTH_REQUIRED,
  CART_EMPTY,
  CART_NOT_ACTIVE,
  CART_NOT_FOUND,
  CHECKOUT_CONFLICT,
  CUSTOMER_REQUIRED,
  INSUFFICIENT_STOCK,
  INVALID_QUANTITY,
  MOQ_NOT_MET,
  PRICE_ACCESS_DENIED,
  PRICE_UNAVAILABLE,
  PRODUCT_UNAVAILABLE,
  VARIANT_NOT_FOUND,
} from "./checkout.errors";
import {
  attributeSnapshot,
  lineTotal,
  money,
  moneySum,
  nextOrderNumber,
  resolveLockedCartCheckout,
  variantDisplayName,
} from "./checkout.rules";

const TX = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  timeout: 20_000,
  maxWait: 10_000,
} as const;

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PricingService) private readonly pricing: PricingService,
  ) {}

  async placeOrder(user: AuthContext | null, input: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    const eligible = this.requireEligible(user);

    return this.prisma.client.$transaction(async (tx) => {
      const customer = await this.lockCustomerBuyer(tx, eligible.customer.id);
      const cart = await this.lockOwnedCart(tx, customer.id, input.cartId);
      if (!cart) throw new NotFoundException(CART_NOT_FOUND);

      const locked = resolveLockedCartCheckout(cart);
      if (locked === "existing") {
        const existing = await tx.order.findUnique({ where: { cartId: cart.id } });
        if (existing) return toDto(existing);
        throw new ConflictException(CHECKOUT_CONFLICT);
      }
      if (locked !== "proceed" || cart.items.length === 0) {
        if (locked !== "proceed") throw new BadRequestException(CART_NOT_ACTIVE);
        throw new BadRequestException(CART_EMPTY);
      }

      const already = await tx.order.findUnique({ where: { cartId: cart.id } });
      if (already) return toDto(already);

      const now = new Date();
      const lines: Array<{
        productId: string;
        variantId: string | null;
        productName: string;
        variantName: string | null;
        sku: string;
        attributesSnapshot: ReturnType<typeof attributeSnapshot> | null;
        quantity: number;
        unitPrice: Prisma.Decimal;
        total: Prisma.Decimal;
        currency: string;
      }> = [];

      for (const item of cart.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, deletedAt: null, status: "ACTIVE", category: { deletedAt: null, status: true } },
          select: { id: true, name: true, sku: true, minOrderQuantity: true, productType: true },
        });
        if (!product) throw new NotFoundException(PRODUCT_UNAVAILABLE);
        if (item.quantity < product.minOrderQuantity) throw new BadRequestException(MOQ_NOT_MET);

        const variant = item.variantId
          ? await tx.productVariant.findUnique({
              where: { id: item.variantId },
              include: { values: { include: { value: { include: { attribute: true } } } } },
            })
          : null;
        const selection = selectionError({
          productType: product.productType,
          productId: product.id,
          variantId: item.variantId,
          variantProductId: variant?.productId,
          variantStatus: variant?.status,
        });
        if (selection === "VARIANT_NOT_FOUND") throw new NotFoundException(VARIANT_NOT_FOUND);
        if (selection === "PRODUCT_UNAVAILABLE") throw new NotFoundException(PRODUCT_UNAVAILABLE);

        const price = await this.pricing.findActivePrice(tx, {
          productId: product.id,
          priceGroupId: customer.priceGroupId,
          variantId: item.variantId,
          now,
        });
        if (!price) throw new NotFoundException(PRICE_UNAVAILABLE);

        await reserveStock(tx, { productId: product.id, variantId: item.variantId }, item.quantity);
        const unitPrice = money(price.amount);
        const values = variant?.values.map((entry) => ({ attributeName: entry.value.attribute.name, value: entry.value.value })) ?? [];
        lines.push({
          productId: product.id,
          variantId: item.variantId,
          productName: product.name,
          variantName: variant ? variantDisplayName(variant.values.map((entry) => entry.value)) : null,
          sku: variant?.sku ?? product.sku,
          attributesSnapshot: values.length ? attributeSnapshot(values) : null,
          quantity: item.quantity,
          unitPrice,
          total: lineTotal(unitPrice, item.quantity),
          currency: price.currency,
        });
      }

      const subtotal = moneySum(lines.map((line) => line.total));
      const currency = lines[0]?.currency ?? "USD";

      let addressId = input.addressId ?? null;
      if (input.addressId) {
        const owned = await tx.address.findFirst({
          where: { id: input.addressId, customerId: customer.id },
        });
        if (!owned) throw new NotFoundException(ADDRESS_NOT_FOUND);
        addressId = owned.id;
      } else if (input.saveAddress) {
        const created = await tx.address.create({
          data: {
            customerId: customer.id,
            recipient: input.recipient,
            phone: input.phone ?? null,
            line1: input.line1,
            line2: input.line2 ?? null,
            city: input.city,
            region: input.region ?? null,
            postalCode: input.postalCode ?? null,
            country: input.country ?? "SA",
            isDefault: false,
          },
        });
        addressId = created.id;
      }

      let orderNumber = nextOrderNumber();
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          const order = await tx.order.create({
            data: {
              orderNumber,
              customerId: customer.id,
              cartId: cart.id,
              status: "PENDING",
              paymentStatus: "PENDING",
              subtotal,
              discount: 0,
              shipping: 0,
              tax: 0,
              total: subtotal,
              currency,
              addressId,
              shippingName: input.recipient,
              shippingPhone: input.phone ?? null,
              shippingLine1: input.line1,
              shippingLine2: input.line2 ?? null,
              shippingCity: input.city,
              shippingRegion: input.region ?? null,
              shippingPostal: input.postalCode ?? null,
              shippingCountry: input.country ?? "SA",
              customerNotes: input.customerNotes ?? null,
              items: {
                create: lines.map((line) => ({
                  productId: line.productId,
                  variantId: line.variantId,
                  productName: line.productName,
                  variantName: line.variantName,
                  sku: line.sku,
                  attributesSnapshot: line.attributesSnapshot ?? undefined,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  total: line.total,
                })),
              },
              history: {
                create: { toStatus: "PENDING", changedBy: eligible.id, notes: "Order placed" },
              },
              payments: {
                create: {
                  amount: subtotal,
                  method: input.paymentMethod,
                  status: "PENDING",
                },
              },
            },
          });

          const converted = await tx.$executeRaw`
            UPDATE carts
            SET status = 'CONVERTED', updated_at = NOW()
            WHERE id = ${cart.id} AND status = 'ACTIVE'
          `;
          if (converted !== 1) throw new ConflictException(CHECKOUT_CONFLICT);

          try {
            await tx.cart.create({ data: { customerId: customer.id, status: "ACTIVE" } });
          } catch (error) {
            if (!isUniqueConstraintError(error)) throw error;
          }
          return toDto(order);
        } catch (error) {
          if (isUniqueConstraintError(error)) {
            const existing = await tx.order.findUnique({ where: { cartId: cart.id } });
            if (existing) return toDto(existing);
            orderNumber = nextOrderNumber();
            continue;
          }
          throw error;
        }
      }
      throw new ConflictException(CHECKOUT_CONFLICT);
    }, TX);
  }

  private requireEligible(user: AuthContext | null) {
    if (!user) throw new UnauthorizedException(AUTH_REQUIRED);
    if (!user.customer) throw new ForbiddenException(CUSTOMER_REQUIRED);
    if (!canSeeProductPrices(user)) throw new ForbiddenException(PRICE_ACCESS_DENIED);
    return user as AuthContext & { customer: NonNullable<AuthContext["customer"]> };
  }

  private async lockCustomerBuyer(tx: Prisma.TransactionClient, customerId: string) {
    await tx.$queryRaw`SELECT id FROM customers WHERE id = ${customerId} FOR UPDATE`;
    const customer = await tx.customer.findUnique({
      where: { id: customerId },
      include: { priceGroup: true },
    });
    if (!customer || !canSeeProductPrices({ customer }) || !customer.priceGroupId) {
      throw new ForbiddenException(PRICE_ACCESS_DENIED);
    }
    return customer as typeof customer & { priceGroupId: string };
  }

  private async lockOwnedCart(tx: Prisma.TransactionClient, customerId: string, cartId: string) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM carts
      WHERE id = ${cartId} AND customer_id = ${customerId}
      FOR UPDATE
    `;
    if (!rows[0]) return null;
    return tx.cart.findUnique({
      where: { id: rows[0].id },
      include: { items: true, order: { select: { orderNumber: true } } },
    });
  }
}

async function reserveStock(
  tx: Prisma.TransactionClient,
  unit: { productId?: string | null; variantId?: string | null },
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new BadRequestException(INVALID_QUANTITY);
  const rows = unit.variantId
    ? await tx.$executeRaw`
        UPDATE inventory
        SET reserved_quantity = reserved_quantity + ${quantity}
        WHERE variant_id = ${unit.variantId}
          AND quantity - reserved_quantity >= ${quantity}
      `
    : await tx.$executeRaw`
        UPDATE inventory
        SET reserved_quantity = reserved_quantity + ${quantity}
        WHERE product_id = ${unit.productId}
          AND variant_id IS NULL
          AND quantity - reserved_quantity >= ${quantity}
      `;
  if (rows !== 1) throw new ConflictException(INSUFFICIENT_STOCK);
}

function toDto(order: { id: string; orderNumber: string; status: string }): PlaceOrderResponse {
  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    },
  };
}
