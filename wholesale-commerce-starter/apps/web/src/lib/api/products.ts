import type { StorefrontProduct } from "../storefront-types";
import {
  getOdooProduct,
  listOdooProducts,
  parseOdooRecordId,
  type OdooProductListParams,
  type StorefrontProductList,
} from "../odoo/catalog";

export async function fetchStorefrontProducts(
  query: OdooProductListParams & {
    category?: string;
    brand?: string;
  } = {},
): Promise<StorefrontProductList> {
  return listOdooProducts({
    page: query.page,
    pageSize: query.pageSize,
    q: query.q,
    categoryId: query.categoryId ?? parseOdooRecordId(query.category) ?? undefined,
    includeChildren: query.includeChildren,
    brandId: query.brandId ?? parseOdooRecordId(query.brand) ?? undefined,
    inStock: query.inStock,
    minMoq: query.minMoq,
    maxMoq: query.maxMoq,
    sort: query.sort,
  });
}

export async function fetchStorefrontProduct(slug: string): Promise<StorefrontProduct | null> {
  const id = parseOdooRecordId(slug);
  if (id == null) return null;
  return getOdooProduct(id);
}

export async function fetchRelatedProducts(slug: string): Promise<StorefrontProduct[]> {
  const id = parseOdooRecordId(slug);
  if (id == null) return [];
  const current = await getOdooProduct(id);
  if (!current) return [];
  const categoryId = parseOdooRecordId(current.category.id);
  const listed = await listOdooProducts(categoryId ? { categoryId } : {});
  return listed.items.filter((product) => product.id !== current.id).slice(0, 4);
}
