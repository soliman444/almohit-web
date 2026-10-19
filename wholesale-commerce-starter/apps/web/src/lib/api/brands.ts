import { listOdooBrands } from "../odoo/catalog";

export async function fetchStorefrontBrands() {
  return listOdooBrands();
}
