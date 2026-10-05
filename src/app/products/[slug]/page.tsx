import { notFound } from "next/navigation";
import { ProductFacts } from "../../../components/storefront/product-facts";
import { ProductGallery } from "../../../components/storefront/product-gallery";
import { ProductInfoPanel } from "../../../components/storefront/product-info-panel";
import { ProductRelated } from "../../../components/storefront/product-related";
import { ProductSpecs } from "../../../components/storefront/product-specs";
import { ProductStoryBlock } from "../../../components/storefront/product-story-block";
import { StorefrontShell } from "../../../components/storefront/shell";
import { getCurrentUser } from "../../../lib/auth";
import { getStorefrontProduct, listRelatedProducts } from "../../../lib/catalog";
import { isApprovedBuyer } from "../../../lib/commerce";
import { commerceMessage } from "../../../lib/commerce-errors";
import { getDisplayCurrency } from "../../../lib/display-currency";
import { productShots } from "../../../lib/storefront-media";
import type { StorefrontProduct } from "../../../lib/storefront-types";

function productStory(product: StorefrontProduct) {
  const full = product.description?.trim() ?? "";
  const short = product.shortDescription?.trim() ?? "";
  if (full.length < 90) return null;
  if (short && full === short) return null;
  return full;
}

export default async function ProductDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cart?: string; error?: string }>;
}) {
  const { slug } = await params;
  const { cart, error } = await searchParams;
  const user = await getCurrentUser();
  const currency = await getDisplayCurrency();
  const product = await getStorefrontProduct(slug, user);
  if (!product) notFound();
  const related = (await listRelatedProducts(user, product)).slice(0, 4);
  const story = productStory(product);
  const shots = productShots(product);
  const approved = isApprovedBuyer(user);

  return (
    <StorefrontShell>
      <article className="sf-pdp-page">
        <div className="sf-pdp">
          <ProductGallery shots={shots} name={product.name} slug={product.slug} categorySlug={product.category.slug} />
          <ProductInfoPanel
            product={product}
            currency={currency}
            showPrices={approved}
            requestHref={user ? "/account/business" : "/register"}
            notice={cart === "added" ? "Added to cart." : undefined}
            error={error ? commerceMessage(error) : undefined}
          />
        </div>

        <ProductFacts product={product} />

        {story && (
          <ProductStoryBlock text={story} image={shots[1] ?? null} name={product.name} />
        )}

        <ProductSpecs product={product} />
        <ProductRelated products={related} />
      </article>
    </StorefrontShell>
  );
}
