import type { StorefrontCategoryCard } from "../../lib/catalog/types";
import type { FinderQuery } from "../../lib/catalog/filters";

export function ProductFinder({
  categories,
  brands = [],
  query = {},
  compact = false,
}: {
  categories: StorefrontCategoryCard[];
  brands?: Array<{ slug: string; name: string }>;
  query?: FinderQuery;
  compact?: boolean;
}) {
  const roots = categories.filter((item) => !item.parentId);

  if (compact) {
    return (
      <section className="sf-finder is-compact" id="finder">
        <form className="sf-finder-form" action="/products" method="get">
          {query.q?.trim() ? <input type="hidden" name="q" value={query.q.trim()} /> : null}
          <label className="field">
            Category
            <select name="category" defaultValue={query.category ?? ""}>
              <option value="">All collections</option>
              {roots.map((item) => (
                <option key={item.id} value={item.slug}>{item.name}</option>
              ))}
            </select>
          </label>
          {brands.length > 0 && (
            <label className="field">
              Brand
              <select name="brand" defaultValue={query.brand ?? ""}>
                <option value="">All brands</option>
                {brands.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            Minimum MOQ
            <input
              type="number"
              name="min_moq"
              min="0"
              step="0.01"
              defaultValue={query.min_moq ?? ""}
              placeholder="Any"
            />
          </label>

          <label className="field">
            Maximum MOQ
            <input
              type="number"
              name="max_moq"
              min="0"
              step="0.01"
              defaultValue={query.max_moq ?? ""}
              placeholder="Any"
            />
          </label>
          <label className="field">
            Availability
            <select name="availability" defaultValue={query.availability ?? ""}>
              <option value="">All</option>
              <option value="in-stock">Ready to supply</option>
            </select>
          </label>
          <label className="field">
            Sort
            <select
              name="sort"
              defaultValue={
                query.sort === "name_asc" ||
                query.sort === "name_desc" ||
                query.sort === "newest" ||
                query.sort === "oldest"
                  ? query.sort
                  : ""
              }
            >
              <option value="">Default</option>
              <option value="name_asc">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </label>
          <button className="btn" type="submit">Find products</button>
        </form>
      </section>
    );
  }

  return (
    <section className="sf-finder is-invite" id="finder">
      <form className="sf-finder-card" action="/products" method="get">
        <h2>Find the right products for your business.</h2>
        <div className="sf-finder-form is-invite">
          <label className="field">
            What do you need?
            <select name="category" defaultValue={query.category ?? ""}>
              <option value="">All produce</option>
              {roots.map((item) => (
                <option key={item.id} value={item.slug}>{item.name}</option>
              ))}
            </select>
          </label>
          {brands.length > 0 && (
            <label className="field">
              Brand
              <select name="brand" defaultValue={query.brand ?? ""}>
                <option value="">All brands</option>
                {brands.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            Minimum MOQ
            <input
              type="number"
              name="min_moq"
              min="0"
              step="0.01"
              defaultValue={query.min_moq ?? ""}
              placeholder="Any"
            />
          </label>

          <label className="field">
            Maximum MOQ
            <input
              type="number"
              name="max_moq"
              min="0"
              step="0.01"
              defaultValue={query.max_moq ?? ""}
              placeholder="Any"
            />
          </label>
          <label className="field">
            Availability
            <select name="availability" defaultValue={query.availability ?? ""}>
              <option value="">Any</option>
              <option value="in-stock">Ready to supply</option>
            </select>
          </label>
          <label className="field">
            Sort
            <select
              name="sort"
              defaultValue={
                query.sort === "name_asc" ||
                query.sort === "name_desc" ||
                query.sort === "newest" ||
                query.sort === "oldest"
                  ? query.sort
                  : ""
              }
            >
              <option value="">Default</option>
              <option value="name_asc">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </label>
          <button className="btn" type="submit">Find products</button>
        </div>
      </form>
    </section>
  );
}
