import { SHOT } from "../../lib/shots";
import { ImageShot } from "./image-shot";

const STEPS = [
  { n: "01", title: "Browse products", copy: "See the catalog before prices appear.", image: SHOT.citrus },
  { n: "02", title: "Request business approval", copy: "Open a trade account in a few fields.", image: SHOT.hands },
  { n: "03", title: "Unlock wholesale prices", copy: "Approved buyers see their trade rate.", image: SHOT.oil },
  { n: "04", title: "Place your order", copy: "Choose the case, confirm, and we prepare the drop.", image: SHOT.grapes },
] as const;

const TRUST = [
  { title: "Reliable supply", copy: "Stock and timing sit with every product." },
  { title: "Selected products", copy: "Only fruit that earns a place in the catalog." },
  { title: "Business pricing", copy: "Trade numbers appear after approval." },
] as const;

export function HowItWorks() {
  return (
    <section className="sf-section is-how" id="how">
      <h2 className="sf-section-title">How Almohit works</h2>
      <div className="sf-how-layout">
        <div className="sf-how-trust">
          {TRUST.map((item) => (
            <article key={item.title} className="sf-why-card is-warm">
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
        <ol className="sf-how-grid">
          {STEPS.map((step) => (
            <li key={step.n} className="sf-how-step">
              <div className="sf-how-media">
                <ImageShot src={step.image} alt="" sizes="28vw" preset="category-card" className="sf-fill" />
              </div>
              <span>{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
