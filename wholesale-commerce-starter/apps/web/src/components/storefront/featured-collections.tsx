import Link from "next/link";
import type { StorefrontCategoryCard } from "../../lib/storefront-types";
import { ImageShot } from "./image-shot";
import { SectionHeading } from "./section-heading";
import { EDITORIAL } from "./visuals";

export function FeaturedCollections({ categories }: { categories: StorefrontCategoryCard[] }) {
  const rows = categories.slice(0, 3);
  if (!rows.length) return null;

  return (
    <section className="sf-section is-collections" id="collections">
      <SectionHeading title="Featured collections" />
      <div className="sf-featured-cols">
        {rows.map((category, index) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className={`sf-featured-col ${index === 0 ? "is-lead" : ""}`}
          >
            <div className="sf-featured-col-media">
              <ImageShot
                src={category.image || EDITORIAL.citrus}
                alt={category.name}
                seed={category.slug}
                sizes={index === 0 ? "70vw" : "36vw"}
                preset="category-card"
                categorySlug={category.slug}
                fitMode={category.imageFraming?.fitMode}
                focalX={category.imageFraming?.focalX}
                focalY={category.imageFraming?.focalY}
                scale={category.imageFraming?.scale}
                className="sf-fill"
              />
            </div>
            <div>
              <p className="sf-kicker">{String(index + 1).padStart(2, "0")}</p>
              <h3>{category.name}</h3>
              <p>{category.description || "A collection in the wholesale catalog."}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
