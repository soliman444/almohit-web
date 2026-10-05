import Link from "next/link";
import { ImageShot } from "../../components/storefront/image-shot";
import { ProductFinder } from "../../components/storefront/product-finder";
import { ProductGrid } from "../../components/storefront/product-grid";
import { StorefrontShell } from "../../components/storefront/shell";
import { EDITORIAL } from "../../components/storefront/visuals";
import { getCurrentUser } from "../../lib/auth";
import { flattenCategories, listStorefrontCategoryCards, listStorefrontProducts } from "../../lib/catalog";
import { applyFinderFilters, type FinderQuery } from "../../lib/storefront-filters";
import { STOREFRONT_PROMOS } from "../../lib/storefront-promos";
import type { Prisma } from "../../../generated/prisma/client";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<FinderQuery>;
}) {
  const user = await getCurrentUser();
  const query = await searchParams;
  const term = query.q?.trim();
  const searchWhere: Prisma.ProductWhereInput = term
    ? {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { sku: { contains: term, mode: "insensitive" } },
          { shortDescription: { contains: term, mode: "insensitive" } },
          { category: { name: { contains: term, mode: "insensitive" } } },
          { brand: { name: { contains: term, mode: "insensitive" } } },
        ],
      }
    : {};

  const [allProducts, categories] = await Promise.all([
    listStorefrontProducts(user, searchWhere),
    listStorefrontCategoryCards(),
  ]);
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
