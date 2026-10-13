# Local development: web + API

Storefront (Next.js): http://localhost:8069  
API (NestJS): http://localhost:4000  
Swagger: http://localhost:4000/api/docs  
Health: http://localhost:4000/api/v1/health

```bash
docker compose up -d
npm install
npx prisma generate
npm run dev:api
npm run dev:web
```

Shared database: both apps use the same `DATABASE_URL` (PostgreSQL). Do not create a second database.

## Cookies and CORS

The session cookie is still `wholesale_session` (httpOnly). The NestJS API reads that cookie and resolves the existing `Session` row. JWT is not used.

In local development the browser talks to the Next.js origin (`http://localhost:8069`). Server-side catalog calls from Next.js to `http://localhost:4000` forward the cookie on the server, so they are not a browser cross-origin request.

If you later call the API directly from the browser on a different origin:

- set `CORS_ORIGIN` to the exact web origin (never `*` with `credentials: true`)
- send `credentials: true`
- keep `SameSite=Lax` for same-site deployments

Same-site production options:

1. Reverse proxy: `domain.com` (web) and `domain.com/api` (API) — cookies stay first-party.
2. Sibling hosts: `www.domain.com` and `api.domain.com` — requires `SameSite=None; Secure` and an explicit CORS origin.

Prefer option 1 for this cookie session model.
