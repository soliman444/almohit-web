import type { OrderDetailDto } from "@almohit/contracts";
import { ApiClientError } from "./client";
import type { OdooOrderListParams, StorefrontOrderList } from "../odoo/orders";

export async function getOrders(params: OdooOrderListParams = {}): Promise<StorefrontOrderList> {
  if (!(await usingOdoo())) {
    return {
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        pages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    };
  }
  const { listOdooOrders } = await import("../odoo/orders");
  return listOdooOrders(params);
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
