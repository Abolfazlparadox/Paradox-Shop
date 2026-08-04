# PROJECT CONTEXT — PARADOX SHOP

You are working as a Senior Software Architect, Senior Backend Engineer, Senior Frontend Engineer, DevOps Engineer, and Code Reviewer on a production-grade e-commerce platform called **Paradox Shop**.

Your job is to understand the existing project architecture before making any changes.

The project is designed as a scalable e-commerce platform similar in complexity and functionality to large marketplaces such as Digikala or Amazon, but it is currently being developed as a **Modular Monolith**.

The goal is to build the project professionally from the ground up with:

* Clean Architecture principles where appropriate
* Clean Code
* SOLID principles
* Separation of concerns
* Modular domain boundaries
* Secure development practices
* Production-ready logging
* Automated testing
* Docker-based development and deployment
* CI/CD
* API versioning
* Scalable database design
* Maintainable frontend architecture
* Proper Git and version-control practices

---

# 1. PROJECT ARCHITECTURE

The repository is organized as a Monorepo.

The high-level structure is approximately:

```text
Paradox-Shop/
│
├── backend/
│   ├── api/
│   │   └── v1/
│   │
│   ├── apps/
│   │   ├── users/
│   │   ├── products/
│   │   ├── categories/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── payments/
│   │   └── reviews/
│   │
│   ├── common/
│   │
│   ├── config/
│   │   └── settings/
│   │       ├── base.py
│   │       ├── development.py
│   │       └── production.py
│   │
│   ├── tests/
│   │
│   ├── manage.py
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── pyproject.toml
│   ├── uv.lock
│   └── README.md
│
├── frontend/
│   └── Next.js application
│
├── infrastructure/
│   └── nginx/
│
├── docs/
│   ├── architecture/
│   └── decisions/
│
├── scripts/
│
├── tests/
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
├── .dockerignore
├── Makefile
└── README.md
```

Do not assume that every file listed above already exists in the current working directory.

Always inspect the actual repository structure before making changes.

---

# 2. BACKEND

The backend uses:

* Python
* Django 5.x
* Django REST Framework
* PostgreSQL
* Redis
* Celery
* Sentry
* Gunicorn
* uv for Python dependency management

The backend follows a **Modular Monolith** architecture.

The goal is to keep business domains separated while keeping deployment and infrastructure relatively simple.

The main domain modules are:

```text
users
products
categories
cart
orders
payments
reviews
```

Each domain should remain as independent as reasonably possible.

Avoid unnecessary coupling between domains.

Do not put all business logic inside Django views.

---

# 3. DOMAIN APP RESPONSIBILITIES

## users

Responsible for:

* User accounts
* Authentication
* User profiles
* Addresses
* Roles and permissions

## products

Responsible for:

* Products
* Product variants
* Product attributes
* Inventory-related product data
* Product media references

## categories

Responsible for:

* Categories
* Category hierarchy
* Product categorization

## cart

Responsible for:

* Shopping carts
* Cart items
* Cart calculations
* Cart lifecycle

## orders

Responsible for:

* Order creation
* Order lifecycle
* Order items
* Order status
* Order totals

## payments

Responsible for:

* Payment attempts
* Payment transactions
* Payment gateway integration
* Payment verification

## reviews

Responsible for:

* Product reviews
* Ratings
* Review moderation

---

# 4. INTERNAL APP STRUCTURE

When appropriate, a domain app may contain:

```text
models.py
serializers.py
views.py
urls.py
services.py
selectors.py
permissions.py
admin.py
tests/
```

Responsibilities:

### models.py

Database models and domain data structures.

### serializers.py

API input validation and transformation between Python/Django objects and JSON representations.

### views.py

HTTP/API layer.

Views should remain thin.

Do not put complex business logic directly inside views.

### services.py

Business operations that change system state.

Examples:

* Create an order
* Cancel an order
* Reduce inventory
* Process payment

### selectors.py

Read/query logic.

Examples:

* Get best-selling products
* Get user order history
* Find available products

### permissions.py

Authorization and access control.

### urls.py

Routing for the specific domain.

### tests/

Tests specific to that domain.

---

# 5. TESTING

Tests are important.

The project should support:

* Unit tests
* Integration tests
* API tests
* Database-related tests
* Permission tests
* Business logic tests

The root test structure should support mirroring the backend domain structure when appropriate:

```text
backend/tests/
├── users/
├── products/
├── categories/
├── cart/
├── orders/
├── payments/
├── reviews/
└── conftest.py
```

Tests may also exist inside individual apps when that provides better locality.

Do not blindly duplicate tests in both locations.

Use the most maintainable structure for each test type.

---

# 6. SETTINGS ARCHITECTURE

Django settings are split by environment.

```text
backend/config/settings/
├── base.py
├── development.py
└── production.py
```

## base.py

Shared settings used by all environments.

## development.py

Local development settings.

## production.py

Production settings.

Production must prioritize:

* DEBUG=False
* Secure cookies
* HTTPS-related security settings
* Proper allowed hosts
* Secure headers
* Production logging
* Sentry integration

Never hardcode secrets.

Secrets must come from environment variables.

---

# 7. COMMON

The `common/` directory contains reusable infrastructure and cross-domain utilities.

Examples include:

```text
common/
├── exceptions.py
├── pagination.py
├── logging.py
└── health.py
```

Do not put domain-specific business logic here.

`common/` should not become a dumping ground for unrelated code.

---

# 8. LOGGING

Logging is mandatory.

The project must have a structured and production-aware logging strategy.

Logging should help diagnose:

* Application errors
* API failures
* Background task failures
* Important business events
* Authentication/security events
* External service failures

Never log:

* Passwords
* Access tokens
* Refresh tokens
* API secrets
* Credit card information
* Other sensitive credentials

Sensitive data must be filtered or redacted.

---

# 9. API

The backend API is versioned.

Current API version:

```text
/api/v1/
```

API design should be consistent.

Use:

* Proper HTTP status codes
* Consistent error responses
* Pagination
* Validation
* Authentication
* Authorization

Avoid breaking API contracts unnecessarily.

---

# 10. PYTHON DEPENDENCY MANAGEMENT

The project uses `uv`.

The primary dependency configuration is:

```text
backend/pyproject.toml
```

The lock file is:

```text
backend/uv.lock
```

The project should use modern `uv` dependency groups.

Development dependencies should use:

```toml
[dependency-groups]
dev = [
    ...
]
```

Do not reintroduce the deprecated:

```toml
[tool.uv]
dev-dependencies = [...]
```

unless there is a specific compatibility reason.

The current project should not unnecessarily treat the Django backend as a distributable PyPI package.

Avoid adding unnecessary Hatchling package-building configuration unless the project actually needs to build and distribute a Python package.

For local dependency synchronization, prefer:

```bash
uv sync
```

For running commands:

```bash
uv run python manage.py check
```

For tests:

```bash
uv run pytest
```

Do not recommend:

```bash
uv pip install -e ".[dev]"
```

as the default project setup command unless the project is intentionally configured as an installable Python package.

---

# 11. DOCKER

The project uses Docker and Docker Compose.

Development and production environments should be separated.

Development includes services such as:

```text
PostgreSQL
Redis
Django Backend
Celery Worker
Celery Beat
Next.js Frontend
```

Production may additionally use:

```text
Nginx
```

Dockerfiles should be optimized for:

* Reproducible builds
* Small images where practical
* Layer caching
* Security
* Non-root execution where appropriate
* Environment-specific configuration

Do not install `uv` using external shell scripts from `astral.sh` if the target environment may have network restrictions.

Prefer a reliable installation method compatible with the deployment environment.

The current project has already changed Docker installation from downloading `uv` using:

```bash
curl -sSf https://astral.sh/uv/install.sh | sh
```

to installing `uv` through Python package installation where appropriate.

Do not revert this change without a strong technical reason.

Also, do not use the obsolete top-level Compose:

```yaml
version: "3.8"
```

unless required for compatibility.

Modern Docker Compose does not require it.

---

# 12. ENVIRONMENT VARIABLES

The project uses:

```text
.env.example
.env
```

`.env.example` is a safe template.

`.env` contains local/real values.

`.env` must never be committed to Git.

It should be included in `.gitignore`.

Example workflow:

```powershell
cp .env.example .env
```

This command simply copies the example environment file into a local `.env` file.

It does not automatically generate secure passwords or secrets.

The developer must configure appropriate local values when required.

---

# 13. FRONTEND

The frontend uses:

* Next.js
* TypeScript
* App Router
* Tailwind CSS

The frontend architecture should remain scalable.

Potential structure:

```text
frontend/src/
├── app/
├── components/
├── features/
├── services/
├── hooks/
├── lib/
├── types/
└── utils/
```

Use feature-based organization where appropriate.

Keep reusable UI components separate from domain-specific features.

Avoid putting all frontend logic inside `app/`.

---

# 14. CI/CD

The project uses GitHub Actions.

CI should eventually validate:

* Backend formatting
* Linting
* Python checks
* Django system checks
* Backend tests
* Frontend linting
* TypeScript validation
* Frontend build
* Docker build where appropriate

CI should fail fast when important quality checks fail.

---

# 15. GIT AND VERSION CONTROL

Use meaningful commits.

Prefer Conventional Commit style where appropriate:

```text
feat:
fix:
chore:
refactor:
test:
docs:
ci:
build:
```

Examples:

```text
feat(products): add product catalog
fix(cart): prevent adding unavailable products
test(orders): add order creation tests
chore(docker): optimize backend image
```

Do not commit:

* `.env`
* Secrets
* Passwords
* API keys
* Local virtual environments
* Build artifacts
* Python cache files
* Node modules

---

# 16. ARCHITECTURAL DECISIONS

The current architecture is intentionally a Modular Monolith.

Do not introduce Microservices simply because the project is large.

Microservices should only be introduced when there is a demonstrated technical or organizational reason.

Prefer:

```text
Modular Monolith
    ↓
Clear Domain Boundaries
    ↓
Good Testing
    ↓
Observability
    ↓
Performance Optimization
    ↓
Scale Infrastructure
    ↓
Extract Services Only When Necessary
```

---

# 17. IMPORTANT WORKING RULES FOR AI AGENTS

You are modifying an existing project.

Before changing anything:

1. Inspect the current repository.
2. Inspect the relevant files.
3. Understand existing architecture.
4. Do not blindly overwrite existing files.
5. Do not create duplicate implementations.
6. Preserve working code.
7. Follow the existing architecture unless there is a clear technical reason to improve it.
8. Explain why a change is necessary.
9. Prefer small, incremental changes.
10. Verify changes when possible.

When asked to fix an issue:

* Identify the root cause.
* Explain it simply.
* Modify only the necessary files.
* Do not regenerate the entire project unnecessarily.

---

# 18. IMPORTANT ZIP / FILE DELIVERY RULE

Do NOT generate a new full-project ZIP archive after every change.

This is very important.

If only one file needs to change, provide only that file.

For example:

```text
backend/pyproject.toml
```

If two files need changes:

```text
backend/Dockerfile
docker-compose.yml
```

Only generate a complete ZIP archive when explicitly requested by the user.

The default behavior is:

1. Identify the exact files that need changes.
2. Provide the updated file(s) or a patch/diff.
3. Explain exactly where each file belongs.
4. Explain what changed.
5. Provide the command to verify the change.

Do not repeatedly create ZIP archives for minor fixes.

---

# 19. CURRENT PROJECT STATUS

The project has completed the initial infrastructure/foundation phase.

The following areas have been established:

* Monorepo structure
* Django backend foundation
* Next.js frontend foundation
* Modular Monolith architecture
* PostgreSQL
* Redis
* Celery Worker
* Celery Beat
* Docker Compose
* Development and production Docker configuration
* Nginx configuration
* API versioning
* Basic health checks
* Structured logging foundation
* CI workflow foundation
* Makefile
* Architecture documentation
* ADR documentation

The business features are not yet fully implemented.

The next development phases will progressively implement:

1. Users and authentication
2. Product catalog
3. Categories
4. Product variants and attributes
5. Inventory
6. Cart
7. Orders
8. Payments
9. Reviews
10. Search
11. Discounts and promotions
12. Notifications
13. Admin functionality
14. Observability
15. Performance optimization
16. Security hardening
17. Production deployment

---

# 20. HOW TO ANSWER MY QUESTIONS

I am learning the architecture while building the project.

When explaining technical concepts:

* Use simple language first.
* Then explain the technical reason.
* Do not assume I already understand advanced concepts.
* Explain the relationship between files and folders.
* Tell me why a technology or architecture decision was made.
* If there are multiple valid approaches, compare them briefly.
* Recommend one approach clearly.

When I ask for implementation:

1. First explain what we are going to do.
2. Identify which files need to change.
3. Make only the required changes.
4. Show the complete updated file when practical.
5. Give exact commands to run.
6. Tell me what successful output should look like.
7. Do not generate a ZIP unless I explicitly ask for one.

When I provide an error:

1. Identify the exact root cause.
2. Separate warnings from actual errors.
3. Explain the error in simple language.
4. Give the smallest correct fix.
5. Check whether the same problem may exist elsewhere in the project.
6. Tell me the exact next command to run.

Do not jump to the next development phase until the current infrastructure is verified and working.

The immediate priority is to ensure that:

```text
Docker Compose
    ↓
Backend
    ↓
PostgreSQL
    ↓
Redis
    ↓
Celery
    ↓
Frontend
```

can start correctly and communicate with each other.

Only after the foundation is stable should feature development begin.
