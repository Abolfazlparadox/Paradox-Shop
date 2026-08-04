# Shop Project - Production-Grade E-Commerce Platform

A production-grade, scalable, secure, and maintainable e-commerce platform foundation built with **Python (Django, DRF)**, **Next.js (TypeScript, App Router, Tailwind CSS)**, **PostgreSQL**, **Redis**, and **Celery**.

The architecture adopts a **Modular Monolith** pattern designed to handle enterprise e-commerce workloads while maintaining developer productivity, ease of testing, and a seamless future extraction path to microservices if required.

---

## 🚀 Quick Start (Docker Development Environment)

### Prerequisites
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- Python 3.12+ and [`uv`](https://github.com/astral-sh/uv) (for local CLI development)
- Node.js 20+ and `npm` / `pnpm` (for frontend CLI development)

### Environment Setup

1. **Clone & Copy Environment Variables**:
   ```bash
   cp .env.example .env
   ```

2. **Start Development Services via Docker Compose**:
   ```bash
   make up
   ```
   Or directly:
   ```bash
   docker compose up -d
   ```

3. **Run Database Migrations**:
   ```bash
   make migrate
   ```

4. **Verify System Health**:
   Access the system health check at: [http://localhost:8000/api/v1/health/](http://localhost:8000/api/v1/health/)

   Key endpoints:
   - **Backend API**: `http://localhost:8000/api/v1/`
   - **Backend Admin**: `http://localhost:8000/admin/`
   - **Frontend App**: `http://localhost:3000/`

---

## 🛠️ Management Commands (Makefile)

| Command | Description |
| :--- | :--- |
| `make build` | Rebuild all Docker containers |
| `make up` | Start development environment in detached mode |
| `make down` | Stop and remove development containers |
| `make restart` | Restart all containers |
| `make logs` | Tail logs across all services |
| `make test` | Run backend Pytest suite |
| `make migrate` | Execute Django database migrations |
| `make makemigrations` | Generate new Django database migrations |
| `make shell` | Open interactive Django shell inside backend container |
| `make backend-shell` | Open bash shell inside backend container |
| `make frontend-shell` | Open bash shell inside frontend container |
| `make lint` | Run code quality checks (flake8, black check, frontend lint) |

---

## 📁 Repository Structure

```text
shop-project/
├── backend/                  # Django REST Framework backend
│   ├── api/v1/               # API Router and versioning
│   ├── apps/                 # Domain applications (users, products, categories, cart, orders, payments, reviews)
│   ├── common/               # Shared utilities (logging, exceptions, health checks, pagination)
│   ├── config/               # Django project configuration & settings (base, dev, prod)
│   ├── tests/                # Integration test suite
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── pyproject.toml
│   └── uv.lock
├── frontend/                 # Next.js TypeScript frontend
│   ├── src/                  # App Router, components, features, services
│   ├── public/               # Static assets
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.ts
├── tests/                    # Cross-domain & E2E integration tests
│   ├── integration/
│   └── e2e/
├── docs/                     # Architecture documentation & ADRs
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── deployment/
│   └── decisions/
├── infrastructure/           # Nginx reverse proxy & monitoring configs
│   └── nginx/
├── .github/workflows/        # CI/CD pipelines
├── docker-compose.yml        # Development orchestration
├── docker-compose.prod.yml   # Production orchestration
├── Makefile                  # Developer CLI shortcuts
├── README.md                 # Project documentation
└── LICENSE                   # MIT License
```

---

## 🏗️ Architecture & Documentation

Detailed architectural specifications and Architecture Decision Records (ADRs) are located in `docs/`:
- [Architecture Overview](docs/architecture/overview.md)
- [ADR-001: Modular Monolith Architecture](docs/decisions/ADR-001-modular-monolith.md)
- [ADR-002: Technology Stack Selection](docs/decisions/ADR-002-technology-stack.md)

---

## 🧪 Testing Strategy

Backend testing is powered by `pytest` and `pytest-django`:

```bash
# Run backend tests inside Docker
make test

# Run tests locally
cd backend
pytest
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
