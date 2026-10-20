"use client";

import { useMemo } from "react";
import type { StorefrontProduct } from "../../lib/catalog/types";

export function resolveSelectedVariant(
  product: StorefrontProduct,
  selected: Record<string, string>,
) {
  const attributes = product.attributes ?? [];
  const variants = product.variants ?? [];
  if (attributes.length === 0) return null;
  const chosen = attributes.map((attribute) => selected[attribute.id]).filter(Boolean);
  if (chosen.length !== attributes.length) return null;
  return variants.find((variant) => attributes.every((attribute) => variant.valueIds.includes(selected[attribute.id]))) ?? null;
}

export function VariantPicker({
  product,
  selected,
  onChange,
}: {
  product: StorefrontProduct;
  selected: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const attributes = product.attributes ?? [];
  const variants = product.variants ?? [];

  const enabled = useMemo(() => {
    return (attributeId: string, valueId: string) => {
      const next = { ...selected, [attributeId]: valueId };
      return variants.some((variant) =>
        attributes.every((attribute) => {
          const chosen = next[attribute.id];
          return !chosen || variant.valueIds.includes(chosen);
        }),
      );
    };
  }, [attributes, selected, variants]);

  if (attributes.length === 0) return null;

  return (
    <div className="sf-variant-picker">
      {attributes.map((attribute) => (
        <div key={attribute.id} className="sf-variant-group">
          <p className="sf-kicker">{attribute.name}</p>
          <div className="sf-variant-options">
            {attribute.values.map((item) => {
              const active = selected[attribute.id] === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sf-variant-option${active ? " is-active" : ""}`}
                  disabled={!enabled(attribute.id, item.id)}
                  onClick={() => onChange({ ...selected, [attribute.id]: item.id })}
                  style={attribute.type === "COLOR" && item.colorHex ? { background: item.colorHex } : undefined}
                >
                  {attribute.type === "COLOR" ? <span className="sf-sr-only">{item.value}</span> : item.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
