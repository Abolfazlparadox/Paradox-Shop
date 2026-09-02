# Paradox Shop — Backend & API Completion Implementation Plan

## Goal

Complete and harden the Django/DRF backend so the frontend team can consume the API without requiring major backend redesign. Fix all critical issues found in the [backend audit](file:///d:/Project/GitHub/Paradox-Shop/docs/backend-audit.md), implement missing functionality, add comprehensive tests, and produce authoritative documentation.

## User Review Required

> [!CAUTION]
> **Critical Auth Fix**: The current `DEFAULT_AUTHENTICATION_CLASSES` only includes `SessionAuthentication`, meaning JWT tokens issued at login are **never validated**. This plan adds `JWTAuthentication` as the primary authenticator. The OpenAPI security scheme will be updated from `cookieAuth` to `bearerAuth (JWT)`. **This is a breaking change if any consumer currently relies on session cookies.**

> [!IMPORTANT]
> **Scope Decision**: This plan does NOT add Elasticsearch, Wishlist, Promotions/Coupons, Shipping, or Notifications modules. These are deferred to future phases as they are not required for initial frontend integration. Celery tasks will be created as stubs that log messages rather than actually sending emails (no email service is configured).

## Open Questions

> [!IMPORTANT]
> 1. **Payment Gateway**: The current payment is mock/simulated. Should I keep the mock implementation and structure it to be gateway-swappable, or do you want real Zarinpal integration now?
> 2. **Email Service**: No email backend is configured. Should Celery email tasks be implemented as log-only stubs, or should I configure a real email backend (e.g., SMTP, Mailgun)?
> 3. **Rate Limiting**: I plan to add `django-ratelimit` or `djangorestframework-throttling` for login/register endpoints. Do you have a preference for the throttle rates (e.g., 5 login attempts/minute)?

---

## Proposed Changes

Changes are ordered by dependency (foundations first, then domain features, then tests, then docs).

---

### Phase 1: Fix Critical Foundation Issues

#### [MODIFY] [`base.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/config/settings/base.py)

1. **Fix Authentication**: Add `JWTAuthentication` to `DEFAULT_AUTHENTICATION_CLASSES` (keep `SessionAuthentication` for admin).
2. **Add throttling config**: Add `DEFAULT_THROTTLE_CLASSES` and `DEFAULT_THROTTLE_RATES` for rate limiting.
3. **Add token blacklist app**: Add `rest_framework_simplejwt.token_blacklist` to `INSTALLED_APPS`, set `BLACKLIST_AFTER_ROTATION=True`.
4. **Wire SensitiveDataFilter** into the `LOGGING` config.
5. **Improve logging**: Add JSON formatter and request-ID-aware formatting.
6. **Add `SECURE_PROXY_SSL_HEADER`** in production context awareness.

#### [MODIFY] [`production.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/config/settings/production.py)

- Add `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')`.
- Add `SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'`.

#### [MODIFY] [`config/__init__.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/config/__init__.py)

- Export Celery app: `from .celery import app as celery_app; __all__ = ('celery_app',)`.

#### [MODIFY] [`pyproject.toml`](file:///d:/Project/GitHub/Paradox-Shop/backend/pyproject.toml)

- Add `django-ratelimit` or use DRF's built-in throttling (no extra dep needed).
- Add `factory-boy` to dev dependencies for test factories.
- Add `freezegun` to dev dependencies for time-dependent tests.

---

### Phase 2: Authentication & User Domain Hardening

#### [MODIFY] [`users/views.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/users/views.py)

- Add `PasswordChangeView` — authenticated user changes password.
- Add `LogoutView` — blacklists the refresh token.

#### [MODIFY] [`users/urls.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/users/urls.py)

- Add routes: `password/change/`, `logout/`.

#### [MODIFY] [`users/services.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/users/services.py)

- Add `UserService.change_password()` method.

#### [MODIFY] [`users/serializers.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/users/serializers.py)

- Add `PasswordChangeSerializer` (old_password, new_password, new_password_confirm).
- Add `LogoutSerializer` (refresh token).

---

### Phase 3: Database Constraints & Model Improvements

#### [MODIFY] [`cart/models.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/cart/models.py)

- Add `CheckConstraint` on `CartItem.quantity >= 1`.

#### [MODIFY] [`orders/models.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/orders/models.py)

- Add `CheckConstraint` on `OrderItem.quantity >= 1`.
- Add `CheckConstraint` on `Order.subtotal >= 0`, `Order.total >= 0`, `Order.shipping_cost >= 0`, `Order.discount_amount >= 0`.
- Add documented valid state transitions as a class method.

#### [MODIFY] [`products/models.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/products/models.py)

- Add `CheckConstraint` on `Product.base_price >= 0`.
- Add `CheckConstraint` on `ProductVariant.price_override >= 0` (when not null).

#### [MODIFY] [`payments/models.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/payments/models.py)

- Add `CheckConstraint` on `Payment.amount >= 0`.

#### [MODIFY] [`users/models.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/users/models.py)

- Add composite index on `Address(user, is_deleted)`.

*Each model change generates a new migration.*

---

### Phase 4: Order State Machine

#### [MODIFY] [`orders/services.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/orders/services.py)

- Add `OrderService.cancel_order()` — validates transition from PENDING only.
- Add `OrderService.transition_status()` — validates allowed transitions:
  ```
  PENDING → CANCELLED
  PENDING → PROCESSING (via payment)
  PROCESSING → SHIPPED
  SHIPPED → DELIVERED
  DELIVERED → REFUNDED (admin only, future)
  ```
- Add `VALID_TRANSITIONS` dict as a class constant.

#### [MODIFY] [`orders/views.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/orders/views.py)

- Add `CancelOrderView` — user cancels a pending order.

#### [MODIFY] [`orders/urls.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/orders/urls.py)

- Add route: `{id}/cancel/`.

---

### Phase 5: API Consistency & OpenAPI Improvements

#### [MODIFY] [`common/exceptions.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/common/exceptions.py)

- Improve exception handler to produce consistent error shape for all DRF exception types (field errors, list errors, detail errors).
- Add business exception base classes: `BusinessLogicException`, `InsufficientStockError`, `InvalidStateTransitionError`.

#### [NEW] `backend/common/throttling.py`

- Define `LoginRateThrottle`, `RegisterRateThrottle` using DRF's built-in `AnonRateThrottle`.

#### Add `@extend_schema` annotations across all views

Affected files:
- [`cart/views.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/cart/views.py)
- [`categories/views.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/categories/views.py)
- [`orders/views.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/orders/views.py)
- [`payments/views.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/payments/views.py)
- [`reviews/views.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/reviews/views.py)
- [`users/views.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/users/views.py)

This will:
- Add proper request/response schemas to OpenAPI
- Group endpoints by domain tags
- Document error responses
- Fix the security scheme from `cookieAuth` to `bearerAuth`

#### [MODIFY] [`base.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/config/settings/base.py) SPECTACULAR_SETTINGS

- Add security scheme override to declare `bearerAuth` (JWT).
- Add tag configuration by domain.

---

### Phase 6: Payment Idempotency Key

#### [MODIFY] [`payments/models.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/payments/models.py)

- Add optional `idempotency_key` field for future real gateway integration.

#### [MODIFY] [`payments/serializers.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/payments/serializers.py)

- Add optional `idempotency_key` to `CreatePaymentSerializer`.

#### [MODIFY] [`payments/services.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/payments/services.py)

- Use idempotency key if provided to prevent duplicate payment attempts.

---

### Phase 7: Celery Tasks (Stubs)

#### [MODIFY] [`config/__init__.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/config/__init__.py)

- Already handled in Phase 1.

#### [NEW] `backend/apps/orders/tasks.py`

- `send_order_confirmation_email` — logs order confirmation (stub).
- `send_order_status_change_notification` — logs status change (stub).

#### [NEW] `backend/apps/payments/tasks.py`

- `send_payment_confirmation_email` — logs payment success (stub).

#### [MODIFY] [`orders/services.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/orders/services.py)

- Call `send_order_confirmation_email.delay()` after checkout success.

#### [MODIFY] [`payments/services.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/payments/services.py)

- Call `send_payment_confirmation_email.delay()` after payment success.

---

### Phase 8: Health Checks Improvement

#### [MODIFY] [`common/health.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/common/health.py)

- Split into `LivenessView` (always returns 200) and `ReadinessView` (checks DB + Redis).

#### [MODIFY] [`api/v1/urls.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/api/v1/urls.py)

- Add `health/live/` and `health/ready/` routes.
- Keep `health/` as alias for readiness.

#### Remove orphaned module health endpoints

- Remove `OrdersHealthCheckView`, `PaymentsHealthCheckView`, `ReviewsHealthCheckView` from views and URLs (they serve no real purpose and the test expectations for users/products/categories/cart are broken anyway).

---

### Phase 9: Logging Improvements

#### [MODIFY] [`common/logging.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/common/logging.py)

- Add `RequestIDMiddleware` to inject request IDs.
- Add JSON log formatter for structured logging.

#### [MODIFY] [`base.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/config/settings/base.py) LOGGING

- Wire `SensitiveDataFilter` into handlers.
- Add `RequestIDMiddleware` to `MIDDLEWARE`.

---

### Phase 10: Fix Broken Tests & Add Comprehensive Test Suite

#### [MODIFY] [`backend/tests/conftest.py`](file:///d:/Project/GitHub/Paradox-Shop/backend/tests/conftest.py)

- Add shared test fixtures: `api_client`, `authenticated_client`, `user_factory`, `product_factory`, `category_factory`, etc.

#### [NEW] `backend/tests/factories.py`

- Factory Boy factories for all models: User, UserProfile, Address, Brand, Category, Product, ProductVariant, Cart, CartItem, Order, OrderItem, Payment, Review.

#### [DELETE or REWRITE] All per-app `test_views.py` files

- Replace broken module_health tests with real functional tests.

#### [NEW] Test files (all under `backend/tests/`):

| File | Tests |
|------|-------|
| `test_users_api.py` | Register (success, duplicate, password mismatch), Login (success, wrong password), Token refresh, Profile GET/PATCH, Address CRUD, Password change, Logout, Ownership tests |
| `test_products_api.py` | List (pagination, filtering by category/brand/price/search/featured), Detail (by slug), Inactive products hidden |
| `test_categories_api.py` | List (flat, with parent filter, root filter), Detail (children, attributes), Tree (nested structure) |
| `test_cart_api.py` | Get cart, Add item (success, out of stock, inactive product, duplicate), Update quantity, Remove item, Guest cart, Merge cart |
| `test_orders_api.py` | Checkout (success, empty cart, no address, wrong address, insufficient stock), Order list, Order detail, Order cancel, Ownership |
| `test_payments_api.py` | Create payment (success, already paid, wrong order, non-pending order), Payment list, Ownership |
| `test_reviews_api.py` | Create review (success, duplicate, no purchase, rating validation), Product reviews list (only approved) |
| `test_security.py` | Cross-user access denied for addresses, orders, payments. Unauthenticated access denied for protected endpoints. |
| `test_services.py` | Unit tests for critical service methods (checkout, payment, review creation) |

---

### Phase 11: CI Pipeline Improvements

#### [MODIFY] [`.github/workflows/ci.yml`](file:///d:/Project/GitHub/Paradox-Shop/.github/workflows/ci.yml)

- Fix: Install dev dependencies with `uv pip install --system -e ".[dev]"` or `uv sync --group dev`.
- Add: `python manage.py makemigrations --check` step.
- Add: `black --check` and `isort --check` steps.
- Add: Coverage report step.

---

### Phase 12: Documentation

#### [NEW] `docs/api/README.md`

- API conventions (versioning, auth, pagination, filtering, errors).
- Authentication flow (register → login → use Bearer token → refresh → logout).

#### [NEW] `docs/api/endpoints.md`

- Complete endpoint reference with request/response examples.

#### [NEW] `docs/database/schema.md`

- Model relationships and key constraints.

#### [NEW] `docs/architecture/order-lifecycle.md`

- Order state machine diagram and transitions.

#### [NEW] `docs/architecture/payment-lifecycle.md`

- Payment flow documentation.

#### [NEW] `docs/deployment/README.md`

- Production deployment guide.

#### [NEW] `docs/decisions/ADR-003-jwt-authentication.md`

- ADR documenting the fix from SessionAuth to JWT.

---

## Verification Plan

### Automated Tests

```bash
cd backend
uv sync --group dev
uv run python manage.py check
uv run python manage.py check --deploy  # with prod settings
uv run python manage.py makemigrations --check
uv run pytest -v --tb=short
uv run pytest --cov=apps --cov=common --cov-report=term-missing
```

### Docker Verification

```bash
docker compose config
docker compose build
docker compose up -d
# Wait for services
docker compose exec backend python manage.py check
docker compose exec backend python manage.py migrate
docker compose exec backend pytest
# Health check
curl http://localhost:8000/api/v1/health/
curl http://localhost:8000/api/v1/health/live/
curl http://localhost:8000/api/v1/health/ready/
```

### Manual Verification

- OpenAPI docs at `http://localhost:8000/api/docs/swagger/` should show correct JWT security scheme and all response schemas.
- JWT login flow: register → login → use Bearer token → access protected endpoint → refresh → logout.

---

## What This Plan Does NOT Include (Deferred)

| Feature | Reason |
|---------|--------|
| Wishlist | Not required for MVP frontend integration |
| Promotions/Coupons | Deferred to commerce phase 2 |
| Shipping calculations | Deferred (currently hardcoded to 0) |
| In-app notifications | Deferred |
| Real payment gateway (Zarinpal) | Awaiting decision |
| Email sending | Awaiting email backend decision |
| Elasticsearch | PostgreSQL search is sufficient initially |
| Redis caching layer | Can be added after API stabilizes |
| Full-text search endpoint | `icontains` on product name/description is sufficient for now |

---

## Estimated File Changes

| Action | Count |
|--------|-------|
| Modified files | ~25 |
| New files | ~15 |
| Deleted files | 0 |
| New migrations | ~5 |
