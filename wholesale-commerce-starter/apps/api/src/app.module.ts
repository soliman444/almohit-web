import { Module } from "@nestjs/common";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { AddressesModule } from "./addresses/addresses.module";
import { BusinessRequestsModule } from "./business-requests/business-requests.module";
import { CatalogModule } from "./catalog/catalog.module";
import { CartModule } from "./cart/cart.module";
import { CheckoutModule } from "./checkout/checkout.module";
import { CommonModule } from "./common/common.module";
import { CustomersModule } from "./customers/customers.module";
import { HealthModule } from "./health/health.module";
import { OdooModule } from "./odoo/odoo.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { PricingModule } from "./pricing/pricing.module";
import { RolesModule } from "./roles/roles.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    CommonModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    CatalogModule,
    PricingModule,
    CartModule,
    AddressesModule,
    CheckoutModule,
    OrdersModule,
    PaymentsModule,
    BusinessRequestsModule,
    RolesModule,
    PermissionsModule,
    AuditModule,
    OdooModule,
  ],
})
export class AppModule {}
