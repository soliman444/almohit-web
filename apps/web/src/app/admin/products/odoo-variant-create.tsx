"use client";

import { useMemo, useState } from "react";
import { AddAttributeValuePanel, CreateAttributePanel } from "./odoo-create-panels";

type OdooAdminAttribute = {
  id: number;
  name: string;
  values: Array<{ id: number; name: string }>;
};

type ComboRow = {
  valueIds: number[];
  labels: string[];
  sku: string;
  barcode: string;
  quantity: string;
  wholesalePrice: string;
  cost: string;
};

function cartesian(groups: Array<Array<{ id: number; name: string }>>): ComboRow[] {
  if (groups.length === 0) return [];
  return groups.reduce<ComboRow[]>((rows, group) => {
    if (rows.length === 0) {
      return group.map((value) => ({
        valueIds: [value.id],
        labels: [value.name],
        sku: "",
        barcode: "",
        quantity: "",
        wholesalePrice: "",
        cost: "",
      }));
    }
    return rows.flatMap((row) => group.map((value) => ({
      valueIds: [...row.valueIds, value.id],
      labels: [...row.labels, value.name],
      sku: "",
      barcode: "",
      quantity: "",
      wholesalePrice: "",
      cost: "",
    })));
  }, []);
}

export function OdooVariantCreate({
  attributes,
  onAttributesChange,
}: {
  attributes: OdooAdminAttribute[];
  onAttributesChange?: (attributes: OdooAdminAttribute[]) => void;
}) {
  const usable = attributes.filter((attribute) => attribute.values.length > 0);
  const [selectedAttributes, setSelectedAttributes] = useState<number[]>([]);
  const [selectedValues, setSelectedValues] = useState<number[]>([]);
  const [rows, setRows] = useState<ComboRow[]>([]);

  function replaceAttribute(next: OdooAdminAttribute) {
    const updated = attributes.some((attribute) => attribute.id === next.id)
      ? attributes.map((attribute) => (attribute.id === next.id ? next : attribute))
      : [...attributes, next];
    onAttributesChange?.(updated);
    if (!selectedAttributes.includes(next.id)) {
      const nextAttributes = [...selectedAttributes, next.id];
      const nextValues = [...selectedValues, ...next.values.map((value) => value.id)];
      setSelectedAttributes(nextAttributes);
      setSelectedValues(nextValues);
      rebuild(nextAttributes, nextValues, updated);
      return;
    }
    const added = next.values.filter((value) => !selectedValues.includes(value.id)).map((value) => value.id);
    if (added.length) {
      const nextValues = [...selectedValues, ...added];
      setSelectedValues(nextValues);
      rebuild(selectedAttributes, nextValues, updated);
    } else {
      rebuild(selectedAttributes, selectedValues, updated);
    }
  }

  const selected = useMemo(
    () => usable.filter((attribute) => selectedAttributes.includes(attribute.id)),
    [selectedAttributes, usable],
  );

  function rebuild(nextAttributes: number[], nextValues: number[], source = attributes) {
    const groups = source
      .filter((attribute) => nextAttributes.includes(attribute.id) && attribute.values.length > 0)
      .map((attribute) => attribute.values.filter((value) => nextValues.includes(value.id)));
    if (groups.length === 0 || groups.some((group) => group.length === 0)) {
      setRows([]);
      return;
    }
    setRows(cartesian(groups));
  }

  function toggleAttribute(id: number, checked: boolean) {
    const valueIds = usable.find((attribute) => attribute.id === id)?.values.map((value) => value.id) ?? [];
    const nextAttributes = checked
      ? [...selectedAttributes, id]
      : selectedAttributes.filter((item) => item !== id);
    const nextValues = checked
      ? selectedValues
      : selectedValues.filter((item) => !valueIds.includes(item));
    setSelectedAttributes(nextAttributes);
    setSelectedValues(nextValues);
    rebuild(nextAttributes, nextValues);
  }

  function toggleValue(id: number, checked: boolean) {
    const nextValues = checked ? [...selectedValues, id] : selectedValues.filter((item) => item !== id);
    setSelectedValues(nextValues);
    rebuild(selectedAttributes, nextValues);
  }

  function updateRow(index: number, field: keyof ComboRow, value: string) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  }

  const attributeLines = selected.map((attribute) => ({
    attribute_id: attribute.id,
    value_ids: attribute.values.filter((value) => selectedValues.includes(value.id)).map((value) => value.id),
  })).filter((line) => line.value_ids.length > 0);

  const variants = rows.map((row) => ({
    value_ids: row.valueIds,
    sku: row.sku || undefined,
    barcode: row.barcode || undefined,
    quantity: row.quantity ? Number(row.quantity) : 0,
    wholesale_price: row.wholesalePrice ? Number(row.wholesalePrice) : undefined,
    cost: row.cost ? Number(row.cost) : undefined,
  }));

  return (
    <div className="stack">
      <input type="hidden" name="attributeLinesJson" value={JSON.stringify(attributeLines)} />
      <input type="hidden" name="variantsJson" value={JSON.stringify(variants)} />
      <CreateAttributePanel onCreated={replaceAttribute} />
      {usable.length === 0 && (
        <p className="muted">No Odoo attributes with values are available yet. Create Color or Size above, then select it here.</p>
      )}
      {usable.map((attribute) => {
        const assigned = selectedAttributes.includes(attribute.id);
        return (
          <fieldset key={attribute.id} className="stack" style={{ border: "1px solid var(--line)", borderRadius: 16, padding: 16 }}>
            <label>
              <input
                type="checkbox"
                checked={assigned}
                onChange={(event) => toggleAttribute(attribute.id, event.target.checked)}
              />
              {" "}{attribute.name}
            </label>
            {assigned && (
              <div className="grid">
                {attribute.values.map((value) => (
                  <label key={value.id}>
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(value.id)}
                      onChange={(event) => toggleValue(value.id, event.target.checked)}
                    />
                    {" "}{value.name}
                  </label>
                ))}
              </div>
            )}
            {assigned && <AddAttributeValuePanel attributeId={attribute.id} onUpdated={replaceAttribute} />}
          </fieldset>
        );
      })}
      {rows.length > 0 && (
        <div className="admin-table-wrap">
          <p className="muted">{rows.length} native Odoo combinations. Stock and SKU are per variant. Template wholesale price and cost are the default; optional overrides apply to that variant.</p>
          <table className="table">
            <thead>
              <tr>
                <th>Combination</th>
                <th>SKU</th>
                <th>Barcode</th>
                <th>On-hand</th>
                <th>Price override</th>
                <th>Cost</th>
                <th>Image</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.valueIds.join("-")}>
                  <td>{row.labels.join(" / ")}</td>
                  <td><input value={row.sku} onChange={(event) => updateRow(index, "sku", event.target.value)} placeholder="Optional" /></td>
                  <td><input value={row.barcode} onChange={(event) => updateRow(index, "barcode", event.target.value)} placeholder="Optional" /></td>
                  <td><input type="number" min={0} value={row.quantity} onChange={(event) => updateRow(index, "quantity", event.target.value)} placeholder="0" /></td>
                  <td><input type="number" min={0} step="0.01" value={row.wholesalePrice} onChange={(event) => updateRow(index, "wholesalePrice", event.target.value)} placeholder="Default" /></td>
                  <td><input type="number" min={0} step="0.01" value={row.cost} onChange={(event) => updateRow(index, "cost", event.target.value)} placeholder="Default" /></td>
                  <td><input name={`variantImage:${row.valueIds.join("-")}`} type="file" accept="image/jpeg,image/png,image/gif,image/webp" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
