export type StorefrontPromo = {
  id: string;
  eyebrow: string;
  title: string;
  copy: string;
  href: string;
  badge?: string;
  discountLabel?: string;
  tone: "light" | "dark" | "accent";
  categorySlug?: string;
  productSlug?: string;
};

export const STOREFRONT_PROMOS: StorefrontPromo[] = [
  {
    id: "season-open",
    eyebrow: "Limited window",
    title: "Season opening cases.",
    copy: "A short run of fruit that is ready to move this week.",
    href: "/products?view=new",
    badge: "New season",
    discountLabel: "Trade offer",
    tone: "dark",
  },
  {
    id: "citrus-run",
    eyebrow: "Collection offer",
    title: "Citrus on a tight clock.",
    copy: "A short window on the citrus line.",
    href: "/categories/citrus-fruits",
    badge: "15%",
    discountLabel: "Sample offer",
    tone: "accent",
    categorySlug: "citrus-fruits",
  },
  {
    id: "desert-dates",
    eyebrow: "Floor special",
    title: "Dates while the pallet lasts.",
    copy: "Limited cases from Desert Fruits, while the pallet lasts.",
    href: "/products/fresh-barhi-dates",
    badge: "Limited",
    discountLabel: "While stock lasts",
    tone: "light",
    categorySlug: "desert-fruits",
    productSlug: "fresh-barhi-dates",
  },
];

export function promoForProduct(slug: string) {
  return STOREFRONT_PROMOS.find((item) => item.productSlug === slug) ?? null;
}

export function promoForCategory(slug: string) {
  return STOREFRONT_PROMOS.find((item) => item.categorySlug === slug) ?? STOREFRONT_PROMOS[0];
}
