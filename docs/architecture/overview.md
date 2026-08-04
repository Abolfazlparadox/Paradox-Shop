# Architecture Overview - Shop Project Platform

## Executive Summary

Shop Project is designed as an enterprise-grade, high-performance, maintainable, and scalable e-commerce platform. The project adopts a **Modular Monolith** architecture to ensure clear domain boundaries, rapid initial development, low operational overhead, and a seamless path to Microservices if scaled in the future.

## Architectural Principles

1. **Modular Monolith First**: Applications are split logically into independent domain modules inside a single repository and codebase (`backend/apps/`) before considering physical service extraction.
2. **Explicit Separation of Concerns**: Views deal strictly with HTTP requests/responses, Services encapsulate business logic, Selectors handle database queries, and Models define entity schemas and data integrity.
3. **API-Driven Architecture**: The backend acts as a stateless RESTful API engine (`/api/v1/`) decoupled from frontend consumers.
4. **Asynchronous Task Processing**: Heavy operations (emails, notification delivery, analytics aggregation, third-party payment reconciliation) are offloaded to Celery background workers via Redis.
5. **Zero-Hardcoded Configurations**: All secrets, database connection parameters, feature flags, and environment-dependent configs are injected via environment variables (`.env`).

## High-Level System Architecture

```
                                  +---------------------+
                                  |    Client Browser   |
                                  +----------+----------+
                                             |
                                  +----------v----------+
                                  |   Next.js Frontend  |
                                  +----------+----------+
                                             |
                                  +----------v----------+
                                  |   Nginx Reverse     |
                                  |       Proxy         |
                                  +----+-----------+----+
                                       |           |
                          +------------+           +------------+
                          |                                     |
             +------------v------------+           +------------v------------+
             |   Django REST Backend   |           |    Static / Media Assets|
             +----+---------------+----+           +-------------------------+
                  |               |
     +------------+               +------------+
     |                                         |
+----v--------------------+               +----v--------------------+
|  PostgreSQL Database    |               |      Redis Cache &      |
|  (Relational Storage)   |               |     Celery Broker       |
+-------------------------+               +----+---------------+----+
                                               |
                                          +----v--------------------+
                                          |   Celery Workers / Beat |
                                          +-------------------------+
```

## Domain Modules Boundary

The backend is organized under `backend/apps/`:
- `users`: Authentication, profile management, addresses, authorization rules.
- `products`: Product catalog, attributes, variants, media, inventory.
- `categories`: Hierarchical category taxonomy.
- `cart`: Session/user shopping cart management.
- `orders`: Order lifecycle, state machine, items, invoice generation.
- `payments`: Gateway integration, transactional audit logs, payment verifications.
- `reviews`: Product ratings, moderation, feedback.

Shared functionality across domains resides in `backend/common/`:
- `exceptions`: Standardized custom exception handling.
- `logging`: Structured application logger configuration with sensitive PII filtering.
- `health`: Multilevel system health check endpoint.
- `pagination`: Unified API pagination defaults.
