# Paradox Shop — Backend Audit Report

**Date**: 2026-08-17  
**Auditor Role**: Senior Software Architect / Backend Engineer  
**Source of Truth**: Actual repository files (not project reports)

---

## 1. Architecture

### Current State

The project follows a **Modular Monolith** architecture with 7 domain apps under `backend/apps/`:

| App | Purpose | Models | Services | Selectors | Views | Permissions |
|-----|---------|--------|----------|-----------|-------|-------------|
| `users` | Auth, profile, addresses | User, UserProfile, Address | ✅ UserService, AddressService | ✅ UserSelector, AddressSelector | ✅ RegisterView, LoginView, ProfileView, AddressViewSet | ✅ IsOwner |
| `products` | Catalog | Brand, Product, ProductVariant, ProductImage, ProductAttributeValue | ❌ Empty stub | ✅ ProductSelector | ✅ ProductListView, ProductDetailView | ❌ Empty |
| `categories` | Taxonomy | Category, CategoryAttribute | ❌ Empty stub | ✅ CategorySelector | ✅ TreeView, ListView, DetailView | ❌ Empty |
| `cart` | Shopping cart | Cart, CartItem | ✅ CartService, CartItemService | ✅ CartSelector | ✅ CartView, ItemListView, ItemDetailView, MergeCartView | ❌ Empty |
| `orders` | Order lifecycle | Order, OrderItem, OrderAddress | ✅ OrderService | ✅ OrderSelector | ✅ OrderListView, OrderDetailView, CheckoutView | ✅ IsOrderOwner |
| `payments` | Payment processing | Payment | ✅ PaymentService (mock) | ✅ PaymentSelector | ✅ PaymentListView, PaymentDetailView, CreatePaymentView | ✅ IsPaymentOwner |
| `reviews` | Product reviews | Review | ✅ ReviewService | ✅ ReviewSelector | ✅ ProductReviewListView, CreateReviewView | ✅ IsReviewOwner (defined but unused in views) |

Shared layer in `backend/common/`:
- `models.py` — UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin
- `exceptions.py` — Custom exception handler
- `health.py` — SystemHealthCheckView (DB + Redis)
- `pagination.py` — StandardResultsSetPagination
- `logging.py` — SensitiveDataFilter, setup_logger

### Domain Boundary Assessment

**GOOD**: Each app follows the View → Serializer → Service → Selector → Model layering consistently. Business logic is in services, read queries in selectors. Views are thin.

**NEEDS IMPROVEMENT**:
- `products/services.py` and `categories/services.py` are empty stubs — acceptable since these are read-only domains currently, but the stub classes serve no purpose.
- `cart/services.py` imports `apps.products.models` directly — this is a pragmatic cross-domain dependency, but it should be documented as intentional.
- `orders/services.py` imports `apps.cart.models`, `apps.products.models`, and `apps.users.models` — same pragmatic approach.
- `reviews/selectors.py` imports `apps.orders.models` — again pragmatic.
- `products/serializers.py` imports `apps.categories.serializers.CategoryMiniSerializer` — cross-domain serializer dependency.

### Circular Dependencies

**NONE FOUND** — The dependency graph is acyclic:
```
users ← (no domain deps)
categories ← (no domain deps)
products → categories
cart → products
orders → cart, products, users
payments → orders
reviews → orders, products
```

### Architectural Violations

1. **`common/` is NOT a dumping ground** — it contains only genuinely shared utilities. **GOOD**.
2. **No business logic in serializers/views** — Business logic is properly in services. **GOOD**.
3. **`config/__init__.py` does not export Celery app** — `celery.py` exists but `config/__init__.py` is empty. Celery autodiscovery may not work because `__all__` is not set. **RISK**.

### Verdict: **GOOD** (with minor improvements needed)

---

## 2. Database

### Models Summary

| Model | PK | Timestamps | Soft Delete | Constraints | Indexes |
|-------|-----|------------|-------------|-------------|---------|
| `User` | UUID | ✅ | ✅ | email unique, phone unique | email, phone, created_at |
| `UserProfile` | UUID | ✅ | ❌ | national_id unique | created_at |
| `Address` | UUID | ✅ | ✅ | — | created_at |
| `Brand` | UUID | ✅ | ❌ | name unique, slug unique | slug, created_at |
| `Product` | UUID | ✅ | ❌ | slug unique | slug, created_at |
| `ProductVariant` | UUID | ✅ | ❌ | sku unique | sku, created_at |
| `ProductImage` | UUID | ❌ | ❌ | — | — |
| `ProductAttributeValue` | UUID | ❌ | ❌ | unique(product, attribute) | — |
| `Category` | UUID | ✅ | ❌ | slug unique | slug, created_at |
| `CategoryAttribute` | UUID | ❌ | ❌ | — | — |
| `Cart` | UUID | ✅ | ❌ | session_key unique | session_key, created_at |
| `CartItem` | UUID | ✅ | ❌ | unique(cart, product, variant) | created_at |
| `Order` | UUID | ✅ | ❌ | order_number unique | order_number, status, created_at |
| `OrderItem` | UUID | ❌ | ❌ | — | — |
| `OrderAddress` | UUID | ❌ | ❌ | order OneToOne | — |
| `Payment` | UUID | ✅ | ❌ | transaction_id unique | transaction_id, status, created_at |
| `Review` | UUID | ✅ | ❌ | unique(product, user), CHECK(1≤rating≤5) | is_approved, created_at |

### Issues Found

1. **Missing `db_index` on `Product.category`** — ForeignKey has implicit FK index, but category-based filtering is a primary query pattern. Django auto-creates FK indexes on PostgreSQL, so this is **OK**.

2. **Missing composite index on `Address(user, is_deleted)`** — Address queries always filter by `user` AND `is_deleted=False`. A composite index would help. **NEEDS IMPROVEMENT**.

3. **`Cart.user` is OneToOneField** — Good, prevents multiple carts per user.

4. **`CartItem.unit_price` is a snapshot** — Good design decision. The service layer correctly recalculates prices from the authoritative variant/product on add and update.

5. **`OrderItem` correctly snapshots product_name, variant_name, sku, unit_price, total_price** — **GOOD**. This ensures order history survives product changes.

6. **No `CHECK` constraint on `CartItem.quantity`** — The model uses `PositiveIntegerField` which prevents negative values at the DB level (CHECK ≥ 0), but 0 is allowed at DB level. The service validates ≥ 1 at the application layer. **NEEDS IMPROVEMENT** — add CHECK ≥ 1.

7. **No `CHECK` constraint on `OrderItem.quantity`** — Same concern. **NEEDS IMPROVEMENT**.

8. **`ProductVariant.stock` is `PositiveIntegerField`** — This prevents negative stock at DB level. **GOOD**.

9. **No `CHECK` constraint on prices ≥ 0** — `Product.base_price`, `ProductVariant.price_override`, `Order.subtotal`, `Order.total`, `Payment.amount` should all be non-negative. **NEEDS IMPROVEMENT**.

### N+1 Query Risks

- **Product list**: Uses `select_related('brand', 'category')` + `Prefetch('images')` — **GOOD**.
- **Product detail**: Uses `select_related + prefetch_related` for images, variants, attribute_values — **GOOD**.
- **Category tree**: Single query with in-memory tree building — **GOOD**.
- **Cart serializer**: `get_items_count` and `get_subtotal` iterate `obj.items.all()` twice — the items are already prefetched so this is OK from a query standpoint, but iterating twice is unnecessary. **NEEDS IMPROVEMENT** — could iterate once.
- **Order list**: No prefetch on order items for list view — **OK** since list doesn't include items.
- **Order detail**: Uses `prefetch_related('items', 'payments') + select_related('shipping_address')` — **GOOD**.
- **Payment detail queryset**: `get_user_payments` has no `select_related('order')` — when `IsPaymentOwner` checks `obj.order.user`, this causes an extra query per permission check. **NEEDS IMPROVEMENT**.

### Transaction Safety

- **User registration**: `@transaction.atomic` — **GOOD**.
- **Address CRUD**: `@transaction.atomic` — **GOOD**.
- **Cart add/update/remove**: `@transaction.atomic` + `select_for_update` on Cart and ProductVariant rows — **GOOD**.
- **Cart merge**: `@transaction.atomic` + `select_for_update` on both carts + variant rows — **GOOD**.
- **Checkout**: `@transaction.atomic` + `select_for_update` on Cart + ProductVariant rows — **GOOD**.
- **Payment**: `@transaction.atomic` + `select_for_update` on Order — **GOOD**.

### Concurrency / Race Conditions

- **Overselling prevention**: Checkout locks variant rows with `select_for_update()`, validates stock AFTER lock, then decrements. This correctly prevents two concurrent checkouts from overselling. **GOOD**.
- **Duplicate payment**: PaymentService checks for existing non-failed payments while holding Order lock. **GOOD**.
- **Cart merge race**: Both carts locked with `select_for_update()`. **GOOD**.

### Verdict: **GOOD** (with minor constraint improvements needed)

---

## 3. API

### Existing Endpoints

| Method | Endpoint | Auth | Implemented | Notes |
|--------|----------|------|-------------|-------|
| GET | `/api/v1/health/` | None | ✅ | DB + Redis check |
| POST | `/api/v1/users/register/` | None | ✅ | Returns user profile |
| POST | `/api/v1/users/login/` | None | ✅ | JWT token pair |
| POST | `/api/v1/users/login/refresh/` | None | ✅ | Token refresh |
| GET | `/api/v1/users/profile/` | Auth | ✅ | User + profile |
| PUT/PATCH | `/api/v1/users/profile/` | Auth | ✅ | Update profile |
| GET/POST | `/api/v1/users/addresses/` | Auth | ✅ | Address list/create |
| GET/PUT/PATCH/DELETE | `/api/v1/users/addresses/{id}/` | Auth | ✅ | Address CRUD |
| GET | `/api/v1/products/` | None | ✅ | Paginated, filtered |
| GET | `/api/v1/products/{slug}/` | None | ✅ | Full detail |
| GET | `/api/v1/categories/` | None | ✅ | Paginated flat list |
| GET | `/api/v1/categories/{slug}/` | None | ✅ | With children + attrs |
| GET | `/api/v1/categories/tree/` | None | ✅ | Nested hierarchy |
| GET | `/api/v1/cart/` | Any | ✅ | User or guest cart |
| POST | `/api/v1/cart/items/` | Any | ✅ | Add to cart |
| PATCH | `/api/v1/cart/items/{id}/` | Any | ✅ | Update quantity |
| DELETE | `/api/v1/cart/items/{id}/` | Any | ✅ | Remove item |
| POST | `/api/v1/cart/merge/` | Auth | ✅ | Merge guest → user |
| GET | `/api/v1/orders/` | Auth | ✅ | User's orders |
| GET | `/api/v1/orders/{id}/` | Auth | ✅ | Order detail |
| POST | `/api/v1/orders/checkout/` | Auth | ✅ | Create order from cart |
| GET | `/api/v1/payments/` | Auth | ✅ | User's payments |
| GET | `/api/v1/payments/{id}/` | Auth | ✅ | Payment detail |
| POST | `/api/v1/payments/pay/` | Auth | ✅ | Mock payment |
| POST | `/api/v1/reviews/create/` | Auth | ✅ | Submit review |
| GET | `/api/v1/reviews/product/{id}/` | None | ✅ | Product reviews |
| GET | `/api/v1/orders/health/` | None | ✅ | Module health |
| GET | `/api/v1/payments/health/` | None | ✅ | Module health |
| GET | `/api/v1/reviews/health/` | None | ✅ | Module health |

### Missing Endpoints (Not Yet Implemented)

| Endpoint | Priority | Justification |
|----------|----------|---------------|
| `POST /api/v1/users/password/change/` | HIGH | Users need to change password |
| `POST /api/v1/users/logout/` | MEDIUM | JWT blacklisting for logout |
| `GET /api/v1/products/` with sorting param | MEDIUM | Currently hardcoded sort order |

### CRITICAL: Authentication Mismatch

> [!CAUTION]
> **Implementation uses JWT (simplejwt) but DRF's `DEFAULT_AUTHENTICATION_CLASSES` is set to `SessionAuthentication` only.**

**In `base.py` line 132-134:**
```python
'DEFAULT_AUTHENTICATION_CLASSES': [
    'rest_framework.authentication.SessionAuthentication',
],
```

**But the project:**
- Imports and configures `SIMPLE_JWT` settings (lines 151-165)
- Has `rest_framework_simplejwt` in `pyproject.toml`
- Uses `TokenObtainPairView` for login
- Uses `TokenRefreshView` for refresh
- Has `EmailTokenObtainPairSerializer` extending `TokenObtainPairSerializer`

**OpenAPI spec declares `cookieAuth` (session-based) at line 2078-2081:**
```yaml
securitySchemes:
  cookieAuth:
    type: apiKey
    in: cookie
    name: sessionid
```

**Impact**: JWT tokens are issued at login but **never validated on subsequent requests** because `JWTAuthentication` is not in the authentication classes list. The frontend would receive tokens but they would be useless. All "authenticated" endpoints would actually rely on Django session cookies.

**Fix Required**: Add `rest_framework_simplejwt.authentication.JWTAuthentication` to `DEFAULT_AUTHENTICATION_CLASSES` and update OpenAPI scheme.

### API Consistency Issues

1. **Error response format**: The custom exception handler works but has a subtle bug — when DRF returns a dict with multiple field errors (not a `detail` key), the handler sets `message` to the default string and puts the actual field errors in `details`. This is functional but could be cleaner. **NEEDS IMPROVEMENT**.

2. **Pagination**: Applied globally via `DEFAULT_PAGINATION_CLASS`. However, `CategoryTreeView` returns a raw `Response()` bypassing pagination — this is correct since tree endpoints shouldn't be paginated. **GOOD**.

3. **Some endpoints return paginated responses, some return raw**: Cart, checkout, and payment creation return non-paginated responses — correct since they return single objects. **GOOD**.

4. **`CategoryTreeView` bypasses the serializer entirely** — returns raw dicts from the selector. This means OpenAPI schema auto-generation has no response schema for this endpoint. **NEEDS IMPROVEMENT**.

### Verdict: **NEEDS IMPROVEMENT** (critical auth mismatch, OpenAPI needs fixing)

---

## 4. Async (Celery / Background Tasks)

### Current State

- `config/celery.py` exists with basic configuration
- `celery.autodiscover_tasks()` is called
- **No actual Celery tasks exist anywhere in the codebase**
- `config/__init__.py` is empty — **missing `__all__ = ('celery_app',)` export** which is needed for Celery to work with Django
- Docker Compose includes `celery_worker` and `celery_beat` services
- No `CELERY_BEAT_SCHEDULE` configured
- No task modules (`tasks.py`) in any app

### Missing Background Operations

| Task | Priority | Domain |
|------|----------|--------|
| Email notification on registration | MEDIUM | users |
| Email notification on order creation | HIGH | orders |
| Email notification on payment success | HIGH | payments |
| Stale cart cleanup (periodic) | LOW | cart |
| Order status change notifications | MEDIUM | orders |

### Verdict: **MISSING** (Celery is configured but completely unused)

---

## 5. Security

### Authentication

| Aspect | Status | Details |
|--------|--------|---------|
| Auth mechanism | **BROKEN** | JWT configured but SessionAuth is the only active authenticator |
| Password hashing | ✅ GOOD | Django's default PBKDF2 |
| Password validation | ✅ GOOD | 4 validators configured |
| Token refresh | ✅ GOOD | `ROTATE_REFRESH_TOKENS=True` |
| Token blacklisting | **MISSING** | `BLACKLIST_AFTER_ROTATION=False`, no blacklist app installed |
| Logout/revocation | **MISSING** | No logout endpoint exists |

### Authorization

| Aspect | Status | Details |
|--------|--------|---------|
| Address ownership | ✅ GOOD | `IsOwner` permission + queryset filtered by user |
| Order ownership | ✅ GOOD | `IsOrderOwner` permission + queryset filtered by user |
| Payment ownership | ✅ GOOD | `IsPaymentOwner` permission + queryset filtered by user |
| Cart ownership | ⚠️ RISK | Cart endpoints use `AllowAny` — guest carts identified by session key. An attacker who knows another user's session key could access their guest cart. This is inherent to guest cart design but should be documented. |
| Review creation | ✅ GOOD | Requires `IsAuthenticated`, verifies purchase history |
| Product/Category | ✅ GOOD | Read-only, `AllowAny` is correct |
| Order status manipulation | ✅ GOOD | No endpoint allows clients to set arbitrary order status |
| Price manipulation | ✅ GOOD | Server recalculates all prices during add-to-cart and checkout |

### CORS/CSRF

| Aspect | Status |
|--------|--------|
| `CORS_ALLOWED_ORIGINS` | ✅ Configured from env var |
| `CSRF_TRUSTED_ORIGINS` | ✅ Configured from env var |
| `CORS_ALLOW_ALL_ORIGINS` | ✅ Not set (defaults to False) |

### Production Security Settings

| Setting | Development | Production |
|---------|-------------|------------|
| `DEBUG` | True (override) | False |
| `ALLOWED_HOSTS` | `['*']` | From env var |
| `SECURE_SSL_REDIRECT` | ❌ | ✅ |
| `SESSION_COOKIE_SECURE` | ❌ | ✅ |
| `CSRF_COOKIE_SECURE` | ❌ | ✅ |
| `SECURE_HSTS_SECONDS` | ❌ | ✅ 1 year |
| `SECURE_CONTENT_TYPE_NOSNIFF` | ❌ | ✅ |
| `X_FRAME_OPTIONS` | ❌ | ✅ DENY |

**Missing from production.py:**
- `SECURE_PROXY_SSL_HEADER` — needed when behind Nginx reverse proxy
- `SECURE_REFERRER_POLICY` — not configured

### Secret Management

- `SECRET_KEY` defaults to an insecure hardcoded string in `base.py` — **RISK** if `.env` is not loaded. The production compose passes it via env var, but the default is dangerous.
- `.env` file is in `.gitignore` — **GOOD**.
- `.env` file actually exists in the repo — **RISK** (should not be committed, but `.gitignore` should prevent it).

### Rate Limiting

- **MISSING** — No rate limiting on login, registration, or any endpoint. **RISK** for brute-force attacks.

### File Upload Security

- `ImageField` used for avatars, logos, product images, category images — Django's default validation checks file headers. No explicit file size limit configured. Nginx has `client_max_body_size 20M`. **NEEDS IMPROVEMENT** — should validate at Django level too.

### Verdict: **NEEDS IMPROVEMENT** (critical auth mismatch, missing rate limiting, missing logout)

---

## 6. Testing

### Current Test Coverage

**Total test files**: 8 files across the project  
**Total actual test functions**: ~10

| Location | Tests | Quality |
|----------|-------|---------|
| `backend/tests/integration/test_health_and_settings.py` | 2 tests | Basic — checks settings loaded and health endpoint responds |
| `backend/apps/users/tests/test_views.py` | 1 test | **BROKEN** — references `api_v1:users:module_health` URL name that doesn't exist in users URLs |
| `backend/apps/products/tests/test_views.py` | 1 test | **BROKEN** — references `api_v1:products:module_health` URL name that doesn't exist |
| `backend/apps/categories/tests/test_views.py` | 1 test | **BROKEN** — references `api_v1:categories:module_health` URL name that doesn't exist |
| `backend/apps/cart/tests/test_views.py` | 1 test | **BROKEN** — references `api_v1:cart:module_health` URL name that doesn't exist |
| `backend/apps/orders/tests/test_views.py` | 1 test | Checks module health endpoint (exists) |
| `backend/apps/payments/tests/test_views.py` | 1 test | Checks module health endpoint (exists) |
| `backend/apps/reviews/tests/test_views.py` | 1 test | Checks module health endpoint (exists) |
| `tests/e2e/test_e2e_placeholder.py` | — | Empty placeholder |

> [!CAUTION]
> **4 out of 7 per-app test files reference `module_health` URL names that don't exist** in the `users`, `products`, `categories`, and `cart` URL configurations. These tests would fail with `NoReverseMatch`.

### Missing Tests (Critical)

- ❌ User registration (success, duplicate email, password mismatch)
- ❌ Login (success, wrong password, inactive user)
- ❌ JWT token refresh
- ❌ Profile retrieval and update
- ❌ Address CRUD (create, update, delete, ownership)
- ❌ Product listing (filters, pagination, search)
- ❌ Product detail
- ❌ Category tree, list, detail
- ❌ Cart add/update/remove items
- ❌ Cart merge (guest → user)
- ❌ Checkout (success, empty cart, insufficient stock, concurrent checkout)
- ❌ Payment creation (success, already paid, wrong order)
- ❌ Review creation (success, duplicate, unverified purchase)
- ❌ Authorization (user A cannot access user B's data)
- ❌ Model constraint tests
- ❌ Service layer unit tests

### Verdict: **BROKEN** (most tests would fail; near-zero meaningful coverage)

---

## 7. Infrastructure

### Docker

| Component | Status | Notes |
|-----------|--------|-------|
| `docker-compose.yml` | ✅ GOOD | PostgreSQL, Redis, Backend, Celery Worker, Celery Beat, Frontend |
| `docker-compose.prod.yml` | ✅ GOOD | Adds Nginx, Gunicorn, volume mounts |
| `Dockerfile` (prod) | ⚠️ | Multi-stage build works but uses deprecated `as` syntax instead of `AS` |
| `Dockerfile.dev` | ✅ GOOD | Single-stage, `uv pip install`, non-root user |
| PostgreSQL healthcheck | ✅ GOOD | `pg_isready` |
| Redis healthcheck | ✅ GOOD | `redis-cli ping` |
| Backend depends_on | ✅ GOOD | Waits for healthy postgres and redis |
| Celery depends_on | ⚠️ | Depends on `backend` service (not `postgres` healthy) — Celery could start before DB is ready |
| Nginx config | ✅ GOOD | Reverse proxy for API, admin, frontend, static/media |

### `uv` Package Management

- `pyproject.toml` uses modern `[dependency-groups]` instead of deprecated `[tool.uv] dev-dependencies`. **GOOD**.
- `uv.lock` exists (91KB). **GOOD**.
- Dockerfiles use `uv pip install --system -e .` — functional but `-e .` (editable install) is unusual for Docker. **NEEDS IMPROVEMENT** — should be non-editable for production.

### Health Checks

- `SystemHealthCheckView` at `/api/v1/health/` checks DB + Redis. **GOOD**.
- No distinction between liveness and readiness. **NEEDS IMPROVEMENT**.
- Module health endpoints (orders, payments, reviews) just return static JSON — no actual health checking. **NEEDS IMPROVEMENT** — either make them useful or remove them.

### Logging

- Basic `LOGGING` config in `base.py` with console handler. **NEEDS IMPROVEMENT** — no structured JSON logging, no request ID correlation.
- `SensitiveDataFilter` in `common/logging.py` exists but is **never wired into the LOGGING config**. **BROKEN**.
- Logging in services is sparse — only the exception handler and health check log errors.

### Verdict: **NEEDS IMPROVEMENT**

---

## 8. Documentation

| Document | Status | Notes |
|----------|--------|-------|
| `README.md` | ✅ GOOD | Accurate quick start, structure, make commands |
| `docs/architecture/overview.md` | ✅ GOOD | Accurate system diagram and module boundaries |
| `docs/decisions/ADR-001-modular-monolith.md` | ✅ GOOD | Well-written rationale |
| `docs/decisions/ADR-002-technology-stack.md` | ✅ GOOD | Comprehensive tech choices |
| `Paradox Shop API.yaml` | ⚠️ RISK | Auto-generated OpenAPI with wrong security scheme (cookieAuth instead of JWT Bearer), missing response schemas for many endpoints |
| API endpoint documentation | **MISSING** | No dedicated API docs beyond OpenAPI |
| Database schema documentation | **MISSING** | No ER diagram or model docs |
| Deployment documentation | **MISSING** | No production deployment guide |
| Order lifecycle documentation | **MISSING** | No state machine docs |
| Payment lifecycle documentation | **MISSING** | No payment flow docs |

### Verdict: **NEEDS IMPROVEMENT** (architecture docs good, operational docs missing)

---

## 9. CI/CD

### Current CI Pipeline (`.github/workflows/ci.yml`)

**Backend job:**
1. ✅ Checkout
2. ✅ Python 3.12 setup
3. ✅ Install uv
4. ✅ Install dependencies with uv
5. ✅ `python manage.py check`
6. ✅ `pytest`
7. ❌ No format/lint check
8. ❌ No `makemigrations --check` for migration consistency
9. ❌ No coverage report

**Frontend job:**
1. ✅ TypeScript check (`tsc --noEmit`)
2. ✅ ESLint

### Issues
- CI installs dev dependencies by default (since `uv pip install -e .` only installs production deps). Dev dependencies (pytest, etc.) are in `[dependency-groups] dev` — CI likely **does not install them**. **RISK** — `pytest` would not be available in CI. **BROKEN**.

### Verdict: **NEEDS IMPROVEMENT** (CI probably can't run tests, missing lint/migration checks)

---

## 10. OpenAPI / API Documentation

### Issues

1. **Security scheme is `cookieAuth` (session)** but implementation uses JWT. **BROKEN**.
2. **Many endpoints show `No response body`** — response schemas are missing because views use raw `Response()` without serializer class annotations for OpenAPI. **NEEDS IMPROVEMENT**.
3. **`CategoryTreeView` has no response schema** — returns raw dicts. **NEEDS IMPROVEMENT**.
4. **Cart endpoints have no request/response schemas** — views use `APIView` without `@extend_schema` annotations. **NEEDS IMPROVEMENT**.
5. **All tags are `v1`** — endpoints are not grouped by domain. **NEEDS IMPROVEMENT** — should use domain-specific tags.

### Verdict: **NEEDS IMPROVEMENT** (OpenAPI is auto-generated but incomplete and inaccurate)

---

## 11. Redis

### Current Usage

| Purpose | Redis DB | Configuration |
|---------|----------|---------------|
| General | DB 0 | `REDIS_URL` (used by health check) |
| Celery Broker | DB 1 | `CELERY_BROKER_URL` |
| Celery Results | DB 2 | `CELERY_RESULT_BACKEND` |

- Redis is used **only** for Celery broker/backend and health check ping.
- **No caching** is implemented (no `django-redis` cache backend configured).
- **No rate limiting** uses Redis.
- **No session backend** uses Redis (sessions use default DB backend).

### Verdict: **NEEDS IMPROVEMENT** (Redis is underutilized; caching and rate limiting should be added)

---

## 12. Answers to Repository Analysis Questions

### Architecture
- **Is the Modular Monolith actually modular?** Yes — clear domain boundaries, no circular deps.
- **Are domain boundaries respected?** Mostly — cross-domain imports exist but flow in one direction.
- **Are there circular imports?** No.
- **Is business logic leaking into views/serializers?** Minor: `UserProfileSerializer.update()` does profile update logic in the serializer. The rest is properly in services.
- **Is `common/` a dumping ground?** No — contains only genuinely shared utilities.

### Authentication
- **What is actually implemented?** JWT tokens are issued but `SessionAuthentication` is the only active authenticator. **JWT is effectively non-functional.**
- **Is OpenAPI correct?** No — declares `cookieAuth` instead of Bearer JWT.
- **How does refresh work?** `TokenRefreshView` is wired but since JWTAuthentication isn't active, the tokens wouldn't be validated.
- **How does logout work?** It doesn't — no logout endpoint, no blacklist app.
- **Are protected endpoints actually protected?** Only via session cookies (not JWT).

### Products
- **Are Product, Variant, Inventory separated?** Product and ProductVariant are separated. Stock is on ProductVariant. No separate Inventory model. This is acceptable for current scale.
- **Can the design support multiple variants?** Yes — `ProductVariant` is a ForeignKey (one-to-many) from Product.
- **Is SKU handled?** Yes — unique SKU per variant.
- **Is availability calculated server-side?** Yes — `is_active` flag on Product and Variant, stock on Variant.

### Cart
- **Is cart ownership secure?** Authenticated users: yes (OneToOne). Guest: session-based, inherent risk.
- **Is guest cart support implemented?** Yes.
- **Is merge logic correct?** Yes — atomic, handles duplicate items, respects stock.
- **Can prices be manipulated?** No — `unit_price` is always set server-side from product/variant.

### Orders
- **Is checkout transactional?** Yes — `@transaction.atomic` with `select_for_update()`.
- **Can two users purchase the last item?** No — variant rows are locked, stock validated after lock.
- **Is order status protected?** Yes — no endpoint allows arbitrary status changes.
- **Is total calculated server-side?** Yes — using locked variant prices.

### Payments
- **Is payment currently mocked or real?** Mocked — `create_mock_payment` with simulated success.
- **Is verification authoritative?** Yes — server determines payment outcome.
- **Are callbacks idempotent?** N/A — no callback endpoint (mock payment is synchronous).
- **Can duplicates create duplicate effects?** No — existing active payment check prevents duplicates.

### Reviews
- **Is verified purchase enforced?** Yes — checks for delivered order with the product.
- **Can users review products they didn't buy?** No.
- **Can users create duplicates?** No — unique constraint + application-level check + IntegrityError catch.

### Redis/Celery
- **What is Redis used for?** Only Celery broker/backend and health check ping.
- **Are Celery tasks idempotent?** No tasks exist.
- **Are retries configured?** No.
- **Are failed tasks observable?** No.

### Security
- **IDOR vulnerabilities?** None found — all sensitive endpoints filter by user at the queryset level.
- **Can a user access another user's address/order/payment?** No.
- **Can a user manipulate product price?** No.
- **Can a user modify order status?** No.
- **Are sensitive fields exposed?** User email is never exposed in review responses. Payment `gateway_response` is excluded from the serializer. **GOOD**.

### Performance
- **N+1 queries?** Mostly handled with `select_related`/`prefetch_related`. Payment permission check has a minor N+1 risk.
- **Are large queries paginated?** Yes — global pagination.
- **Are critical fields indexed?** Yes — slugs, emails, order numbers, status fields.

### Deployment
- **Does Docker Compose work from clean?** Likely yes — standard setup.
- **Do migrations work from empty DB?** Untested — needs verification.
- **Does Celery start?** Probably not correctly — `config/__init__.py` missing Celery app export.

---

## 13. Classification Summary

| Area | Status |
|------|--------|
| **Architecture** | ✅ GOOD |
| **Database Models** | ✅ GOOD |
| **Database Constraints** | ⚠️ NEEDS IMPROVEMENT |
| **Database Queries (N+1)** | ✅ GOOD |
| **Transaction Safety** | ✅ GOOD |
| **Concurrency Handling** | ✅ GOOD |
| **API Endpoints** | ✅ GOOD |
| **API Consistency** | ⚠️ NEEDS IMPROVEMENT |
| **Authentication Config** | 🔴 BROKEN |
| **Authorization** | ✅ GOOD |
| **OpenAPI Documentation** | 🔴 BROKEN |
| **Rate Limiting** | 🔴 MISSING |
| **Celery / Async** | 🔴 MISSING |
| **Redis Caching** | 🔴 MISSING |
| **Testing** | 🔴 BROKEN |
| **CI Pipeline** | ⚠️ NEEDS IMPROVEMENT |
| **Docker** | ✅ GOOD |
| **Logging** | ⚠️ NEEDS IMPROVEMENT |
| **Health Checks** | ⚠️ NEEDS IMPROVEMENT |
| **Production Security** | ⚠️ NEEDS IMPROVEMENT |
| **Architecture Docs** | ✅ GOOD |
| **API Docs** | 🔴 MISSING |
| **Deployment Docs** | 🔴 MISSING |
| **Password Change/Logout** | 🔴 MISSING |
| **Order State Machine** | ⚠️ NEEDS IMPROVEMENT |
| **Idempotency** | ⚠️ NEEDS IMPROVEMENT |
| **Error Handling** | ⚠️ NEEDS IMPROVEMENT |
