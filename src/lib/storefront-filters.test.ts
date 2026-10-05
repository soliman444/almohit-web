import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyFinderFilters } from "./storefront-filters";
import type { StorefrontProduct } from "./storefront-types";

function product(partial: Partial<StorefrontProduct> & Pick<StorefrontProduct, "id" | "slug">): StorefrontProduct {
  return {
    name: partial.name ?? partial.slug,
    sku: partial.sku ?? partial.slug,
    shortDescription: null,
    description: null,
    minOrderQuantity: 1,
    isFeatured: false,
    isNew: false,
    productType: "SIMPLE",
    category: { id: "c1", name: "Citrus Fruits", slug: "citrus-fruits" },
    brand: { id: "b1", name: "Almohit", slug: "almohit" },
    media: [],
    inStock: true,
    price: null,
    ...partial,
  };
}

describe("storefront finder filters", () => {
  const catalog = [
    product({ id: "1", slug: "lemon", minOrderQuantity: 8, inStock: true, isNew: true, price: null }),
    product({
      id: "2",
      slug: "dates",
      minOrderQuantity: 12,
      inStock: false,
      category: { id: "c2", name: "Desert Fruits", slug: "desert-fruits" },
      brand: { id: "b2", name: "Desert", slug: "desert" },
      price: { amount: "90.00", currency: "USD" },
    }),
  ];

  it("filters by category, stock, and MOQ without inventing prices", () => {
    const next = applyFinderFilters(catalog, { category: "citrus-fruits", availability: "in-stock", moq: "10" });
    assert.deepEqual(next.map((item) => item.slug), ["lemon"]);
  });

  it("applies price bands only when a product already has an authorized price", () => {
    const hidden = applyFinderFilters(catalog, { price: "80-plus" });
    assert.equal(hidden.some((item) => item.slug === "lemon"), true);
    const priced = applyFinderFilters(
      catalog.map((item) => item),
      { price: "80-plus" },
    ).filter((item) => item.price);
    assert.deepEqual(priced.map((item) => item.slug), ["dates"]);
  });
});
