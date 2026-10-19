import Link from "next/link";

export function CatalogPager({
  pagination,
  hrefForPage,
}: {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  hrefForPage: (page: number) => string;
}) {
  if (pagination.pages <= 1 && !pagination.hasNext && !pagination.hasPrevious) return null;

  return (
    <nav className="sf-controls" aria-label="Pagination">
      {pagination.hasPrevious ? (
        <Link href={hrefForPage(pagination.page - 1)}>Previous</Link>
      ) : (
        <span className="is-disabled">Previous</span>
      )}
      <span className="sf-count">
        Page {String(pagination.page).padStart(2, "0")}
        {pagination.pages > 0 ? ` / ${String(pagination.pages).padStart(2, "0")}` : ""}
      </span>
      {pagination.hasNext ? (
        <Link href={hrefForPage(pagination.page + 1)}>Next</Link>
      ) : (
        <span className="is-disabled">Next</span>
      )}
    </nav>
  );
}
