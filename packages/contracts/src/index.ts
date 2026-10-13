export type MoneyAmount = {
  amount: string;
  currency: string;
};

export type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
};

export type ApiErrorResponse = {
  statusCode: number;
  code: string;
  message: string;
};

export type MediaFraming = {
  fitMode?: "AUTO" | "COVER" | "CONTAIN" | null;
  focalX?: number | null;
  focalY?: number | null;
  scale?: number | null;
};

export type CategorySummary = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  productCount: number;
  image: string | null;
  imageFraming?: MediaFraming | null;
  heroFocalX?: number | null;
  heroFocalY?: number | null;
  heroScale?: number | null;
};

export type CategoryDetail = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  heroVideoUrl: string | null;
  heroPosterUrl: string | null;
  heroFocalX?: number | null;
  heroFocalY?: number | null;
  heroScale?: number | null;
};

export type BrandSummary = {
  id: string;
  name: string;
  slug: string;
};

export type ProductMedia = {
  id: string;
  type: string;
  isPrimary: boolean;
  fitMode?: "AUTO" | "COVER" | "CONTAIN" | null;
  focalX?: number | null;
  focalY?: number | null;
  visualScale?: number | null;
  media: { id: string; filePath: string; fileType: string; altText: string | null };
};

export type ProductAttribute = {
  id: string;
  name: string;
  type: "TEXT" | "COLOR" | "SELECT";
  values: Array<{ id: string; value: string; colorHex: string | null }>;
};

export type ProductVariant = {
  id: string;
  name: string;
  sku: string;
  inStock: boolean;
  valueIds: string[];
  price?: MoneyAmount;
};

export type ProductSummary = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  minOrderQuantity: number;
  isFeatured: boolean;
  isNew: boolean;
  productType: "SIMPLE" | "VARIABLE";
  category: { id: string; name: string; slug: string };
  brand: { id: string; name: string; slug: string } | null;
  media: ProductMedia[];
  inStock: boolean;
  price?: MoneyAmount;
};

export type ProductDetail = ProductSummary & {
  attributes?: ProductAttribute[];
  variants?: ProductVariant[];
};

export type CartItemIssueCode = "UNAVAILABLE" | "STOCK" | "MINIMUM" | "PRICE";

export type CartAttributeDto = {
  name: string;
  value: string;
};

export type CartProductDto = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  image: string | null;
};

export type CartVariantDto = {
  id: string;
  name: string;
  sku: string;
  attributes: CartAttributeDto[];
};

export type CartItemDto = {
  id: string;
  product: CartProductDto;
  variant: CartVariantDto | null;
  quantity: number;
  moq: number;
  unitPrice: MoneyDto | null;
  lineTotal: MoneyDto | null;
  availableQuantity: number;
  isValid: boolean;
  reason: CartItemIssueCode | null;
};

export type CartDto = {
  id: string;
  status: "ACTIVE";
  itemCount: number;
  canCheckout: boolean;
  items: CartItemDto[];
  totals: {
    subtotal: MoneyDto | null;
  };
};

export type AddCartItemRequest = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

export type UpdateCartItemRequest = {
  quantity: number;
};

export type CurrentCartResponse = {
  cart: CartDto | null;
};

export type CartLine = {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
};

export type CartResponse = CurrentCartResponse;

export type AddressDto = {
  id: string;
  label: string | null;
  recipient: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
};

export type AddressListResponse = {
  data: AddressDto[];
};

export type AddressWriteRequest = {
  label?: string | null;
  recipient: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode?: string | null;
  country?: string;
  isDefault?: boolean;
};

export type AddressMutationResponse = {
  data: AddressDto;
};

export type AddressDeleteResponse = {
  data: { id: string };
};

export type PlaceOrderRequest = {
  cartId: string;
  addressId?: string | null;
  saveAddress?: boolean;
  recipient: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode?: string | null;
  country?: string;
  customerNotes?: string | null;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "MANUAL";
};

export type PlaceOrderResponse = {
  order: {
    id: string;
    orderNumber: string;
    status: string;
  };
};

export type OrderResponse = {
  id: string;
  orderNumber: string;
  status: string;
};

export type OrderAttributeDto = {
  name: string;
  value: string;
};

export type OrderPaymentDisplayDto = {
  method: "CASH" | "BANK_TRANSFER" | "MANUAL" | null;
  status: string;
};

export type OrderSummaryDto = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  itemCount: number;
  total: MoneyDto;
  payment: OrderPaymentDisplayDto;
};

export type OrderItemSnapshotDto = {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string;
  attributes: OrderAttributeDto[];
  quantity: number;
  unitPrice: MoneyDto;
  lineTotal: MoneyDto;
};

export type OrderShippingDto = {
  recipient: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
};

export type OrderStatusHistoryDto = {
  id: string;
  status: string;
  createdAt: string;
  notes: string | null;
};

export type OrderDetailPaymentDto = OrderPaymentDisplayDto & {
  paidAmount: MoneyDto;
  remainingAmount: MoneyDto;
};

export type OrderDetailDto = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  customerNotes: string | null;
  shipping: OrderShippingDto;
  items: OrderItemSnapshotDto[];
  totals: {
    subtotal: MoneyDto;
    discount: MoneyDto;
    shipping: MoneyDto;
    tax: MoneyDto;
    total: MoneyDto;
  };
  payment: OrderDetailPaymentDto;
  history: OrderStatusHistoryDto[];
};

export type OrderListResponse = ListResponse<OrderSummaryDto>;

export type OrderDetailResponse = ItemResponse<OrderDetailDto>;

export type OrderStatusName =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "READY"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type UpdateOrderStatusRequest = {
  status: OrderStatusName;
  notes?: string | null;
};

export type CancelOrderRequest = {
  notes?: string | null;
};

export type OrderStatusMutationResponse = {
  order: {
    id: string;
    orderNumber: string;
    status: string;
  };
};

export type PaymentMethodName = "CASH" | "BANK_TRANSFER" | "MANUAL";

export type RecordManualPaymentRequest = {
  amount: string;
  method: PaymentMethodName;
  reference?: string | null;
  markPaid?: boolean;
};

export type PaymentDto = {
  id: string;
  amount: MoneyDto;
  method: PaymentMethodName;
  status: string;
  reference: string | null;
  createdAt: string;
};

export type RecordManualPaymentResponse = {
  payment: PaymentDto;
  order: {
    id: string;
    orderNumber: string;
    paymentStatus: string;
    paidAmount: MoneyDto;
    remainingAmount: MoneyDto;
  };
};

export type AdminOrderCustomerDto = {
  id: string;
  name: string;
  email: string | null;
  companyName: string | null;
};

export type AdminOrderListItemDto = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  itemCount: number;
  customer: AdminOrderCustomerDto;
  total: MoneyDto;
};

export type AdminOrderItemDto = {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  unitPrice: MoneyDto;
  lineTotal: MoneyDto;
};

export type AdminOrderPaymentDto = {
  id: string;
  method: string;
  status: string;
  amount: MoneyDto;
  reference: string | null;
  createdAt: string;
};

export type AdminOrderHistoryDto = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  notes: string | null;
  createdAt: string;
  actorName: string | null;
};

export type AdminOrderDetailDto = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  customerNotes: string | null;
  adminNotes: string | null;
  customer: AdminOrderCustomerDto;
  shipping: OrderShippingDto;
  items: AdminOrderItemDto[];
  payments: AdminOrderPaymentDto[];
  history: AdminOrderHistoryDto[];
  totals: {
    subtotal: MoneyDto;
    discount: MoneyDto;
    shipping: MoneyDto;
    tax: MoneyDto;
    total: MoneyDto;
  };
  paidAmount: MoneyDto;
  remainingAmount: MoneyDto;
};

export type AdminOrderListResponse = ListResponse<AdminOrderListItemDto>;

export type AdminOrderDetailResponse = ItemResponse<AdminOrderDetailDto>;

export type AdminOrderSummaryResponse = {
  total: number;
};

export type UpdateAdminOrderNotesRequest = {
  adminNotes: string | null;
};

export type UpdateAdminOrderNotesResponse = {
  order: {
    id: string;
    orderNumber: string;
    adminNotes: string | null;
  };
  previousAdminNotes: string | null;
};

export type ListResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type ItemResponse<T> = {
  data: T;
};

export type AuthMeUser = {
  id: string;
  email: string | null;
  name: string;
};

export type AuthMeResponse =
  | {
      authenticated: false;
      user: null;
    }
  | {
      authenticated: true;
      user: AuthMeUser;
      roles: string[];
      permissions: string[];
      isSuperAdmin: boolean;
    };

export type CustomerProfile = {
  id: string;
  state: "NORMAL" | "PENDING" | "APPROVED" | "REJECTED";
  companyName: string | null;
  businessName: string | null;
  phone: string | null;
  priceAccess: boolean;
  priceGroupName: string | null;
  role?: "merchant" | "buyer" | "distributor" | "marketer";
};

export type BusinessStatusResponse = {
  state: "NORMAL" | "PENDING" | "APPROVED" | "REJECTED" | null;
  canViewWholesalePrices: boolean;
  hasActivePriceGroup: boolean;
};

export type MoneyDto = {
  amount: string;
  currency: string;
};

export type ResolvedPriceDto = {
  productId: string;
  variantId?: string;
  price: MoneyDto;
};


