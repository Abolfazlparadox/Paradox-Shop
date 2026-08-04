.PHONY: help build up down restart logs test migrate makemigrations shell backend-shell frontend-shell lint clean

help:
	@echo "======================================================="
	@echo "  Shop Project Platform - Management Commands"
	@echo "======================================================="
	@echo "make build          - Build Docker containers"
	@echo "make up             - Start containers in detached mode"
	@echo "make down           - Stop containers"
	@echo "make restart        - Restart containers"
	@echo "make logs           - Tail container logs"
	@echo "make test           - Run backend test suite"
	@echo "make migrate        - Run Django migrations"
	@echo "make makemigrations - Create new Django migrations"
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

restart:
	docker compose restart

logs:
	docker compose logs -f

test:
	docker compose exec backend pytest

migrate:
	docker compose exec backend python manage.py migrate

makemigrations:
	docker compose exec backend python manage.py makemigrations

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
