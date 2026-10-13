import type { StorefrontCategoryCard } from "../../lib/storefront-types";
import type { FinderQuery } from "../../lib/storefront-filters";

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
            Minimum order
            <select name="moq" defaultValue={query.moq ?? ""}>
              <option value="">Any</option>
              <option value="5">Up to 5</option>
              <option value="10">Up to 10</option>
            </select>
          </label>
          <label className="field">
            Availability
            <select name="availability" defaultValue={query.availability ?? ""}>
              <option value="">All</option>
              <option value="in-stock">Ready to supply</option>
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
          <label className="field">
            Minimum order
            <select name="moq" defaultValue={query.moq ?? ""}>
              <option value="">Any</option>
              <option value="5">Up to 5</option>
              <option value="10">Up to 10</option>
            </select>
          </label>
          <label className="field">
            Availability
            <select name="availability" defaultValue={query.availability ?? ""}>
              <option value="">Any</option>
              <option value="in-stock">Ready to supply</option>
            </select>
          </label>
          <button className="btn" type="submit">Find products</button>
        </div>
      </form>
    </section>
  );
}
