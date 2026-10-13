import { BadRequestException } from "@nestjs/common";
import type { OrderStatusName } from "@almohit/contracts";
import { ORDER_STATUS_INVALID } from "./orders.errors";
import { isOrderStatus } from "./orders.rules";

export function parseStatusUpdate(body: Record<string, unknown>) {
  const status = String(body.status ?? "").trim();
  if (!isOrderStatus(status)) throw new BadRequestException(ORDER_STATUS_INVALID);
  return { status: status as OrderStatusName, notes: parseNotes(body.notes) };
}

export function parseCancelInput(body: Record<string, unknown>) {
  return { notes: parseNotes(body.notes) };
}

function parseNotes(value: unknown) {
  if (value == null) return null;
  const notes = String(value).trim();
  return notes ? notes : null;
}
