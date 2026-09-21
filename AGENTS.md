# Paradox Shop — Base44 Dev Environment

## Overview
Django REST + Next.js 14 luxury e-commerce platform ("Paradox Shop").
Backend: Django 5.2, DRF, SimpleJWT, Celery (worker + beat), PostgreSQL 16, Redis 7.
Frontend: Next.js 14.2 (App Router), React 18, TanStack Query, Tailwind CSS, Three.js.

## Running the app
```bash
docker compose -f docker-compose.base44.yml up -d --build
```
- Frontend (preview): http://localhost:3000
- Backend API: http://localhost:8000/api/v1/
- Django admin: http://localhost:8000/admin/ (admin@paradox.shop / paradox-admin-2024)
- API docs: http://localhost:8000/api/docs/swagger/

## Seeding demo data
```bash
# Seed all demo data (idempotent, non-destructive)
docker compose -f docker-compose.base44.yml exec -T backend python manage.py seed_base44_demo

# Clean all demo data
docker compose -f docker-compose.base44.yml exec -T backend python manage.py seed_base44_demo --clean
```

## Demo accounts
- Admin: admin@paradox.shop / paradox-admin-2024
- Customer: customer@paradox.shop / paradox-customer-2024
- Customer2: customer2@paradox.shop / paradox-customer2-2024
- Demo coupon: PARADOX10 (10% off, any order)

## Architecture notes
- **Separate origins**: frontend on port 3000, backend API on port 8000 (both public).
  `NEXT_PUBLIC_API_URL` is set to the backend's public HTTPS URL so browser-side
  API calls reach the backend directly. SSR uses `INTERNAL_API_URL` (Docker network).
- **CORS/CSRF**: Explicit allowlist with `https://3000-${BASE44_PUBLIC_HOST_SUFFIX}`
  (no wildcards). Dev settings also set `CORS_ALLOW_ALL_ORIGINS=True`.
- **Migrations**: run automatically via a one-shot `migrate` compose service
  (`depends_on: service_completed_successfully`) before backend/celery start.
- **Dev settings**: `config.settings.development` sets `ALLOWED_HOSTS=["*"]`.
- **Live reload**: Django runserver (auto-reload) + Next.js dev server (HMR).
  Source is bind-mounted at `/app` in all backend/frontend containers.
- **Celery Beat**: schedule file at `/tmp/celerybeat-schedule` to avoid
  permission issues with the bind-mounted `celerybeat-schedule` file.
- **Media**: `backend/media/` directory must exist with write permissions
  for product image uploads. Created with `chmod -R 777` in the host.

## Key env vars (all local — no external secrets required)
- `DJANGO_SETTINGS_MODULE=config.settings.development`
- `DATABASE_URL=postgres://shop_user:shop_password_secure_123@postgres:5432/shop_db`
- `REDIS_URL=redis://redis:6379/0`
- `NEXT_PUBLIC_API_URL` — backend public URL (set from `BASE44_PUBLIC_HOST_SUFFIX`)
- `INTERNAL_API_URL=http://backend:8000/api/v1` — for SSR

## Verifying the app
1. `curl -s http://localhost:8000/api/v1/health/` → `{"status":"ready",...}`
2. `curl -s http://localhost:8000/api/v1/products/` → JSON with 13 products
3. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → 200
4. Preview iframe shows the storefront homepage with hero + featured products.

## Test commands
```bash
# Backend tests
docker compose -f docker-compose.base44.yml exec -T backend pytest
# Frontend tests
docker compose -f docker-compose.base44.yml exec -T frontend npm test -- --run
# TypeScript check
docker compose -f docker-compose.base44.yml exec -T frontend npx tsc --noEmit
# Lint
docker compose -f docker-compose.base44.yml exec -T frontend npm run lint
# Django check
docker compose -f docker-compose.base44.yml exec -T backend python manage.py check
# Migration check
docker compose -f docker-compose.base44.yml exec -T backend python manage.py makemigrations --check
```

## Known issues
- 1 backend test (`test_production_security_headers_and_ssl`) fails because
  dev `ALLOWED_HOSTS=*` leaks into the production settings import. Pre-existing.
- Product images are simple placeholder JPEGs, not real photography.

## Documentation
- `docs/deployment/base44-preview-fa.md` — Architecture & setup
- `docs/deployment/base44-verification-fa.md` — Verification report
- `docs/deployment/base44-demo-data-fa.md` — Seeded data summary
