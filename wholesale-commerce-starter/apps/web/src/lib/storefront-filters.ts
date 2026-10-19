import type { OdooProductSort } from "./odoo/catalog";
import type { StorefrontProduct } from "./storefront-types";

export type FinderQuery = {
  category?: string;
  brand?: string;
  price?: string;
  min_moq?: string;
  max_moq?: string;
  availability?: string;
  view?: string;
  q?: string;
  page?: string;
  sort?: string;
};

const CATALOG_QUERY_KEYS = [
  "q",
  "category",
  "brand",
  "price",
  "min_moq",
  "max_moq",
  "availability",
  "view",
  "sort",
  "page",
] as const;

export function parseCatalogPage(value?: string): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function parseCatalogSort(value?: string): OdooProductSort | undefined {
  return value === "name_asc" ||
    value === "name_desc" ||
    value === "newest" ||
    value === "oldest"
    ? value
    : undefined;
}

export function storefrontCatalogHref(
  pathname: string,
  query: FinderQuery,
  overrides: Partial<FinderQuery> = {},
): string {
  const params = new URLSearchParams();
  const merged: FinderQuery = { ...query, ...overrides };
  for (const key of CATALOG_QUERY_KEYS) {
    const raw = merged[key]?.trim();
    if (!raw) continue;
    if (key === "page" && parseCatalogPage(raw) <= 1) continue;
    if (key === "sort" && !parseCatalogSort(raw)) continue;
    params.set(key, raw);
  }
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function applyFinderFilters(products: StorefrontProduct[], query: FinderQuery) {
  const hasNew = products.some((product) => product.isNew);
  return products.filter((product) => {
    if (query.view === "new" && hasNew && !product.isNew) return false;
    if (query.price && product.price) {
      const amount = Number(product.price.amount);
      if (!Number.isFinite(amount)) return true;
      if (query.price === "under-25" && amount >= 25) return false;
      if (query.price === "25-80" && (amount < 25 || amount > 80)) return false;
      if (query.price === "80-plus" && amount < 80) return false;
    }
    return true;
  });
}
