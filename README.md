# Wholesale Commerce Platform — Storefront

متجر الجملة (Next.js). المصدر التجاري والكتالوج هو Odoo.

## التقنية
- Next.js 16 + TypeScript (`apps/web`)
- PostgreSQL + Prisma للموظفين والصلاحيات فقط
- Odoo 17 للكتالوج، السلة، الطلبات، العناوين، الفواتير

## التشغيل المحلي
1. انسخ `.env.example` إلى `.env`، و`apps/web/.env.example` إلى `apps/web/.env`.
2. شغّل PostgreSQL:
   `docker compose up -d`
3. ثبت الحزم من جذر هذا المجلد:
   `npm install`
4. أنشئ Prisma Client:
   `npm run db:generate`
5. شغّل الواجهة:
   `npm run dev`

واجهة المتجر: http://localhost:8069  
Odoo: http://localhost:8070

لا تشغّل `prisma migrate reset` ولا `db push --accept-data-loss`.

### المسارات
- `/` المتجر
- `/login` و `/register`
- `/account`
- `/admin` (موظفو Prisma)
