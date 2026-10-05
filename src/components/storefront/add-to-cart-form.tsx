import { addToCartAction } from "../../lib/commerce-actions";
import { OnceForm, OnceSubmit } from "./once-submit";

export function AddToCartForm({
  productId,
  variantId,
  minOrderQuantity,
  next,
  inStock,
}: {
  productId: string;
  variantId?: string;
  minOrderQuantity: number;
  next: string;
  inStock: boolean;
}) {
  if (!inStock) return <p>Currently unavailable</p>;
  return (
    <OnceForm className="sf-cart-add" action={addToCartAction}>
      <input type="hidden" name="productId" value={productId} />
      {variantId && <input type="hidden" name="variantId" value={variantId} />}
      <input type="hidden" name="next" value={next} />
      <label className="sf-field">
        Quantity
        <input name="quantity" type="number" min={minOrderQuantity} defaultValue={minOrderQuantity} />
      </label>
      <OnceSubmit className="sf-btn"><span>Add to cart</span></OnceSubmit>
    </OnceForm>
  );
}
