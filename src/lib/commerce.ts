import { Prisma, type OrderStatus, type PaymentMethod } from "../../generated/prisma/client";
import type { AuthUser } from "./auth";
import { availableQuantity } from "./catalog";
import { CommerceError } from "./commerce-errors";
import {
  allowedOrderTransitions,
  assertOrderTransition,
  assertPaymentAmount,
  cartItemIssue,
  isUniqueConstraintError,
  nextOrderNumber,
  paidTotalFromPayments,
  paymentStatusFromPaid,
  resolveLockedCartCheckout,
  sameCartSku,
} from "./commerce-rules";
import { prisma } from "./db/prisma";
import { lineTotal, money, moneySum, moneyText } from "./money";
import { isApprovedBuyer } from "./price-auth";
import { assertPurchasableSelection, attributeSnapshot, variantDisplayName, variantKey } from "./variant-rules";

export { allowedOrderTransitions, isApprovedBuyer };
export type { CartItemIssue } from "./commerce-rules";

export type CartViewItem = {
  id: string;
  productId: string;
  variantId: string | null;
  variantName: string | null;
  name: string;
  slug: string;
  sku: string;
  quantity: number;
  minOrderQuantity: number;
  available: number;
  unitPrice: string;
  lineTotal: string;
  currency: string;
  image: string | null;
  issue: ReturnType<typeof cartItemIssue>;
};

export type CartView = {
  id: string;
  itemCount: number;
  subtotal: string;
  currency: string;
  canCheckout: boolean;
  items: CartViewItem[];
};

const TX = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  timeout: 20_000,
  maxWait: 10_000,
} as const;

function throwCommerce(code: ConstructorParameters<typeof CommerceError>[0]): never {
  throw new CommerceError(code);
}

function priceWindow(now: Date) {
  return [
    { OR: [{ activeFrom: null }, { activeFrom: { lte: now } }] },
    { OR: [{ activeTo: null }, { activeTo: { gte: now } }] },
  ];
}

export async function resolveProductPrice(
  productId: string,
  priceGroupId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
  now = new Date(),
  variantId?: string | null,
) {
  return client.price.findFirst({
    where: {
      productId,
      priceGroupId,
      variantId: variantId ?? null,
      AND: priceWindow(now),
    },
    select: { amount: true, currency: true },
  });
}

async function lockCustomerBuyer(tx: Prisma.TransactionClient, customerId: string) {
  await tx.$queryRaw`SELECT id FROM customers WHERE id = ${customerId} FOR UPDATE`;
  const customer = await tx.customer.findUnique({
    where: { id: customerId },
    include: { priceGroup: true },
  });
  if (!customer || !isApprovedBuyer({ customer }) || !customer.priceGroupId) {
    throwCommerce("UNAPPROVED");
  }
  return customer as typeof customer & { priceGroupId: string };
}

async function lockOwnedCart(tx: Prisma.TransactionClient, customerId: string, cartId?: string) {
  const rows = cartId
    ? await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM carts
        WHERE id = ${cartId} AND customer_id = ${customerId}
        FOR UPDATE
      `
    : await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM carts
        WHERE customer_id = ${customerId} AND status = 'ACTIVE'
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `;
  if (!rows[0]) return null;
  return tx.cart.findUnique({
    where: { id: rows[0].id },
    include: { items: true, order: { select: { orderNumber: true } } },
  });
}

async function getOrCreateActiveCart(tx: Prisma.TransactionClient, customerId: string) {
  const extras = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM carts
    WHERE customer_id = ${customerId} AND status = 'ACTIVE'
    ORDER BY created_at DESC
    OFFSET 1
    FOR UPDATE
  `;
  if (extras.length) {
    await tx.cart.updateMany({
      where: { id: { in: extras.map((row) => row.id) } },
      data: { status: "ABANDONED" },
    });
  }

  const existing = await lockOwnedCart(tx, customerId);
  if (existing) return existing;

  try {
    return await tx.cart.create({
      data: { customerId, status: "ACTIVE" },
      include: { items: true, order: { select: { orderNumber: true } } },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const raced = await lockOwnedCart(tx, customerId);
    if (!raced) throwCommerce("CART");
    return raced;
  }
}

export async function getCurrentCart(user: AuthUser | null): Promise<CartView | null> {
  if (!user?.customer || !isApprovedBuyer(user)) return null;
  const cart = await prisma.cart.findFirst({
    where: { customerId: user.customer.id, status: "ACTIVE" },
    include: {
      items: {
        include: {
          variant: { include: { inventory: true, values: { include: { value: { include: { attribute: true } } } } } },
          product: {
            include: {
              inventory: true,
              category: { select: { deletedAt: true, status: true } },
              media: { include: { media: true }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!cart) return { id: "", itemCount: 0, subtotal: "0.00", currency: "USD", canCheckout: false, items: [] };

  const now = new Date();
  const items: CartViewItem[] = [];
  for (const item of cart.items) {
    const product = item.product;
    const stock = item.variantId ? item.variant?.inventory : product.inventory;
    const available = stock ? availableQuantity(stock.quantity, stock.reservedQuantity) : 0;
    const price = user.customer.priceGroupId
      ? await resolveProductPrice(item.productId, user.customer.priceGroupId, prisma, now, item.variantId)
      : null;
    const productActive = product.status === "ACTIVE" && !product.deletedAt;
    const categoryActive = !product.category.deletedAt && product.category.status;
    const variantActive = product.productType === "SIMPLE" || item.variant?.status === "ACTIVE";
    const pairingOk =
      (product.productType === "SIMPLE" && !item.variantId) ||
      (product.productType === "VARIABLE" && item.variant?.productId === product.id);
    const issue = cartItemIssue({
      productActive: productActive && variantActive && pairingOk,
      categoryActive,
      quantity: item.quantity,
      minOrderQuantity: product.minOrderQuantity,
      available,
      hasPrice: Boolean(price),
    });
    const unit = price ? money(price.amount) : money(item.unitPrice);
    const values = item.variant?.values.map((entry) => entry.value) ?? [];
    items.push({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      variantName: item.variant ? variantDisplayName(values) : null,
      name: product.name,
      slug: product.slug,
      sku: item.variant?.sku ?? product.sku,
      quantity: item.quantity,
      minOrderQuantity: product.minOrderQuantity,
      available,
      unitPrice: moneyText(unit),
      lineTotal: moneyText(lineTotal(unit, item.quantity)),
      currency: price?.currency ?? "USD",
      image: product.media[0]?.media.filePath ?? null,
      issue,
    });
  }

  const priced = items.filter((item) => !item.issue || item.issue === "STOCK" || item.issue === "MINIMUM");
  const currency = items.find((item) => !item.issue)?.currency ?? items[0]?.currency ?? "USD";
  return {
    id: cart.id,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: moneyText(moneySum(priced.map((item) => item.lineTotal))),
    currency,
    canCheckout: items.length > 0 && items.every((item) => !item.issue),
    items: items.map((item) => ({ ...item, currency })),
  };
}

export async function addToCart(user: AuthUser, productId: string, quantity: number, variantId?: string | null) {
  if (!isApprovedBuyer(user) || !user.customer) throwCommerce("UNAPPROVED");
  if (!Number.isInteger(quantity) || quantity < 1) throwCommerce("QUANTITY");

  await prisma.$transaction(async (tx) => {
    const customer = await lockCustomerBuyer(tx, user.customer!.id);
    const product = await tx.product.findFirst({
      where: { id: productId, deletedAt: null, status: "ACTIVE", category: { deletedAt: null, status: true } },
      include: { inventory: true },
    });
    if (!product) throwCommerce("PRODUCT");

    const variant = variantId
      ? await tx.productVariant.findUnique({ where: { id: variantId }, include: { inventory: true } })
      : null;
    assertPurchasableSelection({
      productType: product.productType,
      productId: product.id,
      variantId,
      variantProductId: variant?.productId,
      variantStatus: variant?.status,
    });

    const price = await resolveProductPrice(product.id, customer.priceGroupId, tx, new Date(), variant?.id ?? null);
    if (!price) throwCommerce("PRICE");

    const stock = product.productType === "VARIABLE" ? variant?.inventory : product.inventory;
    const available = stock ? availableQuantity(stock.quantity, stock.reservedQuantity) : 0;

    const cart = await getOrCreateActiveCart(tx, customer.id);
    const current = cart.items.find((item) => sameCartSku(item, { productId: product.id, variantId: variant?.id ?? null }));
    const nextQty = (current?.quantity ?? 0) + quantity;
    if (nextQty < product.minOrderQuantity) throwCommerce("MINIMUM");
    if (nextQty > available) throwCommerce("STOCK");

    if (current) {
      await tx.cartItem.update({
        where: { id: current.id },
        data: { quantity: nextQty, unitPrice: price.amount, variantId: variant?.id ?? null, variantKey: variantKey(variant?.id) },
      });
    } else {
      await tx.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          variantId: variant?.id ?? null,
          variantKey: variantKey(variant?.id),
          quantity: nextQty,
          unitPrice: price.amount,
        },
      });
    }
    await tx.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  }, TX);
}

export async function updateCartItemQuantity(user: AuthUser, itemId: string, quantity: number) {
  if (!isApprovedBuyer(user) || !user.customer) throwCommerce("UNAPPROVED");
  if (!Number.isInteger(quantity) || quantity < 1) throwCommerce("QUANTITY");

  await prisma.$transaction(async (tx) => {
    const customer = await lockCustomerBuyer(tx, user.customer!.id);
    const item = await tx.cartItem.findFirst({
      where: { id: itemId, cart: { customerId: customer.id, status: "ACTIVE" } },
      include: {
        variant: { include: { inventory: true } },
        product: { include: { inventory: true, category: true } },
      },
    });
    if (!item) throwCommerce("ITEM");
    if (item.product.status !== "ACTIVE" || item.product.deletedAt || item.product.category.deletedAt || !item.product.category.status) {
      throwCommerce("PRODUCT");
    }
    assertPurchasableSelection({
      productType: item.product.productType,
      productId: item.product.id,
      variantId: item.variantId,
      variantProductId: item.variant?.productId,
      variantStatus: item.variant?.status,
    });
    if (quantity < item.product.minOrderQuantity) throwCommerce("MINIMUM");

    const stock = item.product.productType === "VARIABLE" ? item.variant?.inventory : item.product.inventory;
    const available = stock ? availableQuantity(stock.quantity, stock.reservedQuantity) : 0;
    if (quantity > available) throwCommerce("STOCK");

    const price = await resolveProductPrice(item.productId, customer.priceGroupId, tx, new Date(), item.variantId);
    if (!price) throwCommerce("PRICE");

    await tx.cartItem.update({
      where: { id: item.id },
      data: { quantity, unitPrice: price.amount },
    });
  }, TX);
}

export async function removeCartItem(user: AuthUser, itemId: string) {
  if (!isApprovedBuyer(user) || !user.customer) throwCommerce("UNAPPROVED");
  const result = await prisma.cartItem.deleteMany({
    where: { id: itemId, cart: { customerId: user.customer.id, status: "ACTIVE" } },
  });
  if (result.count === 0) throwCommerce("ITEM");
}

export async function clearCart(user: AuthUser) {
  if (!isApprovedBuyer(user) || !user.customer) throwCommerce("UNAPPROVED");
  const cart = await prisma.cart.findFirst({ where: { customerId: user.customer.id, status: "ACTIVE" } });
  if (!cart) return;
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}

async function reserveStock(
  tx: Prisma.TransactionClient,
  unit: { productId?: string | null; variantId?: string | null },
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity < 1) throwCommerce("QUANTITY");
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
  if (rows !== 1) throwCommerce("STOCK");
}

async function releaseReservation(
  tx: Prisma.TransactionClient,
  unit: { productId?: string | null; variantId?: string | null },
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity < 1) throwCommerce("QUANTITY");
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
  if (rows !== 1) throwCommerce("STOCK");
}

async function fulfillStock(
  tx: Prisma.TransactionClient,
  unit: { productId?: string | null; variantId?: string | null },
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity < 1) throwCommerce("QUANTITY");
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
  if (rows !== 1) throwCommerce("STOCK");
}

export type CheckoutInput = {
  cartId: string;
  addressId?: string;
  recipient: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  country: string;
  customerNotes?: string;
  paymentMethod: PaymentMethod;
  saveAddress?: boolean;
};

export async function placeOrder(user: AuthUser, input: CheckoutInput) {
  if (!isApprovedBuyer(user) || !user.customer) throwCommerce("UNAPPROVED");
  if (!input.cartId || !input.recipient || !input.line1 || !input.city || !input.country) {
    throwCommerce("ADDRESS");
  }

  return prisma.$transaction(async (tx) => {
    const customer = await lockCustomerBuyer(tx, user.customer!.id);
    const cart = await lockOwnedCart(tx, customer.id, input.cartId);
    if (!cart) throwCommerce("EMPTY");

    const locked = resolveLockedCartCheckout(cart);
    if (locked.type === "existing") {
      const existing = await tx.order.findUnique({ where: { cartId: cart.id } });
      if (existing) return existing;
      throwCommerce("CHECKOUT");
    }
    if (locked.type !== "proceed" || cart.items.length === 0) throwCommerce("EMPTY");

    const already = await tx.order.findUnique({ where: { cartId: cart.id } });
    if (already) return already;

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
      if (!product) throwCommerce("PRODUCT");
      if (item.quantity < product.minOrderQuantity) throwCommerce("MINIMUM");

      const variant = item.variantId
        ? await tx.productVariant.findUnique({
            where: { id: item.variantId },
            include: { values: { include: { value: { include: { attribute: true } } } } },
          })
        : null;
      assertPurchasableSelection({
        productType: product.productType,
        productId: product.id,
        variantId: item.variantId,
        variantProductId: variant?.productId,
        variantStatus: variant?.status,
      });

      const price = await resolveProductPrice(product.id, customer.priceGroupId, tx, now, item.variantId);
      if (!price) throwCommerce("PRICE");

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
      if (!owned) throwCommerce("ADDRESS");
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
          country: input.country,
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
            shippingCountry: input.country,
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
              create: { toStatus: "PENDING", changedBy: user.id, notes: "Order placed" },
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
        if (converted !== 1) throwCommerce("CHECKOUT");

        try {
          await tx.cart.create({ data: { customerId: customer.id, status: "ACTIVE" } });
        } catch (error) {
          if (!isUniqueConstraintError(error)) throw error;
        }
        return order;
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          const existing = await tx.order.findUnique({ where: { cartId: cart.id } });
          if (existing) return existing;
          orderNumber = nextOrderNumber();
          continue;
        }
        throw error;
      }
    }
    throwCommerce("CHECKOUT");
  }, TX);
}

async function lockOrder(tx: Prisma.TransactionClient, orderId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE
  `;
  if (!rows[0]) throwCommerce("ORDER");
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: true },
  });
  if (!order) throwCommerce("ORDER");
  return order;
}

export async function changeOrderStatus(orderId: string, toStatus: OrderStatus, actorId: string, notes?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    assertOrderTransition(order.status, toStatus);

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
    if (moved !== 1) throwCommerce("TRANSITION");

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus,
        changedBy: actorId,
        notes: notes ?? null,
      },
    });
    return order.orderNumber;
  }, TX);
}

export async function recordManualPayment(
  orderId: string,
  input: { amount: string; method: PaymentMethod; reference?: string; markPaid: boolean },
) {
  return prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (order.status === "CANCELLED") throwCommerce("CANCELLED");

    const paid = paidTotalFromPayments(order.payments);
    const amount = assertPaymentAmount(input.amount, paid, order.total);

    await tx.payment.create({
      data: {
        orderId: order.id,
        amount,
        method: input.method,
        status: input.markPaid ? "PAID" : "PENDING",
        reference: input.reference ?? null,
        paidAt: input.markPaid ? new Date() : null,
      },
    });

    const payments = await tx.payment.findMany({ where: { orderId: order.id } });
    const paymentStatus = paymentStatusFromPaid(paidTotalFromPayments(payments), order.total);
    await tx.order.update({ where: { id: order.id }, data: { paymentStatus } });
    return paymentStatus;
  }, TX);
}
