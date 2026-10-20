import { cache } from "react";
import type { MoneyAmount } from "@/types/contracts";
import { ApiClientError } from "./errors";
import { odooRequest } from "./client";
import { rewriteOdooImageUrl } from "./images";
import type { OdooCookieAdapter } from "./types";

export type MediaFraming = {
  fitMode?: "AUTO" | "COVER" | "CONTAIN" | null;
  focalX?: number | null;
  focalY?: number | null;
  scale?: number | null;
};

export type StorefrontCategoryCard = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  productCount: number;
  image: string | null;
  imageFraming?: MediaFraming | null;
  heroFocalX?: number | null;
  heroFocalY?: number | null;
  heroScale?: number | null;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  minOrderQuantity: number;
  isFeatured: boolean;
  isNew: boolean;
  productType: "SIMPLE" | "VARIABLE";
  category: { id: string; name: string; slug: string };
  brand: { id: string; name: string; slug: string } | null;
  media: Array<{
    id: string;
    type: string;
    isPrimary: boolean;
    fitMode?: "AUTO" | "COVER" | "CONTAIN" | null;
    focalX?: number | null;
    focalY?: number | null;
    visualScale?: number | null;
    media: { id: string; filePath: string; fileType: string; altText: string | null };
  }>;
  inStock: boolean;
  availableQuantity?: number;
  price: { amount: string; currency: string } | null;
  attributes?: Array<{
    id: string;
    name: string;
    type: "TEXT" | "COLOR" | "SELECT";
    values: Array<{ id: string; value: string; colorHex: string | null }>;
  }>;
  variants?: Array<{
    id: string;
    name: string;
    sku: string;
    inStock: boolean;
    availableQuantity?: number;
    valueIds: string[];
    imageUrl?: string | null;
    price?: { amount: string; currency: string };
  }>;
};

export const ODOO_PRICE_CURRENCY = "USD";

export type OdooCatalogQuery = {
  q?: string;
  category?: string;
  brand?: string;
  includeDescendants?: boolean;
};

export type OdooProductSort =
  | "name_asc"
  | "name_desc"
  | "newest"
  | "oldest";

export type OdooProductListParams = {
    page?: number;
    pageSize?: number;
    q?: string;
    categoryId?: number;
    includeChildren?: boolean;
    brandId?: number;
    inStock?: boolean;
    minMoq?: number;
    maxMoq?: number;
    sort?: OdooProductSort;
  };

export type StorefrontProductPagination = {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type StorefrontProductList = {
  items: StorefrontProduct[];
  pagination: StorefrontProductPagination;
};

type OdooNamedRef = {
  id: number;
  name: string;
  image_url?: string | null;
};

type OdooAvailability = {
  in_stock?: boolean;
  qty_available?: number;
};

type OdooVariantAttribute = {
  attribute: string;
  value: string;
};

export type OdooCatalogVariant = {
  id: number;
  default_code?: string | null;
  barcode?: string | null;
  attributes?: OdooVariantAttribute[];
  image_url?: string | null;
  availability?: OdooAvailability;
  price?: number;
};

export type OdooCatalogProduct = {
  id: number;
  name: string;
  default_code?: string | null;
  type?: string;
  category?: OdooNamedRef | null;
  brand?: OdooNamedRef | null;
  image_url?: string | null;
  min_order_qty?: number;
  availability?: OdooAvailability;
  uom?: OdooNamedRef | null;
  has_variants?: boolean;
  variants?: OdooCatalogVariant[];
  description?: string | null;
  barcode?: string | null;
  images?: string[];
  price?: number;
  currency?: string | null;
};

export type OdooCatalogCategory = {
  id: number;
  name: string;
  complete_name?: string;
  parent_id?: number | null;
};

export type OdooCatalogBrand = {
  id: number;
  name: string;
};

type OdooCatalogPagination = {
  page?: number;
  page_size?: number;
  total?: number;
  pages?: number;
  has_next?: boolean;
  has_previous?: boolean;
};

type OdooCatalogProductList = {
  items?: OdooCatalogProduct[];
  pagination?: OdooCatalogPagination;
};

export function parseOdooRecordId(value: string | null | undefined): number | null {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function hasOdooPriceKey(payload: object): boolean {
  return Object.prototype.hasOwnProperty.call(payload, "price");
}

export function mapOdooPrice(payload: object, currency?: string | null): MoneyAmount | undefined {
  if (!hasOdooPriceKey(payload)) return undefined;
  const value = (payload as { price?: unknown }).price;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const code = currency
    || (payload as { currency?: string | null }).currency
    || ODOO_PRICE_CURRENCY;
  return {
    amount: value.toFixed(2),
    currency: code,
  };
}

export function buildOdooProductQuery(params: OdooProductListParams = {}): string {
  const search = new URLSearchParams();

  const page = asPositiveInt(params.page);
  if (page && page > 1) {
    search.set("page", String(page));
  }

  const pageSize = asPositiveInt(params.pageSize);
  if (pageSize && pageSize !== 20) {
    search.set("page_size", String(Math.min(pageSize, 100)));
  }

  const q = params.q?.trim();
  if (q) {
    search.set("q", q);
  }

  const categoryId = asPositiveInt(params.categoryId);
  if (categoryId) {
    search.set("category_id", String(categoryId));

    if (params.includeChildren === true) {
      search.set("include_children", "true");
    }
  }

  const brandId = asPositiveInt(params.brandId);
  if (brandId) {
    search.set("brand_id", String(brandId));
  }

  if (params.inStock === true) {
    search.set("in_stock", "true");
  }

  const minMoq = asNonNegativeNumber(params.minMoq);
  if (minMoq !== null) {
    search.set("min_moq", String(minMoq));
  }

  const maxMoq = asNonNegativeNumber(params.maxMoq);
  if (maxMoq !== null) {
    search.set("max_moq", String(maxMoq));
  }

  if (
    params.sort === "name_asc" ||
    params.sort === "name_desc" ||
    params.sort === "newest" ||
    params.sort === "oldest"
  ) {
    search.set("sort", params.sort);
  }

  return search.toString();
}

const listOdooProductsByQuery = cache(async (
  queryString: string,
  cookies?: OdooCookieAdapter,
): Promise<StorefrontProductList> => {
  const path = queryString ? `/products?${queryString}` : "/products";
  const payload = await odooRequest<OdooCatalogProductList>(path, {
    method: "GET",
    cookies,
    captureSetCookie: false,
  });
  const items = (payload?.items ?? []).map(mapOdooProduct);
  return {
    items,
    pagination: mapOdooProductPagination(payload?.pagination, items.length),
  };
});

export async function listOdooProducts(
  params: OdooProductListParams = {},
  cookies?: OdooCookieAdapter,
): Promise<StorefrontProductList> {
  return listOdooProductsByQuery(buildOdooProductQuery(params), cookies);
}

export async function getOdooProduct(id: number, cookies?: OdooCookieAdapter): Promise<StorefrontProduct | null> {
  try {
    const payload = await odooRequest<OdooCatalogProduct>(`/products/${id}`, {
      method: "GET",
      cookies,
      captureSetCookie: false,
    });
    return payload ? mapOdooProduct(payload) : null;
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 404 || error.code === "PRODUCT_NOT_FOUND")) {
      return null;
    }
    throw error;
  }
}

export const listOdooCategories = cache(async (cookies?: OdooCookieAdapter): Promise<StorefrontCategoryCard[]> => {
  const payload = await odooRequest<OdooCatalogCategory[]>("/categories", {
    method: "GET",
    cookies,
    captureSetCookie: false,
  });
  return (payload ?? []).map(mapOdooCategory);
});
export const listOdooBrands = cache(async (
  cookies?: OdooCookieAdapter,
): Promise<Array<{ id: string; slug: string; name: string }>> => {
  const payload = await odooRequest<OdooCatalogBrand[]>("/brands", {
    method: "GET",
    cookies,
    captureSetCookie: false,
  });

  return (payload ?? []).map((brand) => ({
    id: String(brand.id),
    slug: String(brand.id),
    name: brand.name,
  }));
});

export function filterOdooProducts(
  products: StorefrontProduct[],
  query: OdooCatalogQuery = {},
  categories: StorefrontCategoryCard[] = [],
): StorefrontProduct[] {
  const term = query.q?.trim().toLowerCase();
  const categoryIds = query.category
    ? query.includeDescendants
      ? descendantCategoryIds(categories, query.category)
      : new Set([query.category])
    : null;

  return products.filter((product) => {
    if (term) {
      const haystack = `${product.name} ${product.sku}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    if (categoryIds && !categoryIds.has(product.category.id)) return false;
    if (query.brand && product.brand?.id !== query.brand && product.brand?.slug !== query.brand) return false;
    return true;
  });
}

export function mapOdooCategory(payload: OdooCatalogCategory): StorefrontCategoryCard {
  const id = String(payload.id);
  return {
    id,
    parentId: payload.parent_id != null ? String(payload.parent_id) : null,
    name: payload.name,
    slug: id,
    description: null,
    sortOrder: 0,
    productCount: 0,
    image: null,
  };
}

export function firstProductImage(product: StorefrontProduct): string | null {
  const main = product.media.find((item) => item.isPrimary) ?? product.media[0];
  if (main?.media.filePath) return main.media.filePath;
  return product.variants?.find((variant) => variant.imageUrl)?.imageUrl ?? null;
}

export function applyFirstProductCategoryImages(
  categories: StorefrontCategoryCard[],
  products: StorefrontProduct[],
): StorefrontCategoryCard[] {
  const firstByCategory = new Map<string, string>();
  for (const product of products) {
    const image = firstProductImage(product);
    if (!image || firstByCategory.has(product.category.id)) continue;
    firstByCategory.set(product.category.id, image);
  }

  return categories.map((category) => {
    const direct = firstByCategory.get(category.id);
    if (direct) return { ...category, image: direct };
    const descendants = descendantCategoryIds(categories, category.id);
    for (const product of products) {
      if (!descendants.has(product.category.id)) continue;
      const image = firstProductImage(product);
      if (image) return { ...category, image };
    }
    return category;
  });
}

export function mapOdooProduct(payload: OdooCatalogProduct): StorefrontProduct {
  const id = String(payload.id);
  const categoryId = payload.category ? String(payload.category.id) : "0";
  const categoryName = payload.category?.name ?? "";
  const price = mapOdooPrice(payload);
  const { attributes, variants } = mapOdooVariants(payload);
  const media = mapOdooMedia(payload);

  const product: StorefrontProduct = {
    id,
    name: payload.name,
    slug: id,
    sku: payload.default_code || id,
    shortDescription: null,
    description: payload.description ?? null,
    minOrderQuantity: typeof payload.min_order_qty === "number" ? payload.min_order_qty : 1,
    isFeatured: false,
    isNew: false,
    productType: payload.has_variants ? "VARIABLE" : "SIMPLE",
    category: {
      id: categoryId,
      name: categoryName,
      slug: categoryId,
    },
    brand: payload.brand
      ? {
          id: String(payload.brand.id),
          name: payload.brand.name,
          slug: String(payload.brand.id),
        }
      : null,
    media,
    inStock: Boolean(payload.availability?.in_stock),
    availableQuantity: asAvailableQty(payload.availability?.qty_available),
    price: price ?? null,
    attributes,
    variants,
  };

  return product;
}

function mapOdooMedia(payload: OdooCatalogProduct): StorefrontProduct["media"] {
  const urls = [
    rewriteOdooImageUrl(payload.image_url),
    ...(payload.images ?? []).map((url) => rewriteOdooImageUrl(url)),
  ].filter((url, index, list): url is string => Boolean(url) && list.indexOf(url) === index);

  return urls.map((filePath, index) => ({
    id: `${payload.id}-image-${index}`,
    type: index === 0 ? "MAIN" : "GALLERY",
    isPrimary: index === 0,
    media: {
      id: `${payload.id}-file-${index}`,
      filePath,
      fileType: "IMAGE",
      altText: payload.name,
    },
  }));
}

function mapOdooVariants(payload: OdooCatalogProduct): {
  attributes: NonNullable<StorefrontProduct["attributes"]>;
  variants: NonNullable<StorefrontProduct["variants"]>;
} {
  const source = payload.variants ?? [];
  const attributeValues = new Map<string, Map<string, { id: string; value: string; colorHex: string | null }>>();

  const variants = source.map((variant) => {
    const pairs = variant.attributes ?? [];
    for (const pair of pairs) {
      const attributeId = attributeKey(pair.attribute);
      const valueId = valueKey(pair.attribute, pair.value);
      const values = attributeValues.get(pair.attribute) ?? new Map();
      values.set(valueId, { id: valueId, value: pair.value, colorHex: null });
      attributeValues.set(pair.attribute, values);
    }

    const price = mapOdooPrice(variant, payload.currency);
    const mapped: NonNullable<StorefrontProduct["variants"]>[number] = {
      id: String(variant.id),
      name: pairs.map((pair) => pair.value).join(" / ") || (variant.default_code ?? String(variant.id)),
      sku: variant.default_code || String(variant.id),
      inStock: Boolean(variant.availability?.in_stock),
      availableQuantity: asAvailableQty(variant.availability?.qty_available),
      valueIds: pairs.map((pair) => valueKey(pair.attribute, pair.value)),
      imageUrl: rewriteOdooImageUrl(variant.image_url),
    };
    if (price) mapped.price = price;
    return mapped;
  });

  const attributes = [...attributeValues.entries()].map(([name, values]) => ({
    id: attributeKey(name),
    name,
    type: "SELECT" as const,
    values: [...values.values()],
  }));

  return { attributes, variants };
}

function asAvailableQty(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function asPositiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function asNonNegativeNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const n = typeof value === "number" ? value : Number(value);

  return Number.isFinite(n) && n >= 0 ? n : null;
}

function mapOdooProductPagination(
  payload: OdooCatalogPagination | null | undefined,
  itemCount: number,
): StorefrontProductPagination {
  const page = asPositiveInt(payload?.page) ?? 1;
  const pageSize = Math.min(asPositiveInt(payload?.page_size) ?? 20, 100);
  const total = typeof payload?.total === "number" && Number.isFinite(payload.total) && payload.total >= 0
    ? payload.total
    : itemCount;
  const pages = typeof payload?.pages === "number" && Number.isFinite(payload.pages) && payload.pages >= 0
    ? payload.pages
    : pageSize > 0
      ? Math.ceil(total / pageSize)
      : 0;
  return {
    page,
    pageSize,
    total,
    pages,
    hasNext: typeof payload?.has_next === "boolean" ? payload.has_next : page < pages,
    hasPrevious: typeof payload?.has_previous === "boolean" ? payload.has_previous : page > 1,
  };
}

function attributeKey(name: string) {
  return `attr:${name}`;
}

function valueKey(attribute: string, value: string) {
  return `val:${attribute}:${value}`;
}

function descendantCategoryIds(categories: StorefrontCategoryCard[], rootId: string) {
  const ids = new Set<string>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        added = true;
      }
    }
  }
  return ids;
}
