import { getOdooApiUrl } from "./config";
import { rewriteOdooImageUrl } from "./images";
import { odooStaffRequest } from "./staff";
import type { OdooAdminAttribute, OdooAdminBrand, OdooAdminCategory } from "./admin-products";

export type OdooAdminCategoryRow = OdooAdminCategory & {
  parent_name?: string | null;
  product_count?: number;
};

export type OdooAdminBrandRow = OdooAdminBrand & {
  active?: boolean;
  product_count?: number;
  image_url?: string | null;
};

export type OdooAdminCatalogStats = {
  products: number;
  categories: number;
  brands: number;
  attributes: number;
};

export async function listOdooAdminCategories(): Promise<OdooAdminCategoryRow[]> {
  return odooStaffRequest<OdooAdminCategoryRow[]>("/admin/categories", { method: "GET" });
}

export async function listOdooAdminBrands(): Promise<OdooAdminBrandRow[]> {
  const rows = await odooStaffRequest<OdooAdminBrandRow[]>("/admin/brands", { method: "GET" });
  return rows.map((row) => ({ ...row, image_url: rewriteOdooImageUrl(row.image_url) }));
}

export async function listOdooAdminAttributes(): Promise<OdooAdminAttribute[]> {
  return odooStaffRequest<OdooAdminAttribute[]>("/admin/attributes", { method: "GET" });
}

export async function getOdooAdminCatalogStats(): Promise<OdooAdminCatalogStats> {
  return odooStaffRequest<OdooAdminCatalogStats>("/admin/catalog-stats", { method: "GET" });
}

export function categoryParentOptions(categories: OdooAdminCategoryRow[]) {
  return categories
    .slice()
    .sort((left, right) => (left.complete_name || left.name).localeCompare(right.complete_name || right.name))
    .map((category) => ({
      id: String(category.id),
      name: category.complete_name || category.name,
      depth: (category.complete_name || category.name).split(" / ").length - 1,
    }));
}

export function odooBackendCategoryUrl(categoryId: number) {
  return `${getOdooApiUrl()}/web#id=${categoryId}&model=product.category&view_type=form`;
}

export function odooBackendBrandUrl(brandId: number) {
  return `${getOdooApiUrl()}/web#id=${brandId}&model=almohit.product.brand&view_type=form`;
}

export function odooBackendAttributeUrl(attributeId: number) {
  return `${getOdooApiUrl()}/web#id=${attributeId}&model=product.attribute&view_type=form`;
}
