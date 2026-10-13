import type { RecordManualPaymentRequest, RecordManualPaymentResponse } from "@almohit/contracts";
import { apiPost } from "./client";

export async function recordManualPayment(orderId: string, input: RecordManualPaymentRequest) {
  return apiPost<RecordManualPaymentResponse>(`/orders/${encodeURIComponent(orderId)}/payments`, {
    amount: input.amount,
    method: input.method,
    ...(input.reference ? { reference: input.reference } : {}),
    markPaid: input.markPaid ?? true,
  });
}
