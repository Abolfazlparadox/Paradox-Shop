# Walkthrough — Paradox Shop Final Backend Async & Celery Hardening

We have completed the final backend hardening phase for **Paradox Shop**, establishing production-ready Celery/Redis asynchronous processing, periodic cleanup and expiration routines, inventory concurrency safety, idempotent workflows, integration tests, and comprehensive master Persian documentation.

---

## 1. Summary of Changes

### Core Settings & Celery Scheduling
- [base.py](file:///d:/Project/GitHub/Paradox-Shop/backend/config/settings/base.py):
  - Added configurable timeout parameters: `ORDER_PAYMENT_TIMEOUT_MINUTES = 30` and `GUEST_CART_RETENTION_DAYS = 7`.
  - Configured `CELERY_BEAT_SCHEDULE`:
    - `cancel-stale-pending-orders`: executes every 5 minutes (`300.0` seconds).
    - `cleanup-abandoned-guest-carts`: executes daily at 00:00 UTC via `crontab(hour=0, minute=0)`.

### Orders Domain Layer
- [services.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/orders/services.py):
  - Updated `OrderService.cancel_order(*, user=None, order_id)` to allow `user` to be optional, serving as the single authoritative cancellation logic for both user-initiated cancellations and automated background/system tasks.
  - Guarantees row-locking (`select_for_update`), state re-checking, atomic variant stock restoration, recording of `cancelled_at`, and transition to `CANCELLED`.
- [tasks.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/orders/tasks.py):
  - Implemented `cancel_stale_pending_orders`: selects candidate stale pending orders in bounded batches (`[:100]`), acquiring row locks and safely handling concurrent payments or cancellations without side effects or duplicate stock restoration.

### Cart Domain Layer
- [tasks.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/cart/tasks.py):
  - Implemented `cleanup_abandoned_guest_carts`: purges inactive guest carts (`user__isnull=True`) older than `GUEST_CART_RETENTION_DAYS` (7 days) along with their cascaded `CartItem` records in bounded batches. Preserves active guest carts and all authenticated user carts.

### Users Domain Layer
- [tasks.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/users/tasks.py):
  - Implemented `send_welcome_email`: Celery task with exponential backoff retry policy, logging only safe non-sensitive metadata.
- [services.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/users/services.py):
  - Dispatches `send_welcome_email` safely upon transaction commit via `transaction.on_commit()`.

### Integration Tests
- [test_orders_tasks.py](file:///d:/Project/GitHub/Paradox-Shop/backend/tests/integration/test_orders_tasks.py):
  - Tests stale order expiration, exact stock restoration, ignoring of recent and processed orders, and strict idempotency across multiple runs.
- [test_cart_tasks.py](file:///d:/Project/GitHub/Paradox-Shop/backend/tests/integration/test_cart_tasks.py):
  - Tests guest cart cleanup, cascade deletion of cart items, preservation of active guest carts, preservation of authenticated carts, and updated timestamps.
- [test_notification_tasks.py](file:///d:/Project/GitHub/Paradox-Shop/backend/tests/integration/test_notification_tasks.py):
  - Tests welcome emails, order confirmation notifications, status updates, payment receipt notifications, and `transaction.on_commit` registration triggers.

### Master Documentation
- [backend-master-overview-fa.md](file:///d:/Project/GitHub/Paradox-Shop/docs/api/backend-master-overview-fa.md):
  - Comprehensive, formal Persian documentation covering project scope, modular monolith architecture, layered directory structure, all 7 domains, full OpenAPI endpoint catalog, advanced engineering highlights, Celery background tasks, payment status, frontend handoff contract, and deferred features.

---

## 2. Verification Results

### Integration Test Suite (Pytest)
Command: `docker compose exec backend pytest -v --tb=short`
```text
============================= test session starts ==============================
platform linux -- Python 3.12.14, pytest-8.4.2, pluggy-1.6.0
collected 57 items

57 passed in 14.59s (100% success rate, 0 failed, 0 errors)
```
*(Baseline was 44 passed; now 57 passed with 13 comprehensive new async and background task tests).*

### Django System & Migration Checks
- `python manage.py check`: `System check identified no issues (0 silenced).`
- `python manage.py makemigrations --check`: `No changes detected` (Migrations are clean and fully synchronized).

### OpenAPI Schema Validation
- `python manage.py spectacular --validate`: Successfully validated OpenAPI 3.0 schema with 0 errors.

### Code Style & Formatting
- `flake8 config apps common tests`: Passed with 0 warnings / 0 errors.
- `black --check config apps common tests`: 125 files passed (0 reformatted).
- `isort --check config apps common tests`: All imports cleanly organized.

### Celery Worker & Beat Status
- `celery_worker`: Running and connected to Redis (`redis://redis:6379/1`). Registered all 7 domain tasks.
- `celery_beat`: Running and actively managing the 5-minute order cancellation and daily cart cleanup schedules.
