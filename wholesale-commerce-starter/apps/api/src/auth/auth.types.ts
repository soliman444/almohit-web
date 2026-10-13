export type AuthContextCustomer = {
  id: string;
  businessStatus: string;
  priceGroupId: string | null;
  priceGroup: { status: string; name: string } | null;
  companyName: string | null;
  businessName: string | null;
};

export type AuthContext = {
  sessionId: string;
  id: string;
  email: string | null;
  name: string;
  status: string;
  phone: string | null;
  roles: string[];
  permissions: Set<string>;
  isSuperAdmin: boolean;
  customer: AuthContextCustomer | null;
};
