"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CURRENCY_COOKIE } from "../../config/currencies";
import { listActiveDisplayCurrencies } from "../currency/catalog";
import { parseCurrencyCookie } from "../currency/format";

export async function setDisplayCurrencyAction(code: string) {
  const catalog = await listActiveDisplayCurrencies();
  const next = parseCurrencyCookie(code, catalog);
  const jar = await cookies();
  jar.set(CURRENCY_COOKIE, next, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
