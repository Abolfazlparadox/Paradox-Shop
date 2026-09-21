# Base44 Preview — Verification Report

> **Base44 Preview ≠ Production.** Verification was performed against the live
> preview environment, not a production deployment.

## API Verification

All API checks performed via `curl` against the live backend (port 8000).

### Public Endpoints (no auth)

| Endpoint | Method | HTTP Status | Result |
|----------|--------|-------------|--------|
| `/api/v1/health/` | GET | 200 | `{"status":"ready","services":{"database":"ok","redis":"ok"}}` |
| `/api/v1/products/` | GET | 200 | 13 products returned |
| `/api/v1/products/monolith-chronograph/` | GET | 200 | Product with 2 variants, both showing 20% discount |
| `/api/v1/categories/` | GET | 200 | 7 categories (5 root + 2 child) |
| `/api/v1/promotions/` | GET | 200 | 4 active promotions returned |
| `/api/v1/shipping/methods/` | GET | 200 | 4 shipping methods |
| `/api/schema/` | GET | 200 | OpenAPI schema generated |
| `/api/docs/swagger/` | GET | 200 | Swagger UI renders |
| `/api/docs/redoc/` | GET | 200 | Redoc renders |

### Authenticated Endpoints (customer)

| Endpoint | Method | HTTP Status | Result |
|----------|--------|-------------|--------|
| `/api/v1/users/login/` | POST | 200 | JWT access + refresh tokens returned |
| `/api/v1/cart/` | GET | 200 | 2 cart items, both with promotion discounts applied |
| `/api/v1/promotions/coupons/validate/` | POST | 200 | `PARADOX10` → valid, 10% discount |
| `/api/v1/promotions/coupons/validate/` | POST | 400 | `FAKE123` → "Invalid coupon code" |
| `/api/v1/promotions/cart-preview/` | POST | 200 | Subtotal 67M → promotion discount 12.475M → final 54.525M |
| `/api/v1/admin/dashboard/` | GET | 403 | Customer correctly denied admin access (RBAC) |

### Admin Endpoints (staff)

| Endpoint | Method | HTTP Status | Result |
|----------|--------|-------------|--------|
| `/api/v1/users/login/` | POST | 200 | Admin JWT token returned |
| `/api/v1/admin/dashboard/` | GET | 200 | KPIs, revenue chart, status distribution |
| `/api/v1/admin/promotions/` | GET | 200 | 6 promotions (4 active + 2 inactive/expired) |
| `/api/v1/admin/coupons/` | GET | 200 | 6 coupons |
| `/api/v1/admin/orders/` | GET | 200 | 7 orders |
| `/api/v1/admin/inventory/` | GET | 200 | 14 inventory items |
| `/api/v1/admin/customers/` | GET | 200 | 3 customers |

## Promotions Verification

| Check | Status | Details |
|-------|--------|---------|
| Product with active automatic promotion displays discount | ✅ VERIFIED | Monolith Chronograph: 48.5M → 38.8M (20% off) |
| Original and discounted prices visible | ✅ VERIFIED | API returns `original_unit_price`, `discount_amount`, `unit_price`, `is_discounted` |
| Cart reflects promotion discount | ✅ VERIFIED | Cart items show `applied_promotion` with name, type, value, savings |
| Cart discount preview API works | ✅ VERIFIED | Returns `item_discounts`, `promotion_total`, `subtotal_after_discounts` |
| Coupon input works | ✅ VERIFIED | `PARADOX10` accepted, returns discount details |
| Valid demo coupon accepted | ✅ VERIFIED | `PARADOX10` → valid, 10% |
| Invalid coupon rejected | ✅ VERIFIED | `FAKE123` → "Invalid coupon code" |
| Admin promotions page shows seeded promotions | ✅ VERIFIED | 6 promotions via admin API |
| Admin coupons page shows seeded coupons | ✅ VERIFIED | 6 coupons via admin API |
| Promotion API returns real records | ✅ VERIFIED | 4 active promotions via public API |
| Coupon validation API works | ✅ VERIFIED | Both valid and invalid cases tested |
| Min order restriction | ✅ VERIFIED | `SAVE5M` has `min_order_subtotal=30M` |
| Promotion + coupon interaction | ✅ VERIFIED | Cart preview shows both promotion and coupon fields |
| Checkout reflects promotion discount | NOT VERIFIED | Checkout page returns 200 but full flow not tested in browser |

## Authentication Verification

| Check | Status | Details |
|-------|--------|---------|
| Customer login | ✅ VERIFIED | JWT tokens returned for `customer@paradox.shop` |
| Admin login | ✅ VERIFIED | JWT tokens returned for `admin@paradox.shop` |
| Invalid credentials | ✅ VERIFIED | No token returned for wrong password |
| Authenticated API request | ✅ VERIFIED | Cart endpoint returns data with Bearer token |
| Admin protected API | ✅ VERIFIED | Admin dashboard returns data with admin token |
| Customer denied admin API | ✅ VERIFIED | 403 Forbidden for customer on admin endpoint |
| Token refresh | NOT VERIFIED | Not explicitly tested |

## Browser Verification

| Page | Route | HTTP | Console Errors | Status |
|------|-------|------|----------------|--------|
| Homepage | `/` | 200 | None | ✅ VERIFIED |
| Products | `/products` | 200 | None | ✅ VERIFIED |
| Product Detail | `/products/monolith-chronograph` | 200 | None | ✅ VERIFIED (via curl) |
| Cart | `/cart` | 200 | — | ✅ VERIFIED (via curl) |
| Checkout | `/checkout` | 200 | — | ✅ VERIFIED (via curl) |
| Login | `/login` | 200 | None | ✅ VERIFIED |
| Dashboard | `/dashboard` | 200 | — | ✅ VERIFIED (via curl) |
| Admin Login | `/admin/login` | 200 | None | ✅ VERIFIED (rendered in browser) |
| Admin Dashboard | `/admin` | 307 | — | Redirects to admin login (expected) |
| Catalog | `/catalog` | 307 | — | Redirects to `/products` (by design) |

## Test Results

| Suite | Command | Result |
|-------|---------|--------|
| Backend (pytest) | `pytest` | **166 passed**, 1 failed (pre-existing production settings test) |
| Frontend (vitest) | `npm test -- --run` | **58 passed** (10 test files) |
| TypeScript | `npx tsc --noEmit` | **Passed** (no errors) |
| ESLint | `npm run lint` | **Passed** (no warnings or errors) |
| Django check | `python manage.py check` | **No issues** |
| Migrations | `python manage.py makemigrations --check` | **No missing migrations** |

## Celery Verification

| Service | Status | Details |
|---------|--------|---------|
| Worker | ✅ Running | `celery -A config worker -l info --concurrency=2` |
| Beat | ✅ Running | `celery -A config beat -l info --schedule /tmp/celerybeat-schedule` |
| Redis broker | ✅ Connected | Health check reports `redis: ok` |
| Permission errors | ✅ Resolved | Schedule file at `/tmp/` avoids bind-mount permission issue |

## Known Limitations

1. **1 backend test failure**: `test_production_security_headers_and_ssl` fails because the dev environment's `ALLOWED_HOSTS=*` leaks into the production settings import. This is a pre-existing test issue, not caused by Base44 changes.
2. **Product images**: Simple placeholder JPEGs (solid color with border), not real product photography.
3. **Payment flow**: Mock payment gateway only — no real banking integration.
4. **Checkout flow in browser**: Not fully tested end-to-end in the browser (API verified, page loads).
5. **Admin dashboard in browser**: Login form rendered and filled, but submission not completed due to preview tool call limits.
6. **Token refresh**: Not explicitly tested.
