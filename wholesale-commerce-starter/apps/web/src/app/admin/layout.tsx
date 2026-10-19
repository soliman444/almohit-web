import { isStaffUser, requireUser } from "../../lib/auth";
import { AdminNav } from "../../components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!isStaffUser(user)) {
    return (
      <div className="admin-shell">
        <div className="admin-main">
          <div className="card">You do not have access to the admin panel.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell admin-layout">
      <AdminNav userName={user.name} userEmail={user.email ?? ""} />
      <section className="admin-main">{children}</section>
    </div>
  );
}
