import { notFound } from "next/navigation";
import { ProductFacts } from "../../../components/storefront/product-facts";
import { ProductDetailMedia } from "../../../components/storefront/product-detail-media";
import { ProductRelated } from "../../../components/storefront/product-related";
import { ProductSpecs } from "../../../components/storefront/product-specs";
import { ProductStoryBlock } from "../../../components/storefront/product-story-block";
import { StorefrontShell } from "../../../components/storefront/shell";
import { StorefrontUnavailable } from "../../../components/system/storefront-unavailable";
import { fetchRelatedProducts, fetchStorefrontProduct } from "../../../lib/api/products";
import { getCurrentUser } from "../../../lib/api/auth";
import { getCurrentCustomer } from "../../../lib/api/customers";
import { safeApiCall } from "../../../lib/api/safe";
import { commerceMessage } from "../../../lib/commerce-errors";
import { getDisplayCurrency } from "../../../lib/display-currency";
import { productShots } from "../../../lib/storefront-media";
import type { StorefrontProduct } from "../../../lib/storefront-types";

export const dynamic = "force-dynamic";

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
  searchParams: Promise<{ cart?: string; error?: string; minQty?: string; available?: string }>;
}) {
  const { slug } = await params;
  const { cart, error, minQty, available } = await searchParams;
  const currency = await getDisplayCurrency();
  const loaded = await safeApiCall(async () => {
    const [me, product, customer] = await Promise.all([
      getCurrentUser(),
      fetchStorefrontProduct(slug),
      getCurrentCustomer(),
    ]);
    if (!product) return null;
    const related = await fetchRelatedProducts(slug);
    return {
      me,
      product,
      related: related.slice(0, 4),
      approved: customer?.state === "APPROVED",
      canOrder: customer?.state === "APPROVED" && customer.role !== "marketer",
    };
  });
  if (!loaded.ok) return <StorefrontUnavailable />;
  if (!loaded.data) notFound();
  const { me, product, related, approved, canOrder } = loaded.data;
  const story = productStory(product);
  const shots = productShots(product);

  return (
    <StorefrontShell>
      <article className="sf-pdp-page">
        <div className="sf-pdp">
          <ProductDetailMedia
            product={product}
            shots={shots}
            currency={currency}
            showPrices={approved}
            allowAddToCart={approved}
            requestHref={me.authenticated ? "/account/business" : "/register"}
            notice={cart === "added" ? "Added to cart." : undefined}
            error={error ? commerceMessage(error, minQty, available) : undefined}
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
