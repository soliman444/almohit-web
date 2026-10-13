"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  assignProductAttributesAction,
  deleteProductVariantAction,
  disableProductVariantAction,
  generateProductVariantsAction,
  updateProductVariantAction,
} from "../../../lib/variant-actions";

type AttributeOption = {
  id: string;
  name: string;
  type: string;
  values: Array<{ id: string; value: string; colorHex: string | null }>;
};

type VariantRow = {
  id: string;
  sku: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  quantity: number;
  reserved: number;
  available: number;
  priceAmount: string;
  weight: string;
  selectedValues: string;
  canDelete: boolean;
};

export type VariantEditorProps = {
  productId: string;
  attributes: AttributeOption[];
  assignedAttributeIds: string[];
  allowedValueIds: string[];
  variants: VariantRow[];
  canEditPrice: boolean;
  error?: string;
};

export function VariantEditor({
  productId,
  attributes,
  assignedAttributeIds,
  allowedValueIds,
  variants,
  canEditPrice,
  error,
}: VariantEditorProps) {
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>(assignedAttributeIds);
  const [allowed, setAllowed] = useState<string[]>(allowedValueIds);

  const canGenerate = useMemo(() => {
    if (assignedAttributeIds.length === 0) return false;
    return assignedAttributeIds.every((attributeId) => {
      const attribute = attributes.find((item) => item.id === attributeId);
      return Boolean(attribute?.values.some((value) => allowedValueIds.includes(value.id)));
    });
  }, [allowedValueIds, assignedAttributeIds, attributes]);

  function toggleAttribute(id: string, checked: boolean) {
    setSelectedAttributes((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
    if (!checked) {
      const valueIds = attributes.find((item) => item.id === id)?.values.map((item) => item.id) ?? [];
      setAllowed((current) => current.filter((item) => !valueIds.includes(item)));
    }
  }

  function toggleValue(id: string, checked: boolean) {
    setAllowed((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
  }

  return (
    <div className="stack">
      <section className="card stack">
        <div className="actions" style={{ justifyContent: "space-between" }}>
          <h2>Attributes</h2>
          <Link href="/admin/attributes">Manage attributes</Link>
        </div>
        {error === "attributes" && <p className="error">Assign at least one attribute and one allowed value for each attribute before generating variants.</p>}
        {error === "sku" && <p className="error">That variant SKU is already in use.</p>}
        {error === "variantdelete" && <p className="error">This variant has orders or reserved stock and cannot be deleted.</p>}
        {attributes.length === 0 && <p className="muted">Create Color, Size, or other attributes first in Attributes.</p>}
        <form className="stack" action={assignProductAttributesAction}>
          <input type="hidden" name="productId" value={productId} />
          {attributes.map((attribute) => {
            const assigned = selectedAttributes.includes(attribute.id);
            return (
              <fieldset key={attribute.id} className="stack" style={{ border: "1px solid var(--line)", borderRadius: 16, padding: 16 }}>
                <label>
                  <input
                    type="checkbox"
                    name="attributeId"
                    value={attribute.id}
                    checked={assigned}
                    onChange={(event) => toggleAttribute(attribute.id, event.target.checked)}
                  />
                  {" "}{attribute.name} <span className="muted">{attribute.type}</span>
                </label>
                {assigned && (
                  <div className="grid">
                    {attribute.values.map((item) => (
                      <label key={item.id}>
                        <input
                          type="checkbox"
                          name="allowedValueId"
                          value={item.id}
                          checked={allowed.includes(item.id)}
                          onChange={(event) => toggleValue(item.id, event.target.checked)}
                        />
                        {" "}{item.value}
                      </label>
                    ))}
                    {attribute.values.length === 0 && <p className="muted">No values yet. Add them in Attributes.</p>}
                  </div>
                )}
              </fieldset>
            );
          })}
          <button className="btn secondary" type="submit">Save attributes</button>
        </form>
      </section>

      <section className="card stack">
        <h2>Variants</h2>
        <form action={generateProductVariantsAction}>
          <input type="hidden" name="productId" value={productId} />
          <button className="btn" type="submit" disabled={!canGenerate}>Generate combinations</button>
        </form>
        {!canGenerate && (
          <p className="muted">Save attributes first. Each selected attribute needs at least one allowed value.</p>
        )}
        {variants.length === 0 && <p className="muted">No variants yet.</p>}
        {variants.map((variant) => (
          <article key={variant.id} className="card stack">
            <p><b>{variant.name}</b></p>
            <p className="muted">Selected values: {variant.selectedValues || "—"}</p>
            <form className="stack" action={updateProductVariantAction}>
              <input type="hidden" name="productId" value={productId} />
              <input type="hidden" name="variantId" value={variant.id} />
              <div className="grid">
                <label className="field">SKU<input name="sku" defaultValue={variant.sku} required /></label>
                <label className="field">
                  Status
                  <select name="status" defaultValue={variant.status}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>
                <label className="field">Weight<input name="weight" defaultValue={variant.weight} /></label>
                <label className="field">Quantity<input name="quantity" type="number" min={0} defaultValue={variant.quantity} /></label>
                <p className="field"><span className="muted">Reserved</span><b>{variant.reserved}</b></p>
                <p className="field"><span className="muted">Available</span><b>{variant.available}</b></p>
                {canEditPrice && (
                  <label className="field">Variant price (USD)<input name="priceAmount" type="number" min={0} step="0.01" defaultValue={variant.priceAmount} /></label>
                )}
              </div>
              <div className="actions">
                <button className="btn secondary" type="submit">Save</button>
              </div>
            </form>
            <div className="actions">
              {variant.status === "ACTIVE" && (
                <form action={disableProductVariantAction}>
                  <input type="hidden" name="productId" value={productId} />
                  <input type="hidden" name="variantId" value={variant.id} />
                  <button className="btn secondary" type="submit">Disable</button>
                </form>
              )}
              {variant.canDelete && (
                <form action={deleteProductVariantAction}>
                  <input type="hidden" name="productId" value={productId} />
                  <input type="hidden" name="variantId" value={variant.id} />
                  <button className="btn danger" type="submit">Delete</button>
                </form>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
