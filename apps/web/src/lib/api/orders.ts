import type { OrderDetailDto, OrderSummaryDto } from "@almohit/contracts";
import { ApiClientError } from "./client";

export async function getOrders(): Promise<OrderSummaryDto[]> {
  if (!(await usingOdoo())) return [];
  const { listOdooOrders } = await import("../odoo/orders");
  return listOdooOrders();
}

export async function getOrder(orderNumber: string): Promise<OrderDetailDto> {
  if (!(await usingOdoo())) {
    throw new ApiClientError(404, "ORDER_NOT_FOUND", "Order not found.");
  }
  const { parseOdooRecordId } = await import("../odoo/catalog");
  const { getOdooOrder } = await import("../odoo/orders");
  const orderId = parseOdooRecordId(orderNumber);
  if (!orderId) {
    throw new ApiClientError(404, "ORDER_NOT_FOUND", "Order not found.");
  }
  return getOdooOrder(orderId);
}

async function usingOdoo() {
  const odoo = await import("../odoo/auth");
  return odoo.hasOdooSession();
}
