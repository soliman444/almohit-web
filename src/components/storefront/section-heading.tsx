import { Reveal } from "./reveal";

export function SectionHeading({
  index,
  eyebrow,
  title,
  copy,
  invert,
}: {
  index?: string;
  eyebrow?: string;
  title: string;
  copy?: string;
  invert?: boolean;
}) {
  return (
    <Reveal className={`sf-heading ${invert ? "is-invert" : ""}`}>
      {(index || eyebrow) && (
        <div className="sf-heading-meta">
          {index && <span>{index}</span>}
          {eyebrow && <span>{eyebrow}</span>}
        </div>
      )}
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </Reveal>
  );
}
