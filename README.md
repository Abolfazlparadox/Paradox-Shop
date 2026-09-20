# Paradox Shop — Production-Grade Modular Monolith E-Commerce Platform

[![CI Pipeline](https://github.com/Abolfazlparadox/Paradox-Shop/actions/workflows/ci.yml/badge.svg)](https://github.com/Abolfazlparadox/Paradox-Shop/actions)
[![Django](https://img.shields.io/badge/Django-5.2-092e20.svg?logo=django)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.15-red.svg)](https://www.django-rest-framework.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-dc382d.svg?logo=redis)](https://redis.io/)
[![Celery](https://img.shields.io/badge/Celery-5.6-37814A.svg?logo=celery)](https://docs.celeryq.dev/)

An enterprise-grade, high-concurrency luxury e-commerce platform built as a clean **Modular Monolith** with server authority, zero client-side calculation trust, and a bespoke *Impossible Minimalism* digital aesthetic.

---

## 1. Project Overview & Architecture

Paradox Shop combines a modular Django REST Framework backend with a modern Next.js 14 App Router frontend:

```text
                                  ┌───────────────────────────┐
                                  │      Client Browser       │
                                  └─────────────┬─────────────┘
                                                │
                                                ▼
                                  ┌───────────────────────────┐
                                  │  Next.js 14 App Router    │ (SSR / Client Components)
                                  └─────────────┬─────────────┘
                                                │
                                                ▼ HTTP / REST
                                  ┌───────────────────────────┐
                                  │   Django 5.2.17 + DRF     │ (api/v1/urls.py)
                                  ├───────────────────────────┤
                                  │  Views → Serializers →    │
                                  │  Services → Selectors     │
                                  └──────┬─────────────┬──────┘
                                         │             │
                    PostgreSQL 16 (ACID) │             │ Task Queue (Redis 7)
                                         ▼             ▼
                                  ┌─────────────┐ ┌─────────────┐
                                  │ PostgreSQL  │ │   Celery    │ (Worker + Beat)
                                  └─────────────┘ └─────────────┘
```

### Key Architectural Tenets:
- **Server Authority**: Pricing, discounts, stock availability, and verified purchase status are calculated strictly on the server.
- **ACID & Concurrency Safety**: Row locks via `select_for_update()` on inventory, orders, and coupon redemptions eliminate race conditions.
- **Clean Layer Separation**: Views handle HTTP protocols; Serializers validate inputs; Services execute mutations and transactions; Selectors perform optimized, read-only queries avoiding N+1 problems.
- **Zero Synthetic Admin Mocks**: The Next.js Admin Control Center consumes 48 live backend `/api/v1/admin/...` endpoints guarded by `IsStaffAdmin`.

---

## 2. Technology Stack

- **Backend**: Python 3.12, Django 5.2.17, Django REST Framework 3.15, `uv` package manager.
- **Database**: PostgreSQL 16 (UUID v4 primary keys, CHECK constraints, soft deletes).
- **Caching & Broker**: Redis 7 Alpine.
- **Asynchronous Tasks**: Celery 5.6.3 (Worker) + Celery Beat (Persistent Scheduler).
- **Frontend**: Next.js 14.2.5 (App Router), TypeScript 5, Tailwind CSS 3.4.
- **State Management**: TanStack Query (React Query) for server state; Zustand for UI state.
- **Design & Motion**: Framer Motion, Three.js, Lenis, Bespoke SVG KPI chart engine.
- **Testing**: Pytest 8, Vitest 4, Pytest-Django, Factory-Boy, Freezegun.
- **Orchestration**: Docker & Docker Compose.

---

## 3. Verified Implemented Features (Phases 0–4)

### Core Commerce (Phase 0)
- **Authentication & Users**: JWT authentication, email verification, 2FA OTP with Redis rate-limiting, address book with soft deletes, password reset.
- **Product Catalog**: Dynamic taxonomy (categories tree), brand filtering, price ranges, product variants with stock tracking, image gallery.
- **Shopping Cart**: Guest sessions (`sessionid` & `X-Session-Key`), authenticated user cart, atomic cross-session cart merge upon login.
- **Checkout & Orders**: Multi-step checkout, stock reservation under row locks, status transitions machine, user cancellation, automated cancellation of stale pending orders.
- **Payments**: Mock payment gateway, idempotency key enforcement, financial audit transactions.

### Subsystem Extensions
- **Phase 1 — Wishlist**: Guest and user wishlists, client-side localStorage sync, cross-session merge, toggle buttons on catalog and product pages.
- **Phase 2 — Shipping & Logistics**: Shipping methods (Standard Post, VIP Express), province/city zones, dynamic fee calculation, free shipping thresholds, public online tracking (`/track`), admin shipping management.
- **Phase 3 — Promotions & Coupons**: Rule-based campaigns (percentage / fixed amount), maximum discount caps, single coupon application per order, atomic coupon usage tracking, non-mutating cart discount preview.
- **Phase 4 — Reviews & Product Q&A**: Verified purchase gating (`DELIVERED` order requirement), 1–5 star ratings, pros/cons tags, asynchronous image uploads with EXIF stripping and WebP thumbnailing (Pillow + Celery), helpful/unhelpful voting, abuse reporting, Redis summary caching, official staff responses, technical product Q&A, user dashboard tabs (`/dashboard/reviews`).
- **Admin Control Center**: 19 dedicated routes (`/admin/*`) covering KPIs, revenue analytics, master orders, bulk status updates, inventory batch stock editing, reviews/questions moderation, promotions/coupons management, audit logs, and system settings.

---

## 4. Current Status & Health

- **Project Status**: **HEALTHY** (All 6 Docker containers active, zero runtime crashes).
- **Current Branch**: `feature/reviews-and-qa`.
- **Current Verified Phase**: **Phase 4 Completed**.
- **Automated Tests**: **190 Total Automated Tests** (139 backend tests + 51 frontend tests, 100% passing).
- **Static Quality**: 0 TypeScript errors (`tsc --noEmit`), 0 ESLint warnings (`npm run lint`).

---

## 5. Repository Structure

```text
Paradox-Shop/
├── backend/                      # Django REST Framework modular monolith
│   ├── api/v1/                   # Main v1 router and admin URL endpoints
│   ├── apps/                     # 10 Business domain modules
│   │   ├── users/                # Auth, profile, addresses, OTP
│   │   ├── products/             # Catalog, variants, images, inventory
│   │   ├── categories/           # Taxonomy & hierarchical tree
│   │   ├── cart/                 # Shopping cart & session merge
│   │   ├── orders/               # Order lifecycle & checkout
│   │   ├── shipping/             # Logistics, shipping methods & tracking
│   │   ├── payments/             # Transactions & mock payment gateway
│   │   ├── promotions/           # Discount engine & coupon validation
│   │   ├── reviews/              # Verified reviews, images & product Q&A
│   │   └── wishlist/             # Customer & guest wishlist
│   ├── common/                   # Mixins, permissions, exceptions, logging
│   ├── config/                   # Settings (base, dev, prod), urls, celery
│   ├── tests/                    # 19 integration test suites (139 tests)
│   ├── Dockerfile & Dockerfile.dev
│   └── pyproject.toml & uv.lock
├── frontend/                     # Next.js 14 App Router application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (shop)/           # 20 Public storefront & dashboard routes
│   │   │   └── admin/            # 19 Admin Control Center routes
│   │   ├── components/           # UI primitives, layout, modals, guards
│   │   ├── lib/api/              # Axios client, endpoints, admin API, error handler
│   │   ├── stores/               # Zustand stores (auth, cart, wishlist)
│   │   └── types/                # TypeScript type declarations
│   ├── __tests__/                # 9 Vitest test suites (51 tests)
│   └── package.json
├── docker-compose.yml            # Standard multi-container orchestration
├── docker-compose.dev.yml        # Development overrides
├── docker-compose.prod.yml       # Production simulation
├── Makefile                      # Developer shortcut commands
└── docs/                         # Authoritative documentation, audits & roadmap
```

---

## 6. Local Development Quickstart

### Prerequisites
- Docker & Docker Compose
- Python 3.12+ with `uv` (optional for local CLI)
- Node.js 20+ with `npm` (optional for local CLI)

### 1. Environment Variables
```bash
cp .env.example .env
```

### 2. Run with Docker Compose
```bash
docker compose up -d
```

### 3. Service Access
- **Storefront**: [http://localhost:3000](http://localhost:3000)
- **Admin Control Center**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Backend API**: [http://localhost:8000/api/v1/](http://localhost:8000/api/v1/)
- **Swagger Documentation**: [http://localhost:8000/api/docs/swagger/](http://localhost:8000/api/docs/swagger/)
- **Django Admin**: [http://localhost:8000/admin/](http://localhost:8000/admin/)
- **Health Check**: [http://localhost:8000/api/v1/health/](http://localhost:8000/api/v1/health/)

---

## 7. Testing & Quality Verification

### Run Frontend Tests & Type Checking
```bash
cd frontend
npm test -- --run       # Run all 51 Vitest unit/integration tests
npx tsc --noEmit        # TypeScript compile check (0 errors)
npm run lint            # ESLint static analysis (0 warnings)
```

### Run Backend Tests & Formatting Checks
```bash
# Inside running backend container
docker compose exec backend pytest

# Or locally using uv in backend/
cd backend
uv run pytest
uv run black --check config apps common tests
uv run flake8 config apps common tests
```

---

## 8. Authoritative Documentation Links

For deeper technical deep dives, consult the reorganized documentation directory:
- [Master System Audit (Single Source of Truth)](docs/audits/project-audit-fa.md)
- [Feature Completeness Matrix](docs/audits/feature-matrix-fa.md)
- [Complete 80+ API Matrix](docs/audits/api-matrix-fa.md)
- [Security & RBAC Audit](docs/audits/security-audit-fa.md)
- [Performance & Web Vitals Audit](docs/audits/performance-audit-fa.md)
- [File-by-File Educational Map (Persian)](docs/audits/file-map-fa.md)
- [System Learning Guide (Persian)](docs/audits/project-learning-guide-fa.md)
- [Master Product Roadmap](docs/roadmap/master-roadmap-fa.md)

---

## 9. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
