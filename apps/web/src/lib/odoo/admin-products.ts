import { ApiClientError } from "../api/client";
import { getOdooApiUrl } from "./config";
import { rewriteOdooImageUrl } from "./images";
import { odooStaffRequest, staffCredentialsConfigured } from "./staff";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export type OdooAdminCategory = {
  id: number;
  name: string;
  complete_name?: string;
  parent_id?: number | null;
};

export type OdooAdminBrand = {
  id: number;
  name: string;
};

export type OdooAdminAttributeValue = {
  id: number;
  name: string;
};

export type OdooAdminAttribute = {
  id: number;
  name: string;
  create_variant?: string;
  values: OdooAdminAttributeValue[];
};

export type OdooAdminProductOptions = {
  categories: OdooAdminCategory[];
  brands: OdooAdminBrand[];
  attributes: OdooAdminAttribute[];
};

export type OdooAdminProductListItem = {
  id: number;
  name: string;
  sku: string;
  active: boolean;
  sale_ok: boolean;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  product_type: "SIMPLE" | "VARIABLE";
  detailed_type?: string;
  invoice_policy?: string;
  min_order_qty: number;
  variant_count: number;
  qty_available: number;
  in_stock: boolean;
  wholesale_price: number | null;
  wholesale_price_min?: number | null;
  wholesale_price_max?: number | null;
  cost: number | null;
  cost_min?: number | null;
  cost_max?: number | null;
  image_url: string | null;
  category: OdooAdminCategory | null;
  brand: OdooAdminBrand | null;
};

export type OdooAdminVariant = {
  id: number;
  sku: string;
  barcode: string | null;
  active: boolean;
  qty_available: number;
  wholesale_price: number | null;
  cost: number | null;
  image_url?: string | null;
  value_ids: number[];
  attributes: Array<{
    attribute_id: number;
    attribute: string;
    value_id: number;
    value: string;
  }>;
};

export type OdooAdminProductDetail = OdooAdminProductListItem & {
  description: string | null;
  barcode: string | null;
  gallery?: Array<string | null>;
  variants: OdooAdminVariant[];
};

export type OdooCreatedProduct = {
  id: number;
  variant_id: number | null;
  name: string;
  sku: string;
  active: boolean;
  variant_count?: number;
  product_type?: "SIMPLE" | "VARIABLE";
};

export type OdooAdminAttributeLineInput = {
  attributeId: number;
  valueIds: number[];
};

export type OdooAdminVariantInput = {
  valueIds: number[];
  sku?: string;
  barcode?: string;
  wholesalePrice?: number;
  cost?: number;
  quantity?: number;
  imageBase64?: string;
  imageContentType?: string;
};

export type OdooAdminImageInput = {
  imageBase64: string;
  imageContentType: string;
};

export type CreateOdooAdminProductInput = {
  name: string;
  sku?: string;
  description?: string;
  categoryId: number;
  brandId?: number;
  minOrderQty: number;
  saleOk: boolean;
  barcode?: string;
  wholesalePrice?: number;
  cost?: number;
  quantity?: number;
  imageBase64?: string;
  imageContentType?: string;
  gallery?: OdooAdminImageInput[];
  attributeLines?: OdooAdminAttributeLineInput[];
  variants?: OdooAdminVariantInput[];
};

export type OdooCreatedCategory = {
  id: number;
  name: string;
  complete_name?: string;
  parent: { id: number; name: string } | null;
};

export type OdooCreatedBrand = {
  id: number;
  name: string;
  active?: boolean;
};

export type OdooCreatedAttribute = OdooAdminAttribute;

export type AdminProductListQuery = {
  q?: string;
  categoryId?: string;
  status?: string;
  type?: string;
};

export function odooCreateProductPayload(input: CreateOdooAdminProductInput) {
  const body: Record<string, unknown> = {
    name: input.name,
    sku: input.sku || undefined,
    description: input.description || undefined,
    category_id: input.categoryId,
    brand_id: input.brandId,
    min_order_qty: input.minOrderQty,
    sale_ok: input.saleOk,
    barcode: input.barcode || undefined,
    wholesale_price: input.wholesalePrice,
    cost: input.cost,
    image_base64: input.imageBase64,
    image_content_type: input.imageContentType,
  };
  if (input.gallery?.length) {
    body.gallery = input.gallery.map((image) => ({
      image_base64: image.imageBase64,
      image_content_type: image.imageContentType,
    }));
  }
  if (!input.attributeLines?.length) {
    body.quantity = input.quantity;
    return body;
  }
  body.attribute_lines = input.attributeLines.map((line) => ({
    attribute_id: line.attributeId,
    value_ids: line.valueIds,
  }));
  if (input.variants?.length) {
    body.variants = input.variants.map((variant) => ({
      value_ids: variant.valueIds,
      sku: variant.sku || undefined,
      barcode: variant.barcode || undefined,
      wholesale_price: variant.wholesalePrice,
      cost: variant.cost,
      quantity: variant.quantity,
      image_base64: variant.imageBase64,
      image_content_type: variant.imageContentType,
    }));
  }
  return body;
}

export async function decodeAdminImage(file: File | null): Promise<{
  imageBase64?: string;
  imageContentType?: string;
}> {
  if (!file || file.size === 0) return {};
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new ApiClientError(400, "INVALID_IMAGE", "Image type is not allowed.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ApiClientError(400, "INVALID_IMAGE", "Image is missing or too large.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    imageBase64: buffer.toString("base64"),
    imageContentType: file.type,
  };
}

export async function decodeAdminImages(files: File[]): Promise<OdooAdminImageInput[]> {
  const images: OdooAdminImageInput[] = [];
  for (const file of files) {
    const decoded = await decodeAdminImage(file);
    if (decoded.imageBase64 && decoded.imageContentType) {
      images.push({ imageBase64: decoded.imageBase64, imageContentType: decoded.imageContentType });
    }
  }
  return images;
}

export function categorySelectOptions(categories: OdooAdminCategory[]) {
  return categories.map((category) => ({
    id: String(category.id),
    name: category.complete_name || category.name,
    depth: (category.complete_name || "").split(" / ").length - 1,
  }));
}

export function brandSelectOptions(brands: OdooAdminBrand[]) {
  return brands.map((brand) => ({
    id: String(brand.id),
    name: brand.name,
  }));
}

export function rewriteAdminProductImage(url: string | null | undefined) {
  return rewriteOdooImageUrl(url);
}

function requireStaffConfig() {
  if (!staffCredentialsConfigured()) {
    throw new ApiClientError(503, "STAFF_REQUIRED", "Odoo staff credentials are not configured.");
  }
}

export async function listOdooAdminProductOptions(): Promise<OdooAdminProductOptions> {
  requireStaffConfig();
  const options = await odooStaffRequest<OdooAdminProductOptions>("/admin/product-options", { method: "GET" });
  return {
    categories: options.categories ?? [],
    brands: options.brands ?? [],
    attributes: options.attributes ?? [],
  };
}

export async function listOdooAdminProducts(query: AdminProductListQuery = {}): Promise<OdooAdminProductListItem[]> {
  requireStaffConfig();
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.categoryId) params.set("category_id", query.categoryId);
  if (query.status) params.set("status", query.status);
  if (query.type) params.set("type", query.type);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return odooStaffRequest<OdooAdminProductListItem[]>(`/admin/products${suffix}`, { method: "GET" });
}

export async function withVariableWholesalePrices<T extends OdooAdminProductListItem>(products: T[]) {
  return Promise.all(products.map(async (product) => {
    if (product.product_type !== "VARIABLE") return product;
    try {
      const detail = await getOdooAdminProduct(product.id);
      return {
        ...product,
        variants: detail.variants.map((variant) => ({
          wholesale_price: variant.wholesale_price,
          cost: variant.cost,
        })),
      };
    } catch {
      return product;
    }
  }));
}

export async function getOdooAdminProduct(productId: number): Promise<OdooAdminProductDetail> {
  requireStaffConfig();
  return odooStaffRequest<OdooAdminProductDetail>(`/admin/products/${productId}`, { method: "GET" });
}

export async function createOdooAdminProduct(input: CreateOdooAdminProductInput): Promise<OdooCreatedProduct> {
  requireStaffConfig();
  const body = odooCreateProductPayload(input);
  return odooStaffRequest<OdooCreatedProduct>("/admin/products", {
    method: "POST",
    body,
  });
}

export async function createOdooAdminCategory(input: { name: string; parentId?: number }): Promise<OdooCreatedCategory> {
  requireStaffConfig();
  return odooStaffRequest<OdooCreatedCategory>("/admin/categories", {
    method: "POST",
    body: { name: input.name, parent_id: input.parentId },
  });
}

export async function createOdooAdminBrand(input: {
  name: string;
  imageBase64?: string;
  imageContentType?: string;
}): Promise<OdooCreatedBrand> {
  requireStaffConfig();
  return odooStaffRequest<OdooCreatedBrand>("/admin/brands", {
    method: "POST",
    body: {
      name: input.name,
      image_base64: input.imageBase64,
      image_content_type: input.imageContentType,
    },
  });
}

export async function createOdooAdminAttribute(input: { name: string; values: string[] }): Promise<OdooCreatedAttribute> {
  requireStaffConfig();
  return odooStaffRequest<OdooCreatedAttribute>("/admin/attributes", {
    method: "POST",
    body: { name: input.name, values: input.values },
  });
}

export async function addOdooAdminAttributeValues(attributeId: number, values: string[]): Promise<OdooCreatedAttribute> {
  requireStaffConfig();
  return odooStaffRequest<OdooCreatedAttribute>(`/admin/attributes/${attributeId}/values`, {
    method: "POST",
    body: { values },
  });
}

export function parseJsonField<T>(raw: string, fallback: T): T {
  if (!raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type AdminListPresentation = Pick<
  OdooAdminProductListItem,
  | "product_type"
  | "sku"
  | "variant_count"
  | "qty_available"
  | "wholesale_price"
  | "wholesale_price_min"
  | "wholesale_price_max"
  | "cost"
  | "cost_min"
  | "cost_max"
  | "status"
  | "brand"
> & {
  variants?: Array<{ wholesale_price: number | null; cost?: number | null }>;
};

function asMoney(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Number(value.toFixed(2));
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
  }
  return null;
}

export function formatAdminUsd(amount: number) {
  const money = asMoney(amount);
  return money == null ? "—" : `$${money.toFixed(2)}`;
}

export function adminProductTypeLabel(product: Pick<AdminListPresentation, "product_type" | "variant_count">) {
  if (product.product_type !== "VARIABLE") {
    return { primary: "Simple", secondary: null as string | null };
  }
  const count = Number.isFinite(product.variant_count) ? product.variant_count : 0;
  return {
    primary: "Variable",
    secondary: `${count} ${count === 1 ? "variant" : "variants"}`,
  };
}

export function adminProductSkuLabel(product: Pick<AdminListPresentation, "product_type" | "sku">) {
  const sku = product.sku?.trim();
  if (sku) return sku;
  if (product.product_type === "VARIABLE") return "Multiple variant SKUs";
  return "—";
}

export function adminProductBrandLabel(product: Pick<AdminListPresentation, "brand">) {
  const name = product.brand?.name?.trim();
  return name || "No brand";
}

export function adminProductStockLabel(product: Pick<AdminListPresentation, "product_type" | "qty_available">) {
  const qty = Number(product.qty_available);
  if (!Number.isFinite(qty) || qty <= 0) return "Out of stock";
  const amount = Number.isInteger(qty) ? String(qty) : String(Number(qty.toFixed(2)));
  if (product.product_type === "VARIABLE") return `${amount} units total`;
  return `${amount} units`;
}

function wholesalePricesFromList(product: AdminListPresentation) {
  const fromVariants = (product.variants ?? [])
    .map((variant) => asMoney(variant.wholesale_price))
    .filter((value): value is number => value != null);
  if (fromVariants.length > 0) return fromVariants;

  const min = asMoney(product.wholesale_price_min);
  const max = asMoney(product.wholesale_price_max);
  if (min != null || max != null) return [min, max].filter((value): value is number => value != null);

  const single = asMoney(product.wholesale_price);
  return single == null ? [] : [single];
}

export function adminProductWholesaleLabel(product: AdminListPresentation) {
  const prices = wholesalePricesFromList(product);
  if (prices.length === 0) return "—";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return formatAdminUsd(min);
  return `${formatAdminUsd(min)} – ${formatAdminUsd(max)}`;
}

function costsFromList(product: AdminListPresentation) {
  const fromVariants = (product.variants ?? [])
    .map((variant) => asMoney(variant.cost))
    .filter((value): value is number => value != null);
  if (fromVariants.length > 0) return fromVariants;

  const min = asMoney(product.cost_min);
  const max = asMoney(product.cost_max);
  if (min != null || max != null) return [min, max].filter((value): value is number => value != null);

  const single = asMoney(product.cost);
  return single == null ? [] : [single];
}

export function adminProductCostLabel(product: AdminListPresentation) {
  const costs = costsFromList(product);
  if (costs.length === 0) return "—";
  const min = Math.min(...costs);
  const max = Math.max(...costs);
  if (min === max) return formatAdminUsd(min);
  return `${formatAdminUsd(min)} – ${formatAdminUsd(max)}`;
}

export function adminProductStatusLabel(status: OdooAdminProductListItem["status"] | string) {
  if (status === "ACTIVE") return "Active";
  if (status === "INACTIVE") return "Not saleable";
  if (status === "ARCHIVED") return "Archived";
  return status;
}

export function odooBackendProductUrl(productId: number) {
  return `${getOdooApiUrl()}/web#id=${productId}&model=product.template&view_type=form`;
}
