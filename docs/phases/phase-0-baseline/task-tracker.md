# Paradox Shop — Backend Completion Task Tracker

## Phase 1: Fix Critical Foundation Issues
- [x] Fix `config/settings/base.py` — auth classes, throttling, blacklist, logging
- [x] Fix `config/settings/production.py` — proxy SSL header, referrer policy
- [x] Fix `config/__init__.py` — export Celery app
- [x] Update `pyproject.toml` — add factory-boy, freezegun to dev deps
- [x] Add `common/middleware.py` — RequestIDMiddleware with thread-local tracing

## Phase 2: Authentication & User Domain Hardening
- [x] Add PasswordChangeView, LogoutView
- [x] Add routes, serializers, services

## Phase 3: Database Constraints & Model Improvements
- [x] Add CHECK constraints to CartItem, OrderItem, Order, Product, ProductVariant, Payment
- [x] Add composite index on Address(user, is_deleted)
- [x] Update models across apps

## Phase 4: Order State Machine
- [x] Add VALID_TRANSITIONS, cancel_order, transition_status
- [x] Add CancelOrderView + route

## Phase 5: API Consistency & OpenAPI Improvements
- [x] Improve exception handler, add business exceptions
- [x] Add @extend_schema annotations to all views across all domains
- [x] Fix SPECTACULAR_SETTINGS (JWT security, domain tags)

## Phase 6: Payment Idempotency
- [x] Add idempotency_key field, serializer, service logic

## Phase 7: Celery Tasks (Stubs)
- [x] Create orders/tasks.py, payments/tasks.py
- [x] Wire tasks into services via transaction.on_commit()

## Phase 8: Health Checks Improvement
- [x] Split into Liveness/Readiness/System health
- [x] Add /api/v1/health/live/ and /api/v1/health/ready/

## Phase 9: Logging Improvements
- [x] Add RequestIDMiddleware
- [x] Wire SensitiveDataFilter, structured logging

## Phase 10: Comprehensive Test Suite
- [x] Create conftest.py fixtures
- [x] Create test_users_api.py
- [x] Create test_products_api.py
- [x] Create test_categories_api.py
- [x] Create test_cart_api.py
- [x] Create test_orders_api.py
- [x] Create test_payments_api.py
- [x] Create test_reviews_api.py
- [x] Create test_security_and_auth.py
- [x] Update per-app test_views.py

## Phase 11: CI Pipeline Improvements
- [x] Fix ci.yml — dev deps, migration check, lint, coverage

## Phase 12: Documentation
- [x] API docs (docs/api/README.md, docs/api/endpoints.md)
- [x] Database schema docs (docs/database/schema.md)
- [x] Order/payment lifecycle docs (docs/architecture/order-lifecycle.md, docs/architecture/payment-lifecycle.md)
- [x] Deployment docs (docs/deployment/README.md)
- [x] ADR-003 JWT authentication (docs/decisions/ADR-003-jwt-authentication.md)
