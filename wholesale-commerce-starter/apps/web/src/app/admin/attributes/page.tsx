import { addOdooAttributeValueFormAction, createOdooAttributeFormAction } from "../../../lib/actions";
import { requirePermission } from "../../../lib/auth";
import { queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader } from "../../../components/admin/admin-ui";
import { listOdooAdminAttributes, odooBackendAttributeUrl } from "../../../lib/odoo/admin-taxonomy";

export default async function AttributesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  await requirePermission("product.update");
  const params = await searchParams;
  const q = queryValue(params.q).toLowerCase();
  const error = queryValue(params.error);

  let attributes;
  try {
    attributes = await listOdooAdminAttributes();
  } catch {
    return (
      <div className="stack">
        <AdminHeader title="Attributes" />
        <p className="error">Odoo attributes could not be loaded.</p>
      </div>
    );
  }

  const rows = attributes.filter((attribute) => !q || attribute.name.toLowerCase().includes(q));

  return (
    <div className="stack">
      <AdminHeader title="Attributes" count={rows.length} hint="Odoo variant attributes" />
      {error ? <p className="error">{error}</p> : null}
      <AdminFilters action="/admin/attributes" q={queryValue(params.q)} qPlaceholder="Attribute name" />
      <form className="card stack" action={createOdooAttributeFormAction}>
        <h2>Add attribute</h2>
        <label className="field">Name<input name="name" required placeholder="Color" /></label>
        <label className="field">
          Values
          <textarea name="values" required placeholder="Red, Green, Blue" />
        </label>
        <button className="btn" type="submit">Add attribute</button>
      </form>
      {rows.length === 0 ? (
        <div className="card"><AdminEmpty title="No attributes match these filters." /></div>
      ) : rows.map((attribute) => (
        <section key={attribute.id} className="card stack">
          <div>
            <h2>{attribute.name}</h2>
            <p className="muted">{attribute.values.length} values</p>
          </div>
          {attribute.values.length > 0 ? (
            <div className="admin-chips">
              {attribute.values.map((item) => (
                <span className="badge is-muted" key={item.id}>{item.name}</span>
              ))}
            </div>
          ) : <p className="muted">No values yet.</p>}
          <form className="grid" action={addOdooAttributeValueFormAction}>
            <input type="hidden" name="attributeId" value={attribute.id} />
            <label className="field">Value<input name="values" required placeholder="Black" /></label>
            <div className="admin-toolbar-actions">
              <button className="btn secondary" type="submit">Add value</button>
              <a className="btn secondary" href={odooBackendAttributeUrl(attribute.id)} target="_blank" rel="noreferrer">
                Manage in Odoo
              </a>
            </div>
          </form>
        </section>
      ))}
    </div>
  );
}