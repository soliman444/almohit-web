import type { StorefrontProduct } from "../storefront-types";
import {
  filterOdooProducts,
  getOdooProduct,
  listOdooCategories,
  listOdooProducts,
  parseOdooRecordId,
} from "../odoo/catalog";

export async function fetchStorefrontProducts(query: {
  q?: string;
  category?: string;
  brand?: string;
  includeDescendants?: boolean;
} = {}): Promise<StorefrontProduct[]> {
  const needsCategoryTree = Boolean(query.category && query.includeDescendants);
  const [products, categories] = await Promise.all([
    listOdooProducts(),
    needsCategoryTree ? listOdooCategories() : Promise.resolve([]),
  ]);
  return filterOdooProducts(products, query, categories);
}

export async function fetchStorefrontProduct(slug: string): Promise<StorefrontProduct | null> {
  const id = parseOdooRecordId(slug);
  if (id == null) return null;
  return getOdooProduct(id);
}

export async function fetchRelatedProducts(slug: string): Promise<StorefrontProduct[]> {
  const id = parseOdooRecordId(slug);
  if (id == null) return [];
  const products = await listOdooProducts();
  const current = products.find((product) => product.id === String(id));
  if (!current) return [];
  return products
    .filter((product) => product.id !== current.id && product.category.id === current.category.id)
    .slice(0, 4);
}
