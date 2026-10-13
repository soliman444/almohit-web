import { BadRequestException } from "@nestjs/common";
import { INVALID_AMOUNT, INVALID_PAYMENT_METHOD } from "./payments.errors";
import { isPaymentMethod, parseDecimalAmount } from "./payments.rules";

export function parseRecordPaymentInput(body: Record<string, unknown>) {
  const amount = parseDecimalAmount(body.amount);
  if (!amount || amount.lte(0)) throw new BadRequestException(INVALID_AMOUNT);
  const method = String(body.method ?? "").trim();
  if (!isPaymentMethod(method)) throw new BadRequestException(INVALID_PAYMENT_METHOD);
  return {
    amount,
    method,
    reference: parseReference(body.reference),
    markPaid: parseMarkPaid(body.markPaid),
  };
}

function parseReference(value: unknown) {
  if (value == null) return null;
  const reference = String(value).trim();
  return reference ? reference : null;
}

function parseMarkPaid(value: unknown) {
  if (value == null) return true;
  if (value === true || value === "on" || value === "true" || value === "1") return true;
  if (value === false || value === "off" || value === "false" || value === "0") return false;
  return true;
}
