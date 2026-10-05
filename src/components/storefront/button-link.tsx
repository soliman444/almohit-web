import Link from "next/link";

export function ButtonLink({
  href,
  children,
  invert,
  subtle,
  ghost,
  plain,
}: {
  href: string;
  children: string;
  invert?: boolean;
  subtle?: boolean;
  ghost?: boolean;
  plain?: boolean;
}) {
  return (
    <Link className={`sf-btn ${invert ? "is-invert" : ""} ${subtle ? "is-subtle" : ""} ${ghost ? "is-ghost" : ""}`} href={href}>
      <span>{children}</span>
      {plain ? null : <span className="sf-arrow" aria-hidden>→</span>}
    </Link>
  );
}
