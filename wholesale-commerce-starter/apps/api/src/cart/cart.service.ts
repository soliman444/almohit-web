import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { CartDto, CartItemDto, CurrentCartResponse, MoneyDto } from "@almohit/contracts";
import { Prisma } from "@almohit/database";
import { canSeeProductPrices } from "@almohit/validation";
import type { AuthContext } from "../auth/auth.types";
import { PrismaService } from "../common/prisma.service";
import { PriceAccessService } from "../pricing/price-access.service";
import { PRICE_ACCESS_DENIED } from "../pricing/pricing.errors";
import { multiplyMoney, serializeMoney } from "../pricing/pricing-money";
import { PricingService } from "../pricing/pricing.service";
import {
  AUTH_REQUIRED,
  CART_ITEM_NOT_FOUND,
  CART_UNAVAILABLE,
  INSUFFICIENT_STOCK,
  MOQ_NOT_MET,
  PRICE_UNAVAILABLE,
  PRODUCT_UNAVAILABLE,
  VARIANT_NOT_FOUND,
} from "./cart.errors";
import { parseAddCartItem, parseUpdateCartItem } from "./cart.input";
import {
  availableQuantity,
  cartItemIssue,
  isUniqueConstraintError,
  sameCartSku,
  selectionError,
  variantKey,
} from "./cart.rules";

const TX = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  timeout: 20_000,
  maxWait: 10_000,
} as const;

const activeCartInclude = {
  items: {
    include: {
      variant: {
        include: {
          inventory: true,
          values: { include: { value: { include: { attribute: true } } } },
        },
      },
      product: {
        include: {
          inventory: true,
          category: { select: { deletedAt: true, status: true } },
          media: { include: { media: true }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.CartInclude;

type ActiveCartRow = Prisma.CartGetPayload<{ include: typeof activeCartInclude }>;

function variantDisplayName(values: Array<{ value: string }>) {
  return values.map((item) => item.value).join(" / ");
}

function sumLineTotals(values: MoneyDto[]): MoneyDto {
  const currency = values[0]?.currency ?? "USD";
  const total = values.reduce((sum, value) => sum.add(value.amount), new Prisma.Decimal("0.00"));
  return serializeMoney(total, currency);
}

function throwSelection(code: "VARIANT_NOT_FOUND" | "PRODUCT_UNAVAILABLE"): never {
  if (code === "VARIANT_NOT_FOUND") throw new NotFoundException(VARIANT_NOT_FOUND);
  throw new NotFoundException(PRODUCT_UNAVAILABLE);
}

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PricingService) private readonly pricing: PricingService,
    @Inject(PriceAccessService) private readonly access: PriceAccessService,
  ) {}

  async getCurrentCart(user: AuthContext | null): Promise<CurrentCartResponse> {
    if (!user) {
      throw new UnauthorizedException(AUTH_REQUIRED);
    }
    if (!user.customer || !this.access.canViewWholesalePrices(user)) {
      return { cart: null };
    }

    const carts = await this.prisma.client.cart.findMany({
      where: { customerId: user.customer.id, status: "ACTIVE" },
      include: activeCartInclude,
      orderBy: { createdAt: "desc" },
    });

    if (carts.length > 1) {
      this.logger.warn(
        `Multiple ACTIVE carts for customer ${user.customer.id}; surfacing ${carts[0].id} of ${carts.length} without merging.`,
      );
    }

    const cart = carts[0];
    if (!cart) return { cart: null };
    return { cart: await this.toCartDto(user, cart) };
  }

  async addItem(user: AuthContext | null, body: Record<string, unknown>): Promise<CurrentCartResponse> {
    const eligible = this.requireEligible(user);
    const input = parseAddCartItem(body);

    await this.prisma.client.$transaction(async (tx) => {
      const customer = await this.lockCustomerBuyer(tx, eligible.customer.id);
      const product = await tx.product.findFirst({
        where: { id: input.productId, deletedAt: null, status: "ACTIVE", category: { deletedAt: null, status: true } },
        include: { inventory: true },
      });
      if (!product) throw new NotFoundException(PRODUCT_UNAVAILABLE);

      const variant = input.variantId
        ? await tx.productVariant.findUnique({ where: { id: input.variantId }, include: { inventory: true } })
        : null;
      const invalid = selectionError({
        productType: product.productType,
        productId: product.id,
        variantId: input.variantId,
        variantProductId: variant?.productId,
        variantStatus: variant?.status,
      });
      if (invalid) throwSelection(invalid);

      const price = await this.pricing.resolveLinePrice(eligible, product.id, variant?.id ?? null, tx);
      if (!price) throw new NotFoundException(PRICE_UNAVAILABLE);

      const stock = product.productType === "VARIABLE" ? variant?.inventory : product.inventory;
      const available = stock ? availableQuantity(stock.quantity, stock.reservedQuantity) : 0;
      const cart = await this.getOrCreateActiveCart(tx, customer.id);
      const current = cart.items.find((item) => sameCartSku(item, { productId: product.id, variantId: variant?.id ?? null }));
      const nextQty = (current?.quantity ?? 0) + input.quantity;
      if (nextQty < product.minOrderQuantity) throw new BadRequestException(MOQ_NOT_MET);
      if (nextQty > available) throw new BadRequestException(INSUFFICIENT_STOCK);

      if (current) {
        await tx.cartItem.update({
          where: { id: current.id },
          data: {
            quantity: nextQty,
            unitPrice: price.amount,
            variantId: variant?.id ?? null,
            variantKey: variantKey(variant?.id),
          },
        });
      } else {
        try {
          await tx.cartItem.create({
            data: {
              cartId: cart.id,
              productId: product.id,
              variantId: variant?.id ?? null,
              variantKey: variantKey(variant?.id),
              quantity: nextQty,
              unitPrice: price.amount,
            },
          });
        } catch (error) {
          if (!isUniqueConstraintError(error)) throw error;
          const raced = await tx.cartItem.findFirst({
            where: { cartId: cart.id, productId: product.id, variantKey: variantKey(variant?.id) },
          });
          if (!raced) throw new ConflictException(CART_UNAVAILABLE);
          const merged = raced.quantity + input.quantity;
          if (merged < product.minOrderQuantity) throw new BadRequestException(MOQ_NOT_MET);
          if (merged > available) throw new BadRequestException(INSUFFICIENT_STOCK);
          await tx.cartItem.update({
            where: { id: raced.id },
            data: { quantity: merged, unitPrice: price.amount, variantId: variant?.id ?? null, variantKey: variantKey(variant?.id) },
          });
        }
      }
      await tx.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
    }, TX);

    return this.getCurrentCart(eligible);
  }

  async updateItem(user: AuthContext | null, itemId: string, body: Record<string, unknown>): Promise<CurrentCartResponse> {
    const eligible = this.requireEligible(user);
    const { quantity } = parseUpdateCartItem(body);

    await this.prisma.client.$transaction(async (tx) => {
      const customer = await this.lockCustomerBuyer(tx, eligible.customer.id);
      const item = await tx.cartItem.findFirst({
        where: { id: itemId, cart: { customerId: customer.id, status: "ACTIVE" } },
        include: {
          variant: { include: { inventory: true } },
          product: { include: { inventory: true, category: true } },
        },
      });
      if (!item) throw new NotFoundException(CART_ITEM_NOT_FOUND);
      if (
        item.product.status !== "ACTIVE" ||
        item.product.deletedAt ||
        item.product.category.deletedAt ||
        !item.product.category.status
      ) {
        throw new NotFoundException(PRODUCT_UNAVAILABLE);
      }
      const invalid = selectionError({
        productType: item.product.productType,
        productId: item.product.id,
        variantId: item.variantId,
        variantProductId: item.variant?.productId,
        variantStatus: item.variant?.status,
      });
      if (invalid) throwSelection(invalid);
      if (quantity < item.product.minOrderQuantity) throw new BadRequestException(MOQ_NOT_MET);

      const stock = item.product.productType === "VARIABLE" ? item.variant?.inventory : item.product.inventory;
      const available = stock ? availableQuantity(stock.quantity, stock.reservedQuantity) : 0;
      if (quantity > available) throw new BadRequestException(INSUFFICIENT_STOCK);

      const price = await this.pricing.resolveLinePrice(eligible, item.productId, item.variantId, tx);
      if (!price) throw new NotFoundException(PRICE_UNAVAILABLE);

      await tx.cartItem.update({
        where: { id: item.id },
        data: { quantity, unitPrice: price.amount },
      });
    }, TX);

    return this.getCurrentCart(eligible);
  }

  async removeItem(user: AuthContext | null, itemId: string): Promise<CurrentCartResponse> {
    const eligible = this.requireEligible(user);
    const result = await this.prisma.client.cartItem.deleteMany({
      where: { id: itemId, cart: { customerId: eligible.customer.id, status: "ACTIVE" } },
    });
    if (result.count === 0) throw new NotFoundException(CART_ITEM_NOT_FOUND);
    return this.getCurrentCart(eligible);
  }

  async clear(user: AuthContext | null): Promise<CurrentCartResponse> {
    const eligible = this.requireEligible(user);
    const cart = await this.prisma.client.cart.findFirst({
      where: { customerId: eligible.customer.id, status: "ACTIVE" },
      select: { id: true },
    });
    if (cart) {
      await this.prisma.client.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return this.getCurrentCart(eligible);
  }

  private requireEligible(user: AuthContext | null) {
    if (!user) throw new UnauthorizedException(AUTH_REQUIRED);
    if (!user.customer || !this.access.canViewWholesalePrices(user)) {
      throw new ForbiddenException(PRICE_ACCESS_DENIED);
    }
    return user as AuthContext & { customer: NonNullable<AuthContext["customer"]> };
  }

  private async lockCustomerBuyer(tx: Prisma.TransactionClient, customerId: string) {
    await tx.$queryRaw`SELECT id FROM customers WHERE id = ${customerId} FOR UPDATE`;
    const customer = await tx.customer.findUnique({
      where: { id: customerId },
      include: { priceGroup: true },
    });
    if (!customer || !canSeeProductPrices({ customer }) || !customer.priceGroupId) {
      throw new ForbiddenException(PRICE_ACCESS_DENIED);
    }
    return customer as typeof customer & { priceGroupId: string };
  }

  private async lockOwnedCart(tx: Prisma.TransactionClient, customerId: string) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM carts
      WHERE customer_id = ${customerId} AND status = 'ACTIVE'
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
    `;
    if (!rows[0]) return null;
    return tx.cart.findUnique({
      where: { id: rows[0].id },
      include: { items: true, order: { select: { orderNumber: true } } },
    });
  }

  private async getOrCreateActiveCart(tx: Prisma.TransactionClient, customerId: string) {
    const extras = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM carts
      WHERE customer_id = ${customerId} AND status = 'ACTIVE'
      ORDER BY created_at DESC
      OFFSET 1
      FOR UPDATE
    `;
    if (extras.length) {
      await tx.cart.updateMany({
        where: { id: { in: extras.map((row) => row.id) } },
        data: { status: "ABANDONED" },
      });
    }

    const existing = await this.lockOwnedCart(tx, customerId);
    if (existing) return existing;

    try {
      return await tx.cart.create({
        data: { customerId, status: "ACTIVE" },
        include: { items: true, order: { select: { orderNumber: true } } },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const raced = await this.lockOwnedCart(tx, customerId);
      if (!raced) throw new ConflictException(CART_UNAVAILABLE);
      return raced;
    }
  }

  private async toCartDto(user: AuthContext, cart: ActiveCartRow): Promise<CartDto> {
    const simpleTargets = cart.items
      .filter((item) => item.product.productType === "SIMPLE" && !item.variantId)
      .map((item) => ({ id: item.productId, productType: "SIMPLE" as const, variantIds: [] as string[] }));
    const variantIds = cart.items
      .filter((item) => item.product.productType === "VARIABLE" && item.variantId)
      .map((item) => item.variantId!);

    const [simplePrices, variantPrices] = await Promise.all([
      this.pricing.resolveCatalogPrices(user, simpleTargets),
      this.pricing.resolveVariantPrices(user, variantIds),
    ]);

    const items: CartItemDto[] = cart.items.map((item) => {
      const product = item.product;
      const stock = item.variantId ? item.variant?.inventory : product.inventory;
      const available = stock ? availableQuantity(stock.quantity, stock.reservedQuantity) : 0;
      const currentPrice =
        product.productType === "VARIABLE" && item.variantId
          ? (variantPrices.get(item.variantId) ?? null)
          : (simplePrices.get(item.productId) ?? null);
      const productActive = product.status === "ACTIVE" && !product.deletedAt;
      const categoryActive = !product.category.deletedAt && product.category.status;
      const variantActive = product.productType === "SIMPLE" || item.variant?.status === "ACTIVE";
      const pairingOk =
        (product.productType === "SIMPLE" && !item.variantId) ||
        (product.productType === "VARIABLE" && item.variant?.productId === product.id);
      const reason = cartItemIssue({
        productActive: productActive && variantActive && pairingOk,
        categoryActive,
        quantity: item.quantity,
        minOrderQuantity: product.minOrderQuantity,
        available,
        hasPrice: Boolean(currentPrice),
      });
      const unitPrice = currentPrice ?? serializeMoney(item.unitPrice, "USD");
      const values = item.variant?.values.map((entry) => entry.value) ?? [];
      return {
        id: item.id,
        product: {
          id: product.id,
          slug: product.slug,
          name: product.name,
          sku: product.sku,
          image: product.media[0]?.media.filePath ?? null,
        },
        variant: item.variant
          ? {
              id: item.variant.id,
              name: variantDisplayName(values) || item.variant.name,
              sku: item.variant.sku,
              attributes: values.map((value) => ({ name: value.attribute.name, value: value.value })),
            }
          : null,
        quantity: item.quantity,
        moq: product.minOrderQuantity,
        unitPrice,
        lineTotal: multiplyMoney(unitPrice.amount, item.quantity, unitPrice.currency),
        availableQuantity: available,
        isValid: reason === null,
        reason,
      };
    });

    const priced = items.filter((item) => !item.reason || item.reason === "STOCK" || item.reason === "MINIMUM");
    return {
      id: cart.id,
      status: "ACTIVE",
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      canCheckout: items.length > 0 && items.every((item) => item.isValid),
      items,
      totals: {
        subtotal: sumLineTotals(priced.map((item) => item.lineTotal).filter((value): value is MoneyDto => Boolean(value))),
      },
    };
  }
}
