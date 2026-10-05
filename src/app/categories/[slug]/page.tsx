import { notFound } from "next/navigation";
import { CategoryHero } from "../../../components/storefront/category-hero";
import { CategoryMosaic } from "../../../components/storefront/category-mosaic";
import { DealBanner } from "../../../components/storefront/promo-system";
import { ProductGrid } from "../../../components/storefront/product-grid";
import { SectionHeading } from "../../../components/storefront/section-heading";
import { SourcingStory } from "../../../components/storefront/sourcing-story";
import { StorefrontShell } from "../../../components/storefront/shell";
import { resolveCategoryHero } from "../../../lib/category-heroes";
import { getCurrentUser } from "../../../lib/auth";
import { collectCategoryAndDescendantIds, getStorefrontCategory, listStorefrontCategoryCards, listStorefrontProducts } from "../../../lib/catalog";
import { promoForCategory } from "../../../lib/storefront-promos";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const category = await getStorefrontCategory(slug);
  if (!category) notFound();

  const [ids, cards] = await Promise.all([
    collectCategoryAndDescendantIds(category.id),
    listStorefrontCategoryCards(),
  ]);
  const products = await listStorefrontProducts(user, { categoryId: { in: ids } });
  const card = cards.find((item) => item.id === category.id);
  const configuredHero = resolveCategoryHero(category.slug, {
    title: category.name,
    subtitle: category.description,
    image: card?.image,
  });
  const hero = category.heroVideoUrl
    ? {
        ...configuredHero,
        mode: "video-loop" as const,
        video: category.heroVideoUrl,
        poster: category.heroPosterUrl || configuredHero.poster || card?.image || undefined,
      }
    : {
        ...configuredHero,
        poster: category.heroPosterUrl || configuredHero.poster,
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
        productCount={card?.productCount ?? products.length}
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
        <SectionHeading title="All products" copy={`${products.length} items in this collection.`} />
        <ProductGrid products={products} variant="catalog" />
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
