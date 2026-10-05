import { requirePermission } from "../../../lib/auth";
import { addAttributeValueAction, createAttributeAction } from "../../../lib/variant-actions";
import { prisma } from "../../../lib/db/prisma";
import { queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader } from "../../../components/admin/admin-ui";

export default async function AttributesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  await requirePermission("product.update");
  const params = await searchParams;
  const q = queryValue(params.q).toLowerCase();
  const type = queryValue(params.type);
  const attributes = (await prisma.attribute.findMany({
    include: { values: { orderBy: { sortOrder: "asc" } } },
    orderBy: { name: "asc" },
  })).filter((attribute) => {
    const matchesQuery = !q || attribute.name.toLowerCase().includes(q) || attribute.slug.toLowerCase().includes(q);
    const matchesType = !type || attribute.type === type;
    return matchesQuery && matchesType;
  });

  return (
    <div className="stack">
      <AdminHeader title="Attributes" count={attributes.length} hint="Used to build product variants" />
      <AdminFilters
        action="/admin/attributes"
        q={queryValue(params.q)}
        qPlaceholder="Attribute name"
        filters={[{ name: "type", label: "Type", value: type, options: [{ value: "SELECT", label: "Select" }, { value: "COLOR", label: "Color" }, { value: "TEXT", label: "Text" }] }]}
      />
      <form className="card stack" action={createAttributeAction}>
        <h2>Add attribute</h2>
        <div className="grid">
          <label className="field">Name<input name="name" required placeholder="Color" /></label>
          <label className="field">
            Type
            <select name="type" defaultValue="SELECT">
              <option value="SELECT">Select</option>
              <option value="COLOR">Color</option>
              <option value="TEXT">Text</option>
            </select>
          </label>
        </div>
        <button className="btn" type="submit">Add attribute</button>
      </form>
      {attributes.length === 0 ? (
        <div className="card"><AdminEmpty title="No attributes match these filters." /></div>
      ) : attributes.map((attribute) => (
        <section key={attribute.id} className="card stack">
          <div>
            <h2>{attribute.name}</h2>
            <p className="muted">{attribute.type} · {attribute.values.length} values</p>
          </div>
          {attribute.values.length > 0 ? (
            <div className="admin-chips">
              {attribute.values.map((item) => (
                <span className="badge is-muted" key={item.id}>
                  {item.colorHex ? <span className="admin-color" style={{ background: item.colorHex }} /> : null}
                  {item.value}
                </span>
              ))}
            </div>
          ) : <p className="muted">No values yet.</p>}
          <form className="grid" action={addAttributeValueAction}>
            <input type="hidden" name="attributeId" value={attribute.id} />
            <label className="field">Value<input name="value" required placeholder="Black" /></label>
            {attribute.type === "COLOR" && <label className="field">Hex<input name="colorHex" placeholder="#111111" /></label>}
            <div className="admin-toolbar-actions"><button className="btn secondary" type="submit">Add value</button></div>
          </form>
        </section>
      ))}
    </div>
  );
}
