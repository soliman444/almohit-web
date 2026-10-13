export const XMLID_MODULE = "almohit_legacy";

export function xmlidName(kind: string, legacyId: string) {
  const safe = String(legacyId).replace(/[^A-Za-z0-9]/g, "_");
  return `${kind}_${safe}`;
}

export function xmlid(kind: string, legacyId: string) {
  return `${XMLID_MODULE}.${xmlidName(kind, legacyId)}`;
}

export function simpleVariantLegacyId(productId: string) {
  return `simple_${productId}`;
}
