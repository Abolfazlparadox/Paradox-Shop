# Implementation Plan: Paradox Shop Backend Bug Fixes, Full Verification & Persian Handoff

Inspect, debug, and fix remaining backend issues, consolidate the test suite into a single authoritative set of integration tests, execute full verification across database, concurrency, security, and OpenAPI layers, and produce comprehensive Persian handoff documentation for the Frontend team.

## User Review Required

> [!IMPORTANT]
> - All tests will be consolidated under `backend/tests/integration/` as the single authoritative test suite.
> - The obsolete duplicate/placeholder test files under `backend/apps/*/tests/test_views.py` will have any useful assertions migrated to `backend/tests/integration/` before removal.
> - Django 6.0 `CheckConstraint.check` deprecation warnings will be updated to `condition=` across models to maintain modern Django standard and reduce noise in test runs.

## Proposed Changes

### 1. Test Fixtures & Configuration

#### [MODIFY] [conftest.py](file:///d:/Project/GitHub/Paradox-Shop/backend/tests/conftest.py)
- In `create_brand` fixture, unpack `Brand.objects.get_or_create(...)` to return the `Brand` model instance directly instead of the `(instance, created)` tuple.

---

### 2. Orders Module

#### [MODIFY] [views.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/orders/views.py)
- Add missing imports `from django.http import Http404` and `from .models import Order` used in `OrderDetailView.get_object`.

---

### 3. Integration Tests & Stale Tests Consolidation

#### [MODIFY] [test_orders_api.py](file:///d:/Project/GitHub/Paradox-Shop/backend/tests/integration/test_orders_api.py)
- Fix reverse URL call in `test_checkout_workflow_success` line 43 from `'api_v1:cart:cart'` to `'api_v1:cart:detail'`.

#### [MODIFY] [test_health_and_settings.py](file:///d:/Project/GitHub/Paradox-Shop/backend/tests/integration/test_health_and_settings.py)
- Add tests for domain-specific health check endpoints (`api_v1:orders:module_health`, `api_v1:payments:module_health`, `api_v1:reviews:module_health`).

#### [DELETE] Obsolete App-Level Placeholder Test Files
- `backend/apps/cart/tests/test_views.py`
- `backend/apps/categories/tests/test_views.py`
- `backend/apps/products/tests/test_views.py`
- `backend/apps/users/tests/test_views.py`
- `backend/apps/orders/tests/test_views.py`
- `backend/apps/payments/tests/test_views.py`
- `backend/apps/reviews/tests/test_views.py`

---

### 4. Models (Django 6.0 Modernization)

#### [MODIFY] [models.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/products/models.py)
- Replace `check=models.Q(...)` with `condition=models.Q(...)` in `CheckConstraint`.

#### [MODIFY] [models.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/cart/models.py)
- Replace `check=models.Q(...)` with `condition=models.Q(...)` in `CheckConstraint`.

#### [MODIFY] [models.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/orders/models.py)
- Replace `check=models.Q(...)` with `condition=models.Q(...)` in `CheckConstraint`.

#### [MODIFY] [models.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/payments/models.py)
- Replace `check=models.Q(...)` with `condition=models.Q(...)` in `CheckConstraint`.

#### [MODIFY] [models.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/reviews/models.py)
- Replace `check=models.Q(...)` with `condition=models.Q(...)` in `CheckConstraint`.

---

### 5. OpenAPI Schema Typing (Clean Polish)

#### [MODIFY] [serializers.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/products/serializers.py)
- Add `@extend_schema_field` decorators on serializer method fields to resolve Spectacular schema warnings.

---

### 6. Persian Backend Handoff Documentation

#### [NEW] [backend-handoff-fa.md](file:///d:/Project/GitHub/Paradox-Shop/docs/api/backend-handoff-fa.md)
- Complete, professional Persian handoff document structured according to the prompt's 15 detailed sections:
  1. معرفی پروژه
  2. معماری کلان
  3. ساختار Backend
  4. Domain Breakdown
  5. API Guide
  6. Authentication
  7. Cart / Checkout / Orders
  8. Payments
  9. Reviews
  10. Engineering Highlights (Transactions, Concurrency, N+1, Idempotency, Snapshots, Logging)
  11. Testing Strategy & Exact Results
  12. OpenAPI / Swagger Guide
  13. Frontend Integration Guide
  14. Known Limitations & Deferred Features
  15. Backend Handoff Checklist

---

## Verification Plan

### Automated Tests
- Targeted test suites:
  - `docker compose exec backend pytest tests/integration/test_users_api.py -v`
  - `docker compose exec backend pytest tests/integration/test_products_api.py -v`
  - `docker compose exec backend pytest tests/integration/test_cart_api.py -v`
  - `docker compose exec backend pytest tests/integration/test_orders_api.py -v`
  - `docker compose exec backend pytest tests/integration/test_payments_api.py -v`
  - `docker compose exec backend pytest tests/integration/test_reviews_api.py -v`
  - `docker compose exec backend pytest tests/integration/test_security_and_auth.py -v`
  - `docker compose exec backend pytest tests/integration/test_health_and_settings.py -v`
  - `docker compose exec backend pytest tests/integration/test_categories_api.py -v`
- Full backend suite with coverage:
  - `docker compose exec backend pytest -v --tb=short --cov=apps --cov=common --cov-report=term-missing`
- Django system and migration checks:
  - `docker compose exec backend python manage.py check`
  - `docker compose exec backend python manage.py makemigrations --check`
  - `docker compose exec backend python manage.py spectacular --validate`

### Code Quality & Docker
- Linting & formatting check: `flake8` and `black --check`
- Verify Docker containers status: `docker compose ps`
