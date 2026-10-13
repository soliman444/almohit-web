import type { MoneyDto } from "@almohit/contracts";

export type CatalogPriceTarget = {
  id: string;
  productType: "SIMPLE" | "VARIABLE";
  variantIds: string[];
};

export type { MoneyDto };
