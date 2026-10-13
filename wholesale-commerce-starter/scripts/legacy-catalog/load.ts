import type { PrismaClient } from "../../packages/database/generated/prisma/client";
import { simpleVariantLegacyId } from "./xmlid";
import type { Counts, Issue } from "./types";

export type LoadedCatalog = {
  categories: Array<Record<string, unknown>>;
  brands: Array<Record<string, unknown>>;
  attributes: Array<Record<string, unknown>>;
  products: Array<Record<string, unknown>>;
  variantConfigs: Array<Record<string, unknown>>;
  images: Array<Record<string, unknown>>;
  prices: Array<Record<string, unknown>>;
  inventory: Array<Record<string, unknown>>;
  counts: Counts;
  issues: Issue[];
  inventorySummary: {
    onHand: number;
    reserved: number;
    available: number;
    rows: number;
    reservedRows: number;
  };
  priceGroups: Array<{ id: string; name: string; slug: string; status: string; priceCount: number }>;
  imageJobs: Array<{ productId: string; primary?: string; gallery: Array<{ name: string; url: string }> }>;
};

export async function loadLegacyCatalog(prisma: PrismaClient): Promise<LoadedCatalog> {
  const issues: Issue[] = [];
  const [
    categories,
    brands,
    attributes,
    products,
    priceGroups,
    inventoryRows,
  ] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.attribute.findMany({
      include: { values: { orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      include: {
        media: { include: { media: true }, orderBy: [{ sortOrder: "asc" }] },
        attributes: { include: { attribute: true }, orderBy: { sortOrder: "asc" } },
        allowedValues: { include: { value: true } },
        variants: { include: { values: { include: { value: true } } } },
        prices: true,
        inventory: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.priceGroup.findMany({ include: { _count: { select: { prices: true } } } }),
    prisma.inventory.findMany(),
  ]);

  const skuCounts = new Map<string, number>();
  for (const product of products) {
    skuCounts.set(product.sku, (skuCounts.get(product.sku) ?? 0) + 1);
    for (const variant of product.variants) {
      skuCounts.set(variant.sku, (skuCounts.get(variant.sku) ?? 0) + 1);
    }
  }
  for (const [sku, count] of skuCounts) {
    if (count > 1) issues.push({ severity: "error", code: "DUPLICATE_SKU", message: `Duplicate SKU ${sku}` });
  }

  const brandNames = new Map<string, number>();
  for (const brand of brands) {
    const key = brand.name.trim().toLowerCase();
    brandNames.set(key, (brandNames.get(key) ?? 0) + 1);
  }
  for (const [name, count] of brandNames) {
    if (count > 1) issues.push({ severity: "warning", code: "DUPLICATE_BRAND", message: `Duplicate brand name ${name}` });
  }

  const categoryById = new Map(categories.map((row) => [row.id, row]));
  const orderedCategories = topoCategories(categories, issues);

  const categoryPayload = orderedCategories.map((row) => ({
    legacy_id: row.id,
    name: row.name,
    parent_legacy_id: row.parentId,
    sort_order: row.sortOrder,
    status: row.status,
    deleted: Boolean(row.deletedAt),
  }));

  const brandPayload = brands.map((row) => ({
    legacy_id: row.id,
    name: row.name,
    active: row.status && !row.deletedAt,
  }));

  const attributePayload = attributes.map((row, index) => ({
    legacy_id: row.id,
    name: row.name,
    type: row.type,
    sequence: index + 1,
    values: row.values.map((value) => ({
      legacy_id: value.id,
      name: value.value,
      sequence: value.sortOrder,
      html_color: value.colorHex,
    })),
  }));

  const productPayload: Array<Record<string, unknown>> = [];
  const variantConfigs: Array<Record<string, unknown>> = [];
  const imageJobs: LoadedCatalog["imageJobs"] = [];
  const pricePayload: Array<Record<string, unknown>> = [];
  const inventoryPayload: Array<Record<string, unknown>> = [];
  let imageCount = 0;
  let galleryCount = 0;
  const wholesale = priceGroups.find((group) => group.slug === "wholesale");

  for (const product of products) {
    if (!product.name.trim()) {
      issues.push({ severity: "error", code: "MISSING_NAME", message: "Product has no name", legacyId: product.id });
      continue;
    }
    if (!categoryById.has(product.categoryId)) {
      issues.push({ severity: "warning", code: "MISSING_CATEGORY", message: `Product ${product.sku} category missing`, legacyId: product.id });
    }
    const live = !product.deletedAt && product.status === "ACTIVE";
    productPayload.push({
      legacy_id: product.id,
      name: product.name,
      default_code: product.sku,
      description_sale: product.description,
      description: product.shortDescription,
      category_legacy_id: product.categoryId,
      brand_legacy_id: product.brandId,
      min_order_qty: product.minOrderQuantity,
      sale_ok: live,
      active: !product.deletedAt && product.status !== "INACTIVE" && product.status !== "ARCHIVED",
      has_variants: product.productType === "VARIABLE" || product.variants.length > 0,
    });

    const imageRows = product.media.filter((row) => row.media.fileType === "IMAGE");
    const primary = imageRows.find((row) => row.isPrimary || row.type === "MAIN") ?? imageRows[0];
    const gallery = imageRows.filter((row) => row.id !== primary?.id);
    if (!primary) {
      issues.push({ severity: "warning", code: "MISSING_IMAGE", message: `No image for ${product.sku}`, legacyId: product.id });
    } else {
      imageCount += 1;
    }
    galleryCount += gallery.length;
    const nonImages = product.media.filter((row) => row.media.fileType !== "IMAGE");
    for (const row of nonImages) {
      issues.push({
        severity: "warning",
        code: "UNSUPPORTED_MEDIA",
        message: `${row.media.fileType} not imported for ${product.sku}`,
        legacyId: product.id,
      });
    }
    imageJobs.push({
      productId: product.id,
      primary: primary?.media.filePath,
      gallery: gallery.map((row, index) => ({
        name: row.media.fileName || `gallery-${index}`,
        url: row.media.filePath,
      })),
    });

    if (product.productType === "VARIABLE" || product.variants.length > 0) {
      const valueIds = new Map<string, Set<string>>();
      for (const line of product.attributes) {
        valueIds.set(line.attributeId, new Set());
      }
      for (const allowed of product.allowedValues) {
        const attributeId = allowed.value.attributeId;
        if (!valueIds.has(attributeId)) valueIds.set(attributeId, new Set());
        valueIds.get(attributeId)!.add(allowed.attributeValueId);
      }
      for (const variant of product.variants) {
        for (const link of variant.values) {
          const attributeId = link.value.attributeId;
          if (!valueIds.has(attributeId)) valueIds.set(attributeId, new Set());
          valueIds.get(attributeId)!.add(link.attributeValueId);
        }
      }
      variantConfigs.push({
        legacy_id: product.id,
        attribute_lines: [...valueIds.entries()].map(([attributeId, ids]) => ({
          attribute_legacy_id: attributeId,
          value_legacy_ids: [...ids],
        })),
        variants: product.variants.map((variant) => ({
          legacy_id: variant.id,
          default_code: variant.sku,
          active: variant.status === "ACTIVE",
          value_legacy_ids: variant.values.map((value) => value.attributeValueId),
        })),
      });
    }

    for (const price of product.prices) {
      if (!wholesale || price.priceGroupId !== wholesale.id) {
        issues.push({
          severity: "warning",
          code: "UNMAPPED_PRICE_GROUP",
          message: `Price ${price.id} is not on the wholesale group`,
          legacyId: price.id,
        });
        continue;
      }
      if (price.currency !== "USD") {
        issues.push({
          severity: "warning",
          code: "NON_USD_PRICE",
          message: `${product.sku} price ${price.amount} ${price.currency} skipped (pricelist is USD)`,
          legacyId: price.id,
        });
        continue;
      }
      pricePayload.push({
        legacy_id: price.id,
        product_legacy_id: product.id,
        variant_legacy_id: price.variantId,
        amount: Number(price.amount),
        currency: price.currency,
        date_start: price.activeFrom?.toISOString() ?? null,
        date_end: price.activeTo?.toISOString() ?? null,
      });
    }
  }

  for (const row of inventoryRows) {
    const onHand = row.quantity;
    const reserved = row.reservedQuantity;
    if (reserved) {
      issues.push({
        severity: "warning",
        code: "RESERVED_NOT_MIGRATED",
        message: `Reserved ${reserved} not copied (on-hand ${onHand})`,
        legacyId: row.variantId ?? row.productId ?? row.id,
      });
    }
    if (onHand < 0) {
      issues.push({ severity: "error", code: "INVALID_INVENTORY", message: `Negative on-hand ${onHand}`, legacyId: row.id });
      continue;
    }
    const variantLegacyId = row.variantId ?? (row.productId ? simpleVariantLegacyId(row.productId) : null);
    if (!variantLegacyId) continue;
    inventoryPayload.push({
      variant_legacy_id: variantLegacyId,
      quantity: onHand,
    });
  }

  const onHand = inventoryRows.reduce((sum, row) => sum + row.quantity, 0);
  const reserved = inventoryRows.reduce((sum, row) => sum + row.reservedQuantity, 0);

  return {
    categories: categoryPayload,
    brands: brandPayload,
    attributes: attributePayload,
    products: productPayload,
    variantConfigs,
    images: [],
    prices: pricePayload,
    inventory: inventoryPayload,
    imageJobs,
    counts: {
      categories: categoryPayload.length,
      brands: brandPayload.length,
      attributes: attributePayload.length,
      attributeValues: attributePayload.reduce((sum, row) => sum + ((row.values as unknown[]).length), 0),
      products: productPayload.length,
      variants: variantConfigs.reduce((sum, row) => sum + ((row.variants as unknown[]).length), 0),
      prices: pricePayload.length,
      inventoryRows: inventoryPayload.length,
      images: imageCount,
      galleryImages: galleryCount,
    },
    issues,
    inventorySummary: {
      onHand,
      reserved,
      available: onHand - reserved,
      rows: inventoryRows.length,
      reservedRows: inventoryRows.filter((row) => row.reservedQuantity > 0).length,
    },
    priceGroups: priceGroups.map((group) => ({
      id: group.id,
      name: group.name,
      slug: group.slug,
      status: group.status,
      priceCount: group._count.prices,
    })),
  };
}

function topoCategories<T extends { id: string; parentId: string | null }>(
  rows: T[],
  issues: Issue[],
): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const seen = new Set<string>();
  const ordered: T[] = [];
  function visit(row: T, stack: Set<string>) {
    if (seen.has(row.id)) return;
    if (stack.has(row.id)) {
      issues.push({ severity: "error", code: "CATEGORY_CYCLE", message: "Category parent cycle", legacyId: row.id });
      return;
    }
    if (row.parentId) {
      const parent = byId.get(row.parentId);
      if (!parent) {
        issues.push({ severity: "warning", code: "MISSING_PARENT_CATEGORY", message: "Parent category missing", legacyId: row.id });
      } else {
        stack.add(row.id);
        visit(parent, stack);
        stack.delete(row.id);
      }
    }
    seen.add(row.id);
    ordered.push(row);
  }
  for (const row of rows) visit(row, new Set());
  return ordered;
}
