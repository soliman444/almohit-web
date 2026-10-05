export const PERMISSIONS = {
  USER_VIEW: "user.view",
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_DELETE: "user.delete",

  ROLE_VIEW: "role.view",
  ROLE_CREATE: "role.create",
  ROLE_UPDATE: "role.update",
  ROLE_DELETE: "role.delete",

  CUSTOMER_VIEW: "customer.view",
  CUSTOMER_UPDATE: "customer.update",
  CUSTOMER_APPROVE: "customer.approve",
  CUSTOMER_REJECT: "customer.reject",

  CATEGORY_VIEW: "category.view",
  CATEGORY_CREATE: "category.create",
  CATEGORY_UPDATE: "category.update",
  CATEGORY_DELETE: "category.delete",

  BRAND_VIEW: "brand.view",
  BRAND_CREATE: "brand.create",
  BRAND_UPDATE: "brand.update",
  BRAND_DELETE: "brand.delete",

  PRODUCT_VIEW: "product.view",
  PRODUCT_CREATE: "product.create",
  PRODUCT_UPDATE: "product.update",
  PRODUCT_DELETE: "product.delete",

  PRICE_VIEW: "price.view",
  PRICE_CREATE: "price.create",
  PRICE_UPDATE: "price.update",
  PRICE_DELETE: "price.delete",

  CURRENCY_VIEW: "currency.view",
  CURRENCY_CREATE: "currency.create",
  CURRENCY_UPDATE: "currency.update",
  CURRENCY_DELETE: "currency.delete",

  ORDER_VIEW: "order.view",
  ORDER_UPDATE: "order.update",
  ORDER_CANCEL: "order.cancel",

  PAYMENT_VIEW: "payment.view",
  PAYMENT_UPDATE: "payment.update",

  AUDIT_VIEW: "audit.view",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
