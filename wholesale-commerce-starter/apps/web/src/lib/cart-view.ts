export type CartLineIssue = "UNAVAILABLE" | "PRICE" | "MINIMUM" | "STOCK" | null;

export type CartViewItem = {
  id: string;
  productId: string;
  variantId: string | null;
  variantName: string | null;
  name: string;
  slug: string;
  sku: string;
  quantity: number;
  minOrderQuantity: number;
  available: number;
  unitPrice: string;
  lineTotal: string;
  currency: string;
  image: string | null;
  issue: CartLineIssue;
  templateId?: string;
  uom?: string | null;
};

export type CartView = {
  id: string;
  itemCount: number;
  subtotal: string;
  currency: string;
  canCheckout: boolean;
  items: CartViewItem[];
  amountUntaxed?: string;
  amountTax?: string;
  amountTotal?: string;
};

export type CartMutationResult =
  | { ok: true; cart: CartView | null }
  | { ok: false; error: string; minOrderQuantity?: number; availableQuantity?: number };

export function emptyCartView(): CartView {
  return {
    id: "",
    itemCount: 0,
    subtotal: "0.00",
    currency: "USD",
    canCheckout: false,
    items: [],
    amountUntaxed: "0.00",
    amountTax: "0.00",
    amountTotal: "0.00",
  };
}

export function cartSignature(cart: CartView | null) {
  if (!cart) return "null";
  return [
    cart.id,
    String(cart.itemCount),
    cart.subtotal,
    cart.amountTotal ?? "",
    ...cart.items.map((item) => `${item.id}:${item.quantity}`),
  ].join("|");
}
