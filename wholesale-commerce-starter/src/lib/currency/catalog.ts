import { cache } from "react";
import { listOdooCurrencies, type OdooCurrencyCatalog } from "../odoo/currencies";

const EMPTY_CATALOG: OdooCurrencyCatalog = {
  companyCurrency: "",
  date: null,
  currencies: [],
};

export const getOdooCurrencyCatalog = cache(async (): Promise<OdooCurrencyCatalog> => {
  try {
    return await listOdooCurrencies();
  } catch {
    return EMPTY_CATALOG;
  }
});

export const listActiveDisplayCurrencies = cache(async () => {
  return (await getOdooCurrencyCatalog()).currencies;
});
