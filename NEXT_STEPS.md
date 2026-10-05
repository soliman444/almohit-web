# Next implementation milestones

## Completed foundation
- Users, Roles, Permissions
- Customers and business approval request
- Price groups and basic product/catalog schema
- Database-backed login sessions
- Register / login / logout
- Admin approval/rejection of business accounts
- Custom role creation
- Staff account creation and role assignment
- Basic audit logs

## Completed: Catalog V1
- Hierarchical categories with admin CRUD, enable/disable, sort order, soft delete
- Brands with admin CRUD, active/inactive, soft delete
- Products with media (URL/path), inventory, and wholesale price
- Storefront: `/`, `/products`, `/products/[slug]`, `/categories/[slug]`
- Backend price visibility: no price for visitor/NORMAL/PENDING/REJECTED; group price for APPROVED
- Server-side permission checks and audit logs for catalog mutations

## Completed: Commerce Core V1
- Persistent approved-buyer cart
- Customer addresses
- Checkout with server-side price/inventory checks
- Orders, status history, inventory reservation
- Manual payments (cash / bank transfer / manual)
- Customer order pages and admin order management

## Next after Commerce Core V1
- Product attributes + variants editor
- Search and filters
- Wishlist
- External payment gateway
- Notifications
- Homepage CMS sections
- Performance/security polish
