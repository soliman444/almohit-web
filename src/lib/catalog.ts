import type { Prisma } from "../../generated/prisma/client";
import type { AuthUser } from "./auth";
import { prisma } from "./db/prisma";
import { authorizedPriceGroupId } from "./price-auth";
import type { StorefrontCategoryCard, StorefrontProduct } from "./storefront-types";

export { canSeeProductPrices } from "./price-auth";

export type { StorefrontCategoryCard, StorefrontProduct };
export { primaryImage, secondaryImage, galleryImages } from "./storefront-media";

export type StorefrontViewer = AuthUser | null;

const storefrontMediaInclude = {
  media: {
    select: {
      id: true,
      filePath: true,
      fileType: true,
      altText: true,
    },
  },
} satisfies Prisma.ProductMediaInclude;

const storefrontProductInclude = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  media: { include: storefrontMediaInclude, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
  inventory: { select: { quantity: true, reservedQuantity: true } },
  variants: {
    where: { status: "ACTIVE" },
    include: { inventory: { select: { quantity: true, reservedQuantity: true } } },
  },
} satisfies Prisma.ProductInclude;

export function slugify(input: string) {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `item-${Date.now().toString(36)}`;
}

export function availableQuantity(quantity: number, reservedQuantity: number) {
  return Math.max(0, quantity - reservedQuantity);
}

export function viewerPriceGroupId(user: StorefrontViewer) {
  return authorizedPriceGroupId(user);
}

export async function uniqueSlug(
  model: "category" | "brand" | "product",
  name: string,
  preferred?: string,
  excludeId?: string,
) {
  const base = slugify(preferred || name);
  let candidate = base;
  let index = 2;

  while (true) {
    const existing =
      model === "category"
        ? await prisma.category.findFirst({ where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })
        : model === "brand"
          ? await prisma.brand.findFirst({ where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })
          : await prisma.product.findFirst({ where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });

    if (!existing) return candidate;
    candidate = `${base}-${index}`;
    index += 1;
  }
}

export function flattenCategories<T extends { id: string; parentId: string | null; sortOrder: number; name: string }>(
  categories: T[],
) {
  const ids = new Set(categories.map((category) => category.id));
  const byParent = new Map<string | null, T[]>();
  for (const category of categories) {
    const key = category.parentId && ids.has(category.parentId) ? category.parentId : null;
    const list = byParent.get(key) ?? [];
    list.push(category);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ar"));
  }

  const walk = (parentId: string | null, depth: number): Array<T & { depth: number }> =>
    (byParent.get(parentId) ?? []).flatMap((category) => [
      { ...category, depth },
      ...walk(category.id, depth + 1),
    ]);

  return walk(null, 0);
}

export async function collectCategoryAndDescendantIds(categoryId: string) {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null, status: true },
    select: { id: true, parentId: true },
  });
  const children = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const list = children.get(category.parentId) ?? [];
    list.push(category.id);
    children.set(category.parentId, list);
  }

  const ids = [categoryId];
  const queue = [categoryId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const childId of children.get(current) ?? []) {
      ids.push(childId);
      queue.push(childId);
    }
  }
  return ids;
}

export async function wouldCreateCategoryCycle(categoryId: string, parentId: string | null) {
  if (!parentId) return false;
  let current: string | null = parentId;
  const seen = new Set<string>();
  while (current) {
    if (current === categoryId) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    const node: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: current },
      select: { parentId: true },
    });
    current = node?.parentId ?? null;
  }
  return false;
}

function publicProductWhere(extra: Prisma.ProductWhereInput = {}): Prisma.ProductWhereInput {
  return {
    deletedAt: null,
    status: "ACTIVE",
    category: { deletedAt: null, status: true },
    ...extra,
  };
}

function toStorefrontProduct(
  product: Prisma.ProductGetPayload<{ include: typeof storefrontProductInclude }>,
  price: { amount: string; currency: string } | null,
): StorefrontProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    shortDescription: product.shortDescription,
    description: product.description,
    minOrderQuantity: product.minOrderQuantity,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    productType: product.productType,
    category: product.category,
    brand: product.brand,
    media: product.media,
    inStock:
      product.productType === "VARIABLE"
        ? product.variants.some((variant) =>
            variant.inventory ? availableQuantity(variant.inventory.quantity, variant.inventory.reservedQuantity) > 0 : false,
          )
        : product.inventory
          ? availableQuantity(product.inventory.quantity, product.inventory.reservedQuantity) > 0
          : false,
    price,
  };
}

async function attachPrices(
  products: Array<Prisma.ProductGetPayload<{ include: typeof storefrontProductInclude }>>,
  user: StorefrontViewer,
): Promise<StorefrontProduct[]> {
  const priceGroupId = viewerPriceGroupId(user);
  if (!priceGroupId || products.length === 0) {
    return products.map((product) => toStorefrontProduct(product, null));
  }

  const now = new Date();
  const window = [
    { OR: [{ activeFrom: null }, { activeFrom: { lte: now } }] },
    { OR: [{ activeTo: null }, { activeTo: { gte: now } }] },
  ];
  const simpleIds = products.filter((product) => product.productType === "SIMPLE").map((product) => product.id);
  const variantIds = products.flatMap((product) =>
    product.productType === "VARIABLE" ? product.variants.map((variant) => variant.id) : [],
  );

  const [simplePrices, variantPrices] = await Promise.all([
    simpleIds.length
      ? prisma.price.findMany({
          where: { productId: { in: simpleIds }, priceGroupId, variantId: null, AND: window },
          select: { productId: true, amount: true, currency: true },
        })
      : [],
    variantIds.length
      ? prisma.price.findMany({
          where: { variantId: { in: variantIds }, priceGroupId, AND: window },
          select: { productId: true, amount: true, currency: true },
        })
      : [],
  ]);

  const byProduct = new Map(simplePrices.map((price) => [price.productId, { amount: price.amount, currency: price.currency }]));
  for (const price of variantPrices) {
    const current = byProduct.get(price.productId);
    if (!current || price.amount.lt(current.amount)) {
      byProduct.set(price.productId, { amount: price.amount, currency: price.currency });
    }
  }
  return products.map((product) =>
    toStorefrontProduct(
      product,
      byProduct.has(product.id)
        ? { amount: byProduct.get(product.id)!.amount.toString(), currency: byProduct.get(product.id)!.currency }
        : null,
    ),
  );
}

export async function listStorefrontCategories() {
  return prisma.category.findMany({
    where: { deletedAt: null, status: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      parentId: true,
      name: true,
      slug: true,
      description: true,
      sortOrder: true,
      heroFocalX: true,
      heroFocalY: true,
      heroScale: true,
    },
  });
}

export async function listStorefrontProducts(user: StorefrontViewer, extra: Prisma.ProductWhereInput = {}) {
  const products = await prisma.product.findMany({
    where: publicProductWhere(extra),
    include: storefrontProductInclude,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });
  return attachPrices(products, user);
}

export async function getStorefrontProduct(slug: string, user: StorefrontViewer) {
  const product = await prisma.product.findFirst({
    where: publicProductWhere({ slug }),
    include: {
      ...storefrontProductInclude,
      attributes: {
        include: { attribute: { include: { values: { orderBy: { sortOrder: "asc" } } } } },
        orderBy: { sortOrder: "asc" },
      },
      allowedValues: { select: { attributeValueId: true } },
      variants: {
        where: { status: "ACTIVE" },
        include: {
          inventory: { select: { quantity: true, reservedQuantity: true } },
          values: { select: { attributeValueId: true } },
        },
      },
    },
  });
  if (!product) return null;
  const [withPrice] = await attachPrices([product], user);
  const allowed = new Set(product.allowedValues.map((item) => item.attributeValueId));
  const priceGroupId = viewerPriceGroupId(user);
  const now = new Date();
  const variantPrices = priceGroupId && product.variants.length
    ? await prisma.price.findMany({
        where: {
          variantId: { in: product.variants.map((variant) => variant.id) },
          priceGroupId,
          AND: [
            { OR: [{ activeFrom: null }, { activeFrom: { lte: now } }] },
            { OR: [{ activeTo: null }, { activeTo: { gte: now } }] },
          ],
        },
        select: { variantId: true, amount: true, currency: true },
      })
    : [];
  const priceByVariant = new Map(
    variantPrices.map((price) => [price.variantId!, { amount: price.amount.toString(), currency: price.currency }]),
  );

  return {
    ...withPrice,
    attributes: product.attributes.map((assignment) => ({
      id: assignment.attribute.id,
      name: assignment.attribute.name,
      type: assignment.attribute.type,
      values: assignment.attribute.values
        .filter((value) => allowed.size === 0 || allowed.has(value.id))
        .map((value) => ({ id: value.id, value: value.value, colorHex: value.colorHex })),
    })),
    variants: product.variants.map((variant) => {
      const publicVariant = {
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        inStock: variant.inventory ? availableQuantity(variant.inventory.quantity, variant.inventory.reservedQuantity) > 0 : false,
        valueIds: variant.values.map((entry) => entry.attributeValueId),
      };
      const price = priceByVariant.get(variant.id);
      return price ? { ...publicVariant, price } : publicVariant;
    }),
  };
}

export async function getStorefrontCategory(slug: string) {
  return prisma.category.findFirst({
    where: { slug, deletedAt: null, status: true },
    select: {
      id: true,
      parentId: true,
      name: true,
      slug: true,
      description: true,
      heroVideoUrl: true,
      heroPosterUrl: true,
      heroFocalX: true,
      heroFocalY: true,
      heroScale: true,
    },
  });
}

export async function listRelatedProducts(user: StorefrontViewer, product: StorefrontProduct) {
  return listStorefrontProducts(user, {
    categoryId: product.category.id,
    id: { not: product.id },
  }).then((items) => items.slice(0, 4));
}

export async function listStorefrontCategoryCards(): Promise<StorefrontCategoryCard[]> {
  const [categories, products] = await Promise.all([
    listStorefrontCategories(),
    prisma.product.findMany({
      where: publicProductWhere(),
      select: {
        categoryId: true,
        media: {
          include: storefrontMediaInclude,
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
        },
      },
    }),
  ]);

  const children = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const list = children.get(category.parentId) ?? [];
    list.push(category.id);
    children.set(category.parentId, list);
  }

  const directCount = new Map<string, number>();
  const firstImage = new Map<string, { src: string; framing: StorefrontCategoryCard["imageFraming"] }>();
  for (const product of products) {
    directCount.set(product.categoryId, (directCount.get(product.categoryId) ?? 0) + 1);
    const item = product.media[0];
    const image = item?.media.filePath;
    if (image && !firstImage.has(product.categoryId)) {
      firstImage.set(product.categoryId, {
        src: image,
        framing: {
          fitMode: item.fitMode,
          focalX: item.focalX,
          focalY: item.focalY,
          scale: item.visualScale,
        },
      });
    }
  }

  const memo = new Map<string, number>();
  const countTree = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    const total = (directCount.get(id) ?? 0) + (children.get(id) ?? []).reduce((sum, child) => sum + countTree(child), 0);
    memo.set(id, total);
    return total;
  };

  const imageFor = (id: string): { src: string; framing: StorefrontCategoryCard["imageFraming"] } | null => {
    if (firstImage.has(id)) return firstImage.get(id)!;
    for (const child of children.get(id) ?? []) {
      const nested = imageFor(child);
      if (nested) return nested;
    }
    return null;
  };

  return categories.map((category) => {
    const image = imageFor(category.id);
    return {
      ...category,
      productCount: countTree(category.id),
      image: image?.src ?? null,
      imageFraming: image?.framing ?? null,
    };
  });
}

export function fileNameFromPath(path: string) {
  try {
    const url = new URL(path);
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "image");
  } catch {
    return path.split("/").filter(Boolean).pop() || "image";
  }
}

export function parseImageUrls(input: string) {
  return [...new Set(input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
}

export type ProductImageFraming = {
  fitMode: "AUTO" | "COVER" | "CONTAIN";
  focalX: number;
  focalY: number;
  visualScale: number;
};

export async function replaceProductImages(
  productId: string,
  userId: string,
  mainImage: string | null,
  galleryImages: string[],
  framing?: ProductImageFraming,
) {
  const existing = await prisma.productMedia.findMany({
    where: { productId, type: { in: ["MAIN", "GALLERY"] } },
    select: { id: true, mediaId: true },
  });

  if (existing.length) {
    await prisma.productMedia.deleteMany({ where: { id: { in: existing.map((item) => item.id) } } });
    await prisma.media.deleteMany({ where: { id: { in: existing.map((item) => item.mediaId) } } });
  }

  const rows: Array<{ path: string; type: "MAIN" | "GALLERY"; isPrimary: boolean; sortOrder: number }> = [];
  if (mainImage) rows.push({ path: mainImage, type: "MAIN", isPrimary: true, sortOrder: 0 });
  galleryImages.forEach((path, index) => {
    if (path === mainImage) return;
    rows.push({ path, type: "GALLERY", isPrimary: false, sortOrder: index + 1 });
  });

  for (const row of rows) {
    const media = await prisma.media.create({
      data: {
        fileName: fileNameFromPath(row.path),
        filePath: row.path,
        fileType: "IMAGE",
        altText: null,
        createdById: userId,
      },
    });
    await prisma.productMedia.create({
      data: {
        productId,
        mediaId: media.id,
        type: row.type,
        isPrimary: row.isPrimary,
        sortOrder: row.sortOrder,
        fitMode: row.type === "MAIN" ? framing?.fitMode ?? "AUTO" : "AUTO",
        focalX: row.type === "MAIN" ? framing?.focalX ?? 50 : 50,
        focalY: row.type === "MAIN" ? framing?.focalY ?? 50 : 50,
        visualScale: row.type === "MAIN" ? framing?.visualScale ?? 1 : 1,
      },
    });
  }
}
