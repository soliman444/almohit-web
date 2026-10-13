"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ApiClientError, ApiUnavailableError } from "./api/client";
import { destroySession, requirePermission } from "./auth";
import { isOdooAuthError, loginCustomer, logoutCurrentCustomer, registerCustomer } from "./odoo/auth";
import { parseOdooRecordId } from "./odoo/catalog";
import { getTradeApplication, submitTradeApplication } from "./odoo/trade";
import { parseAppRole, parseTradeKyc, tradeApplicationFromKyc, formValue as value } from "./trade-kyc";

export async function registerAction(formData: FormData) {
  const account = z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    role: z.enum(["merchant", "buyer", "distributor", "marketer"]),
  }).safeParse({
    name: value(formData, "name"),
    email: value(formData, "email").toLowerCase(),
    password: value(formData, "password"),
    role: parseAppRole(value(formData, "role")),
  });
  if (!account.success) redirect("/register?error=account");
  const kyc = parseTradeKyc(formData, account.data.role);
  if (!kyc.success) redirect("/register?error=kyc");

  try {
    await registerCustomer({
      name: account.data.name,
      email: account.data.email,
      password: account.data.password,
      phone: kyc.data.phone,
      role: account.data.role,
    });
    await loginCustomer({ email: account.data.email, password: account.data.password });
  } catch (error) {
    if (isOdooAuthError(error, "EMAIL_ALREADY_EXISTS")) redirect("/register?error=exists");
    if (isOdooAuthError(error, "PASSWORD_TOO_SHORT")) redirect("/register?error=password");
    if (isOdooAuthError(error, "INVALID_ROLE")) redirect("/register?error=role");
    if (error instanceof ApiUnavailableError) redirect("/register?error=unavailable");
    throw error;
  }

  try {
    const image = formData.get("shopImage");
    const { decodeAdminImage } = await import("./odoo/admin-products");
    const shopImage = account.data.role === "merchant"
      ? await decodeAdminImage(image instanceof File ? image : null)
      : { imageBase64: undefined, imageContentType: undefined };
    await submitTradeApplication({
      ...tradeApplicationFromKyc(account.data.role, kyc.data),
      shopImageBase64: shopImage.imageBase64,
      shopImageContentType: shopImage.imageContentType,
    });
  } catch (error) {
    if (isOdooAuthError(error, "APPLICATION_ALREADY_PENDING")) redirect("/account/business");
    if (isOdooAuthError(error, "INVALID_IMAGE")) redirect("/account/business?error=image");
    if (isOdooAuthError(error, "INVALID_PAYMENT_METHOD")) redirect("/account/business?error=payment");
    if (isOdooAuthError(error, "INVALID_ROLE")) redirect("/account/business?error=role");
    if (error instanceof ApiUnavailableError) redirect("/account/business?error=unavailable");
    throw error;
  }

  await destroySession();
  redirect("/account/business");
}

export async function loginAction(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  if (!email || !password) redirect("/login?error=invalid");

  try {
    const session = await loginCustomer({ email, password });
    if (session.isStaff) redirect("/admin");
  } catch (error) {
    if (isOdooAuthError(error, "INVALID_CREDENTIALS") || (error instanceof ApiClientError && error.status === 401)) {
      redirect("/login?error=invalid");
    }
    if (error instanceof ApiUnavailableError) redirect("/login?error=unavailable");
    throw error;
  }

  redirect("/account");
}

export async function logoutAction() {
  await logoutCurrentCustomer();
  redirect("/");
}

export async function submitBusinessRequestAction(formData: FormData) {
  const odoo = await import("./odoo/auth");
  const odooSession = await odoo.hasOdooSession();
  const sessionCustomer = odooSession ? await odoo.getCurrentCustomer() : null;
  if (!odooSession || !sessionCustomer) redirect("/login");

  const existing = await getTradeApplication();
  if (
    sessionCustomer.tradeStatus === "approved"
    || sessionCustomer.tradeStatus === "pending"
    || existing?.status === "approved"
    || existing?.status === "pending"
  ) {
    redirect("/account/business");
  }

  const role = parseAppRole(sessionCustomer.role ?? "merchant");
  const kyc = parseTradeKyc(formData, role);
  if (!kyc.success) redirect("/account/business?error=kyc");

  try {
    const image = formData.get("shopImage");
    const { decodeAdminImage } = await import("./odoo/admin-products");
    const shopImage = role === "merchant"
      ? await decodeAdminImage(image instanceof File ? image : null)
      : { imageBase64: undefined, imageContentType: undefined };
    await submitTradeApplication({
      ...tradeApplicationFromKyc(role, kyc.data),
      shopImageBase64: shopImage.imageBase64,
      shopImageContentType: shopImage.imageContentType,
    });
  } catch (error) {
    if (isOdooAuthError(error, "APPLICATION_ALREADY_PENDING") || isOdooAuthError(error, "APPLICATION_ALREADY_APPROVED")) {
      redirect("/account/business");
    }
    if (isOdooAuthError(error, "INVALID_IMAGE")) redirect("/account/business?error=image");
    if (isOdooAuthError(error, "INVALID_PAYMENT_METHOD")) redirect("/account/business?error=payment");
    if (isOdooAuthError(error, "INVALID_ROLE")) redirect("/account/business?error=role");
    if (isOdooAuthError(error, "UNAUTHENTICATED") || (error instanceof ApiClientError && error.status === 401)) {
      redirect("/login");
    }
    if (error instanceof ApiUnavailableError) redirect("/account/business?error=unavailable");
    throw error;
  }
  redirect("/account/business?status=submitted");
}

export async function approveBusinessRequestAction(formData: FormData) {
  await requirePermission("customer.approve");
  const requestId = value(formData, "requestId");
  if (!requestId) return;
  const { approveOdooAdminTradeApplication } = await import("./odoo/admin-trade");
  try {
    await approveOdooAdminTradeApplication(requestId);
  } catch (error) {
    if (isOdooAuthError(error, "APPLICATION_NOT_FOUND") || isOdooAuthError(error, "APPLICATION_NOT_PENDING")) {
      revalidatePath("/admin/business-requests");
      return;
    }
    throw error;
  }
  revalidatePath("/admin/business-requests");
  revalidatePath("/admin");
}

export async function rejectBusinessRequestAction(formData: FormData) {
  await requirePermission("customer.reject");
  const requestId = value(formData, "requestId");
  const reason = value(formData, "reason");
  if (!requestId) return;
  const { rejectOdooAdminTradeApplication } = await import("./odoo/admin-trade");
  try {
    await rejectOdooAdminTradeApplication(requestId, reason);
  } catch (error) {
    if (isOdooAuthError(error, "APPLICATION_NOT_FOUND") || isOdooAuthError(error, "APPLICATION_NOT_PENDING")) {
      revalidatePath("/admin/business-requests");
      return;
    }
    throw error;
  }
  revalidatePath("/admin/business-requests");
  revalidatePath("/admin");
}

function revalidateCatalog() {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/brands");
  revalidatePath("/admin/attributes");
  revalidatePath("/admin/products");
}

export type OdooAdminFormResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function redirectOdooAdminForm(result: OdooAdminFormResult<unknown>, okPath: string, errorPath: string) {
  if (!result.ok) {
    const error = encodeURIComponent(result.error);
    redirect(`${errorPath}${errorPath.includes("?") ? "&" : "?"}error=${error}`);
  }
  redirect(okPath);
}

export async function createOdooCategoryFormAction(formData: FormData) {
  redirectOdooAdminForm(await createOdooCategoryAction(formData), "/admin/categories", "/admin/categories/new");
}

export async function createOdooBrandFormAction(formData: FormData) {
  redirectOdooAdminForm(await createOdooBrandAction(formData), "/admin/brands", "/admin/brands");
}

export async function createOdooAttributeFormAction(formData: FormData) {
  redirectOdooAdminForm(await createOdooAttributeAction(formData), "/admin/attributes", "/admin/attributes");
}

export async function addOdooAttributeValueFormAction(formData: FormData) {
  redirectOdooAdminForm(await addOdooAttributeValueAction(formData), "/admin/attributes", "/admin/attributes");
}

function odooAdminCreateErrorPath(error: unknown) {
  if (error instanceof ApiUnavailableError) return "/admin/products/new?error=unavailable";
  if (error instanceof ApiClientError) {
    const mapped: Record<string, string> = {
      NAME_REQUIRED: "name",
      CATEGORY_NOT_FOUND: "category",
      CATEGORY_EXISTS: "category",
      BRAND_NOT_FOUND: "brand",
      BRAND_EXISTS: "brand",
      INVALID_MOQ: "moq",
      SKU_ALREADY_EXISTS: "sku",
      INVALID_IMAGE: "image",
      INVALID_PRICE: "price",
      INVALID_COST: "cost",
      INVALID_STOCK_QUANTITY: "stock",
      ATTRIBUTE_NOT_FOUND: "attributes",
      ATTRIBUTE_EXISTS: "attributes",
      ATTRIBUTE_VALUE_EXISTS: "attributes",
      INVALID_ATTRIBUTE_VALUES: "attributes",
      STAFF_REQUIRED: "odoo",
      PERMISSION_DENIED: "permission",
      UNAUTHENTICATED: "odoo",
    };
    return `/admin/products/new?error=${mapped[error.code] ?? "odoo"}`;
  }
  return "/admin/products/new?error=odoo";
}

function odooAdminFormError(error: unknown) {
  if (error instanceof ApiUnavailableError) return "Odoo is temporarily unavailable.";
  if (error instanceof ApiClientError) return error.message;
  return "Odoo could not save this record.";
}

export async function createOdooCategoryAction(formData: FormData): Promise<OdooAdminFormResult<{
  id: string;
  name: string;
  depth: number;
}>> {
  await requirePermission("category.create");
  const name = value(formData, "name");
  if (!name) return { ok: false, error: "Category name is required." };
  const parentRaw = value(formData, "parentId");
  const parentId = parentRaw ? parseOdooRecordId(parentRaw) : undefined;
  if (parentRaw && !parentId) return { ok: false, error: "Parent category not found." };
  try {
    const { createOdooAdminCategory } = await import("./odoo/admin-products");
    const created = await createOdooAdminCategory({ name, parentId: parentId ?? undefined });
    revalidateCatalog();
    return {
      ok: true,
      data: {
        id: String(created.id),
        name: created.complete_name || created.name,
        depth: (created.complete_name || created.name).split(" / ").length - 1,
      },
    };
  } catch (error) {
    return { ok: false, error: odooAdminFormError(error) };
  }
}

export async function createOdooBrandAction(formData: FormData): Promise<OdooAdminFormResult<{
  id: string;
  name: string;
}>> {
  await requirePermission("brand.create");
  const name = value(formData, "name");
  if (!name) return { ok: false, error: "Brand name is required." };
  const image = formData.get("image");
  try {
    const { createOdooAdminBrand, decodeAdminImage } = await import("./odoo/admin-products");
    const imagePayload = await decodeAdminImage(image instanceof File ? image : null);
    const created = await createOdooAdminBrand({ name, ...imagePayload });
    revalidateCatalog();
    return { ok: true, data: { id: String(created.id), name: created.name } };
  } catch (error) {
    return { ok: false, error: odooAdminFormError(error) };
  }
}

export async function createOdooAttributeAction(formData: FormData): Promise<OdooAdminFormResult<{
  id: number;
  name: string;
  values: Array<{ id: number; name: string }>;
}>> {
  await requirePermission("product.create");
  const name = value(formData, "name");
  const values = value(formData, "values")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!name) return { ok: false, error: "Attribute name is required." };
  if (values.length === 0) return { ok: false, error: "Add at least one attribute value." };
  try {
    const { createOdooAdminAttribute } = await import("./odoo/admin-products");
    const created = await createOdooAdminAttribute({ name, values });
    revalidateCatalog();
    return { ok: true, data: created };
  } catch (error) {
    return { ok: false, error: odooAdminFormError(error) };
  }
}

export async function addOdooAttributeValueAction(formData: FormData): Promise<OdooAdminFormResult<{
  id: number;
  name: string;
  values: Array<{ id: number; name: string }>;
}>> {
  await requirePermission("product.create");
  const attributeId = parseOdooRecordId(value(formData, "attributeId"));
  const values = value(formData, "values")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!attributeId) return { ok: false, error: "Attribute not found." };
  if (values.length === 0) return { ok: false, error: "Add at least one attribute value." };
  try {
    const { addOdooAdminAttributeValues } = await import("./odoo/admin-products");
    const created = await addOdooAdminAttributeValues(attributeId, values);
    revalidateCatalog();
    return { ok: true, data: created };
  } catch (error) {
    return { ok: false, error: odooAdminFormError(error) };
  }
}

export async function createProductAction(formData: FormData) {
  await requirePermission("product.create");
  const isVariable = value(formData, "productType") === "VARIABLE";

  const categoryId = parseOdooRecordId(value(formData, "categoryId"));
  const brandRaw = value(formData, "brandId");
  const brandId = brandRaw ? parseOdooRecordId(brandRaw) : undefined;
  const name = value(formData, "name");
  const sku = value(formData, "sku");
  const minOrderQty = Number(value(formData, "minOrderQuantity") || 1);
  const quantity = Number(value(formData, "quantity") || 0);
  const priceRaw = value(formData, "priceAmount");
  const costRaw = value(formData, "costAmount");
  const saleOk = value(formData, "status") === "ACTIVE";
  const image = formData.get("image");

  if (!name) redirect("/admin/products/new?error=name");
  if (!isVariable && !sku) redirect("/admin/products/new?error=sku");
  if (!categoryId) redirect("/admin/products/new?error=category");
  if (brandRaw && !brandId) redirect("/admin/products/new?error=brand");
  if (!Number.isFinite(minOrderQty) || minOrderQty <= 0) redirect("/admin/products/new?error=moq");
  if (!isVariable && (!Number.isFinite(quantity) || quantity < 0)) redirect("/admin/products/new?error=stock");

  let wholesalePrice: number | undefined;
  if (priceRaw) {
    wholesalePrice = Number(priceRaw);
    if (!Number.isFinite(wholesalePrice) || wholesalePrice < 0) redirect("/admin/products/new?error=price");
  }
  let cost: number | undefined;
  if (costRaw) {
    cost = Number(costRaw);
    if (!Number.isFinite(cost) || cost < 0) redirect("/admin/products/new?error=cost");
  }

  const { parseJsonField } = await import("./odoo/admin-products");
  const attributeLines = isVariable
    ? parseJsonField<Array<{ attribute_id: number; value_ids: number[] }>>(value(formData, "attributeLinesJson"), [])
      .filter((line) => line?.attribute_id && Array.isArray(line.value_ids) && line.value_ids.length > 0)
      .map((line) => ({ attributeId: line.attribute_id, valueIds: line.value_ids }))
    : [];
  const variants = isVariable
    ? parseJsonField<Array<{ value_ids: number[]; sku?: string; barcode?: string; quantity?: number; wholesale_price?: number; cost?: number }>>(value(formData, "variantsJson"), [])
      .filter((variant) => Array.isArray(variant?.value_ids) && variant.value_ids.length > 0)
      .map((variant) => ({
        valueIds: variant.value_ids,
        sku: variant.sku,
        barcode: variant.barcode,
        quantity: variant.quantity,
        wholesalePrice: variant.wholesale_price,
        cost: variant.cost,
      }))
    : [];
  if (isVariable && attributeLines.length === 0) redirect("/admin/products/new?error=attributes");

  let created;
  try {
    const { decodeAdminImage, decodeAdminImages, createOdooAdminProduct } = await import("./odoo/admin-products");
    const imagePayload = await decodeAdminImage(image instanceof File ? image : null);
    const gallery = await decodeAdminImages(
      formData.getAll("gallery").filter((item): item is File => item instanceof File && item.size > 0),
    );
    const variantImages = new Map<string, Awaited<ReturnType<typeof decodeAdminImage>>>();
    for (const [key, file] of formData.entries()) {
      if (!key.startsWith("variantImage:") || !(file instanceof File) || file.size === 0) continue;
      variantImages.set(key.slice("variantImage:".length), await decodeAdminImage(file));
    }
    const variantsWithImages = variants.map((variant) => {
      const image = variantImages.get(variant.valueIds.join("-"));
      return image?.imageBase64 ? { ...variant, ...image } : variant;
    });
    created = await createOdooAdminProduct({
      name,
      sku: sku || undefined,
      description: value(formData, "description") || undefined,
      categoryId,
      brandId: brandId ?? undefined,
      minOrderQty,
      saleOk,
      barcode: value(formData, "barcode") || undefined,
      wholesalePrice,
      cost,
      quantity: !isVariable && quantity > 0 ? quantity : undefined,
      attributeLines: isVariable ? attributeLines : undefined,
      variants: isVariable ? variantsWithImages : undefined,
      gallery: gallery.length ? gallery : undefined,
      ...imagePayload,
    });
  } catch (error) {
    redirect(odooAdminCreateErrorPath(error));
  }
  revalidateCatalog();
  redirect(`/admin/products?created=${created.id}`);
}

