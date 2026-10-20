export type MoneyAmount = {
  amount: string;
  currency: string;
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

export type OrderAttributeDto = {
  name: string;
  value: string;
};

export type OrderPaymentDisplayDto = {
  method: string | null;
  status: string;
};

export type OrderSummaryDto = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  itemCount: number;
  total: MoneyAmount;
  payment: OrderPaymentDisplayDto;
};

export type OrderItemSnapshotDto = {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string;
  attributes: OrderAttributeDto[];
  quantity: number;
  unitPrice: MoneyAmount;
  lineTotal: MoneyAmount;
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
  paidAmount: MoneyAmount;
  remainingAmount: MoneyAmount;
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
    subtotal: MoneyAmount;
    discount: MoneyAmount;
    shipping: MoneyAmount;
    tax: MoneyAmount;
    total: MoneyAmount;
  };
  payment: OrderDetailPaymentDto;
  history: OrderStatusHistoryDto[];
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
    };

export type TradeStatus = "normal" | "pending" | "approved" | "rejected";

export type CustomerProfile = {
  id: string;
  state: TradeStatus;
  businessName: string | null;
  phone: string | null;
  role: "merchant" | "buyer" | "distributor" | "marketer";
};

export type BusinessStatusResponse = {
  state: TradeStatus | null;
  canViewWholesalePrices: boolean;
};
