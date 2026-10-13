import { requirePermission } from "../../../lib/auth";
import { getOdooCurrencyCatalog } from "../../../lib/currency-catalog";
import { queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader, StatusBadge } from "../../../components/admin/admin-ui";

export default async function AdminCurrenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission("currency.view");
  const params = await searchParams;
  const q = queryValue(params.q).toUpperCase();
  const payload = await getOdooCurrencyCatalog();
  const currencies = payload.currencies.filter((item) => {
    if (q && !item.code.includes(q) && !item.label.toUpperCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="stack">
      <AdminHeader
        title="Display currencies"
        hint="Read-only from Odoo. Change active currencies and rates in Accounting → Configuration → Currencies."
        count={currencies.length}
      />
      <AdminFilters
        action="/admin/currencies"
        q={q}
        qPlaceholder="Code or name"
        filters={[]}
      />
      {payload.companyCurrency && (
        <p className="muted">
          Company currency: {payload.companyCurrency}
          {payload.date ? ` · rates for ${payload.date}` : ""}
        </p>
      )}
      {payload.currencies.length === 0 && (
        <p className="error">Could not load currencies from Odoo.</p>
      )}

      <div className="card admin-table-wrap">
        {currencies.length === 0 ? (
          <AdminEmpty title="No currencies match these filters." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Currency</th>
                <th>Rate / 1 {payload.companyCurrency || "company"}</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((item) => (
                <tr key={item.code}>
                  <td>
                    <b>{item.code}</b>
                    {item.isCompany ? " · company" : ""}
                    <br />
                    <span className="muted">{item.label} · {item.symbol}</span>
                  </td>
                  <td>{item.rateFromCompany}</td>
                  <td><StatusBadge value="ACTIVE" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
