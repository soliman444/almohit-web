import type { AppRole } from "../../lib/trade-kyc";

export type TradeKycDefaults = {
  businessName?: string;
  taxNumber?: string;
  businessType?: string;
  phone?: string;
  city?: string;
  address?: string;
  managerName?: string;
  employeeName?: string;
  bankAccount?: string;
  paymentMethod?: string;
  notes?: string;
};

export function TradeKycFields({
  role,
  defaults = {},
}: {
  role: AppRole;
  defaults?: TradeKycDefaults;
}) {
  if (role === "buyer" || role === "marketer") {
    return (
      <>
        <section className="sf-biz-block">
          <h2>{role === "marketer" ? "Marketer" : "Office"}</h2>
          <div className="sf-biz-grid">
            <label className="sf-biz-field">{role === "marketer" ? "Full name" : "Sourcing office"}<input name="businessName" defaultValue={defaults.businessName} required dir="auto" /></label>
            <label className="sf-biz-field">Commercial registration<input name="taxNumber" defaultValue={defaults.taxNumber} required dir="auto" /></label>
            <label className="sf-biz-field">{role === "marketer" ? "Coverage area" : "What you source"}<input name="businessType" placeholder={role === "marketer" ? "Riyadh, Jeddah…" : "Dates, citrus, mixed fruit…"} defaultValue={defaults.businessType} required dir="auto" /></label>
            <label className="sf-biz-field">Phone<input name="phone" defaultValue={defaults.phone} dir="auto" /></label>
          </div>
        </section>
        <section className="sf-biz-block">
          <h2>Location</h2>
          <div className="sf-biz-grid">
            <label className="sf-biz-field">City<input name="city" defaultValue={defaults.city} required dir="auto" /></label>
            <label className="sf-biz-field">Contact person<input name="managerName" defaultValue={defaults.managerName} required dir="auto" /></label>
            <label className="sf-biz-field is-span-2">{role === "marketer" ? "Base address" : "Office address"}<input name="address" defaultValue={defaults.address} required dir="auto" /></label>
            <label className="sf-biz-field is-wide">Notes<textarea name="notes" defaultValue={defaults.notes} dir="auto" /></label>
          </div>
        </section>
      </>
    );
  }

  if (role === "distributor") {
    return (
      <>
        <section className="sf-biz-block">
          <h2>Company</h2>
          <div className="sf-biz-grid">
            <label className="sf-biz-field">Company name<input name="businessName" defaultValue={defaults.businessName} required dir="auto" /></label>
            <label className="sf-biz-field">Commercial registration<input name="taxNumber" defaultValue={defaults.taxNumber} required dir="auto" /></label>
            <label className="sf-biz-field">Coverage area<input name="businessType" placeholder="Riyadh, Jeddah, Eastern Province…" defaultValue={defaults.businessType} required dir="auto" /></label>
            <label className="sf-biz-field">Phone<input name="phone" defaultValue={defaults.phone} dir="auto" /></label>
          </div>
        </section>
        <section className="sf-biz-block">
          <h2>Location</h2>
          <div className="sf-biz-grid">
            <label className="sf-biz-field">Base city<input name="city" defaultValue={defaults.city} required dir="auto" /></label>
            <label className="sf-biz-field">Contact person<input name="managerName" defaultValue={defaults.managerName} required dir="auto" /></label>
            <label className="sf-biz-field is-span-2">Depot address<input name="address" defaultValue={defaults.address} required dir="auto" /></label>
            <label className="sf-biz-field is-wide">Notes<textarea name="notes" defaultValue={defaults.notes} dir="auto" /></label>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="sf-biz-block">
        <h2>Shop</h2>
        <div className="sf-biz-grid">
          <label className="sf-biz-field">Shop name<input name="businessName" defaultValue={defaults.businessName} required dir="auto" /></label>
          <label className="sf-biz-field">Commercial registration<input name="taxNumber" defaultValue={defaults.taxNumber} required dir="auto" /></label>
          <label className="sf-biz-field">Business type<input name="businessType" placeholder="Grocery, dates shop, wholesaler…" defaultValue={defaults.businessType} dir="auto" /></label>
          <label className="sf-biz-field">Phone<input name="phone" defaultValue={defaults.phone} dir="auto" /></label>
          <label className="sf-biz-field">City<input name="city" defaultValue={defaults.city} required dir="auto" /></label>
          <label className="sf-biz-field is-span-3">Shop address<input name="address" defaultValue={defaults.address} required dir="auto" /></label>
        </div>
      </section>
      <section className="sf-biz-block">
        <h2>People & payment</h2>
        <div className="sf-biz-grid">
          <label className="sf-biz-field">Shop manager<input name="managerName" defaultValue={defaults.managerName} required dir="auto" /></label>
          <label className="sf-biz-field">Other employee<input name="employeeName" defaultValue={defaults.employeeName} dir="auto" /></label>
          <label className="sf-biz-field">Bank account<input name="bankAccount" defaultValue={defaults.bankAccount} required dir="auto" /></label>
          <label className="sf-biz-field">Payment method
            <select name="paymentMethod" defaultValue={defaults.paymentMethod ?? ""} required>
              <option value="">Select payment method</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cash">Cash</option>
              <option value="both">Bank transfer or cash</option>
            </select>
          </label>
          <label className="sf-biz-field is-span-2">Shop photo
            <input name="shopImage" type="file" accept="image/jpeg,image/png,image/gif,image/webp" />
          </label>
          <label className="sf-biz-field is-span-2">Notes<textarea name="notes" defaultValue={defaults.notes} dir="auto" /></label>
        </div>
      </section>
    </>
  );
}
