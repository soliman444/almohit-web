import {
  removeCartItemAction,
  updateCartItemQuantityAction,
} from "../../lib/commerce-actions";
import type { CartViewItem } from "../../lib/commerce";
import { commerceMessage } from "../../lib/commerce-errors";
import { useFormatFromUSD } from "./display-currency";

export function CartLines({ items, next }: { items: CartViewItem[]; next: string }) {
  const formatMoney = useFormatFromUSD();
  return (
    <ul className="sf-cart-lines">
      {items.map((item) => (
        <li key={item.id} className="sf-cart-line">
          <div>
            <b>{item.name}{item.variantName ? ` · ${item.variantName}` : ""}</b>
            <p>{formatMoney(item.unitPrice)} · SKU {item.sku}</p>
            {item.issue && <p className="error">{commerceMessage(item.issue)}</p>}
          </div>
          <div className="sf-cart-line-tools">
            {item.issue !== "UNAVAILABLE" && item.issue !== "PRICE" && (
              <form action={updateCartItemQuantityAction}>
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="next" value={next} />
                <input
                  name="quantity"
                  type="number"
                  min={item.minOrderQuantity}
                  max={Math.max(item.available, item.minOrderQuantity)}
                  defaultValue={item.quantity}
                />
                <button className="sf-text-link" type="submit">Update</button>
              </form>
            )}
            <form action={removeCartItemAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <button className="sf-text-link" type="submit">Remove</button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
