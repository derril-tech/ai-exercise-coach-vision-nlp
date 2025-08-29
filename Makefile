# AI Exercise Coach - Development Commands

.PHONY: help dev-up dev-down dev-logs install build test lint clean

# Default target
help:
	@echo "AI Exercise Coach - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev-up     - Start development services (Postgres, Redis, NATS)"
	@echo "  make dev-down   - Stop development services"
	@echo "  make dev-logs   - View development service logs"
	@echo "  make dev        - Start frontend and backend in development mode"
	@echo ""
	@echo "Setup:"
	@echo "  make install    - Install all dependencies"
	@echo "  make build      - Build all applications"
	@echo ""
	@echo "Quality:"
	@echo "  make test       - Run all tests"
	@echo "  make lint       - Run linting"
	@echo "  make typecheck  - Run TypeScript type checking"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean      - Clean build artifacts and node_modules"

# Development services
dev-up:
	docker-compose -f docker-compose.dev.yml up -d
	@echo "✅ Development services started"
	@echo "📊 Postgres: localhost:5432"
	@echo "🔴 Redis: localhost:6379"
	@echo "📡 NATS: localhost:4222 (HTTP: localhost:8222)"

dev-down:
	docker-compose -f docker-compose.dev.yml down
	@echo "✅ Development services stopped"

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

# Application development
dev:
	npm run dev

# Setup commands
install:
	npm install
	cd apps/frontend && npm install
	cd apps/backend && npm install

build:
	npm run build

# Quality commands
test:
	npm run test

lint:
	npm run lint

typecheck:
	npm run typecheck

# Maintenance
clean:
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf apps/*/.next
	rm -rf apps/*/dist
	rm -rf .turbo
