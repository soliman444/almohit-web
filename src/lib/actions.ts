"use server";

import argon2 from "argon2";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "../../generated/prisma/client";
import { z } from "zod";
import { createSession, destroySession, hasPermission, requirePermission, requireUser, type AuthUser } from "./auth";
import {
  parseImageUrls,
  replaceProductImages,
  uniqueSlug,
  wouldCreateCategoryCycle,
} from "./catalog";
import { clampFocal, clampScale, parseFitMode } from "./media-system";
import { prisma } from "./db/prisma";

function value(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function makeCustomerCode() {
  return `CUS-${Date.now().toString(36).toUpperCase()}`;
}

export async function registerAction(formData: FormData) {
  const input = z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    phone: z.string().min(6).max(30).optional().or(z.literal("")),
    password: z.string().min(8).max(128),
  }).parse({
    name: value(formData, "name"),
    email: value(formData, "email").toLowerCase(),
    phone: value(formData, "phone"),
    password: value(formData, "password"),
  });

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, ...(input.phone ? [{ phone: input.phone }] : [])] },
    select: { id: true },
  });
  if (exists) redirect("/register?error=exists");

  const passwordHash = await argon2.hash(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      passwordHash,
      customer: { create: { customerCode: makeCustomerCode() } },
    },
  });

  await createSession(user.id);
  redirect("/account");
}

export async function loginAction(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.deletedAt || user.status !== "ACTIVE" || !(await argon2.verify(user.passwordHash, password))) {
    redirect("/login?error=invalid");
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  redirect("/account");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function submitBusinessRequestAction(formData: FormData) {
  const user = await requireUser();
  if (!user.customer) throw new Error("Customer profile is required");

  const input = z.object({
    businessName: z.string().min(2).max(160),
    businessType: z.string().max(120).optional(),
    city: z.string().max(120).optional(),
    address: z.string().max(300).optional(),
    phone: z.string().max(30).optional(),
    notes: z.string().max(1000).optional(),
  }).parse({
    businessName: value(formData, "businessName"),
    businessType: value(formData, "businessType") || undefined,
    city: value(formData, "city") || undefined,
    address: value(formData, "address") || undefined,
    phone: value(formData, "phone") || undefined,
    notes: value(formData, "notes") || undefined,
  });

  const pending = await prisma.businessRequest.findFirst({ where: { customerId: user.customer.id, status: "PENDING" } });
  if (pending) redirect("/account/business?status=pending");

  await prisma.$transaction([
    prisma.businessRequest.create({ data: { customerId: user.customer.id, ...input } }),
    prisma.customer.update({ where: { id: user.customer.id }, data: { businessStatus: "PENDING", businessName: input.businessName } }),
  ]);
  redirect("/account/business?status=submitted");
}

export async function approveBusinessRequestAction(formData: FormData) {
  const admin = await requirePermission("customer.approve");
  const requestId = value(formData, "requestId");
  const request = await prisma.businessRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "PENDING") return;
  const wholesale = await prisma.priceGroup.findUnique({ where: { slug: "wholesale" } });
  if (!wholesale) throw new Error("Wholesale price group is missing. Run the seed.");

  await prisma.$transaction([
    prisma.businessRequest.update({ where: { id: request.id }, data: { status: "APPROVED", reviewedById: admin.id, reviewedAt: new Date(), rejectionReason: null } }),
    prisma.customer.update({ where: { id: request.customerId }, data: { businessStatus: "APPROVED", priceGroupId: wholesale.id, businessName: request.businessName } }),
    prisma.auditLog.create({ data: { userId: admin.id, action: "BUSINESS_REQUEST_APPROVED", entityType: "BusinessRequest", entityId: request.id } }),
  ]);
  revalidatePath("/admin/business-requests");
}

export async function rejectBusinessRequestAction(formData: FormData) {
  const admin = await requirePermission("customer.reject");
  const requestId = value(formData, "requestId");
  const reason = value(formData, "reason");
  const request = await prisma.businessRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "PENDING") return;

  await prisma.$transaction([
    prisma.businessRequest.update({ where: { id: request.id }, data: { status: "REJECTED", reviewedById: admin.id, reviewedAt: new Date(), rejectionReason: reason || null } }),
    prisma.customer.update({ where: { id: request.customerId }, data: { businessStatus: "REJECTED", priceGroupId: null } }),
    prisma.auditLog.create({ data: { userId: admin.id, action: "BUSINESS_REQUEST_REJECTED", entityType: "BusinessRequest", entityId: request.id, newData: reason ? { reason } : undefined } }),
  ]);
  revalidatePath("/admin/business-requests");
}

export async function createRoleAction(formData: FormData) {
  const admin = await requirePermission("role.create");
  const name = value(formData, "name");
  const slug = value(formData, "slug").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const permissionIds = formData.getAll("permissions").map(String);
  if (!name || !slug) return;

  const role = await prisma.role.create({ data: { name, slug } });
  if (permissionIds.length) {
    await prisma.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })) });
  }
  await prisma.auditLog.create({ data: { userId: admin.id, action: "ROLE_CREATED", entityType: "Role", entityId: role.id } });
  revalidatePath("/admin/roles");
}

export async function createStaffUserAction(formData: FormData) {
  const admin = await requirePermission("user.create");
  const name = value(formData, "name");
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const roleId = value(formData, "roleId");
  if (!name || !email || password.length < 8 || !roleId) return;

  const passwordHash = await argon2.hash(password);
  const staff = await prisma.user.create({ data: { name, email, passwordHash } });
  await prisma.userRole.create({ data: { userId: staff.id, roleId } });
  await prisma.auditLog.create({ data: { userId: admin.id, action: "STAFF_USER_CREATED", entityType: "User", entityId: staff.id } });
  revalidatePath("/admin/users");
}

function revalidateCatalog() {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/brands");
  revalidatePath("/admin/products");
}

async function writeAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldData?: Record<string, unknown>,
  newData?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      oldData: oldData ? (oldData as Prisma.InputJsonValue) : undefined,
      newData: newData ? (newData as Prisma.InputJsonValue) : undefined,
    },
  });
}

export async function createCategoryAction(formData: FormData) {
  const admin = await requirePermission("category.create");
  const name = value(formData, "name");
  if (!name) return;

  const parentId = value(formData, "parentId") || null;
  const slug = await uniqueSlug("category", name, value(formData, "slug") || undefined);
  const description = value(formData, "description") || null;
  const heroVideoUrl = value(formData, "heroVideoUrl") || null;
  const heroPosterUrl = value(formData, "heroPosterUrl") || null;
  const heroFocalX = clampFocal(value(formData, "heroFocalX") || 50);
  const heroFocalY = clampFocal(value(formData, "heroFocalY") || 50);
  const heroScale = clampScale(value(formData, "heroScale") || 1);
  const sortOrder = Number(value(formData, "sortOrder") || 0);
  const status = formData.get("status") === "on";

  if (parentId) {
    const parent = await prisma.category.findFirst({ where: { id: parentId, deletedAt: null }, select: { id: true } });
    if (!parent) return;
  }

  const category = await prisma.category.create({
    data: {
      name,
      slug,
      parentId,
      description,
      heroVideoUrl,
      heroPosterUrl,
      heroFocalX,
      heroFocalY,
      heroScale,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      status,
    },
  });
  await writeAudit(admin.id, "CATEGORY_CREATED", "Category", category.id, undefined, {
    name, slug, parentId, status, heroVideoUrl, heroPosterUrl,
  });
  revalidateCatalog();
  redirect("/admin/categories");
}

export async function updateCategoryAction(formData: FormData) {
  const admin = await requirePermission("category.update");
  const id = value(formData, "id");
  const category = await prisma.category.findFirst({ where: { id, deletedAt: null } });
  if (!category) return;

  const name = value(formData, "name") || category.name;
  const parentId = value(formData, "parentId") || null;
  if (await wouldCreateCategoryCycle(id, parentId)) return;

  const slug = await uniqueSlug("category", name, value(formData, "slug") || category.slug, id);
  const next = {
    name,
    slug,
    parentId,
    description: value(formData, "description") || null,
    heroVideoUrl: value(formData, "heroVideoUrl") || null,
    heroPosterUrl: value(formData, "heroPosterUrl") || null,
    heroFocalX: clampFocal(value(formData, "heroFocalX") || category.heroFocalX),
    heroFocalY: clampFocal(value(formData, "heroFocalY") || category.heroFocalY),
    heroScale: clampScale(value(formData, "heroScale") || category.heroScale),
    sortOrder: Number(value(formData, "sortOrder") || category.sortOrder),
    status: formData.get("status") === "on",
  };

  await prisma.category.update({ where: { id }, data: next });
  await writeAudit(admin.id, "CATEGORY_UPDATED", "Category", id, {
    name: category.name,
    slug: category.slug,
    parentId: category.parentId,
    status: category.status,
    sortOrder: category.sortOrder,
    heroVideoUrl: category.heroVideoUrl,
    heroPosterUrl: category.heroPosterUrl,
  }, next);
  revalidateCatalog();
  redirect("/admin/categories");
}

export async function deleteCategoryAction(formData: FormData) {
  const admin = await requirePermission("category.delete");
  const id = value(formData, "id");
  const category = await prisma.category.findFirst({ where: { id, deletedAt: null } });
  if (!category) return;

  const activeProducts = await prisma.product.count({ where: { categoryId: id, deletedAt: null } });
  if (activeProducts > 0) return;

  await prisma.category.update({ where: { id }, data: { deletedAt: new Date(), status: false } });
  await writeAudit(admin.id, "CATEGORY_DELETED", "Category", id, { name: category.name, slug: category.slug });
  revalidateCatalog();
  redirect("/admin/categories");
}

export async function createBrandAction(formData: FormData) {
  const admin = await requirePermission("brand.create");
  const name = value(formData, "name");
  if (!name) return;

  const exists = await prisma.brand.findFirst({ where: { OR: [{ name }, { slug: slugifySafe(value(formData, "slug") || name) }], deletedAt: null } });
  if (exists) return;

  const slug = await uniqueSlug("brand", name, value(formData, "slug") || undefined);
  const brand = await prisma.brand.create({
    data: {
      name,
      slug,
      description: value(formData, "description") || null,
      status: formData.get("status") === "on",
    },
  });
  await writeAudit(admin.id, "BRAND_CREATED", "Brand", brand.id, undefined, { name, slug });
  revalidateCatalog();
}

export async function updateBrandAction(formData: FormData) {
  const admin = await requirePermission("brand.update");
  const id = value(formData, "id");
  const brand = await prisma.brand.findFirst({ where: { id, deletedAt: null } });
  if (!brand) return;

  const name = value(formData, "name") || brand.name;
  const slug = await uniqueSlug("brand", name, value(formData, "slug") || brand.slug, id);
  const next = {
    name,
    slug,
    description: value(formData, "description") || null,
    status: formData.get("status") === "on",
  };

  await prisma.brand.update({ where: { id }, data: next });
  await writeAudit(admin.id, "BRAND_UPDATED", "Brand", id, { name: brand.name, slug: brand.slug, status: brand.status }, next);
  revalidateCatalog();
}

export async function deleteBrandAction(formData: FormData) {
  const admin = await requirePermission("brand.delete");
  const id = value(formData, "id");
  const brand = await prisma.brand.findFirst({ where: { id, deletedAt: null } });
  if (!brand) return;

  await prisma.brand.update({ where: { id }, data: { deletedAt: new Date(), status: false } });
  await writeAudit(admin.id, "BRAND_DELETED", "Brand", id, { name: brand.name, slug: brand.slug });
  revalidateCatalog();
}

function slugifySafe(input: string) {
  return input.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
}

function parseProductInput(formData: FormData) {
  return z.object({
    name: z.string().min(2).max(180),
    slug: z.string().max(180).optional(),
    sku: z.string().min(1).max(80),
    shortDescription: z.string().max(300).optional(),
    description: z.string().max(8000).optional(),
    categoryId: z.string().min(1),
    brandId: z.string().optional(),
    productType: z.enum(["SIMPLE", "VARIABLE"]),
    status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]),
    isFeatured: z.boolean(),
    minOrderQuantity: z.number().int().min(1).max(100000),
    quantity: z.number().int().min(0).max(1000000),
    mainImage: z.string().max(1000).optional(),
    galleryImages: z.string().max(4000).optional(),
    fitMode: z.enum(["AUTO", "COVER", "CONTAIN"]).optional(),
    focalX: z.number().optional(),
    focalY: z.number().optional(),
    visualScale: z.number().optional(),
    priceAmount: z.string().optional(),
  }).parse({
    name: value(formData, "name"),
    slug: value(formData, "slug") || undefined,
    sku: value(formData, "sku"),
    shortDescription: value(formData, "shortDescription") || undefined,
    description: value(formData, "description") || undefined,
    categoryId: value(formData, "categoryId"),
    brandId: value(formData, "brandId") || undefined,
    productType: value(formData, "productType") || "SIMPLE",
    status: value(formData, "status") || "DRAFT",
    isFeatured: formData.get("isFeatured") === "on",
    minOrderQuantity: Number(value(formData, "minOrderQuantity") || 1),
    quantity: Number(value(formData, "quantity") || 0),
    mainImage: value(formData, "mainImage") || undefined,
    galleryImages: value(formData, "galleryImages") || undefined,
    fitMode: parseFitMode(value(formData, "fitMode")),
    focalX: clampFocal(value(formData, "focalX") || 50),
    focalY: clampFocal(value(formData, "focalY") || 50),
    visualScale: clampScale(value(formData, "visualScale") || 1),
    priceAmount: value(formData, "priceAmount") || undefined,
  });
}

async function assertCatalogRefs(categoryId: string, brandId?: string) {
  const category = await prisma.category.findFirst({ where: { id: categoryId, deletedAt: null }, select: { id: true } });
  if (!category) throw new Error("Category not found");
  if (brandId) {
    const brand = await prisma.brand.findFirst({ where: { id: brandId, deletedAt: null }, select: { id: true } });
    if (!brand) throw new Error("Brand not found");
  }
}

async function syncProductPrice(admin: AuthUser, productId: string, amountRaw: string | undefined) {
  if (amountRaw === undefined) return;
  if (!hasPermission(admin, "price.create") && !hasPermission(admin, "price.update")) return;

  const wholesale = await prisma.priceGroup.findUnique({ where: { slug: "wholesale" } });
  if (!wholesale) return;

  const current = await prisma.price.findFirst({
    where: { productId, priceGroupId: wholesale.id, variantId: null },
  });

  if (!amountRaw) {
    if (current && hasPermission(admin, "price.delete")) {
      await prisma.price.delete({ where: { id: current.id } });
      await writeAudit(admin.id, "PRICE_DELETED", "Price", current.id, { productId, amount: current.amount.toString() });
    }
    return;
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount < 0) return;
  if (current && !hasPermission(admin, "price.update")) return;
  if (!current && !hasPermission(admin, "price.create")) return;

  const price = current
    ? await prisma.price.update({ where: { id: current.id }, data: { amount } })
    : await prisma.price.create({ data: { productId, priceGroupId: wholesale.id, amount, variantId: null } });

  const previous = current?.amount.toString();
  const next = price.amount.toString();
  if (previous !== next) {
    await writeAudit(
      admin.id,
      current ? "PRICE_UPDATED" : "PRICE_CREATED",
      "Price",
      price.id,
      current ? { amount: previous } : undefined,
      { productId, amount: next, priceGroup: "wholesale" },
    );
  }
}

export async function createProductAction(formData: FormData) {
  const admin = await requirePermission("product.create");
  const input = parseProductInput(formData);
  await assertCatalogRefs(input.categoryId, input.brandId);

  const skuTaken = await prisma.product.findFirst({ where: { sku: input.sku }, select: { id: true } });
  const variantSkuTaken = await prisma.productVariant.findFirst({ where: { sku: input.sku }, select: { id: true } });
  if (skuTaken || variantSkuTaken) redirect("/admin/products/new?error=sku");
  if (input.productType === "VARIABLE" && input.status === "ACTIVE") redirect("/admin/products/new?error=variants");

  const slug = await uniqueSlug("product", input.name, input.slug);
  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug,
      sku: input.sku,
      shortDescription: input.shortDescription ?? null,
      description: input.description ?? null,
      categoryId: input.categoryId,
      brandId: input.brandId ?? null,
      productType: input.productType,
      status: input.productType === "VARIABLE" ? "DRAFT" : input.status,
      isFeatured: input.isFeatured,
      minOrderQuantity: input.minOrderQuantity,
      createdById: admin.id,
      updatedById: admin.id,
      inventory: input.productType === "SIMPLE" ? { create: { quantity: input.quantity } } : undefined,
    },
  });

  await replaceProductImages(product.id, admin.id, input.mainImage ?? null, parseImageUrls(input.galleryImages ?? ""), {
    fitMode: input.fitMode ?? "AUTO",
    focalX: input.focalX ?? 50,
    focalY: input.focalY ?? 50,
    visualScale: input.visualScale ?? 1,
  });
  if (input.productType === "SIMPLE" && input.priceAmount) await syncProductPrice(admin, product.id, input.priceAmount);
  await writeAudit(admin.id, "PRODUCT_CREATED", "Product", product.id, undefined, { name: product.name, sku: product.sku, slug });
  revalidateCatalog();
  redirect("/admin/products");
}

export async function updateProductAction(formData: FormData) {
  const admin = await requirePermission("product.update");
  const id = value(formData, "id");
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: { inventory: true },
  });
  if (!product) return;

  const input = parseProductInput(formData);
  await assertCatalogRefs(input.categoryId, input.brandId);

  const skuTaken = await prisma.product.findFirst({ where: { sku: input.sku, id: { not: id } }, select: { id: true } });
  const variantSkuTaken = await prisma.productVariant.findFirst({ where: { sku: input.sku }, select: { id: true } });
  if (skuTaken || variantSkuTaken) redirect(`/admin/products/${id}/edit?error=sku`);
  if (input.productType === "VARIABLE" && input.status === "ACTIVE") {
    const activeVariants = await prisma.productVariant.count({ where: { productId: id, status: "ACTIVE" } });
    if (activeVariants < 1) redirect(`/admin/products/${id}/edit?error=variants`);
  }

  const slug = await uniqueSlug("product", input.name, input.slug, id);
  const oldData = { name: product.name, sku: product.sku, slug: product.slug, status: product.status, categoryId: product.categoryId };
  await prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      slug,
      sku: input.sku,
      shortDescription: input.shortDescription ?? null,
      description: input.description ?? null,
      categoryId: input.categoryId,
      brandId: input.brandId ?? null,
      productType: input.productType,
      status: input.status,
      isFeatured: input.isFeatured,
      minOrderQuantity: input.minOrderQuantity,
      updatedById: admin.id,
      inventory:
        input.productType === "SIMPLE"
          ? {
              upsert: {
                create: { quantity: input.quantity },
                update: { quantity: input.quantity },
              },
            }
          : undefined,
    },
  });

  if (input.productType === "VARIABLE") {
    const leftover = await prisma.inventory.findUnique({ where: { productId: id } });
    if (leftover && leftover.reservedQuantity === 0) {
      await prisma.inventory.delete({ where: { id: leftover.id } });
    }
  }

  await replaceProductImages(product.id, admin.id, input.mainImage ?? null, parseImageUrls(input.galleryImages ?? ""), {
    fitMode: input.fitMode ?? "AUTO",
    focalX: input.focalX ?? 50,
    focalY: input.focalY ?? 50,
    visualScale: input.visualScale ?? 1,
  });
  if (input.productType === "SIMPLE") await syncProductPrice(admin, product.id, input.priceAmount);
  await writeAudit(admin.id, "PRODUCT_UPDATED", "Product", id, oldData, { name: input.name, sku: input.sku, slug, status: input.status });
  revalidateCatalog();
  redirect(`/admin/products/${id}/edit`);
}

export async function deleteProductAction(formData: FormData) {
  const admin = await requirePermission("product.delete");
  const id = value(formData, "id");
  const product = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!product) return;

  await prisma.product.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE", updatedById: admin.id } });
  await writeAudit(admin.id, "PRODUCT_DELETED", "Product", id, { name: product.name, sku: product.sku });
  revalidateCatalog();
  redirect("/admin/products");
}
