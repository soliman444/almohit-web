"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission, requireUser } from "./auth";
import {
  addToCart,
  changeOrderStatus,
  clearCart,
  isApprovedBuyer,
  placeOrder,
  recordManualPayment,
  removeCartItem,
  updateCartItemQuantity,
} from "./commerce";
import { commerceErrorCode } from "./commerce-errors";
import { prisma } from "./db/prisma";

function value(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function nextPath(formData: FormData, fallback = "/products") {
  const next = value(formData, "next");
  return next.startsWith("/") ? next : fallback;
}

function withError(path: string, error: unknown) {
  const url = new URL(path, "http://local.invalid");
  url.searchParams.set("error", commerceErrorCode(error));
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function revalidateStore() {
  revalidatePath("/", "layout");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/account");
  revalidatePath("/account/orders");
  revalidatePath("/account/addresses");
  revalidatePath("/admin/orders");
}

async function requireBuyer() {
  const user = await requireUser();
  if (!isApprovedBuyer(user) || !user.customer) redirect("/account/business");
  return user;
}

export async function addToCartAction(formData: FormData) {
  const user = await requireBuyer();
  const next = nextPath(formData);
  const quantity = Number(value(formData, "quantity") || "1");
  try {
    await addToCart(user, value(formData, "productId"), quantity, value(formData, "variantId") || null);
  } catch (error) {
    redirect(withError(next, error));
  }
  revalidateStore();
  redirect(next.includes("?") ? `${next}&cart=added` : `${next}?cart=added`);
}

export async function updateCartItemQuantityAction(formData: FormData) {
  const user = await requireBuyer();
  const next = nextPath(formData, "/cart");
  try {
    await updateCartItemQuantity(user, value(formData, "itemId"), Number(value(formData, "quantity")));
  } catch (error) {
    redirect(withError(next, error));
  }
  revalidateStore();
}

export async function removeCartItemAction(formData: FormData) {
  const user = await requireBuyer();
  try {
    await removeCartItem(user, value(formData, "itemId"));
  } catch (error) {
    redirect(withError("/cart", error));
  }
  revalidateStore();
}

export async function clearCartAction() {
  const user = await requireBuyer();
  await clearCart(user);
  revalidateStore();
}

const addressSchema = z.object({
  label: z.string().max(80).optional(),
  recipient: z.string().min(2).max(120),
  phone: z.string().max(30).optional(),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(120),
  region: z.string().max(120).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().min(2).max(80).default("SA"),
  isDefault: z.boolean().optional(),
});

function addressInput(formData: FormData) {
  return addressSchema.parse({
    label: value(formData, "label") || undefined,
    recipient: value(formData, "recipient"),
    phone: value(formData, "phone") || undefined,
    line1: value(formData, "line1"),
    line2: value(formData, "line2") || undefined,
    city: value(formData, "city"),
    region: value(formData, "region") || undefined,
    postalCode: value(formData, "postalCode") || undefined,
    country: value(formData, "country") || "SA",
    isDefault: formData.get("isDefault") === "on",
  });
}

async function setDefaultAddress(customerId: string, addressId: string) {
  const owned = await prisma.address.findFirst({ where: { id: addressId, customerId } });
  if (!owned) return;
  await prisma.$transaction([
    prisma.address.updateMany({ where: { customerId }, data: { isDefault: false } }),
    prisma.address.update({ where: { id: addressId, customerId }, data: { isDefault: true } }),
  ]);
}

export async function createAddressAction(formData: FormData) {
  const user = await requireBuyer();
  const input = addressInput(formData);
  const address = await prisma.address.create({
    data: {
      customerId: user.customer!.id,
      label: input.label ?? null,
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
  if (input.isDefault) await setDefaultAddress(user.customer!.id, address.id);
  revalidateStore();
  redirect("/account/addresses");
}

export async function updateAddressAction(formData: FormData) {
  const user = await requireBuyer();
  const id = value(formData, "id");
  const owned = await prisma.address.findFirst({ where: { id, customerId: user.customer!.id } });
  if (!owned) redirect("/account/addresses");
  const input = addressInput(formData);
  await prisma.address.update({
    where: { id: owned.id },
    data: {
      label: input.label ?? null,
      recipient: input.recipient,
      phone: input.phone ?? null,
      line1: input.line1,
      line2: input.line2 ?? null,
      city: input.city,
      region: input.region ?? null,
      postalCode: input.postalCode ?? null,
      country: input.country,
    },
  });
  if (input.isDefault) await setDefaultAddress(user.customer!.id, owned.id);
  revalidateStore();
  redirect("/account/addresses");
}

export async function deleteAddressAction(formData: FormData) {
  const user = await requireBuyer();
  await prisma.address.deleteMany({ where: { id: value(formData, "id"), customerId: user.customer!.id } });
  revalidateStore();
  redirect("/account/addresses");
}

export async function setDefaultAddressAction(formData: FormData) {
  const user = await requireBuyer();
  await setDefaultAddress(user.customer!.id, value(formData, "id"));
  revalidateStore();
  redirect("/account/addresses");
}

export async function placeOrderAction(formData: FormData) {
  const user = await requireBuyer();
  const paymentMethod = z.enum(["CASH", "BANK_TRANSFER", "MANUAL"]).parse(value(formData, "paymentMethod") || "BANK_TRANSFER");
  let orderNumber = "";
  try {
    const order = await placeOrder(user, {
      cartId: value(formData, "cartId"),
      addressId: value(formData, "addressId") || undefined,
      recipient: value(formData, "recipient"),
      phone: value(formData, "phone") || undefined,
      line1: value(formData, "line1"),
      line2: value(formData, "line2") || undefined,
      city: value(formData, "city"),
      region: value(formData, "region") || undefined,
      postalCode: value(formData, "postalCode") || undefined,
      country: value(formData, "country") || "SA",
      customerNotes: value(formData, "customerNotes") || undefined,
      paymentMethod,
      saveAddress: formData.get("saveAddress") === "on" && !value(formData, "addressId"),
    });
    orderNumber = order.orderNumber;
  } catch (error) {
    redirect(withError("/checkout", error));
  }
  revalidateStore();
  redirect(`/account/orders/${orderNumber}?placed=1`);
}

export async function updateOrderStatusAction(formData: FormData) {
  const status = z.enum(["PENDING", "CONFIRMED", "PROCESSING", "READY", "SHIPPED", "DELIVERED", "CANCELLED"]).parse(value(formData, "status"));
  const admin = await requirePermission(status === "CANCELLED" ? "order.cancel" : "order.update");
  const orderId = value(formData, "orderId");
  try {
    const orderNumber = await changeOrderStatus(orderId, status, admin.id, value(formData, "notes") || undefined);
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: status === "CANCELLED" ? "ORDER_CANCELLED" : "ORDER_STATUS_CHANGED",
        entityType: "Order",
        entityId: orderId,
        newData: { status, orderNumber },
      },
    });
  } catch (error) {
    redirect(withError(`/admin/orders/${orderId}`, error));
  }
  revalidateStore();
  redirect(`/admin/orders/${orderId}`);
}

export async function updateAdminOrderNoteAction(formData: FormData) {
  const admin = await requirePermission("order.update");
  const orderId = value(formData, "orderId");
  const adminNotes = value(formData, "adminNotes") || null;
  const current = await prisma.order.findUnique({ where: { id: orderId }, select: { adminNotes: true } });
  if (!current) return;
  await prisma.order.update({ where: { id: orderId }, data: { adminNotes } });
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "ORDER_ADMIN_NOTE",
      entityType: "Order",
      entityId: orderId,
      oldData: { adminNotes: current.adminNotes },
      newData: { adminNotes },
    },
  });
  revalidateStore();
  redirect(`/admin/orders/${orderId}`);
}

export async function recordPaymentAction(formData: FormData) {
  const admin = await requirePermission("payment.update");
  const orderId = value(formData, "orderId");
  try {
    const paymentStatus = await recordManualPayment(orderId, {
      amount: value(formData, "amount"),
      method: z.enum(["CASH", "BANK_TRANSFER", "MANUAL"]).parse(value(formData, "method") || "MANUAL"),
      reference: value(formData, "reference") || undefined,
      markPaid: formData.get("markPaid") === "on",
    });
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "PAYMENT_RECORDED",
        entityType: "Order",
        entityId: orderId,
        newData: { paymentStatus, amount: value(formData, "amount") },
      },
    });
  } catch (error) {
    redirect(withError(`/admin/orders/${orderId}`, error));
  }
  revalidateStore();
  redirect(`/admin/orders/${orderId}`);
}
