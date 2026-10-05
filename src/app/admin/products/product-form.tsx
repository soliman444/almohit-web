"use client";

import { useState } from "react";
import { ImageFramingFields } from "../../../components/admin/image-framing";
import { createProductAction, updateProductAction } from "../../../lib/actions";
import type { MediaFitMode } from "../../../lib/media-system";
import { VariantEditor, type VariantEditorProps } from "./variant-editor";

type CategoryOption = { id: string; name: string; depth: number };
type BrandOption = { id: string; name: string };

export function ProductForm({
  action,
  categories,
  brands,
  canEditPrice,
  error,
  product,
  variantEditor,
}: {
  action: typeof createProductAction | typeof updateProductAction;
  categories: CategoryOption[];
  brands: BrandOption[];
  canEditPrice: boolean;
  error?: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    shortDescription: string | null;
    description: string | null;
    categoryId: string;
    brandId: string | null;
    productType: "SIMPLE" | "VARIABLE";
    status: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
    isFeatured: boolean;
    minOrderQuantity: number;
    quantity: number;
    variantCount: number;
    mainImage: string;
    galleryImages: string;
    fitMode?: MediaFitMode;
    focalX?: number;
    focalY?: number;
    visualScale?: number;
    priceAmount: string;
  };
  variantEditor?: VariantEditorProps;
}) {
  const savedType = product?.productType ?? "SIMPLE";
  const [productType, setProductType] = useState<"SIMPLE" | "VARIABLE">(savedType);
  const [mainImage, setMainImage] = useState(product?.mainImage ?? "");
  const isVariable = productType === "VARIABLE";
  const saved = Boolean(product?.id);

  return (
    <div className="stack">
      <form className="card stack form-wide" action={action}>
        {product && <input type="hidden" name="id" value={product.id} />}
        {error === "sku" && <p className="error">This SKU is already in use.</p>}
        {error === "variants" && <p className="error">A variable product needs at least one active variant before it can be active.</p>}
        {error === "attributes" && <p className="error">Assign attributes and allowed values, then save them, before generating variants.</p>}
        <div className="grid">
          <label className="field">Product name<input name="name" defaultValue={product?.name} required /></label>
          <label className="field">Slug<input name="slug" defaultValue={product?.slug} placeholder="Optional" /></label>
          <label className="field">SKU<input name="sku" defaultValue={product?.sku} required /></label>
        </div>
        <label className="field">Short description<input name="shortDescription" defaultValue={product?.shortDescription ?? ""} /></label>
        <label className="field">Full description<textarea name="description" defaultValue={product?.description ?? ""} /></label>
        <div className="grid">
          <label className="field">Category
            <select name="categoryId" defaultValue={product?.categoryId} required>
              <option value="">Select category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{"— ".repeat(category.depth)}{category.name}</option>)}
            </select>
          </label>
          <label className="field">Brand
            <select name="brandId" defaultValue={product?.brandId ?? ""}>
              <option value="">No brand</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
          </label>
          <label className="field">Type
            <select name="productType" value={productType} onChange={(event) => setProductType(event.target.value as "SIMPLE" | "VARIABLE")}>
              <option value="SIMPLE">Simple</option>
              <option value="VARIABLE">Variable</option>
            </select>
          </label>
        </div>
        {saved && savedType === "SIMPLE" && isVariable && (
          <p className="muted">Product-level stock and wholesale price will no longer be used. Configure attributes and variants below after you save this type.</p>
        )}
        {saved && savedType === "VARIABLE" && !isVariable && (product?.variantCount ?? 0) > 0 && (
          <p className="error">This product has {product?.variantCount} variants. Switching to Simple will stop using them for stock and price.</p>
        )}
        {!saved && isVariable && (
          <p className="muted">Save the product first to configure attributes and variants.</p>
        )}
        <div className="grid">
          <label className="field">Status
            <select name="status" defaultValue={product?.status && product.status !== "ARCHIVED" ? product.status : "DRAFT"}>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
          <label className="field">Minimum order<input name="minOrderQuantity" type="number" min={1} defaultValue={product?.minOrderQuantity ?? 1} /></label>
          {!isVariable && (
            <label className="field">Quantity<input name="quantity" type="number" min={0} defaultValue={product?.quantity ?? 0} /></label>
          )}
        </div>
        <label className="admin-check"><input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured} /> Featured product</label>
        <label className="field">Main image (URL or path)
          <input name="mainImage" value={mainImage} onChange={(event) => setMainImage(event.target.value)} placeholder="https://..." />
        </label>
        <label className="field">Gallery (one URL per line)<textarea name="galleryImages" defaultValue={product?.galleryImages} placeholder={"https://example.com/1.jpg\nhttps://example.com/2.jpg"} /></label>
        <ImageFramingFields
          src={mainImage}
          fitMode={product?.fitMode}
          focalX={product?.focalX}
          focalY={product?.focalY}
          visualScale={product?.visualScale}
        />
        {canEditPrice && !isVariable && (
          <label className="field">Wholesale price (USD)<input name="priceAmount" type="number" min={0} step="0.01" defaultValue={product?.priceAmount} placeholder="USD only" /></label>
        )}
        <p className="muted">VIDEO and 360 types exist in the database. Current storage is image URLs only.</p>
        <button className="btn">{product ? "Update product" : "Create product"}</button>
      </form>
      {saved && isVariable && variantEditor && <VariantEditor {...variantEditor} error={error} />}
    </div>
  );
}
