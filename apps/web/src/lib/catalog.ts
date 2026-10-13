import { prisma } from "./db/prisma";

export { primaryImage } from "./storefront-media";

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
