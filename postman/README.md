# Almohit Odoo API — Postman

كل مسارات `/almohit/api` من `almohit_core`.

## الاستيراد
1. Postman → Import
2. `Almohit-Odoo-API.postman_collection.json`
3. `Almohit-Odoo-API.postman_environment.json`
4. اختر البيئة **Almohit Local**

## التشغيل
1. املأ في البيئة: `portalEmail` / `portalPassword` و`staffEmail` / `staffPassword`
2. شغّل **Health**
3. شغّل **Login portal** أو **Login staff** — يحفظ `session_id` تلقائياً
4. باقي الطلبات تستخدم نفس الجلسة

`baseUrl` الافتراضي: `http://localhost:8070`

## ملاحظات
- السلة والطلب يحتاجان عميل **معتمد** (ليس مسوّقاً)
- مجلد Admin يحتاج موظف أودو داخلي
- التوصيل يحتاج موزعاً معتمداً
- المسوّق له مجلد منفصل
- **Catalog migration** يكتب في قاعدة أودو — لا تشغّله للتجربة اليومية
