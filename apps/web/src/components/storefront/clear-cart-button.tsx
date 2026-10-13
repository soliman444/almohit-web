"use client";

import { clearCartAction } from "../../lib/commerce-actions";
import { useCartSession } from "./cart-session";

export function ClearCartButton() {
  const { runCartMutation, pending } = useCartSession();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        runCartMutation(clearCartAction, new FormData(event.currentTarget));
      }}
    >
      <button className="sf-btn is-subtle" type="submit" disabled={pending} aria-busy={pending}>
        <span>{pending ? "Clearing…" : "Clear cart"}</span>
      </button>
    </form>
  );
}
