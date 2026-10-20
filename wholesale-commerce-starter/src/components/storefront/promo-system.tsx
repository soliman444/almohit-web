import Link from "next/link";
import { STOREFRONT_PROMOS, type StorefrontPromo } from "../../lib/content/promos";
import { SectionHeading } from "./section-heading";

export function OfferBadge({ label }: { label: string }) {
  return <span className="sf-offer-badge">{label}</span>;
}

export function DealBanner({ promo }: { promo: StorefrontPromo }) {
  return (
    <Link className={`sf-deal-banner is-${promo.tone}`} href={promo.href}>
      <div>
        <p className="sf-kicker">{promo.eyebrow}</p>
        <h3>{promo.title}</h3>
        <p>{promo.copy}</p>
      </div>
      <div className="sf-deal-mark">
        {promo.badge && <strong>{promo.badge}</strong>}
        {promo.discountLabel && <span>{promo.discountLabel}</span>}
      </div>
    </Link>
  );
}

export function OffersSection({ promos = STOREFRONT_PROMOS }: { promos?: StorefrontPromo[] }) {
  const [lead, ...rest] = promos;
  if (!lead) return null;
  return (
    <section className="sf-section is-offers" id="offers">
      <SectionHeading
        index="03"
        eyebrow="Offers"
        title="Current offers."
        copy="Trade windows from the live catalog — open a collection or a case."
      />
      <DealBanner promo={lead} />
      {rest.length > 0 && (
        <div className="sf-promo-grid">
          {rest.map((promo) => (
            <Link key={promo.id} className={`sf-promo-card is-${promo.tone}`} href={promo.href}>
              {promo.badge && <OfferBadge label={promo.badge} />}
              <p className="sf-kicker">{promo.eyebrow}</p>
              <h3>{promo.title}</h3>
              <p>{promo.copy}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function PromoSlot({ promo }: { promo?: StorefrontPromo }) {
  if (!promo) return null;
  return (
    <div className="sf-promo-slot">
      <DealBanner promo={promo} />
    </div>
  );
}
