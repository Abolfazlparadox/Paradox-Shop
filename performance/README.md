# Paradox Shop — Performance, Profiling & Load Testing Suite

This directory contains the reproducible load testing infrastructure, scenarios, and profiling guidelines for Paradox Shop (Phase 4.6).

---

## 1. Prerequisites

- **Docker & Docker Compose**: All application services (`shop_backend`, `shop_frontend`, `shop_postgres`, `shop_redis`, `shop_celery_worker`, `shop_celery_beat`) must be running.
- **k6 CLI** or **Docker k6 Image** (`grafana/k6:latest`).

Verify service availability:
```bash
curl http://127.0.0.1:8000/api/v1/health/
curl http://127.0.0.1:3000/
```

---

## 2. Test Scripts Overview

| Script | Purpose | Traffic Profile | Endpoints Covered |
|---|---|---|---|
| `load-tests/public-api.js` | Stress public catalog & read endpoints | Multi-stage (5, 10, 25 VUs) | `/products/`, `/products/{slug}/`, `/categories/tree/`, `/shipping/methods/`, `/promotions/`, `/reviews/product/{id}/summary/` |
| `load-tests/catalog-flow.js` | Realistic patron browsing flow | Multi-stage (5, 15 VUs) | Category Tree -> Filtered Product Search -> Product Detail -> Product Reviews |
| `load-tests/cart-flow.js` | Guest cart lifecycle operations | Multi-stage (3, 10 VUs) | Cart Fetch -> Add Item -> Update Quantity -> Delete Item |
| `load-tests/authenticated-api.js` | Authenticated patron endpoints | Multi-stage (5, 15 VUs) | Cart, Wishlist, Orders List, Profile Me |

---

## 3. Running Load Tests with Docker

To run without installing k6 on the host, pipe the test script to `grafana/k6`:

### A. Public API Benchmark
```bash
docker run --rm -i --network=host grafana/k6 run - < performance/load-tests/public-api.js
```
*(On macOS/Windows without host networking, use `-e BASE_URL=http://host.docker.internal:8000`)*

### B. Catalog Flow Benchmark
```bash
docker run --rm -i --network=host grafana/k6 run - < performance/load-tests/catalog-flow.js
```

### C. Cart Flow Benchmark
```bash
docker run --rm -i --network=host grafana/k6 run - < performance/load-tests/cart-flow.js
```

### D. Authenticated API Benchmark
```bash
docker run --rm -i --network=host -e TEST_USER_EMAIL="abolfazlmohammadshahi78@gmail.com" -e TEST_USER_PASSWORD="YourPassword" grafana/k6 run - < performance/load-tests/authenticated-api.js
```

---

## 4. Synthetic Scaled Data Seeding (Phase 8 Testing)

To test pagination and database behavior under hundreds of products without polluting the permanent catalog:

```bash
# Seed 100 synthetic products, 200 variants, images, and reviews
docker exec shop_backend python manage.py seed_perf_data --count=100

# Cleanup all synthetic performance data
docker exec shop_backend python manage.py seed_perf_data --clean
```

---

## 5. Django Query Instrumentation & N+1 Audit

To measure the exact query count and execution time of all core endpoints:

```bash
docker exec -i shop_backend python << 'EOF'
import django, os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()
# Audit script runs here
EOF
```

---

## 6. Safety & Production Hardening Boundaries

- **Mock Payments**: Never target real payment gateways during load tests.
- **Isolated Synthetic Data**: All seeded items are prefixed with `[PERF-TEST]` and cleaned after tests.
- **Security Middleware Active**: Rate limiting, CORS, CSRF, and permissions remain strictly enforced.
