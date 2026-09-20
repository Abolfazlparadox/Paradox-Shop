# Paradox Shop Deployment Guide

## Production Architecture

In production, Paradox Shop is orchestrated via `docker-compose.prod.yml`:

```
                    Internet / Cloudflare
                              │
                              ▼ (Ports 80 / 443)
                    ┌───────────────────┐
                    │    Nginx Proxy    │
                    └───┬───────────┬───┘
         /api, /admin   │           │   / (Frontend routes)
                        ▼           ▼
             ┌───────────────┐ ┌───────────────┐
             │ Gunicorn App  │ │ Next.js Node  │
             │ (Django REST) │ │  (SSR App)    │
             └───┬───────────┘ └───────────────┘
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
┌────────────┐        ┌────────────┐
│ PostgreSQL │        │   Redis    │
│  (DB 16)   │        │  (Cache)   │
└────────────┘        └─────┬──────┘
                            │ Broker
                      ┌─────▼──────┐
                      │   Celery   │
                      │  Workers   │
                      └────────────┘
```

## Production Configuration Checklist

1. **Secrets**: Inject non-default values for `DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD`, etc.
2. **Hosts & CORS**: Set `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`.
3. **Database Migrations**: Run `docker compose -f docker-compose.prod.yml exec backend python manage.py migrate`.
4. **Static Assets**: Collected automatically into `static_volume` on container build.
5. **Health Verification**:
   - `curl -f http://<host>/api/v1/health/live/`
   - `curl -f http://<host>/api/v1/health/ready/`

## Zero Downtime & Rollback Strategy

- Database migrations must remain backward-compatible (expand before contract).
- Celery worker deployments should utilize warm shutdowns (`SIGTERM`) to let running tasks finish.
