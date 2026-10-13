# Wholesale Commerce Platform — Starter

المرحلة الأولى من متجر جملة عام قابل للتوسع لأي فئة منتجات.

## التقنية
- Next.js 16.3.8 + TypeScript
- PostgreSQL
- Prisma ORM 7
- RBAC: Users / Roles / Permissions

## ما تم تأسيسه
- Users
- Roles / Permissions
- Customers
- Business account approval requests
- Categories (nested)
- Brands
- Products
- Price groups / prices
- Audit logs

## التشغيل المحلي
1. انسخ `.env.example` إلى `.env` (جذر المشروع). اختياري: `apps/web/.env.example` و `apps/api/.env.example`.
2. شغّل PostgreSQL:
   `docker compose up -d`
3. ثبت الحزم من الجذر:
   `npm install`
4. أنشئ Prisma Client:
   `npm run db:generate`
5. شغّل الـ API ثم الواجهة:
   `npm run dev:api`
   `npm run dev:web`

واجهة المتجر: http://localhost:8069  
API: http://localhost:4000/api/v1/health  
Swagger: http://localhost:4000/api/docs  

تفاصيل CORS والكوكيز: `docs/local-dev.md`

لا تشغّل `prisma migrate reset` ولا `db push --accept-data-loss`.

## قاعدة الأسعار
الواجهة العامة لا يجب أن تحصل على الأسعار من الـ API للزائر أو العميل غير المعتمد. إخفاء السعر في الواجهة وحده غير كافٍ.

## المرحلة التالية
Authentication + sessions، ثم API/use-cases لاعتماد التاجر وإدارة المستخدمين والأدوار والصلاحيات.

## Phase 2 implemented

- Database-backed secure sessions with an httpOnly cookie.
- Register / login / logout.
- Customer account dashboard.
- Business account request workflow.
- Admin approve/reject workflow and automatic Wholesale price group assignment.
- Admin dashboard.
- Create custom roles with selected permissions.
- Create staff accounts and assign a role.
- Audit log entries for key admin actions.

### Useful routes

- `/register`
- `/login`
- `/account`
- `/account/business`
- `/admin`
- `/admin/business-requests`
- `/admin/roles`
- `/admin/users`

After pulling this phase, run a new migration:

```bash
npm run db:generate
npm run db:migrate -- --name add_sessions_and_auth
npm run db:seed
npm run dev
```
