import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../packages/database/generated/prisma/client";
import { DISPLAY_CURRENCY_LIST } from "../apps/web/src/config/currencies";
import { BRANDS, CATEGORIES, PRODUCTS } from "./fruit-catalog";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const permissionKeys = [
  "user.view", "user.create", "user.update", "user.delete",
  "role.view", "role.create", "role.update", "role.delete",
  "customer.view", "customer.update", "customer.approve", "customer.reject",
  "category.view", "category.create", "category.update", "category.delete",
  "brand.view", "brand.create", "brand.update", "brand.delete",
  "product.view", "product.create", "product.update", "product.delete",
  "price.view", "price.create", "price.update", "price.delete",
  "currency.view", "currency.create", "currency.update", "currency.delete",
  "order.view", "order.update", "order.cancel",
  "payment.view", "payment.update",
  "audit.view","customer.odoo.sync",
];

async function main() {
  const permissions = await Promise.all(
    permissionKeys.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key },
      }),
    ),
  );

  const superAdmin = await prisma.role.upsert({
    where: { slug: "super-admin" },
    update: {},
    create: {
      name: "Super Admin",
      slug: "super-admin",
      description: "Full system access",
      isSystem: true,
    },
  });

  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({
      roleId: superAdmin.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });

  const wholesale = await prisma.priceGroup.upsert({
    where: { slug: "wholesale" },
    update: {},
    create: { name: "Wholesale", slug: "wholesale" },
  });

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (email && password) {
    const passwordHash = await argon2.hash(password);
    const admin = await prisma.user.upsert({
      where: { email },
      update: { status: "ACTIVE" },
      create: {
        name: "Super Admin",
        email,
        passwordHash,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: superAdmin.id } },
      update: {},
      create: { userId: admin.id, roleId: superAdmin.id },
    });
  }

  const adminUser = email
    ? await prisma.user.findUnique({ where: { email }, select: { id: true } })
    : null;

  await seedDisplayCurrencies();
  await seedAttributes();
  const catalogCount = await seedCatalog(adminUser?.id ?? null, wholesale.id);
  console.log(`Seed completed. Default price group: ${wholesale.name}. Catalog: ${catalogCount} products.`);
}

async function seedDisplayCurrencies() {
  for (const [index, currency] of DISPLAY_CURRENCY_LIST.entries()) {
    await prisma.displayCurrency.upsert({
      where: { code: currency.code },
      update: {},
      create: {
        code: currency.code,
        label: currency.label,
        symbol: currency.symbol,
        rateFromUsd: currency.rateFromUSD,
        locale: currency.locale,
        isBase: currency.code === "USD",
        status: true,
        sortOrder: index,
      },
    });
  }
}

async function seedAttributes() {
  const catalog: Array<{
    name: string;
    slug: string;
    type: "TEXT" | "COLOR" | "SELECT";
    values: Array<{ value: string; slug: string; colorHex?: string }>;
  }> = [
    { name: "Color", slug: "color", type: "COLOR", values: [
      { value: "Black", slug: "black", colorHex: "#111111" },
      { value: "White", slug: "white", colorHex: "#f5f5f5" },
      { value: "Red", slug: "red", colorHex: "#b42318" },
    ] },
    { name: "Size", slug: "size", type: "SELECT", values: [
      { value: "S", slug: "s" },
      { value: "M", slug: "m" },
      { value: "L", slug: "l" },
    ] },
    { name: "Storage", slug: "storage", type: "SELECT", values: [
      { value: "128GB", slug: "128gb" },
      { value: "256GB", slug: "256gb" },
    ] },
    { name: "Weight", slug: "weight", type: "TEXT", values: [
      { value: "500g", slug: "500g" },
      { value: "1kg", slug: "1kg" },
    ] },
  ];

  for (const item of catalog) {
    const attribute = await prisma.attribute.upsert({
      where: { slug: item.slug },
      update: { name: item.name, type: item.type },
      create: { name: item.name, slug: item.slug, type: item.type },
    });
    for (const [index, value] of item.values.entries()) {
      const colorHex = value.colorHex ?? null;
      await prisma.attributeValue.upsert({
        where: { attributeId_slug: { attributeId: attribute.id, slug: value.slug } },
        update: { value: value.value, colorHex, sortOrder: index },
        create: {
          attributeId: attribute.id,
          value: value.value,
          slug: value.slug,
          colorHex,
          sortOrder: index,
        },
      });
    }
  }
}

function fileNameFromPath(path: string) {
  try {
    return decodeURIComponent(new URL(path).pathname.split("/").filter(Boolean).pop() || "image.jpg");
  } catch {
    return "image.jpg";
  }
}

async function seedCatalog(adminId: string | null, wholesaleId: string) {
  const categoryIds = new Map<string, string>();
  for (const category of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, sortOrder: category.sortOrder, status: true, deletedAt: null },
      create: { ...category, status: true },
    });
    categoryIds.set(category.slug, row.id);
  }

  const brandIds = new Map<string, string>();
  for (const brand of BRANDS) {
    const row = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: { name: brand.name, description: brand.description, status: true, deletedAt: null },
      create: { ...brand, status: true },
    });
    brandIds.set(brand.slug, row.id);
  }

  for (const item of PRODUCTS) {
    const categoryId = categoryIds.get(item.category);
    const brandId = brandIds.get(item.brand);
    if (!categoryId || !brandId) continue;

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        sku: item.sku,
        shortDescription: item.shortDescription,
        description: item.description,
        categoryId,
        brandId,
        status: "ACTIVE",
        isFeatured: item.featured,
        isNew: item.isNew,
        minOrderQuantity: item.minOrder,
        deletedAt: null,
        updatedById: adminId,
      },
      create: {
        name: item.name,
        slug: item.slug,
        sku: item.sku,
        shortDescription: item.shortDescription,
        description: item.description,
        categoryId,
        brandId,
        productType: "SIMPLE",
        status: "ACTIVE",
        isFeatured: item.featured,
        isNew: item.isNew,
        minOrderQuantity: item.minOrder,
        createdById: adminId,
        updatedById: adminId,
      },
    });

    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: { quantity: item.quantity, reservedQuantity: 0 },
      create: { productId: product.id, quantity: item.quantity },
    });

    const existingPrice = await prisma.price.findFirst({
      where: { productId: product.id, priceGroupId: wholesaleId, variantId: null },
    });
    if (existingPrice) {
      await prisma.price.update({
        where: { id: existingPrice.id },
        data: { amount: item.amount, currency: "USD" },
      });
    } else {
      await prisma.price.create({
        data: { productId: product.id, priceGroupId: wholesaleId, amount: item.amount, currency: "USD", variantId: null },
      });
    }

    const existingMedia = await prisma.productMedia.findMany({
      where: { productId: product.id },
      select: { mediaId: true },
    });
    if (existingMedia.length) {
      await prisma.productMedia.deleteMany({ where: { productId: product.id } });
      await prisma.media.deleteMany({ where: { id: { in: existingMedia.map((row) => row.mediaId) } } });
    }
    for (const [index, image] of item.images.entries()) {
      const media = await prisma.media.create({
        data: {
          fileName: fileNameFromPath(image.path),
          filePath: image.path,
          fileType: "IMAGE",
          mimeType: "image/jpeg",
          altText: image.alt,
          createdById: adminId,
        },
      });
      await prisma.productMedia.create({
        data: {
          productId: product.id,
          mediaId: media.id,
          type: index === 0 ? "MAIN" : "GALLERY",
          isPrimary: index === 0,
          sortOrder: index,
        },
      });
    }
  }

  const keepCategorySlugs = CATEGORIES.map((item) => item.slug);
  const keepBrandSlugs = BRANDS.map((item) => item.slug);
  const keepProductSlugs = PRODUCTS.map((item) => item.slug);

  await prisma.category.updateMany({
    where: { deletedAt: null, slug: { notIn: keepCategorySlugs } },
    data: { status: false },
  });
  await prisma.brand.updateMany({
    where: { deletedAt: null, slug: { notIn: keepBrandSlugs } },
    data: { status: false },
  });
  await prisma.product.updateMany({
    where: { deletedAt: null, slug: { notIn: keepProductSlugs } },
    data: { status: "INACTIVE" },
  });

  return PRODUCTS.length;
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
