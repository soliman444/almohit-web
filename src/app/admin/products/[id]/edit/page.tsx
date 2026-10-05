import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProductAction, updateProductAction } from "../../../../../lib/actions";
import { hasPermission, requirePermission } from "../../../../../lib/auth";
import { availableQuantity, flattenCategories } from "../../../../../lib/catalog";
import { prisma } from "../../../../../lib/db/prisma";
import { AdminHeader } from "../../../../../components/admin/admin-ui";
import { ConfirmSubmit } from "../../../../../components/admin/confirm-submit";
import { ProductForm } from "../../product-form";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requirePermission("product.update");
  const { id } = await params;
  const { error } = await searchParams;
  const [product, categories, brands, attributes] = await Promise.all([
    prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        inventory: true,
        media: { include: { media: true }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
        prices: { include: { priceGroup: true } },
        attributes: true,
        allowedValues: true,
        variants: {
          include: {
            inventory: true,
            prices: { include: { priceGroup: true } },
            values: { include: { value: { include: { attribute: true } } } },
            _count: { select: { orderItems: true, cartItems: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.category.findMany({ where: { deletedAt: null }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.brand.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.attribute.findMany({ include: { values: { orderBy: { sortOrder: "asc" } } }, orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  const wholesale = product.prices.find((price) => price.priceGroup.slug === "wholesale" && !price.variantId);
  const main = product.media.find((item) => item.type === "MAIN") ?? product.media[0];
  const mainImage = main?.media.filePath ?? "";
  const galleryImages = product.media.filter((item) => item.type === "GALLERY").map((item) => item.media.filePath).join("\n");
  const reserved = product.inventory?.reservedQuantity ?? 0;
  const quantity = product.inventory?.quantity ?? 0;

  return (
    <div className="stack">
      <AdminHeader title={product.name} hint={product.sku} actions={<Link className="btn secondary" href="/admin/products">Back to products</Link>} />
      {product.productType === "VARIABLE" ? (
        <div className="card"><span className="muted">Variants</span><h2>{product.variants.length}</h2><p className="muted">Stock and price are per variant</p></div>
      ) : (
        <div className="card"><span className="muted">Available</span><h2>{availableQuantity(quantity, reserved)}</h2><p className="muted">Quantity {quantity} · Reserved {reserved}</p></div>
      )}
      <ProductForm
        action={updateProductAction}
        categories={flattenCategories(categories)}
        brands={brands}
        canEditPrice={hasPermission(admin, "price.update") || hasPermission(admin, "price.create")}
        error={error}
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          shortDescription: product.shortDescription,
          description: product.description,
          categoryId: product.categoryId,
          brandId: product.brandId,
          productType: product.productType,
          status: product.status,
          isFeatured: product.isFeatured,
          minOrderQuantity: product.minOrderQuantity,
          quantity,
          variantCount: product.variants.length,
          mainImage,
          galleryImages,
          fitMode: main?.fitMode ?? "AUTO",
          focalX: main?.focalX ?? 50,
          focalY: main?.focalY ?? 50,
          visualScale: main?.visualScale ?? 1,
          priceAmount: wholesale?.amount.toString() ?? "",
        }}
        variantEditor={{
          productId: product.id,
          attributes,
          assignedAttributeIds: product.attributes.map((item) => item.attributeId),
          allowedValueIds: product.allowedValues.map((item) => item.attributeValueId),
          canEditPrice: hasPermission(admin, "price.update") || hasPermission(admin, "price.create"),
          error,
          variants: product.variants.map((variant) => {
            const reserved = variant.inventory?.reservedQuantity ?? 0;
            const qty = variant.inventory?.quantity ?? 0;
            return {
              id: variant.id,
              sku: variant.sku,
              name: variant.name,
              status: variant.status,
              quantity: qty,
              reserved,
              available: availableQuantity(qty, reserved),
              priceAmount: variant.prices.find((price) => price.priceGroup.slug === "wholesale")?.amount.toString() ?? "",
              weight: variant.weight?.toString() ?? "",
              selectedValues: variant.values
                .map((entry) => `${entry.value.attribute.name}: ${entry.value.value}`)
                .join(" · "),
              canDelete: reserved === 0 && variant._count.orderItems === 0 && variant._count.cartItems === 0,
            };
          }),
        }}
      />
      {hasPermission(admin, "product.delete") && (
        <form action={deleteProductAction}>
          <input type="hidden" name="id" value={product.id} />
          <ConfirmSubmit className="btn danger" message="Delete this product?">Delete product</ConfirmSubmit>
        </form>
      )}
    </div>
  );
}
