# Almohit WhatsApp sender

Internal outbound-only WhatsApp Web sender. It is not part of Odoo or Next.js.

## Local / Docker

From `g:\odoo17-docker`:

```bash
docker compose --profile whatsapp up -d --build almohit_whatsapp
```

1. Set `WHATSAPP_SERVICE_TOKEN` (shared with Odoo). Default local token is `almohit-whatsapp-dev`.
2. Logs print a QR code: `docker logs -f almohit_whatsapp`
3. Scan the QR from WhatsApp on the business phone.
4. Session files stay in the `whatsapp_data` volume so restart does not log out.
5. `GET http://127.0.0.1:3001/health` until `whatsapp.connected` is `true`.
6. Enable Odoo sending with `WHATSAPP_ENABLED=true` and recreate the Odoo container.

Odoo keeps working if this service is stopped. WhatsApp is a side effect, never a business requirement.
