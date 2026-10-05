import { createRoleAction } from "../../../lib/actions";
import { requirePermission } from "../../../lib/auth";
import { prisma } from "../../../lib/db/prisma";
import { queryValue } from "../../../lib/admin-query";
import { AdminEmpty, AdminFilters, AdminHeader } from "../../../components/admin/admin-ui";

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission("role.view");
  const rawQuery = queryValue((await searchParams).q);
  const q = rawQuery.toLowerCase();
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.permission.findMany({ orderBy: { key: "asc" } }),
  ]);
  const visible = roles.filter((role) => !q || role.name.toLowerCase().includes(q) || role.slug.toLowerCase().includes(q));

  return (
    <div className="stack">
      <AdminHeader title="Roles & permissions" count={visible.length} />
      <AdminFilters action="/admin/roles" q={rawQuery} qPlaceholder="Role name or slug" />
      <form className="card stack" action={createRoleAction}>
        <h2>Create a new role</h2>
        <div className="grid">
          <label className="field">Name<input name="name" required /></label>
          <label className="field">Slug<input name="slug" required placeholder="product-manager" /></label>
        </div>
        <div className="permission-grid">
          {permissions.map((permission) => (
            <label key={permission.id}>
              <input type="checkbox" name="permissions" value={permission.id} />
              {permission.key}
            </label>
          ))}
        </div>
        <button className="btn">Create role</button>
      </form>
      {visible.length === 0 ? (
        <div className="card"><AdminEmpty title="No roles match this search." /></div>
      ) : (
        <div className="grid">
          {visible.map((role) => (
            <div className="card stack" key={role.id}>
              <div>
                <span className="badge is-muted">{role._count.users} users</span>
                <h2>{role.name}</h2>
                <p className="muted">{role.slug}</p>
              </div>
              <div className="admin-chips">
                {role.permissions.map((entry) => (
                  <span className="badge is-muted" key={entry.permission.id}>{entry.permission.key}</span>
                ))}
                {role.permissions.length === 0 && <span className="muted">No permissions</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
