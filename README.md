# Wholesale Commerce Platform — Storefront

متجر الجملة (Next.js). المصدر التجاري والكتالوج والحسابات هو Odoo.

## التقنية
- Next.js 16 + TypeScript (`apps/web`)
- Odoo 17 للكتالوج، السلة، الطلبات، العناوين، الفواتير، الموظفين

## التشغيل المحلي
1. انسخ `.env.example` إلى `.env`، و`apps/web/.env.example` إلى `apps/web/.env`.
2. ثبت الحزم من جذر هذا المجلد:
   `npm install`
3. شغّل الواجهة:
   `npm run dev`

واجهة المتجر: http://localhost:8069  
Odoo: http://localhost:8070

### المسارات
- `/` المتجر
- `/login` و `/register`
- `/account`
- `/admin` (موظفو Odoo)
