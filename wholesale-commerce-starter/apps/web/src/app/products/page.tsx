import Link from "next/link";
import { ImageShot } from "../../components/storefront/image-shot";
import { ProductFinder } from "../../components/storefront/product-finder";
import { ProductGrid } from "../../components/storefront/product-grid";
import { StorefrontShell } from "../../components/storefront/shell";
import { EDITORIAL } from "../../components/storefront/visuals";
import { StorefrontUnavailable } from "../../components/system/storefront-unavailable";
import { fetchStorefrontCategoryCards } from "../../lib/api/categories";
import { fetchStorefrontProducts } from "../../lib/api/products";
import { safeApiCall } from "../../lib/api/safe";
import { flattenCategories } from "../../lib/catalog";
import { applyFinderFilters, type FinderQuery } from "../../lib/storefront-filters";
import { STOREFRONT_PROMOS } from "../../lib/storefront-promos";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<FinderQuery>;
}) {
  const query = await searchParams;
  const term = query.q?.trim();

  const catalog = await safeApiCall(async () => {
    const [allProducts, categories] = await Promise.all([
      fetchStorefrontProducts({ q: term }),
      fetchStorefrontCategoryCards(),
    ]);
    return { allProducts, categories };
  });
  if (!catalog.ok) return <StorefrontUnavailable />;
  const { allProducts, categories } = catalog.data;
  const tree = flattenCategories(categories);
  const products = applyFinderFilters(allProducts, query);
  const brands = [...new Map(allProducts.flatMap((product) => (product.brand ? [[product.brand.slug, product.brand]] : []))).values()];
  const active = Boolean(query.category || query.brand || query.price || query.moq || query.availability || query.view || term);

  return (
    <StorefrontShell>
      <main className="sf-page">
        <header className="sf-page-banner">
          <ImageShot src={EDITORIAL.night} alt="" sizes="100vw" priority preset="campaign" className="sf-fill" />
          <div className="sf-page-top">
            <h1 className="sf-page-title">{term ? "Results" : query.view === "new" ? "Just in" : "Catalog"}</h1>
            <p className="sf-count">{String(products.length).padStart(2, "0")} items</p>
          </div>
        </header>
        <div className="sf-page-body">
          {term && <p className="sf-heading-meta"><span>Search</span><span>{term}</span></p>}
          <nav className="sf-controls" aria-label="Browse collections">
            <Link className={!query.view && !query.category ? "is-active" : ""} href="/products">All</Link>
            <Link className={query.view === "new" ? "is-active" : ""} href="/products?view=new">New</Link>
            {tree.filter((category) => !category.parentId).map((category) => (
              <Link key={category.id} href={`/categories/${category.slug}`}>{category.name}</Link>
            ))}
          </nav>
          <ProductFinder categories={categories} brands={brands} query={query} compact />
          <ProductGrid
            products={products}
            variant="mixed"
            promo={active ? undefined : STOREFRONT_PROMOS[0]}
          />
        </div>
      </main>
    </StorefrontShell>
  );
}
