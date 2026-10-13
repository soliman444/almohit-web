"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { cartSignature, emptyCartView, type CartMutationResult, type CartView } from "../../lib/cart-view";
import { commerceMessage } from "../../lib/commerce-errors";

type CartSessionValue = {
  cart: CartView | null;
  replaceCart: (cart: CartView | null) => void;
  pending: boolean;
  error: string | null;
  runCartMutation: (
    action: (formData: FormData) => Promise<CartMutationResult>,
    formData: FormData,
  ) => void;
};

const CartSessionContext = createContext<CartSessionValue | null>(null);

export function CartSessionProvider({
  initialCart,
  children,
}: {
  initialCart: CartView | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [cart, setCart] = useState(initialCart);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const serverKey = cartSignature(initialCart);
  const [seenServerKey, setSeenServerKey] = useState(serverKey);
  if (serverKey !== seenServerKey && !pending) {
    setSeenServerKey(serverKey);
    setCart(initialCart);
  }

  const replaceCart = useCallback((next: CartView | null) => {
    setCart(next);
  }, []);

  const runCartMutation = useCallback((
    action: (formData: FormData) => Promise<CartMutationResult>,
    formData: FormData,
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(commerceMessage(result.error, result.minOrderQuantity, result.availableQuantity));
        return;
      }
      setCart(result.cart ?? emptyCartView());
      router.refresh();
    });
  }, [router]);

  const value = useMemo(
    () => ({ cart, replaceCart, pending, error, runCartMutation }),
    [cart, error, pending, replaceCart, runCartMutation],
  );

  return <CartSessionContext.Provider value={value}>{children}</CartSessionContext.Provider>;
}

export function useCartSession() {
  const ctx = useContext(CartSessionContext);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const runFallback = useCallback((
    action: (formData: FormData) => Promise<CartMutationResult>,
    formData: FormData,
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(commerceMessage(result.error, result.minOrderQuantity, result.availableQuantity));
        return;
      }
      router.refresh();
    });
  }, [router]);

  return ctx ?? {
    cart: null,
    replaceCart: () => {},
    pending,
    error,
    runCartMutation: runFallback,
  };
}
