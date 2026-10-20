"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addToCartAction } from "../../lib/actions/cart";
import { commerceMessage } from "../../lib/commerce/errors";
import { useCartSession } from "./cart-session";

export function AddToCartForm({
  productId,
  variantId,
  minOrderQuantity,
  next,
  inStock,
  availableQuantity,
}: {
  productId: string;
  variantId?: string;
  minOrderQuantity: number;
  next: string;
  inStock: boolean;
  availableQuantity?: number;
}) {
  const router = useRouter();
  const { replaceCart } = useCartSession();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  if (!inStock) return <p>Currently unavailable</p>;
  return (
    <form
      className="sf-cart-add"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const quantity = Number(formData.get("quantity"));
        if (
          availableQuantity != null
          && Number.isFinite(availableQuantity)
          && Number.isFinite(quantity)
          && quantity > availableQuantity
        ) {
          setAdded(false);
          setError(commerceMessage("STOCK", undefined, availableQuantity));
          return;
        }
        setError(null);
        startTransition(async () => {
          const result = await addToCartAction(formData);
          if (!result.ok) {
            setAdded(false);
            setError(commerceMessage(result.error, result.minOrderQuantity, result.availableQuantity));
            return;
          }
          replaceCart(result.cart);
          setAdded(true);
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      {variantId && <input type="hidden" name="variantId" value={variantId} />}
      <input type="hidden" name="next" value={next} />
      <label className="sf-field">
        Quantity
        <input name="quantity" type="number" min={minOrderQuantity} defaultValue={minOrderQuantity} required />
      </label>
      <button className="sf-btn" type="submit" disabled={pending} aria-busy={pending}>
        <span>{pending ? "Adding…" : "Add to cart"}</span>
      </button>
      {error && <p className="error" role="alert">{error}</p>}
      {added && !error && (
        <p className="sf-cart-feedback" role="status">
          Added to cart.{" "}
          <Link className="sf-text-link" href="/cart">Open cart</Link>
        </p>
      )}
    </form>
  );
}
