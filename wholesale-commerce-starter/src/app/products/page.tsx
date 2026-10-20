import Link from "next/link";
import { CatalogPager } from "../../components/storefront/catalog-pager";
import { ImageShot } from "../../components/storefront/image-shot";
import { ProductFinder } from "../../components/storefront/product-finder";
import { ProductGrid } from "../../components/storefront/product-grid";
import { StorefrontShell } from "../../components/storefront/shell";
import { EDITORIAL } from "../../components/storefront/visuals";
import { StorefrontUnavailable } from "../../components/system/storefront-unavailable";
import { fetchStorefrontCategoryCards } from "../../lib/catalog/categories";
import { fetchStorefrontProducts } from "../../lib/catalog/products";
import { safeApiCall } from "../../lib/odoo/safe";
import { flattenCategories } from "../../lib/catalog/flatten";
import {
  parseCatalogPage,
  parseCatalogSort,
  storefrontCatalogHref,
  type FinderQuery,
} from "../../lib/catalog/filters";
import { STOREFRONT_PROMOS } from "../../lib/content/promos";
import { listOdooBrands } from "../../lib/odoo/catalog";
export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<FinderQuery>;
}) {
  const query = await searchParams;
  const term = query.q?.trim();
  const page = parseCatalogPage(query.page);
  const sort = parseCatalogSort(query.sort);

  const catalog = await safeApiCall(async () => {
    const [listed, categories, brands] = await Promise.all([
      fetchStorefrontProducts({
        q: term,
        category: query.category,
        brand: query.brand,
        inStock: query.availability === "in-stock" ? true : undefined,
        minMoq: query.min_moq ? Number(query.min_moq) : undefined,
        maxMoq: query.max_moq ? Number(query.max_moq) : undefined,
        sort,
        page,
      }),
      fetchStorefrontCategoryCards(),
      listOdooBrands(),
    ]);
    
    return { listed, categories, brands };
  });
  if (!catalog.ok) return <StorefrontUnavailable />;
  const { listed, categories, brands } = catalog.data;
  const products = listed.items;
  const pagination = listed.pagination;
  const tree = flattenCategories(categories);
  const active = Boolean(
    query.category ||
    query.brand ||
    query.price ||
    query.min_moq ||
    query.max_moq ||
    query.availability ||
    query.view ||
    term ||
    sort
  );
  return (
    <StorefrontShell>
      <main className="sf-page">
        <header className="sf-page-banner">
          <ImageShot src={EDITORIAL.night} alt="" sizes="100vw" priority preset="campaign" className="sf-fill" />
          <div className="sf-page-top">
            <h1 className="sf-page-title">
              {term ? "Results" : query.sort === "newest" ? "Just in" : "Catalog"}
            </h1>
            <p className="sf-count">{String(pagination.total).padStart(2, "0")} items</p>
          </div>
        </header>
        <div className="sf-page-body">
          {term && <p className="sf-heading-meta"><span>Search</span><span>{term}</span></p>}
          <nav className="sf-controls" aria-label="Browse collections">
            <Link className={!query.view && !query.category ? "is-active" : ""} href="/products">All</Link>
            <Link
              className={query.sort === "newest" ? "is-active" : ""}
              href="/products?sort=newest"
            >
              New
            </Link>
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
          <CatalogPager
            pagination={pagination}
            hrefForPage={(nextPage) => storefrontCatalogHref("/products", query, { page: String(nextPage) })}
          />
        </div>
      </main>
    </StorefrontShell>
  );
}
