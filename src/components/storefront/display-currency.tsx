"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DISPLAY_CURRENCY_LIST, DEFAULT_DISPLAY_CURRENCY, type DisplayCurrencyCode, type DisplayCurrencyConfig } from "../../config/currencies";
import { formatCurrencyFromUSD, type DisplayMoneyInput } from "../../lib/currency";

type DisplayCurrencyState = {
  currency: DisplayCurrencyCode;
  catalog: DisplayCurrencyConfig[];
};

const DisplayCurrencyContext = createContext<DisplayCurrencyState>({
  currency: DEFAULT_DISPLAY_CURRENCY,
  catalog: DISPLAY_CURRENCY_LIST,
});

export function DisplayCurrencyProvider({
  currency,
  catalog,
  children,
}: {
  currency: DisplayCurrencyCode;
  catalog: DisplayCurrencyConfig[];
  children: ReactNode;
}) {
  return <DisplayCurrencyContext.Provider value={{ currency, catalog }}>{children}</DisplayCurrencyContext.Provider>;
}

export function useDisplayCurrency() {
  return useContext(DisplayCurrencyContext).currency;
}

export function useCurrencyCatalog() {
  return useContext(DisplayCurrencyContext).catalog;
}

export function useFormatFromUSD() {
  const { currency, catalog } = useContext(DisplayCurrencyContext);
  return (amount: DisplayMoneyInput) => formatCurrencyFromUSD(amount, currency, catalog);
}
