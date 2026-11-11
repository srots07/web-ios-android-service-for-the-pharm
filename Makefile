.PHONY: help setup dev build test lint clean docker-up docker-down db-migrate db-seed

help:
	@echo "Available commands:"
	@echo "  make setup        - Install pnpm dependencies and setup virtualenvs"
	@echo "  make dev          - Start full development stack"
	@echo "  make docker-up    - Run all services via Docker Compose"
	@echo "  make docker-down  - Stop all Docker containers"
	@echo "  make test         - Run tests across all workspaces"
	@echo "  make lint         - Run linting across all packages and apps"
	@echo "  make db-migrate   - Apply database migrations"
	@echo "  make clean        - Clean build artifacts and caches"

setup:
	pnpm install
	python -m venv .venv
	@echo "Setup completed."

dev:
	pnpm dev

docker-up:
	docker compose up -d

docker-down:
	docker compose down

test:
	pnpm test
	pytest tests/

lint:
	pnpm lint

db-migrate:
	alembic -c apps/api/alembic.ini upgrade head

clean:
	pnpm clean
	find . -type d -name "__pycache__" -exec rm -rf {} +

