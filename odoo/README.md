# Odoo 17 — Almohit

نسخة من باك اند Odoo داخل مشروع المنصة الموحد.

النسخة الأصلية تبقى في `G:\odoo17-docker` ولم تُحذف.

## التشغيل

```bash
cp .env.example .env
docker compose --profile whatsapp up -d
```

- Odoo: http://localhost:8070
- الداتابيس: `odoo17db`
- الإضافات في `addons/` (أهمها `almohit_core`)
- خدمة واتساب تُبنى من `../services/almohit-whatsapp`
