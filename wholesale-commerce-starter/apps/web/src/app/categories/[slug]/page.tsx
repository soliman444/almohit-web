import { notFound } from "next/navigation";
import { CatalogPager } from "../../../components/storefront/catalog-pager";
import { CategoryHero } from "../../../components/storefront/category-hero";
import { CategoryMosaic } from "../../../components/storefront/category-mosaic";
import { DealBanner } from "../../../components/storefront/promo-system";
import { ProductGrid } from "../../../components/storefront/product-grid";
import { SectionHeading } from "../../../components/storefront/section-heading";
import { SourcingStory } from "../../../components/storefront/sourcing-story";
import { StorefrontShell } from "../../../components/storefront/shell";
import { resolveCategoryHero } from "../../../lib/category-heroes";
import { StorefrontUnavailable } from "../../../components/system/storefront-unavailable";
import { fetchStorefrontCategory, fetchStorefrontCategoryCards } from "../../../lib/api/categories";
import { fetchStorefrontProducts } from "../../../lib/api/products";
import { safeApiCall } from "../../../lib/api/safe";
import { parseCatalogPage, storefrontCatalogHref } from "../../../lib/storefront-filters";
import { promoForCategory } from "../../../lib/storefront-promos";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const page = parseCatalogPage(query.page);
  const loaded = await safeApiCall(async () => {
    const category = await fetchStorefrontCategory(slug);
    if (!category) return null;
    const [cards, listed] = await Promise.all([
      fetchStorefrontCategoryCards(),
      fetchStorefrontProducts({
        category: slug,
        includeChildren: true,
        page,
      }),
    ]);
    return { category, cards, listed };
  });
  if (!loaded.ok) return <StorefrontUnavailable />;
  if (!loaded.data) notFound();
  const { category, cards, listed } = loaded.data;
  const products = listed.items;
  const pagination = listed.pagination;
  const card = cards.find((item) => item.id === category.id);
  const configuredHero = resolveCategoryHero(category.slug, {
    title: category.name,
    subtitle: category.description,
    image: card?.image,
  });
  const productImage = category.heroPosterUrl || card?.image || undefined;
  const hero = category.heroVideoUrl
    ? {
        ...configuredHero,
        mode: "video-loop" as const,
        video: category.heroVideoUrl,
        poster: productImage || configuredHero.poster,
      }
    : {
        ...configuredHero,
        image: productImage || configuredHero.image,
        poster: productImage || configuredHero.poster,
      };
  const children = cards.filter((item) => item.parentId === category.id);
  const best = products.filter((product) => product.isFeatured).slice(0, 3);
  const related = cards.filter((item) => !item.parentId && item.id !== category.id).slice(0, 6);
  const promo = promoForCategory(category.slug);

  return (
    <StorefrontShell transparentHeader>
      <CategoryHero
        {...hero}
        slug={category.slug}
        productCount={pagination.total}
        focalX={category.heroFocalX}
        focalY={category.heroFocalY}
        frameScale={category.heroScale}
      />

      {children.length > 0 && (
        <section className="sf-section is-browse">
          <SectionHeading title="Subcategories" />
          <CategoryMosaic categories={children} limit={6} />
        </section>
      )}

      {best.length > 0 && (
        <section className="sf-section is-browse">
          <SectionHeading title="Best sellers" />
          <ProductGrid products={best} variant="selected" />
        </section>
      )}

      <section className="sf-section is-browse is-catalog">
        <SectionHeading title="All products" copy={`${pagination.total} items in this collection.`} />
        <ProductGrid products={products} variant="catalog" />
        <CatalogPager
          pagination={pagination}
          hrefForPage={(nextPage) => storefrontCatalogHref(`/categories/${slug}`, query, { page: String(nextPage) })}
        />
      </section>

      {promo && (
        <section className="sf-section is-offers">
          <DealBanner promo={promo} />
        </section>
      )}

      <SourcingStory
        src={card?.image || configuredHero.image || configuredHero.poster}
        title={category.name}
        copy={category.description || "A collection in the catalog. Prices appear after business approval."}
      />

      {related.length > 0 && (
        <section className="sf-section is-browse">
          <SectionHeading title="Related categories" />
          <CategoryMosaic categories={related} limit={6} />
        </section>
      )}
    </StorefrontShell>
  );
}
