.PHONY: help build up down down-v restart logs logs-backend logs-celery test migrate makemigrations showmigrations superuser collectstatic shell backend-shell frontend-shell lint format clean

help:
	@echo "======================================================="
	@echo "  Paradox Shop - Management Commands"
	@echo "======================================================="
	@echo "make build          - Build Docker containers"
	@echo "make up             - Start containers in detached mode"
	@echo "make down           - Stop containers"
	@echo "make down-v         - Stop containers AND wipe database volumes"
	@echo "make restart        - Restart containers"
	@echo "make logs           - Tail all container logs"
	@echo "make logs-backend   - Tail only Django backend logs"
	@echo "make logs-celery    - Tail only Celery logs (worker & beat)"
	@echo "make test           - Run backend test suite"
	@echo "make migrate        - Run Django migrations"
	@echo "make makemigrations - Create new Django migrations"
	@echo "make showmigrations - Show migration status"
	@echo "make superuser      - Create a Django superuser (admin)"
	@echo "make collectstatic  - Collect static files for production"
	@echo "make shell          - Open Django shell"
	@echo "make backend-shell  - Open bash in backend container"
	@echo "make frontend-shell - Open bash in frontend container"
	@echo "make lint           - Run linting checks"
	@echo "make clean          - Remove python cache & build artifacts"

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

down-v:
	docker compose down -v

restart:
	docker compose restart

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-celery:
	docker compose logs -f celery_worker celery_beat

test:
	docker compose exec backend pytest

migrate:
	docker compose exec backend python manage.py migrate

makemigrations:
	docker compose exec backend python manage.py makemigrations

showmigrations:
	docker compose exec backend python manage.py showmigrations

superuser:
	docker compose exec backend python manage.py createsuperuser

collectstatic:
	docker compose exec backend python manage.py collectstatic --noinput

shell:
	docker compose exec backend python manage.py shell

backend-shell:
	docker compose exec backend /bin/bash

frontend-shell:
	docker compose exec frontend /bin/sh

lint:
	docker compose exec backend flake8 .
	docker compose exec frontend npm run lint

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf backend/.pytest_cache frontend/.next