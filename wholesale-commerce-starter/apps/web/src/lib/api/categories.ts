import type { CategoryDetail } from "@almohit/contracts";
import type { StorefrontCategoryCard } from "../storefront-types";
import {
  applyFirstProductCategoryImages,
  listOdooCategories,
  listOdooProducts,
  parseOdooRecordId,
} from "../odoo/catalog";

export async function fetchStorefrontCategoryCards(): Promise<StorefrontCategoryCard[]> {
  const [categories, listed] = await Promise.all([
    listOdooCategories(),
    listOdooProducts(),
  ]);
  return applyFirstProductCategoryImages(categories, listed.items);
}

export async function fetchStorefrontCategory(slug: string): Promise<CategoryDetail | null> {
  const id = parseOdooRecordId(slug);
  if (id == null) return null;
  const categories = await fetchStorefrontCategoryCards();
  const category = categories.find((item) => item.id === String(id));
  if (!category) return null;
  return {
    id: category.id,
    parentId: category.parentId,
    name: category.name,
    slug: category.slug,
    description: category.description,
    heroVideoUrl: null,
    heroPosterUrl: category.image,
  };
}
