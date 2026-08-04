# ADR-002: Technology Stack Selection

- **Status**: Accepted
- **Date**: 2026-08-03
- **Deciders**: Senior Software Architect / Tech Lead

## Context and Problem Statement

We need a proven, high-performance, scalable, and secure technology stack for building both the RESTful API backend and modern web frontend.

## Decision Outcome

### 1. Backend: Python, Django, Django REST Framework, `uv`
- **Django & DRF**: Provides robust ORM, security defaults (CSRF, SQL injection protection, XSS escaping), authentication primitives, and standardized REST serializers/views.
- **`uv`**: Ultra-fast Python package installer and dependency resolver written in Rust. Replaces legacy `pip`/`pipenv`/`poetry` for deterministic builds via `pyproject.toml` and `uv.lock`.

### 2. Primary Database: PostgreSQL 16
- High reliability, ACID compliance, support for JSONB (useful for dynamic product attributes), full-text search capabilities, and robust indexing strategies.

### 3. Caching & Asynchronous Tasks: Redis 7 & Celery 5
- **Redis**: In-memory store for session caching, rate limiting, and Celery broker/backend.
- **Celery**: Industry standard for executing background tasks (email dispatch, order notification, heavy data aggregation) without blocking HTTP response threads.

### 4. Frontend: Next.js 14+, TypeScript, App Router, Tailwind CSS
- **Next.js**: Server-Side Rendering (SSR) and Static Site Generation (SSG) for maximum SEO performance on product pages, combined with App Router for modern component architecture.
- **TypeScript**: Strict type safety preventing runtime errors across API payload consumption and UI components.

### 5. Infrastructure & Containerization: Docker, Docker Compose, Nginx
- Fully containerized environment ensuring parity between local development and production deployments.
- **Nginx**: High-performance reverse proxy for SSL termination, static media serving, and request routing.
