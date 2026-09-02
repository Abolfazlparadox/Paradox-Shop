# Final Backend Async & Celery Hardening Implementation Plan

This plan outlines the final hardening step for the Paradox Shop Django backend before frontend integration. It focuses on asynchronous job reliability, Celery/Redis scheduling, idempotency, concurrency safety, thorough automated integration tests, and comprehensive master Persian backend documentation.

---

## Findings from Codebase Inspection

1. **Inventory Reservation Timing (Crucial)**:
   - In `OrderService.create_order_from_cart`, variant stock is **decremented immediately upon order creation** (status `PENDING`).
   - When an order in `PENDING` or `PROCESSING` is cancelled via `OrderService.cancel_order`, variant stock is **restored atomically** (`variant.stock += item.quantity`).
   - **Conclusion**: When a stale `PENDING` order expires, inventory **MUST be restored** because it was deducted at checkout.
2. **Order Fields**:
   - `Order` already possesses `status`, `paid_at`, and `cancelled_at` timestamps, as well as `can_transition_to()` state validation.
3. **Cart Model & Constraints**:
   - `Cart` has `user` (nullable), `session_key` (nullable, indexed), `created_at`, `updated_at`.
   - `CartItem` cascades on `Cart` deletion (`on_delete=models.CASCADE`). Deleting expired guest carts safely purges orphaned cart items without foreign key violations.
4. **Existing Celery & Docker Setup**:
   - Celery worker and Celery Beat containers are running and connected to Redis (`redis://redis:6379/1`).
   - `CELERY_BEAT_SCHEDULE` needs to be defined in `backend/config/settings/base.py` for automated periodic tasks.

---

## User Review Required

> [!NOTE]
> - `OrderService.cancel_order` will be enhanced with `user: User | None = None` to serve as the **single authoritative cancellation path** for both user-initiated and background periodic/system-initiated cancellations.
> - Default expiration thresholds will be placed in `settings/base.py`:
>   - `ORDER_PAYMENT_TIMEOUT_MINUTES = 30`
>   - `GUEST_CART_RETENTION_DAYS = 7`

---

## Open Questions

None. All architectural requirements and domain behaviors have been verified directly in the codebase.

---

## Proposed Changes

### Configuration Layer

#### [MODIFY] [base.py](file:///d:/Project/GitHub/Paradox-Shop/backend/config/settings/base.py)
- Define `ORDER_PAYMENT_TIMEOUT_MINUTES = int(os.getenv("ORDER_PAYMENT_TIMEOUT_MINUTES", "30"))`.
- Define `GUEST_CART_RETENTION_DAYS = int(os.getenv("GUEST_CART_RETENTION_DAYS", "7"))`.
- Configure `CELERY_BEAT_SCHEDULE`:
  - `cancel-stale-pending-orders`: Runs every 5 minutes (`300.0` seconds) targeting `apps.orders.tasks.cancel_stale_pending_orders`.
  - `cleanup-abandoned-guest-carts`: Runs daily at midnight UTC (`crontab(hour=0, minute=0)`) targeting `apps.cart.tasks.cleanup_abandoned_guest_carts`.

---

### Orders Domain Layer

#### [MODIFY] [services.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/orders/services.py)
- Make `user` optional in `OrderService.cancel_order(*, user=None, order_id: uuid.UUID)`. When `user` is provided, verify user ownership; when `user=None` (system/celery cancellation), look up order directly with `select_for_update()`.
- Ensure atomic stock restoration, `cancelled_at` recording, and status transition to `CANCELLED`.

#### [MODIFY] [tasks.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/orders/tasks.py)
- Add `cancel_stale_pending_orders`:
  - Fetch stale `PENDING` order IDs created older than `ORDER_PAYMENT_TIMEOUT_MINUTES` in bounded batches (`[:100]`).
  - For each order ID: execute within transaction boundary, acquire row lock with `select_for_update()`, verify status is still `PENDING`, and delegate to `OrderService.cancel_order`.
  - Safe error handling: catch validation errors (e.g. if order was paid or cancelled concurrently) and continue gracefully.
  - Safe structured logging with metadata only (counts, order IDs, timestamps).

---

### Cart Domain Layer

#### [NEW] [tasks.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/cart/tasks.py)
- Implement `cleanup_abandoned_guest_carts`:
  - Query guest carts (`user__isnull=True, updated_at__lte=cutoff_time`) older than `GUEST_CART_RETENTION_DAYS`.
  - Delete in bounded batches via IDs to avoid unbounded in-memory querysets and long locks.
  - Safe structured logging of deleted guest cart count.

---

### Users Domain Layer

#### [NEW] [tasks.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/users/tasks.py)
- Implement `send_welcome_email(user_id: str, email: str, full_name: str = "")`:
  - Asynchronous notification task with retry policy (`bind=True, max_retries=3, default_retry_delay=60`).
  - Safe logging of metadata without passwords or sensitive credentials.

#### [MODIFY] [services.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/users/services.py)
- In `UserService.register_user`, trigger `send_welcome_email` safely upon transaction commit via `transaction.on_commit()`.

---

### Integration Test Suite

#### [NEW] [test_orders_tasks.py](file:///d:/Project/GitHub/Paradox-Shop/backend/tests/integration/test_orders_tasks.py)
- `test_cancel_stale_pending_orders_success`: Verify old pending order is cancelled and variant stock is restored.
- `test_cancel_stale_pending_orders_ignores_recent_orders`: Verify recent pending orders (< 30 min) remain intact and stock is untouched.
- `test_cancel_stale_pending_orders_ignores_processed_orders`: Verify `PROCESSING`, `PAID`, `DELIVERED`, `CANCELLED` orders are untouched.
- `test_cancel_stale_pending_orders_idempotent`: Verify running the task multiple times does not double-restore stock.
- `test_cancel_stale_pending_orders_concurrency_race`: Verify graceful handling when order is transitioned/paid during processing.

#### [NEW] [test_cart_tasks.py](file:///d:/Project/GitHub/Paradox-Shop/backend/tests/integration/test_cart_tasks.py)
- `test_cleanup_abandoned_guest_carts_deletes_old_guest_cart`: Verify guest cart older than 7 days and its `CartItem` rows are deleted.
- `test_cleanup_abandoned_guest_carts_preserves_recent_guest_cart`: Verify recent guest cart is preserved.
- `test_cleanup_abandoned_guest_carts_preserves_authenticated_cart`: Verify user cart (even older than 7 days) is never deleted.
- `test_cleanup_abandoned_guest_carts_preserves_recently_updated_guest_cart`: Verify updated guest cart is preserved.

#### [NEW] [test_notification_tasks.py](file:///d:/Project/GitHub/Paradox-Shop/backend/tests/integration/test_notification_tasks.py)
- `test_send_welcome_email_task`: Verify task execution and safe logging.
- `test_user_registration_dispatches_welcome_email`: Verify `UserService.register_user` triggers async welcome email.
- `test_send_order_confirmation_email_task`: Verify execution for valid order metadata.
- `test_send_order_status_notification_task`: Verify execution for status changes.
- `test_send_payment_receipt_notification_task`: Verify execution for payment receipt.

---

### Master Backend Documentation (Persian)

#### [NEW] [backend-master-overview-fa.md](file:///d:/Project/GitHub/Paradox-Shop/docs/api/backend-master-overview-fa.md)
Comprehensive, professional documentation in Persian covering:
1. معرفی پروژه و دامنه عملکردی Paradox Shop
2. معماری ماژولار و لایه‌بندی سیستم (Django, DRF, PostgreSQL, Redis, Celery, Docker, JWT)
3. ساختار لایه‌ها (Models, Serializers, Views, Services, Selectors, Permissions, Tasks, Common)
4. مستندات کامل ۷ دامنه (Users, Categories, Products, Cart, Orders, Payments, Reviews)
5. کاتالوگ جامع و استاندارد کلیه Endpointهای API بر اساس OpenAPI Schema
6. ویژگی‌های مهندسی پیشرفته (Transactions, Row Locking / Concurrency Safety, N+1 Prevention, Database Constraints, Payment Idempotency, Request ID Tracing)
7. فرآیندهای پس‌زمینه (Celery Tasks & Celery Beat Scheduling)
8. وضعیت یکپارچه‌سازی درگاه پرداخت (Mock Gateway vs Production Providers)
9. راهنمای اتصال و تحویل به فرانت‌اند (Frontend Contract, Auth Lifecycle, JWT Headers, Pagination, Error Schema)
10. لیست قابلیت‌های معوقه (Deferred Features)
11. گزارش نهایی راستی‌آزمایی (Verification & Test Reports)

---

## Verification Plan

### Automated Tests
- Run test suite in Docker container:
  `docker compose exec backend pytest -v --tb=short`
  (Ensuring all 44 existing tests + all new task tests pass with 0 errors / 0 failures).

### Django & Schema Checks
- `docker compose exec backend python manage.py check`
- `docker compose exec backend python manage.py makemigrations --check`
- `docker compose exec backend python manage.py spectacular --validate`

### Code Quality & Linting
- `docker compose exec backend flake8 config apps common tests`
- `docker compose exec backend black --check config apps common tests`

### Celery & Docker Health
- Restart and verify Celery Beat & Celery Worker logs:
  `docker compose restart celery_worker celery_beat`
  `docker compose logs --tail=50 celery_worker celery_beat`
