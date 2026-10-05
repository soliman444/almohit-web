import { getDisplayCurrencyState } from "../../lib/display-currency";
import { DisplayCurrencyProvider } from "./display-currency";
import { FloatingDock } from "./floating-dock";
import { PageFade } from "./page-fade";
import { SiteFooter } from "./site-footer";
import { StorefrontHeader } from "./storefront-header";

export async function StorefrontShell({
  children,
  transparentHeader,
}: {
  children: React.ReactNode;
  transparentHeader?: boolean;
}) {
  const { code: currency, catalog } = await getDisplayCurrencyState();
  return (
    <DisplayCurrencyProvider currency={currency} catalog={catalog}>
      <div className="sf">
        <StorefrontHeader transparent={transparentHeader} currency={currency} currencies={catalog} />
        <PageFade>{children}</PageFade>
        <SiteFooter />
        <FloatingDock />
      </div>
    </DisplayCurrencyProvider>
  );
}
