import { createDisplayCurrencyAction, deleteDisplayCurrencyAction, updateDisplayCurrencyAction } from "../../../lib/currency-admin-actions";
import { hasPermission, requirePermission } from "../../../lib/auth";
import { listManagedDisplayCurrencies } from "../../../lib/currency-catalog";
import { queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader, StatusBadge } from "../../../components/admin/admin-ui";
import { ConfirmSubmit } from "../../../components/admin/confirm-submit";

const ERRORS: Record<string, string> = {
  invalid: "Check the code, label, and rate. Codes are 3 letters. Rates must be greater than 0.",
  exists: "That currency code already exists.",
  base: "USD is the stored base currency. It stays active and its rate stays 1.",
  missing: "Currency not found.",
};

const NOTICES: Record<string, string> = {
  created: "Currency added. It now appears in the storefront selector when active.",
  updated: "Currency updated. Display amounts use the new rate.",
  deleted: "Currency removed from display options.",
};

function rateText(value: { toString(): string }) {
  const text = value.toString();
  if (!text.includes(".")) return text;
  return text.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

export default async function AdminCurrenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; q?: string; status?: string; error?: string; notice?: string }>;
}) {
  const admin = await requirePermission("currency.view");
  const params = await searchParams;
  const edit = queryValue(params.edit);
  const q = queryValue(params.q).toUpperCase();
  const status = queryValue(params.status);
  const error = queryValue(params.error);
  const notice = queryValue(params.notice);
  const currencies = (await listManagedDisplayCurrencies()).filter((item) => {
    if (q && !item.code.includes(q) && !item.label.toUpperCase().includes(q)) return false;
    if (status === "active") return item.status;
    if (status === "disabled") return !item.status;
    return true;
  });
  const editing = currencies.find((item) => item.id === edit) ?? null;
  const canCreate = hasPermission(admin, "currency.create");
  const canUpdate = hasPermission(admin, "currency.update");
  const canDelete = hasPermission(admin, "currency.delete");

  return (
    <div className="stack">
      <AdminHeader title="Currencies" hint="Prices stay in USD. These rates only change what approved buyers see." count={currencies.length} />
      <AdminFilters
        action="/admin/currencies"
        q={q}
        qPlaceholder="Code or name"
        filters={[{ name: "status", label: "Status", value: status, options: [{ value: "active", label: "Active" }, { value: "disabled", label: "Disabled" }] }]}
      />
      {error && <p className="error">{ERRORS[error] ?? "Could not save that currency."}</p>}
      {notice && <p className="muted">{NOTICES[notice] ?? "Saved."}</p>}

      {canCreate && (
        <form className="card stack" action={createDisplayCurrencyAction}>
          <h2>Add currency</h2>
          <div className="grid">
            <label className="field">Code<input name="code" required maxLength={3} placeholder="GBP" /></label>
            <label className="field">Name<input name="label" required placeholder="British Pound" /></label>
            <label className="field">Symbol<input name="symbol" placeholder="GBP" /></label>
            <label className="field">Rate from 1 USD<input name="rateFromUsd" required placeholder="0.78" /></label>
            <label className="field">Locale<input name="locale" defaultValue="en-GB" /></label>
            <label className="field">Sort<input name="sortOrder" type="number" min={0} defaultValue={10} /></label>
          </div>
          <label className="admin-check"><input type="checkbox" name="status" defaultChecked /> Show in storefront</label>
          <button className="btn">Save currency</button>
        </form>
      )}

      {editing && canUpdate && (
        <form className="card stack" action={updateDisplayCurrencyAction}>
          <h2>Edit: {editing.code}</h2>
          <input type="hidden" name="id" value={editing.id} />
          <div className="grid">
            <label className="field">Code<input name="code" defaultValue={editing.code} required maxLength={3} disabled={editing.isBase} /></label>
            <label className="field">Name<input name="label" defaultValue={editing.label} required /></label>
            <label className="field">Symbol<input name="symbol" defaultValue={editing.symbol} required /></label>
            <label className="field">Rate from 1 USD<input name="rateFromUsd" defaultValue={rateText(editing.rateFromUsd)} required readOnly={editing.isBase} /></label>
            <label className="field">Locale<input name="locale" defaultValue={editing.locale} /></label>
            <label className="field">Sort<input name="sortOrder" type="number" min={0} defaultValue={editing.sortOrder} /></label>
          </div>
          <label className="admin-check">
            <input type="checkbox" name="status" defaultChecked={editing.status} disabled={editing.isBase} /> Show in storefront
          </label>
          {editing.isBase && <p className="muted">USD is the stored currency. The display rate stays 1.</p>}
          <button className="btn">Update currency</button>
        </form>
      )}

      <div className="card admin-table-wrap">
        {currencies.length === 0 ? (
          <AdminEmpty title="No currencies match these filters." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Currency</th>
                <th>Rate / 1 USD</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((item) => (
                <tr key={item.id}>
                  <td>
                    <b>{item.code}</b>
                    {item.isBase ? " · base" : ""}
                    <br />
                    <span className="muted">{item.label} · {item.symbol}</span>
                  </td>
                  <td>{rateText(item.rateFromUsd)}</td>
                  <td><StatusBadge value={item.status ? "ACTIVE" : "INACTIVE"} /></td>
                  <td>
                    <div className="actions">
                      {canUpdate && <a className="btn secondary" href={`/admin/currencies?edit=${item.id}`}>Edit</a>}
                      {canDelete && !item.isBase && (
                        <form action={deleteDisplayCurrencyAction}>
                          <input type="hidden" name="id" value={item.id} />
                          <ConfirmSubmit className="btn danger" message={`Remove ${item.code} from display currencies?`}>Delete</ConfirmSubmit>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
