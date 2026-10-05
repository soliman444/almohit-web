import { SectionHeading } from "./section-heading";

const POINTS = [
  { title: "Chosen with care", copy: "Only what earns a place in the catalog." },
  { title: "Clear origin", copy: "One source, named, for every group." },
  { title: "Ready to supply", copy: "Stock and minimums sit with the product." },
  { title: "Trade pricing", copy: "The visitor sees the fruit. The approved buyer sees the number." },
] as const;

export function WhyAlmohit() {
  return (
    <section className="sf-section is-why" id="why">
      <SectionHeading
        index="08"
        eyebrow="Trust"
        title="Why Almohit."
        copy="A wholesale desk that stays readable: product first, price later."
      />
      <div className="sf-why-grid">
        {POINTS.map((item, index) => (
          <article key={item.title} className={`sf-why-card is-${index % 2 === 0 ? "warm" : "ink"}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{item.title}</h3>
            <p>{item.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
