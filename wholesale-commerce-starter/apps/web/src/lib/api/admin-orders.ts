import type {
  AdminOrderDetailDto,
  AdminOrderDetailResponse,
  AdminOrderListItemDto,
  AdminOrderListResponse,
  AdminOrderSummaryResponse,
  UpdateAdminOrderNotesResponse,
} from "@almohit/contracts";
import { apiGet, apiPatch } from "./client";

const PAGE_SIZE = 100;

export async function getAdminOrders(input: {
  q?: string;
  status?: string;
  payment?: string;
} = {}): Promise<AdminOrderListItemDto[]> {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.status) params.set("status", input.status);
  if (input.payment) params.set("payment", input.payment);
  params.set("page", "1");
  params.set("pageSize", String(PAGE_SIZE));
  const body = await apiGet<AdminOrderListResponse>(`/admin/orders?${params.toString()}`);
  return body.data;
}

export async function getAdminOrder(id: string): Promise<AdminOrderDetailDto> {
  const body = await apiGet<AdminOrderDetailResponse>(`/admin/orders/${encodeURIComponent(id)}`);
  return body.data;
}

export async function getAdminOrderSummary(): Promise<AdminOrderSummaryResponse> {
  return apiGet<AdminOrderSummaryResponse>("/admin/orders/summary");
}

export async function updateAdminOrderNotes(orderId: string, adminNotes: string | null) {
  return apiPatch<UpdateAdminOrderNotesResponse>(`/admin/orders/${encodeURIComponent(orderId)}/notes`, {
    adminNotes,
  });
}
