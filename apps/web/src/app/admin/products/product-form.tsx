"use client";

import { useState, type FormEvent } from "react";
import { ImageFramingFields } from "../../../components/admin/image-framing";
import { createProductAction } from "../../../lib/actions";
import type { MediaFitMode } from "../../../lib/media-system";
import { CreateBrandPanel, CreateCategoryPanel } from "./odoo-create-panels";
import { OdooVariantCreate } from "./odoo-variant-create";

type OdooAdminAttribute = {
  id: number;
  name: string;
  values: Array<{ id: number; name: string }>;
};

type CategoryOption = { id: string; name: string; depth: number };
type BrandOption = { id: string; name: string };

export function ProductForm({
  action,
  categories,
  brands,
  canEditPrice,
  error,
  product,
  odooCreate = false,
  attributes = [],
  canCreateCategory = false,
  canCreateBrand = false,
}: {
  action: typeof createProductAction;
  categories: CategoryOption[];
  brands: BrandOption[];
  canEditPrice: boolean;
  error?: string;
  odooCreate?: boolean;
  canCreateCategory?: boolean;
  canCreateBrand?: boolean;
  attributes?: OdooAdminAttribute[];
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
    costAmount?: string;
  };
}) {
  const savedType = product?.productType ?? "SIMPLE";
  const [productType, setProductType] = useState<"SIMPLE" | "VARIABLE">(odooCreate ? "SIMPLE" : savedType);
  const [mainImage, setMainImage] = useState(product?.mainImage ?? "");
  const [categoryList, setCategoryList] = useState(categories);
  const [brandList, setBrandList] = useState(brands);
  const [attributeList, setAttributeList] = useState(attributes);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [brandId, setBrandId] = useState(product?.brandId ?? "");
  const [clientError, setClientError] = useState("");
  const isVariable = productType === "VARIABLE";
  const saved = Boolean(product?.id);
  const odooVariable = odooCreate && isVariable;

  function onProductSubmit(event: FormEvent<HTMLFormElement>) {
    setClientError("");
    if (!odooVariable) return;
    const raw = (event.currentTarget.elements.namedItem("attributeLinesJson") as HTMLInputElement | null)?.value;
    let lines: Array<{ attribute_id?: number; value_ids?: number[] }> = [];
    try {
      lines = raw ? JSON.parse(raw) : [];
    } catch {
      lines = [];
    }
    if (!Array.isArray(lines) || lines.length === 0 || lines.some((line) => !line.value_ids?.length)) {
      event.preventDefault();
      setClientError("Select existing Odoo attributes and at least one value for each selected attribute.");
    }
  }

  return (
    <div className="stack">
      <form className="card stack form-wide" action={action} onSubmit={onProductSubmit}>
        {product && <input type="hidden" name="id" value={product.id} />}
        {odooCreate && <input type="hidden" name="productType" value={productType} />}
        {error === "sku" && <p className="error">This SKU is already in use.</p>}
        {error === "variants" && <p className="error">A variable product needs at least one active variant before it can be active.</p>}
        {error === "attributes" && <p className="error">Select existing Odoo attributes and at least one value for each selected attribute.</p>}
        {error === "simple" && <p className="error">Website create currently supports simple products only. Add variants later in Odoo.</p>}
        {error === "name" && <p className="error">Product name is required.</p>}
        {error === "category" && <p className="error">Choose an existing Odoo category.</p>}
        {error === "brand" && <p className="error">Choose an existing Odoo brand.</p>}
        {error === "moq" && <p className="error">Minimum order quantity must be greater than zero.</p>}
        {error === "image" && <p className="error">Upload a JPEG, PNG, GIF, or WebP image under 5 MB.</p>}
        {error === "price" && <p className="error">Enter a valid wholesale price.</p>}
        {error === "cost" && <p className="error">Enter a valid cost.</p>}
        {error === "stock" && <p className="error">Enter a valid initial quantity, or leave it at zero.</p>}
        {error === "odoo" && <p className="error">Odoo could not create this product. Sign in as staff and try again.</p>}
        {error === "permission" && <p className="error">The Odoo staff account cannot create products.</p>}
        {error === "unavailable" && <p className="error">Odoo is temporarily unavailable.</p>}
        {clientError && <p className="error" role="alert">{clientError}</p>}
        {odooCreate && <p className="muted">This product is created in Odoo as the signed-in Odoo staff user. Full management stays in the Odoo backend.</p>}
        <div className="grid">
          <label className="field">Product name<input name="name" defaultValue={product?.name} required /></label>
          {!odooCreate && <label className="field">Slug<input name="slug" defaultValue={product?.slug} placeholder="Optional" /></label>}
          <label className="field">
            {odooVariable ? "Template SKU" : "SKU"}
            <input name="sku" defaultValue={product?.sku} required={!odooVariable} placeholder={odooVariable ? "Optional" : undefined} />
          </label>
          {odooCreate && <label className="field">Barcode<input name="barcode" placeholder="Optional template barcode" /></label>}
        </div>
        {!odooCreate && <label className="field">Short description<input name="shortDescription" defaultValue={product?.shortDescription ?? ""} /></label>}
        <label className="field">Full description<textarea name="description" defaultValue={product?.description ?? ""} /></label>
        <div className="grid">
          <label className="field">Category
            <select name="categoryId" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
              <option value="">Select category</option>
              {categoryList.map((category) => <option key={category.id} value={category.id}>{"— ".repeat(category.depth)}{category.name}</option>)}
            </select>
          </label>
          <label className="field">Brand
            <select name="brandId" value={brandId} onChange={(event) => setBrandId(event.target.value)}>
              <option value="">No brand</option>
              {brandList.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
          </label>
          <label className="field">Type
            {odooCreate ? (
              <select value={productType} onChange={(event) => setProductType(event.target.value as "SIMPLE" | "VARIABLE")}>
                <option value="SIMPLE">Simple</option>
                <option value="VARIABLE">Variable</option>
              </select>
            ) : (
              <select name="productType" value={productType} onChange={(event) => setProductType(event.target.value as "SIMPLE" | "VARIABLE")}>
                <option value="SIMPLE">Simple</option>
                <option value="VARIABLE">Variable</option>
              </select>
            )}
          </label>
        </div>
        {odooCreate && (
          <div className="grid">
            {canCreateCategory && (
              <CreateCategoryPanel
                categories={categoryList}
                onCreated={(category) => {
                  setCategoryList((current) => [...current, category]);
                  setCategoryId(category.id);
                }}
              />
            )}
            {canCreateBrand && (
              <CreateBrandPanel
                onCreated={(brand) => {
                  setBrandList((current) => [...current, brand]);
                  setBrandId(brand.id);
                }}
              />
            )}
          </div>
        )}
        {saved && savedType === "SIMPLE" && isVariable && (
          <p className="muted">Product-level stock and wholesale price will no longer be used. Configure attributes and variants below after you save this type.</p>
        )}
        {saved && savedType === "VARIABLE" && !isVariable && (product?.variantCount ?? 0) > 0 && (
          <p className="error">This product has {product?.variantCount} variants. Switching to Simple will stop using them for stock and price.</p>
        )}
        {odooVariable && <OdooVariantCreate attributes={attributeList} onAttributesChange={setAttributeList} />}
        <div className="grid">
          <label className="field">Status
            <select name="status" defaultValue={odooCreate ? "ACTIVE" : (product?.status && product.status !== "ARCHIVED" ? product.status : "DRAFT")}>
              <option value="DRAFT">{odooCreate ? "Not saleable" : "Draft"}</option>
              <option value="ACTIVE">{odooCreate ? "Saleable" : "Active"}</option>
              <option value="INACTIVE">{odooCreate ? "Not saleable" : "Inactive"}</option>
            </select>
          </label>
          <label className="field">Minimum order<input name="minOrderQuantity" type="number" min={1} defaultValue={product?.minOrderQuantity ?? 1} /></label>
          {!isVariable && (
            <label className="field">
              {odooCreate ? "Initial on-hand (WH/Stock)" : "Quantity"}
              <input name="quantity" type="number" min={0} defaultValue={product?.quantity ?? 0} />
            </label>
          )}
        </div>
        {!odooCreate && <label className="admin-check"><input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured} /> Featured product</label>}
        {odooCreate ? (
          <>
            <label className="field">Main image
              <input name="image" type="file" accept="image/jpeg,image/png,image/gif,image/webp" />
            </label>
            <label className="field">Gallery images
              <input name="gallery" type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple />
            </label>
          </>
        ) : (
          <>
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
          </>
        )}
        {(canEditPrice || odooCreate) && (
          <div className="grid">
            <label className="field">
              {odooCreate ? (odooVariable ? "Default wholesale price" : "Wholesale price") : "Wholesale price (USD)"}
              <input name="priceAmount" type="number" min={0} step="0.01" defaultValue={product?.priceAmount} placeholder={odooCreate ? "Uses the Odoo wholesale list currency" : "USD only"} />
            </label>
            <label className="field">
              {odooCreate ? (odooVariable ? "Default cost" : "Cost") : "Cost (USD)"}
              <input name="costAmount" type="number" min={0} step="0.01" defaultValue={product?.costAmount} placeholder={odooCreate ? "Odoo Cost / standard_price" : "USD only"} />
            </label>
          </div>
        )}
        <p className="muted">
          {odooCreate
            ? odooVariable
              ? "Variable storable product. Odoo generates native variants. Main image stays on the template; gallery images are extra product.image records. Optional per-variant images use image_variant_1920."
              : "Simple storable product. Main image is image_1920. Gallery images are extra native records and do not replace the primary image."
            : "Images are stored in Odoo."}
        </p>
        <button className="btn" type="submit">{product ? "Update product" : "Create product"}</button>
      </form>
    </div>
  );
}
