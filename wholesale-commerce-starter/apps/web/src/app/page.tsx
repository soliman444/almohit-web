import Link from "next/link";
import { BrandMoment } from "../components/storefront/brand-moment";
import { CampaignSplit } from "../components/storefront/campaign-split";
import { CategoryMosaic } from "../components/storefront/category-mosaic";
import { CinematicHero } from "../components/storefront/cinematic-hero";
import { FeaturedCollections } from "../components/storefront/featured-collections";
import { HowItWorks } from "../components/storefront/how-it-works";
import { ProductDiscovery } from "../components/storefront/product-discovery";
import { ProductFinder } from "../components/storefront/product-finder";
import { ProductRail } from "../components/storefront/product-rail";
import { OffersSection } from "../components/storefront/promo-system";
import { SourcingStory } from "../components/storefront/sourcing-story";
import { StorefrontShell } from "../components/storefront/shell";
import { WholesaleCta } from "../components/storefront/wholesale-cta";
import { fetchStorefrontCategoryCards } from "../lib/api/categories";
import { fetchStorefrontProducts } from "../lib/api/products";
import { safeApiCall } from "../lib/api/safe";
import { StorefrontUnavailable } from "../components/system/storefront-unavailable";
import { homeCatalogSlices } from "../lib/home-catalog";
import { primaryImage } from "../lib/storefront-media";
import { SHOT } from "../lib/shots";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = await safeApiCall(async () => {
    const [listed, categories] = await Promise.all([
      fetchStorefrontProducts(),
      fetchStorefrontCategoryCards(),
    ]);
    return { products: listed.items, productTotal: listed.pagination.total, categories };
  });
  if (!catalog.ok) return <StorefrontUnavailable />;
  const { products, productTotal, categories } = catalog.data;
  const home = homeCatalogSlices(products, categories);
  const homeHero = categories.find((category) => category.slug === "basic-fruits" || category.slug === "fresh-produce") ?? home.roots[0];

  return (
    <StorefrontShell transparentHeader>
      <CinematicHero
        collections={home.collections}
        focalX={homeHero?.heroFocalX}
        focalY={homeHero?.heroFocalY}
        frameScale={homeHero?.heroScale}
      />

      <section className="sf-section is-browse" id="discover">
        <h2 className="sf-section-title">Shop by category</h2>
        <p className="sf-heading-meta">
          <span>{String(productTotal).padStart(2, "0")} products</span>
          <span>{String(home.roots.length).padStart(2, "0")} collections</span>
        </p>
        <div className="sf-brand-options">
          {home.roots.map((category) => (
            <Link key={category.id} className="sf-pill" href={`/categories/${category.slug}`}>
              {category.name}
              {category.productCount > 0 ? ` · ${String(category.productCount).padStart(2, "0")}` : ""}
            </Link>
          ))}
          <Link className="sf-pill" href="/products?availability=in-stock">Ready to supply</Link>
          <Link className="sf-pill" href="/products?view=new">Just in</Link>
        </div>
        <CategoryMosaic categories={home.roots} variant="circle" />
        <Link className="sf-text-link sf-more-link" href="/products">View all collections</Link>
      </section>

      {home.roots.length > 0 ? <FeaturedCollections categories={home.roots} /> : null}

      <OffersSection promos={home.promos} />
      <ProductRail
        products={home.offerProducts}
        index="04"
        eyebrow="Trade offers"
        title="Cases on offer this week."
      />

      <ProductDiscovery
        bestSellers={home.bestSellers}
        newArrivals={home.newArrivals}
        offers={home.offerProducts.length ? home.offerProducts : home.bestSellers.slice(0, 3)}
        promo={home.promos[0]}
      />

      {home.spotlight ? <CampaignSplit product={home.spotlight} /> : null}

      {home.categoryRails.map((rail) => (
        <ProductRail
          key={rail.category.id}
          products={rail.products}
          index={rail.index}
          eyebrow={rail.category.name}
          title={`Shop ${rail.category.name}.`}
        />
      ))}

      {home.brands.length > 0 ? (
        <section className="sf-section is-browse" id="brands">
          <h2 className="sf-section-title">Shop by brand</h2>
          <div className="sf-brand-options">
            {home.brands.map((brand) => (
              <Link key={brand.slug} className="sf-pill" href={`/products?brand=${brand.slug}`}>
                {brand.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <ProductFinder categories={home.roots} brands={home.brands} />
      <BrandMoment src={home.spotlight ? primaryImage(home.spotlight)?.src : undefined} title="Seen before it is priced." />
      <HowItWorks />
      <SourcingStory src={SHOT.citrusMacro} />
      <WholesaleCta />
    </StorefrontShell>
  );
}
