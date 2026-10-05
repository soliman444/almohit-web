"use client";

import Link from "next/link";
import type { StorefrontCategoryCard } from "../../lib/storefront-types";
import { ImageShot } from "./image-shot";
import { EDITORIAL } from "./visuals";

function hrefFor(category: StorefrontCategoryCard) {
  if (category.id === "new") return "/products?view=new";
  if (category.id === "catalog") return "/products";
  return `/categories/${category.slug}`;
}

export function CategoryDiscovery({ categories }: { categories: StorefrontCategoryCard[] }) {
  const roots = categories.filter((category) => !category.parentId);
  const base = (roots.length ? roots : categories).slice(0, 6);
  const rows = base.length
    ? base
    : [
        { id: "new", parentId: null, name: "New products", slug: "new", description: null, sortOrder: 0, productCount: 0, image: EDITORIAL.citrus },
        { id: "catalog", parentId: null, name: "Catalog", slug: "catalog", description: null, sortOrder: 1, productCount: 0, image: EDITORIAL.oil },
      ];

  return (
    <section className="sf-discover-wrap" id="discover">
      <header className="sf-band">
        <div>
          <p className="sf-band-kicker">Latest</p>
          <h2>Collections</h2>
        </div>
        <Link className="sf-text-link" href="/products">View catalog</Link>
      </header>
      <div className="sf-nominees">
        {rows.map((category) => (
          <article key={category.id}>
            <Link className="sf-nominee" href={hrefFor(category)}>
              <div className="sf-nominee-media">
                <ImageShot
                  src={category.image || EDITORIAL.oil}
                  alt={category.name}
                  seed={category.slug}
                  sizes="40vw"
                  preset="category-card"
                  categorySlug={category.slug}
                  fitMode={category.imageFraming?.fitMode}
                  focalX={category.imageFraming?.focalX}
                  focalY={category.imageFraming?.focalY}
                  scale={category.imageFraming?.scale}
                  className="sf-fill"
                />
                <span className="sf-nominee-open">Open</span>
              </div>
              <div className="sf-nominee-meta">
                <h3>{category.name}</h3>
                <p>by Almohit · {category.productCount ? `${category.productCount} products` : "Collection"}</p>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
