import { revalidatePath } from "next/cache";
import { ApiUnavailableError } from "../odoo/errors";
import { CommerceError, commerceErrorCode } from "../commerce/errors";

export function value(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

export function withError(path: string, error: unknown) {
  const url = new URL(path, "http://local.invalid");
  url.searchParams.set("error", commerceErrorCode(error));
  if (error instanceof CommerceError && error.details?.minOrderQuantity != null) {
    url.searchParams.set("minQty", String(error.details.minOrderQuantity));
  }
  if (error instanceof CommerceError && error.details?.availableQuantity != null) {
    url.searchParams.set("available", String(error.details.availableQuantity));
  }
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function revalidateStore() {
  revalidatePath("/", "layout");
  revalidatePath("/products", "layout");
  revalidatePath("/categories", "layout");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/account", "layout");
  revalidatePath("/account/orders");
  revalidatePath("/account/invoices");
  revalidatePath("/account/payments");
  revalidatePath("/account/addresses");
}

export function mapUnavailable(error: unknown): CommerceError | null {
  return error instanceof ApiUnavailableError ? new CommerceError("SERVICE_UNAVAILABLE") : null;
}
