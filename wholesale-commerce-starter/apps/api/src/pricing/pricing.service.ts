import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { MoneyDto, ResolvedPriceDto } from "@almohit/contracts";
import { Prisma } from "@almohit/database";
import type { AuthContext } from "../auth/auth.types";
import { PrismaService } from "../common/prisma.service";
import { PriceAccessService } from "./price-access.service";
import { PRICE_ACCESS_DENIED, PRICE_UNAVAILABLE, VARIANT_NOT_FOUND } from "./pricing.errors";
import { serializeMoney } from "./pricing-money";
import type { CatalogPriceTarget } from "./pricing.types";

function activePriceWindow(now: Date) {
  return [
    { OR: [{ activeFrom: null }, { activeFrom: { lte: now } }] },
    { OR: [{ activeTo: null }, { activeTo: { gte: now } }] },
  ];
}

function publicProductWhere(extra: Prisma.ProductWhereInput = {}): Prisma.ProductWhereInput {
  return {
    deletedAt: null,
    status: "ACTIVE",
    category: { deletedAt: null, status: true },
    ...extra,
  };
}

@Injectable()
export class PricingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PriceAccessService) private readonly access: PriceAccessService,
  ) {}

  assertCanViewWholesalePrices(user: AuthContext | null) {
    if (!this.access.canViewWholesalePrices(user)) {
      throw new ForbiddenException(PRICE_ACCESS_DENIED);
    }
  }

  async resolveCatalogPrices(user: AuthContext | null, targets: CatalogPriceTarget[]): Promise<Map<string, MoneyDto>> {
    const result = new Map<string, MoneyDto>();
    const priceGroupId = this.access.authorizedPriceGroupId(user);
    if (!priceGroupId || targets.length === 0) return result;

    const simpleIds = targets.filter((item) => item.productType === "SIMPLE").map((item) => item.id);
    const variantIds = targets.flatMap((item) => (item.productType === "VARIABLE" ? item.variantIds : []));
    const now = new Date();

    const [simplePrices, variantPrices] = await Promise.all([
      this.loadSimplePrices(simpleIds, priceGroupId, now),
      this.loadVariantPrices(variantIds, priceGroupId, now),
    ]);

    for (const price of simplePrices) {
      result.set(price.productId, serializeMoney(price.amount, price.currency));
    }

    const lowestByProduct = new Map<string, { amount: Prisma.Decimal; currency: string }>();
    for (const price of variantPrices) {
      const current = lowestByProduct.get(price.productId);
      if (!current || price.amount.lt(current.amount)) {
        lowestByProduct.set(price.productId, { amount: price.amount, currency: price.currency });
      }
    }
    for (const [productId, price] of lowestByProduct) {
      result.set(productId, serializeMoney(price.amount, price.currency));
    }

    return result;
  }

  async resolveVariantPrices(user: AuthContext | null, variantIds: string[]): Promise<Map<string, MoneyDto>> {
    const result = new Map<string, MoneyDto>();
    const priceGroupId = this.access.authorizedPriceGroupId(user);
    if (!priceGroupId || variantIds.length === 0) return result;

    const rows = await this.loadVariantPrices(variantIds, priceGroupId, new Date());
    for (const price of rows) {
      if (price.variantId) result.set(price.variantId, serializeMoney(price.amount, price.currency));
    }
    return result;
  }

  async resolveLinePrice(
    user: AuthContext | null,
    productId: string,
    variantId: string | null,
    db: { price: { findFirst: Prisma.TransactionClient["price"]["findFirst"] } } = this.prisma.client,
  ): Promise<MoneyDto | null> {
    const priceGroupId = this.access.authorizedPriceGroupId(user);
    if (!priceGroupId) return null;
    const row = await db.price.findFirst({
      where: {
        productId,
        priceGroupId,
        variantId: variantId ?? null,
        AND: activePriceWindow(new Date()),
      },
      select: { amount: true, currency: true },
    });
    return row ? serializeMoney(row.amount, row.currency) : null;
  }

  async resolveProductPrice(user: AuthContext | null, productId: string): Promise<ResolvedPriceDto> {
    this.assertCanViewWholesalePrices(user);
    const product = await this.prisma.client.product.findFirst({
      where: publicProductWhere({ id: productId }),
      select: {
        id: true,
        productType: true,
        variants: { where: { status: "ACTIVE" }, select: { id: true } },
      },
    });
    if (!product) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Product not found" });
    }

    const prices = await this.resolveCatalogPrices(user, [
      {
        id: product.id,
        productType: product.productType,
        variantIds: product.variants.map((variant) => variant.id),
      },
    ]);
    const price = prices.get(product.id);
    if (!price) throw new NotFoundException(PRICE_UNAVAILABLE);
    return { productId: product.id, price };
  }

  async resolveVariantPrice(user: AuthContext | null, productId: string, variantId: string): Promise<ResolvedPriceDto> {
    this.assertCanViewWholesalePrices(user);
    const variant = await this.prisma.client.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
        status: "ACTIVE",
        product: publicProductWhere(),
      },
      select: { id: true, productId: true },
    });
    if (!variant) {
      throw new NotFoundException(VARIANT_NOT_FOUND);
    }

    const prices = await this.resolveVariantPrices(user, [variant.id]);
    const price = prices.get(variant.id);
    if (!price) throw new NotFoundException(PRICE_UNAVAILABLE);
    return { productId: variant.productId, variantId: variant.id, price };
  }

  async findActivePrice(
    db: { price: { findFirst: Prisma.TransactionClient["price"]["findFirst"] } },
    input: { productId: string; priceGroupId: string; variantId?: string | null; now?: Date },
  ) {
    return db.price.findFirst({
      where: {
        productId: input.productId,
        priceGroupId: input.priceGroupId,
        variantId: input.variantId ?? null,
        AND: activePriceWindow(input.now ?? new Date()),
      },
      select: { amount: true, currency: true },
    });
  }

  private loadSimplePrices(productIds: string[], priceGroupId: string, now: Date) {
    if (!productIds.length) return Promise.resolve([]);
    return this.prisma.client.price.findMany({
      where: {
        productId: { in: productIds },
        priceGroupId,
        variantId: null,
        AND: activePriceWindow(now),
      },
      select: { productId: true, amount: true, currency: true },
    });
  }

  private loadVariantPrices(variantIds: string[], priceGroupId: string, now: Date) {
    if (!variantIds.length) return Promise.resolve([]);
    return this.prisma.client.price.findMany({
      where: {
        variantId: { in: variantIds },
        priceGroupId,
        AND: activePriceWindow(now),
      },
      select: { productId: true, variantId: true, amount: true, currency: true },
    });
  }
}
