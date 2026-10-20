export function safeStorefrontReturnTo(raw: string, fallback = "/account/addresses") {
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) return fallback;
  const path = value.split("?")[0];
  if (path === "/checkout" || path === "/cart" || path === "/account/addresses") return path;
  return fallback;
}
