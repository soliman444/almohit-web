import type { StorefrontPromo } from "../content/promos";
import { STOREFRONT_PROMOS } from "../content/promos";
import type { StorefrontCategoryCard, StorefrontProduct } from "./types";

function descendantIds(categories: StorefrontCategoryCard[], rootId: string) {
  const ids = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        grew = true;
      }
    }
  }
  return ids;
}

export function homeCatalogSlices(
  products: StorefrontProduct[],
  categories: StorefrontCategoryCard[],
) {
  const roots = categories.filter((category) => !category.parentId);
  const featured = products.filter((product) => product.isFeatured);
  const newest = products.filter((product) => product.isNew);
  const inStock = products.filter((product) => product.inStock);
  const brands = [...new Map(
    products.flatMap((product) => (product.brand ? [[product.brand.slug, product.brand]] : [])),
  ).values()];

  const promoMatches = products.filter((product) =>
    STOREFRONT_PROMOS.some((promo) =>
      promo.productSlug === product.slug || promo.categorySlug === product.category.slug,
    ),
  );
  const offerPool = inStock.length ? inStock : products;
  const offerOffset = offerPool.slice(2, 10);
  const offerProducts = (
    promoMatches.length ? promoMatches : offerOffset.length ? offerOffset : offerPool
  ).slice(0, 8);

  const collections = roots.slice(0, 4).map((category, index) => ({
    index: String(index + 1).padStart(2, "0"),
    name: category.name,
    href: `/categories/${category.slug}`,
  }));

  const categoryRails = roots.slice(0, 3).flatMap((category, index) => {
    const ids = descendantIds(categories, category.id);
    const items = products.filter((product) => ids.has(product.category.id)).slice(0, 6);
    if (items.length < 2) return [];
    return [{
      category,
      products: items,
      index: String(index + 4).padStart(2, "0"),
    }];
  });

  const spotlight = featured[0] ?? inStock[0] ?? products[0] ?? null;
  const promos = livePromos(roots, spotlight);

  return {
    roots,
    brands,
    collections,
    bestSellers: (featured.length ? featured : inStock.length ? inStock : products).slice(0, 8),
    newArrivals: (newest.length ? newest : [...products].reverse()).slice(0, 8),
    offerProducts,
    promos,
    categoryRails,
    spotlight,
  };
}

function livePromos(
  roots: StorefrontCategoryCard[],
  spotlight: StorefrontProduct | null,
): StorefrontPromo[] {
  const leadCategory = roots[0];
  const secondCategory = roots[1] ?? leadCategory;
  return [
    {
      ...STOREFRONT_PROMOS[0],
      href: "/products?view=new",
    },
    {
      ...STOREFRONT_PROMOS[1],
      title: secondCategory ? `${secondCategory.name} on a tight clock.` : STOREFRONT_PROMOS[1].title,
      copy: secondCategory
        ? `A short window on the ${secondCategory.name} line.`
        : STOREFRONT_PROMOS[1].copy,
      href: secondCategory ? `/categories/${secondCategory.slug}` : "/products",
      categorySlug: secondCategory?.slug,
    },
    {
      ...STOREFRONT_PROMOS[2],
      title: spotlight ? `${spotlight.name} while stock lasts.` : STOREFRONT_PROMOS[2].title,
      href: spotlight ? `/products/${spotlight.slug}` : "/products",
      productSlug: spotlight?.slug,
      categorySlug: spotlight?.category.slug,
    },
  ];
}
