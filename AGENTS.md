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
- Django admin: http://localhost:8000/admin/ (admin@paradox.shop / paradox123)
- API docs: http://localhost:8000/api/docs/swagger/

## Architecture notes
- **Separate origins**: frontend on port 3000, backend API on port 8000 (both public).
  `NEXT_PUBLIC_API_URL` is set to the backend's public HTTPS URL so browser-side
  API calls reach the backend directly. SSR uses `INTERNAL_API_URL` (Docker network).
- **Migrations**: run automatically via a one-shot `migrate` compose service
  (`depends_on: service_completed_successfully`) before backend/celery start.
- **Dev settings**: `config.settings.development` sets `ALLOWED_HOSTS=["*"]` and
  `CORS_ALLOW_ALL_ORIGINS=True`, so no host/origin allowlists are needed.
- **Live reload**: Django runserver (auto-reload) + Next.js dev server (HMR).
  Source is bind-mounted at `/app` in all backend/frontend containers.
- **Seed data**: `docker compose -f docker-compose.base44.yml exec -T backend
  python manage.py seed_perf_data --count 12` (creates [PERF-TEST] products).
  Realistic demo data was seeded via a one-off script (see /tmp/seed_paradox_shell.py).

## Key env vars (all local — no external secrets required)
- `DJANGO_SETTINGS_MODULE=config.settings.development`
- `DATABASE_URL=postgres://shop_user:shop_password_secure_123@postgres:5432/shop_db`
- `REDIS_URL=redis://redis:6379/0`
- `NEXT_PUBLIC_API_URL` — backend public URL (set from `BASE44_PUBLIC_HOST_SUFFIX`)
- `INTERNAL_API_URL=http://backend:8000/api/v1` — for SSR

## Verifying the app
1. `curl -s http://localhost:8000/api/v1/products/` → JSON with product list
2. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → 200
3. Preview iframe shows the storefront homepage with hero + featured products.

## Common operations
```bash
# Create new migrations
docker compose -f docker-compose.base44.yml exec -T backend python manage.py makemigrations
# Django shell
docker compose -f docker-compose.base44.yml exec -T backend python manage.py shell
# Tail logs
docker compose -f docker-compose.base44.yml logs -f backend
docker compose -f docker-compose.base44.yml logs -f frontend
```
