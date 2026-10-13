import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  BrandSummary,
  CategoryDetail,
  CategorySummary,
  ProductDetail,
  ProductSummary,
  ProductVariant,
} from "@almohit/contracts";
import { Prisma } from "@almohit/database";
import type { AuthContext } from "../auth/auth.types";
import { PrismaService } from "../common/prisma.service";
import { PricingService } from "../pricing/pricing.service";

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

type StorefrontProductRow = Prisma.ProductGetPayload<{ include: typeof storefrontProductInclude }>;

export type ProductListQuery = {
  q?: string;
  category?: string;
  brand?: string;
  includeDescendants?: boolean;
};

function availableQuantity(quantity: number, reservedQuantity: number) {
  return Math.max(0, quantity - reservedQuantity);
}

function publicProductWhere(extra: Prisma.ProductWhereInput = {}): Prisma.ProductWhereInput {
  return {
    deletedAt: null,
    status: "ACTIVE",
    category: { deletedAt: null, status: true },
    ...extra,
  };
}

function inStockFor(product: StorefrontProductRow) {
  return product.productType === "VARIABLE"
    ? product.variants.some((variant) =>
        variant.inventory ? availableQuantity(variant.inventory.quantity, variant.inventory.reservedQuantity) > 0 : false,
      )
    : product.inventory
      ? availableQuantity(product.inventory.quantity, product.inventory.reservedQuantity) > 0
      : false;
}

function toProductSummary(product: StorefrontProductRow, price?: { amount: string; currency: string }): ProductSummary {
  const summary: ProductSummary = {
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
    inStock: inStockFor(product),
  };
  if (price) summary.price = price;
  return summary;
}

@Injectable()
export class CatalogService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PricingService) private readonly pricing: PricingService,
  ) {}

  async listCategories(): Promise<CategorySummary[]> {
    const [categories, products] = await Promise.all([
      this.prisma.client.category.findMany({
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
      }),
      this.prisma.client.product.findMany({
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
    const firstImage = new Map<string, { src: string; framing: CategorySummary["imageFraming"] }>();
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

    const imageFor = (id: string): { src: string; framing: CategorySummary["imageFraming"] } | null => {
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

  async getCategory(slug: string): Promise<CategoryDetail> {
    const category = await this.prisma.client.category.findFirst({
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
    if (!category) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Category not found" });
    }
    return category;
  }

  async listBrands(): Promise<BrandSummary[]> {
    return this.prisma.client.brand.findMany({
      where: { deletedAt: null, status: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
  }

  async collectCategoryAndDescendantIds(categoryId: string) {
    const categories = await this.prisma.client.category.findMany({
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

  async listProducts(user: AuthContext | null, query: ProductListQuery = {}): Promise<ProductSummary[]> {
    const extra: Prisma.ProductWhereInput = {};
    const term = query.q?.trim();
    if (term) {
      extra.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
        { shortDescription: { contains: term, mode: "insensitive" } },
        { category: { name: { contains: term, mode: "insensitive" } } },
        { brand: { name: { contains: term, mode: "insensitive" } } },
      ];
    }
    if (query.category) {
      const category = await this.prisma.client.category.findFirst({
        where: { slug: query.category, deletedAt: null, status: true },
        select: { id: true },
      });
      if (!category) return [];
      extra.categoryId = query.includeDescendants
        ? { in: await this.collectCategoryAndDescendantIds(category.id) }
        : category.id;
    }
    if (query.brand) {
      extra.brand = { slug: query.brand, deletedAt: null, status: true };
    }

    const products = await this.prisma.client.product.findMany({
      where: publicProductWhere(extra),
      include: storefrontProductInclude,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    });
    return this.attachPrices(products, user);
  }

  async getProduct(slug: string, user: AuthContext | null): Promise<ProductDetail> {
    const product = await this.prisma.client.product.findFirst({
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
    if (!product) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Product not found" });
    }

    const [withPrice] = await this.attachPrices([product], user);
    const allowed = new Set(product.allowedValues.map((item) => item.attributeValueId));
    const priceByVariant = await this.pricing.resolveVariantPrices(
      user,
      product.variants.map((variant) => variant.id),
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
        const publicVariant: ProductVariant = {
          id: variant.id,
          name: variant.name,
          sku: variant.sku,
          inStock: variant.inventory
            ? availableQuantity(variant.inventory.quantity, variant.inventory.reservedQuantity) > 0
            : false,
          valueIds: variant.values.map((entry) => entry.attributeValueId),
        };
        const price = priceByVariant.get(variant.id);
        if (price) publicVariant.price = price;
        return publicVariant;
      }),
    };
  }

  async listRelated(slug: string, user: AuthContext | null): Promise<ProductSummary[]> {
    const product = await this.getProduct(slug, user);
    const items = await this.prisma.client.product.findMany({
      where: publicProductWhere({
        categoryId: product.category.id,
        id: { not: product.id },
      }),
      include: storefrontProductInclude,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    });
    return (await this.attachPrices(items, user)).slice(0, 4);
  }

  private async attachPrices(products: StorefrontProductRow[], user: AuthContext | null): Promise<ProductSummary[]> {
    const resolved = await this.pricing.resolveCatalogPrices(
      user,
      products.map((product) => ({
        id: product.id,
        productType: product.productType,
        variantIds: product.productType === "VARIABLE" ? product.variants.map((variant) => variant.id) : [],
      })),
    );
    return products.map((product) => toProductSummary(product, resolved.get(product.id)));
  }
}
