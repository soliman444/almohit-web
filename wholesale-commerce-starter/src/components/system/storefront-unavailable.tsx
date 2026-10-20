import { StorefrontShell } from "../storefront/shell";
import { ServiceUnavailable } from "./service-unavailable";

export async function StorefrontUnavailable() {
  return (
    <StorefrontShell>
      <ServiceUnavailable compact />
    </StorefrontShell>
  );
}
