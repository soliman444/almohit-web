import type { StorefrontProduct } from "./storefront-types";

export type FinderQuery = {
  category?: string;
  brand?: string;
  price?: string;
  moq?: string;
  availability?: string;
  view?: string;
  q?: string;
};

export function applyFinderFilters(products: StorefrontProduct[], query: FinderQuery) {
  return products.filter((product) => {
    if (query.view === "new" && !product.isNew) return false;
    if (query.category && product.category.slug !== query.category) return false;
    if (query.brand && product.brand?.slug !== query.brand) return false;
    if (query.availability === "in-stock" && !product.inStock) return false;
    if (query.moq === "5" && product.minOrderQuantity > 5) return false;
    if (query.moq === "10" && product.minOrderQuantity > 10) return false;
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
