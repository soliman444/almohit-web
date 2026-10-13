"use client";

import { createContext, useContext, type ReactNode } from "react";
import { EMPTY_CURRENCY_CATALOG, type DisplayCurrencyCode, type DisplayCurrencyConfig } from "../../config/currencies";
import { formatDisplayMoney, type DisplayMoneyInput } from "../../lib/currency";

type DisplayCurrencyState = {
  currency: DisplayCurrencyCode;
  catalog: DisplayCurrencyConfig[];
};

const DisplayCurrencyContext = createContext<DisplayCurrencyState>({
  currency: "",
  catalog: EMPTY_CURRENCY_CATALOG,
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

export function useFormatDisplayMoney() {
  const { currency, catalog } = useContext(DisplayCurrencyContext);
  return (amount: DisplayMoneyInput) => formatDisplayMoney(amount, currency, catalog);
}
