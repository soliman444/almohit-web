export type AccountingCustomerInput = {
  customerId: string;
  name: string;
  email?: string | null;
};

export type AccountingInvoiceInput = {
  orderId: string;
  customerId: string;
};

export type AccountingInvoice = {
  id: string;
  status: string;
};

export interface AccountingProvider {
  ensureCustomer(input: AccountingCustomerInput): Promise<void>;
  createInvoice(input: AccountingInvoiceInput): Promise<AccountingInvoice>;
  getInvoice(invoiceId: string): Promise<AccountingInvoice | null>;
  getCustomerBalance(customerId: string): Promise<string>;
}
