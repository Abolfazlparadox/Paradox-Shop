# Base44 Preview Environment — Architecture & Setup

> **Base44 Preview ≠ Production.** This is a public/demo preview environment.
> It does not represent production infrastructure.

## 1. Source Commit

- **Repository**: Abolfazlparadox/Paradox-Shop
- **Base commit**: `82dafed` (Merge feature/performance-load-testing into main — Phases 0 through 4.6 complete)
- **Base44 branch**: `base44/setup-c527b3c7` (isolated preview branch, does not modify `main`)

## 2. Services

| Service | Image | Port | Status |
|--------|-------|------|--------|
| PostgreSQL | `postgres:16-alpine` | 5432 (internal) | Healthy |
| Redis | `redis:7-alpine` | 6379 (internal) | Healthy |
| Backend (Django) | `python:3.12-slim` (built from Dockerfile.dev) | 8000 (public) | Running |
| Frontend (Next.js) | `node:20-alpine` (built from Dockerfile.dev) | 3000 (public) | Running |
| Celery Worker | `python:3.12-slim` | — | Running |
| Celery Beat | `python:3.12-slim` | — | Running |
| Migrate (one-shot) | `python:3.12-slim` | — | Exited (0) |

## 3. Public Preview URLs

- **Frontend (storefront)**: `https://3000-$BASE44_PUBLIC_HOST_SUFFIX`
- **Backend API**: `https://8000-$BASE44_PUBLIC_HOST_SUFFIX/api/v1/`
- **Django Admin**: `https://8000-$BASE44_PUBLIC_HOST_SUFFIX/admin/`
- **Swagger UI**: `https://8000-$BASE44_PUBLIC_HOST_SUFFIX/api/docs/swagger/`
- **Redoc**: `https://8000-$BASE44_PUBLIC_HOST_SUFFIX/api/docs/redoc/`

## 4. Internal URLs (Docker Network)

- `INTERNAL_API_URL`: `http://backend:8000/api/v1` (used by Next.js SSR)
- `INTERNAL_BACKEND_URL`: `http://backend:8000` (used for media proxy rewrites)
- `DATABASE_URL`: `postgres://shop_user:shop_password_secure_123@postgres:5432/shop_db`
- `REDIS_URL`: `redis://redis:6379/0`

## 5. Environment Variables

All environment variables are local — no external secrets required.

| Variable | Value | Purpose |
|----------|-------|---------|
| `DJANGO_SETTINGS_MODULE` | `config.settings.development` | Dev settings (ALLOWED_HOSTS=*, CORS_ALLOW_ALL_ORIGINS=True) |
| `DJANGO_DEBUG` | `True` | Debug mode |
| `DJANGO_SECRET_KEY` | `base44-dev-secret-key-not-for-production-use` | Dev-only signing key |
| `NEXT_PUBLIC_API_URL` | `https://8000-${BASE44_PUBLIC_HOST_SUFFIX}/api/v1` | Browser-side API URL |
| `INTERNAL_API_URL` | `http://backend:8000/api/v1` | SSR API URL |
| `CORS_ALLOWED_ORIGINS` | `https://3000-${BASE44_PUBLIC_HOST_SUFFIX},http://localhost:3000` | Explicit allowlist (no wildcards) |
| `CSRF_TRUSTED_ORIGINS` | `https://3000-${BASE44_PUBLIC_HOST_SUFFIX},http://localhost:3000` | Explicit allowlist |

## 6. Demo Users

| Role | Email | Password |
|------|-------|----------|
| Admin/Staff | `admin@paradox.shop` | `paradox-admin-2024` |
| Customer | `customer@paradox.shop` | `paradox-customer-2024` |
| Customer 2 | `customer2@paradox.shop` | `paradox-customer2-2024` |

## 7. Demo Coupon

| Code | Description | Discount | Min Order |
|------|-------------|----------|-----------|
| `PARADOX10` | 10% off any order | 10% | None |
| `SAVE5M` | 5M Rial off | Fixed 5,000,000 | 30,000,000 |
| `WELCOME15` | 15% off, capped at 10M | 15% (max 10M) | None |
| `LUXE20` | 20% off, 5 total uses | 20% | None |
| `EXPIRED2025` | Expired | — | — |
| `VIPONLY` | VIP-only (customer@paradox.shop) | Fixed 10,000,000 | None |

## 8. Network Architecture

```
Browser
   ↓ (HTTPS)
Base44 Frontend Public URL (port 3000)
   ↓
   ├── Next.js SSR → INTERNAL_API_URL (http://backend:8000/api/v1)
   ├── Media proxy → http://backend:8000/media/:path*
   └── Client-side API → NEXT_PUBLIC_API_URL (https://8000-.../api/v1)
                             ↓
                        Base44 Backend Public URL (port 8000)
                             ↓
                        Django REST API
```

## 9. Celery Configuration

- **Worker**: `celery -A config worker -l info --concurrency=2`
- **Beat**: `celery -A config beat -l info --schedule /tmp/celerybeat-schedule`
  - Schedule file moved to `/tmp/` to avoid permission issues with bind-mounted `celerybeat-schedule` file
- **Broker**: `redis://redis:6379/1`
- **Result Backend**: `redis://redis:6379/2`

## 10. Running the Preview

```bash
# Start all services
docker compose -f docker-compose.base44.yml up -d --build

# Seed demo data (idempotent)
docker compose -f docker-compose.base44.yml exec -T backend python manage.py seed_base44_demo

# Clean demo data
docker compose -f docker-compose.base44.yml exec -T backend python manage.py seed_base44_demo --clean

# View logs
docker compose -f docker-compose.base44.yml logs -f backend
docker compose -f docker-compose.base44.yml logs -f frontend
```

## 11. Known Limitations

- This is a development preview — `DJANGO_DEBUG=True`, dev-only secret key
- Product images are simple placeholder JPEGs (solid color with border)
- No real payment gateway — mock payment flow only
- The 1 backend test failure (`test_production_security_headers_and_ssl`) is pre-existing and caused by the dev environment's `ALLOWED_HOSTS=*` leaking into the production settings import test
