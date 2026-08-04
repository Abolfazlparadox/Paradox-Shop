# ADR-001: Architectural Style Selection - Modular Monolith

- **Status**: Accepted
- **Date**: 2026-08-03
- **Deciders**: Senior Software Architect / Tech Lead

## Context and Problem Statement

When starting a serious, production-grade e-commerce platform that aims to eventually support complex domain capabilities (catalog, inventory, checkout, orders, payments, notifications), choosing the right initial architectural pattern is critical.
A common mistake in new projects is opting for Microservices prematurely, introducing distributed systems complexity (network latency, distributed transactions, complex deployment pipelines, high cloud costs, difficult debugging) before domain boundaries and traffic requirements are mature.

## Considered Options

1. **Traditional Monolith**: Tightly coupled Django project where apps intermingle models, business logic, and queries directly.
2. **Microservices Architecture**: Separate repositories/deployments for Users, Products, Orders, Payments, etc., from Day 1.
3. **Modular Monolith**: A unified codebase with strict boundary controls between domain modules (`backend/apps/`), explicit domain interfaces, and decoupled database models.

## Decision Outcome

**Chosen Option**: **Modular Monolith**

### Rationale

- **Low Operational Overhead**: A single deployment unit simplifies CI/CD, local Docker execution, monitoring, and debugging.
- **Clear Domain Boundaries**: Business logic is grouped logically by domain (`users`, `products`, `orders`, etc.). Inter-module communication happens through explicit services/selectors rather than direct tight coupling.
- **Future Extensibility**: If a specific module (e.g., `payments` or `search/catalog`) experiences high traffic scale later, its well-bounded structure allows easy extraction into an independent microservice.
- **Strong Consistency**: Database transactions across domain operations (e.g., deducting inventory when placing an order) remain atomic in PostgreSQL without requiring complex Sagas or two-phase commits.

## Consequences

### Positive
- Accelerated initial feature development and refactoring.
- Simplified testing (single integration test suite).
- Cost-effective infrastructure deployment.

### Negative
- Requires developer discipline to enforce domain boundaries and prevent illegal cross-module imports or direct database joins across domains.
