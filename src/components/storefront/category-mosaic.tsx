import Link from "next/link";
import type { StorefrontCategoryCard } from "../../lib/storefront-types";
import { ImageShot } from "./image-shot";
import { EDITORIAL } from "./visuals";

export function CategoryMosaic({
  categories,
  limit = 6,
  variant = "square",
}: {
  categories: StorefrontCategoryCard[];
  limit?: number;
  variant?: "circle" | "square";
}) {
  const rows = categories.slice(0, limit);
  if (!rows.length) return null;

  return (
    <div className={`sf-cat-mosaic is-${variant}`}>
      {rows.map((category) => (
        <Link
          key={category.id}
          className="sf-cat-card"
          href={`/categories/${category.slug}`}
        >
          <div className="sf-cat-card-media">
            <ImageShot
              src={category.image || EDITORIAL.oil}
              alt={category.name}
              seed={category.slug}
              sizes={variant === "circle" ? "(max-width: 900px) 30vw, 12vw" : "(max-width: 900px) 50vw, 32vw"}
              preset="category-card"
              categorySlug={category.slug}
              fitMode={category.imageFraming?.fitMode}
              focalX={category.imageFraming?.focalX}
              focalY={category.imageFraming?.focalY}
              scale={category.imageFraming?.scale}
              className="sf-fill"
            />
          </div>
          <div className="sf-cat-card-meta">
            <h3>{category.name}</h3>
            <p>{category.productCount ? `${category.productCount} products` : "Collection"}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
