import { ScrollStory } from "../../components/storefront/scroll-story";
import { StorefrontShell } from "../../components/storefront/shell";
import { VisualBreak } from "../../components/storefront/visual-break";
import { WholesaleCta } from "../../components/storefront/wholesale-cta";
import { EDITORIAL } from "../../components/storefront/visuals";

export default function AboutPage() {
  return (
    <StorefrontShell>
      <main className="sf-page">
        <p className="sf-kicker">About</p>
        <h1 className="sf-page-title">A catalog seen before it is priced.</h1>
        <p className="sf-heading">
          We build a wholesale catalog you can browse first. Approved buyers then see their trade prices.
        </p>
      </main>
      <VisualBreak src={EDITORIAL.hands} alt="Working hands" title="Fruit chosen for the next drop." />
      <ScrollStory />
      <WholesaleCta />
    </StorefrontShell>
  );
}