import Link from "next/link";
import type { ReactNode } from "react";

export function AdminHeader({
  title,
  count,
  hint,
  actions,
}: {
  title: string;
  count?: number;
  hint?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="admin-header">
      <div>
        <p className="admin-kicker">Admin</p>
        <h1>{title}</h1>
        {(count != null || hint) && (
          <p className="muted">
            {count != null ? `${count} ${count === 1 ? "record" : "records"}` : ""}
            {count != null && hint ? " · " : ""}
            {hint}
          </p>
        )}
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </div>
  );
}

export function AdminFilters({
  action,
  q,
  qPlaceholder = "Search…",
  filters = [],
}: {
  action: string;
  q?: string;
  qPlaceholder?: string;
  filters?: Array<{
    name: string;
    label: string;
    value?: string;
    options: Array<{ value: string; label: string }>;
  }>;
}) {
  const active = Boolean(q) || filters.some((filter) => filter.value);
  return (
    <form className="admin-toolbar card" action={action} method="get">
      <label className="admin-search field">
        Search
        <input type="search" name="q" defaultValue={q} placeholder={qPlaceholder} />
      </label>
      {filters.map((filter) => (
        <label className="admin-filter field" key={filter.name}>
          {filter.label}
          <select name={filter.name} defaultValue={filter.value ?? ""}>
            <option value="">All</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      ))}
      <div className="admin-toolbar-actions">
        <button className="btn secondary" type="submit">Apply</button>
        {active ? <Link className="btn secondary" href={action}>Clear</Link> : null}
      </div>
    </form>
  );
}

export function AdminEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="admin-empty">
      <p><b>{title}</b></p>
      {hint ? <p className="muted">{hint}</p> : null}
    </div>
  );
}

export function StatusBadge({ value, label }: { value: string; label?: string }) {
  const tone = badgeTone(value);
  return <span className={`badge ${tone}`}>{label ?? formatStatus(value)}</span>;
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

function badgeTone(value: string) {
  const key = value.toUpperCase();
  if (["ACTIVE", "APPROVED", "PAID", "DELIVERED", "CONFIRMED"].includes(key)) return "is-ok";
  if (["PENDING", "PARTIAL", "PROCESSING", "SHIPPED", "DRAFT", "NEW"].includes(key)) return "is-warn";
  if (["REJECTED", "CANCELLED", "SUSPENDED", "INACTIVE", "UNPAID"].includes(key)) return "is-danger";
  return "is-muted";
}
