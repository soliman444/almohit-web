"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasPermission, requirePermission } from "./auth";
import { slugify } from "./catalog";
import { prisma } from "./db/prisma";
import { combinationKey, cartesianCombinations, defaultVariantSku, variantDisplayName } from "./variant-rules";

function value(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function values(fd: FormData, key: string) {
  return fd.getAll(key).map((item) => String(item).trim()).filter(Boolean);
}

function revalidateProduct(id: string) {
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}/edit`);
  revalidatePath("/admin/attributes");
  revalidatePath("/", "layout");
}

export async function createAttributeAction(formData: FormData) {
  await requirePermission("product.update");
  const name = value(formData, "name");
  const type = z.enum(["TEXT", "COLOR", "SELECT"]).parse(value(formData, "type") || "SELECT");
  if (name.length < 1) redirect("/admin/attributes");
  const slug = slugify(value(formData, "slug") || name);
  await prisma.attribute.create({ data: { name, slug, type } });
  revalidatePath("/admin/attributes");
  redirect("/admin/attributes");
}

export async function addAttributeValueAction(formData: FormData) {
  await requirePermission("product.update");
  const attributeId = value(formData, "attributeId");
  const label = value(formData, "value");
  if (!attributeId || !label) redirect("/admin/attributes");
  const count = await prisma.attributeValue.count({ where: { attributeId } });
  await prisma.attributeValue.create({
    data: {
      attributeId,
      value: label,
      slug: slugify(label),
      colorHex: value(formData, "colorHex") || null,
      sortOrder: count,
    },
  });
  revalidatePath("/admin/attributes");
  redirect("/admin/attributes");
}

export async function assignProductAttributesAction(formData: FormData) {
  const admin = await requirePermission("product.update");
  const productId = value(formData, "productId");
  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!product) return;
  if (product.productType !== "VARIABLE") {
    await prisma.product.update({ where: { id: productId }, data: { productType: "VARIABLE" } });
  }
  const attributeIds = values(formData, "attributeId");
  const allowedValueIds = values(formData, "allowedValueId");
  const allowedCatalog = attributeIds.length
    ? await prisma.attributeValue.findMany({
        where: { id: { in: allowedValueIds }, attributeId: { in: attributeIds } },
        select: { id: true },
      })
    : [];
  const scopedAllowed = allowedCatalog.map((item) => item.id);

  await prisma.$transaction(async (tx) => {
    await tx.productAttribute.deleteMany({ where: { productId } });
    await tx.productAllowedValue.deleteMany({ where: { productId } });
    await tx.productAttribute.createMany({
      data: attributeIds.map((attributeId, sortOrder) => ({ productId, attributeId, sortOrder })),
    });
    if (scopedAllowed.length) {
      await tx.productAllowedValue.createMany({
        data: scopedAllowed.map((attributeValueId) => ({ productId, attributeValueId })),
      });
    }
  });
  await prisma.auditLog.create({
    data: { userId: admin.id, action: "PRODUCT_ATTRIBUTES_UPDATED", entityType: "Product", entityId: productId, newData: { attributeIds } },
  });
  revalidateProduct(productId);
  redirect(`/admin/products/${productId}/edit`);
}

export async function generateProductVariantsAction(formData: FormData) {
  const admin = await requirePermission("product.update");
  const productId = value(formData, "productId");
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: {
      attributes: { include: { attribute: { include: { values: true } } }, orderBy: { sortOrder: "asc" } },
      allowedValues: true,
      variants: { select: { combinationKey: true, sku: true } },
    },
  });
  if (!product) redirect(`/admin/products/${productId}/edit?error=variants`);
  if (product.productType !== "VARIABLE") {
    await prisma.product.update({ where: { id: productId }, data: { productType: "VARIABLE" } });
  }

  const allowed = new Set(product.allowedValues.map((item) => item.attributeValueId));
  if (product.attributes.length === 0) redirect(`/admin/products/${productId}/edit?error=attributes`);
  const groups = product.attributes.map((assignment) =>
    assignment.attribute.values
      .filter((item) => allowed.has(item.id))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => item.id),
  );
  if (groups.some((group) => group.length === 0)) redirect(`/admin/products/${productId}/edit?error=attributes`);
  const combos = cartesianCombinations(groups);
  const existing = new Set(product.variants.map((variant) => variant.combinationKey));
  const usedSkus = new Set(product.variants.map((variant) => variant.sku));
  const valueMap = new Map(
    product.attributes.flatMap((assignment) => assignment.attribute.values.map((item) => [item.id, item])),
  );

  await prisma.$transaction(async (tx) => {
    for (const valueIds of combos) {
      const key = combinationKey(valueIds);
      if (existing.has(key)) continue;
      const selected = valueIds.map((id) => valueMap.get(id)).filter(Boolean) as Array<{ value: string; slug: string }>;
      let sku = defaultVariantSku(product.sku, selected.map((item) => item.slug));
      let suffix = 2;
      while (usedSkus.has(sku) || (await tx.product.findFirst({ where: { sku } })) || (await tx.productVariant.findFirst({ where: { sku } }))) {
        sku = `${defaultVariantSku(product.sku, selected.map((item) => item.slug))}-${suffix}`;
        suffix += 1;
      }
      usedSkus.add(sku);
      const variant = await tx.productVariant.create({
        data: {
          productId,
          sku,
          name: variantDisplayName(selected),
          status: "ACTIVE",
          combinationKey: key,
          values: { create: valueIds.map((attributeValueId) => ({ attributeValueId })) },
          inventory: { create: { quantity: 0 } },
        },
      });
      existing.add(key);
      await tx.auditLog.create({
        data: { userId: admin.id, action: "VARIANT_CREATED", entityType: "ProductVariant", entityId: variant.id, newData: { sku, productId } },
      });
    }
  });
  revalidateProduct(productId);
  redirect(`/admin/products/${productId}/edit`);
}

export async function updateProductVariantAction(formData: FormData) {
  const admin = await requirePermission("product.update");
  const productId = value(formData, "productId");
  const variantId = value(formData, "variantId");
  const sku = value(formData, "sku");
  const status = z.enum(["ACTIVE", "INACTIVE"]).parse(value(formData, "status") || "ACTIVE");
  const quantity = Number(value(formData, "quantity") || "0");
  const priceAmount = value(formData, "priceAmount");
  const weightRaw = value(formData, "weight");

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
    include: { inventory: true, product: true },
  });
  if (!variant) redirect(`/admin/products/${productId}/edit`);

  const skuTaken =
    (await prisma.productVariant.findFirst({ where: { sku, id: { not: variantId } }, select: { id: true } })) ||
    (await prisma.product.findFirst({ where: { sku }, select: { id: true } }));
  if (skuTaken) redirect(`/admin/products/${productId}/edit?error=sku`);

  await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      sku,
      status,
      weight: weightRaw ? weightRaw : null,
    },
  });
  await prisma.inventory.upsert({
    where: { variantId },
    create: { variantId, quantity: Number.isFinite(quantity) ? quantity : 0 },
    update: { quantity: Number.isFinite(quantity) ? quantity : 0 },
  });

  if (hasPermission(admin, "price.update") || hasPermission(admin, "price.create") || hasPermission(admin, "price.delete")) {
    const wholesale = await prisma.priceGroup.findUnique({ where: { slug: "wholesale" } });
    if (wholesale) {
      const current = await prisma.price.findFirst({
        where: { variantId, priceGroupId: wholesale.id },
      });
      if (!priceAmount && current) {
        await prisma.price.delete({ where: { id: current.id } });
      } else if (priceAmount) {
        const amount = Number(priceAmount);
        if (Number.isFinite(amount) && amount >= 0) {
          if (current) await prisma.price.update({ where: { id: current.id }, data: { amount } });
          else await prisma.price.create({ data: { productId, variantId, priceGroupId: wholesale.id, amount } });
        }
      }
    }
  }

  await prisma.auditLog.create({
    data: { userId: admin.id, action: "VARIANT_UPDATED", entityType: "ProductVariant", entityId: variantId, newData: { sku, status, quantity } },
  });
  revalidateProduct(productId);
  redirect(`/admin/products/${productId}/edit`);
}

export async function disableProductVariantAction(formData: FormData) {
  const admin = await requirePermission("product.update");
  const productId = value(formData, "productId");
  const variantId = value(formData, "variantId");
  const variant = await prisma.productVariant.findFirst({ where: { id: variantId, productId } });
  if (!variant) redirect(`/admin/products/${productId}/edit`);
  await prisma.productVariant.update({ where: { id: variantId }, data: { status: "INACTIVE" } });
  await prisma.auditLog.create({
    data: { userId: admin.id, action: "VARIANT_DISABLED", entityType: "ProductVariant", entityId: variantId, newData: { productId } },
  });
  revalidateProduct(productId);
  redirect(`/admin/products/${productId}/edit`);
}

export async function deleteProductVariantAction(formData: FormData) {
  const admin = await requirePermission("product.update");
  const productId = value(formData, "productId");
  const variantId = value(formData, "variantId");
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
    include: { inventory: true, _count: { select: { orderItems: true, cartItems: true } } },
  });
  if (!variant) redirect(`/admin/products/${productId}/edit`);
  if ((variant.inventory?.reservedQuantity ?? 0) > 0 || variant._count.orderItems > 0 || variant._count.cartItems > 0) {
    redirect(`/admin/products/${productId}/edit?error=variantdelete`);
  }
  await prisma.productVariant.delete({ where: { id: variantId } });
  await prisma.auditLog.create({
    data: { userId: admin.id, action: "VARIANT_DELETED", entityType: "ProductVariant", entityId: variantId, oldData: { sku: variant.sku, productId } },
  });
  revalidateProduct(productId);
  redirect(`/admin/products/${productId}/edit`);
}
