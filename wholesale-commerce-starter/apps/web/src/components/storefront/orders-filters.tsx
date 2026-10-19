import type { OrdersQuery } from "../../lib/odoo/orders";

export function OrdersFilters({ query }: { query: OrdersQuery }) {
  return (
    <form className="sf-address-form sf-orders-filters" action="/account/orders" method="get">
      <label className="sf-field is-wide">
        Search
        <input type="search" name="q" defaultValue={query.q ?? ""} placeholder="Order number" />
      </label>
      <label className="sf-field">
        Status
        <select name="state" defaultValue={parseOrderStateValue(query.state)}>
          <option value="">All</option>
          <option value="sale">Confirmed</option>
          <option value="done">Done</option>
          <option value="sent">Quotation sent</option>
        </select>
      </label>
      <label className="sf-field">
        Sort
        <select name="sort" defaultValue={query.sort === "newest" || query.sort === "oldest" ? query.sort : ""}>
          <option value="">Default</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </label>
      <label className="sf-field">
        From
        <input type="date" name="date_from" defaultValue={isoDate(query.date_from)} />
      </label>
      <label className="sf-field">
        To
        <input type="date" name="date_to" defaultValue={isoDate(query.date_to)} />
      </label>
      <button className="sf-btn" type="submit"><span>Apply</span></button>
    </form>
  );
}

function parseOrderStateValue(value?: string) {
  return value === "sale" || value === "done" || value === "sent" ? value : "";
}

function isoDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}
