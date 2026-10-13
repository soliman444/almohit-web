# Local development

Storefront (Next.js): http://localhost:8069  
Odoo: http://localhost:8070

```bash
docker compose up -d
npm install
npm run db:generate
npm run dev
```

Prisma/PostgreSQL is for staff accounts, roles, and audit logs. Catalog, cart, checkout, and invoices go to Odoo.
