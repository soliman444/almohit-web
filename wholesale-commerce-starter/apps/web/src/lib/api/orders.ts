import type {
  CancelOrderRequest,
  OrderDetailDto,
  OrderDetailResponse,
  OrderListResponse,
  OrderStatusMutationResponse,
  OrderSummaryDto,
  UpdateOrderStatusRequest,
} from "@almohit/contracts";
import { apiGet, apiPatch, apiPost } from "./client";

const PAGE_SIZE = 50;

export async function getOrders(): Promise<OrderSummaryDto[]> {
  if (await usingOdoo()) {
    const { listOdooOrders } = await import("../odoo/orders");
    return listOdooOrders();
  }
  const first = await apiGet<OrderListResponse>(`/orders?page=1&pageSize=${PAGE_SIZE}`);
  const orders = [...first.data];
  const totalPages = first.meta.totalPages ?? 1;
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await apiGet<OrderListResponse>(`/orders?page=${page}&pageSize=${PAGE_SIZE}`);
    orders.push(...next.data);
  }
  return orders;
}

export async function getOrder(orderNumber: string): Promise<OrderDetailDto> {
  if (await usingOdoo()) {
    const { parseOdooRecordId } = await import("../odoo/catalog");
    const { getOdooOrder } = await import("../odoo/orders");
    const { ApiClientError } = await import("./client");
    const orderId = parseOdooRecordId(orderNumber);
    if (!orderId) {
      throw new ApiClientError(404, "ORDER_NOT_FOUND", "Order not found.");
    }
    return getOdooOrder(orderId);
  }
  const body = await apiGet<OrderDetailResponse>(`/orders/${encodeURIComponent(orderNumber)}`);
  return body.data;
}

async function usingOdoo() {
  const odoo = await import("../odoo/auth");
  return odoo.hasOdooSession();
}

export async function updateOrderStatus(orderId: string, input: UpdateOrderStatusRequest) {
  return apiPatch<OrderStatusMutationResponse>(`/orders/${encodeURIComponent(orderId)}/status`, {
    status: input.status,
    notes: input.notes ?? undefined,
  });
}

export async function cancelOrder(orderId: string, input: CancelOrderRequest = {}) {
  return apiPost<OrderStatusMutationResponse>(`/orders/${encodeURIComponent(orderId)}/cancel`, {
    notes: input.notes ?? undefined,
  });
}
