import Link from "next/link";
import { CategoryMosaic } from "../components/storefront/category-mosaic";
import { CinematicHero } from "../components/storefront/cinematic-hero";
import { HowItWorks } from "../components/storefront/how-it-works";
import { ProductDiscovery } from "../components/storefront/product-discovery";
import { ProductFinder } from "../components/storefront/product-finder";
import { SourcingStory } from "../components/storefront/sourcing-story";
import { StorefrontShell } from "../components/storefront/shell";
import { WholesaleCta } from "../components/storefront/wholesale-cta";
import { fetchStorefrontCategoryCards } from "../lib/api/categories";
import { fetchStorefrontProducts } from "../lib/api/products";
import { safeApiCall } from "../lib/api/safe";
import { StorefrontUnavailable } from "../components/system/storefront-unavailable";
import { SHOT } from "../lib/shots";
import { STOREFRONT_PROMOS } from "../lib/storefront-promos";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = await safeApiCall(async () => {
    const [products, categories] = await Promise.all([
      fetchStorefrontProducts(),
      fetchStorefrontCategoryCards(),
    ]);
    return { products, categories };
  });
  if (!catalog.ok) return <StorefrontUnavailable />;
  const { products, categories } = catalog.data;
  const roots = categories.filter((category) => !category.parentId);
  const collections = roots.slice(0, 4).map((category, index) => ({
    index: String(index + 1).padStart(2, "0"),
    name: category.name,
    href: `/categories/${category.slug}`,
  }));
  const homeHero = categories.find((category) => category.slug === "basic-fruits" || category.slug === "fresh-produce") ?? roots[0];
  const offerSlugs = new Set(STOREFRONT_PROMOS.flatMap((promo) => [promo.productSlug, promo.categorySlug].filter(Boolean)));
  const bestSellers = products.filter((product) => product.isFeatured || product.inStock).slice(0, 6);
  const newArrivals = (products.filter((product) => product.isNew).length ? products.filter((product) => product.isNew) : products).slice(0, 6);
  const offers = products.filter((product) => offerSlugs.has(product.slug) || offerSlugs.has(product.category.slug)).slice(0, 6);

  return (
    <StorefrontShell transparentHeader>
      <CinematicHero
        collections={collections}
        focalX={homeHero?.heroFocalX}
        focalY={homeHero?.heroFocalY}
        frameScale={homeHero?.heroScale}
      />

      <section className="sf-section is-browse" id="discover">
        <h2 className="sf-section-title">Shop by category</h2>
        <CategoryMosaic categories={roots} variant="circle" />
        <Link className="sf-text-link sf-more-link" href="/products">View all collections</Link>
      </section>

      <ProductDiscovery
        bestSellers={bestSellers}
        newArrivals={newArrivals}
        offers={offers.length ? offers : bestSellers.slice(0, 3)}
        promo={STOREFRONT_PROMOS[0]}
      />

      <ProductFinder categories={roots} />
      <HowItWorks />
      <SourcingStory src={SHOT.citrusMacro} />
      <WholesaleCta />
    </StorefrontShell>
  );
}
