.PHONY: help build run test lint clean push docker-build docker-run

# Variables
SERVICE_NAME := delivery-service
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
REGISTRY ?= ghcr.io
IMAGE_NAME := $(REGISTRY)/food-delivery-platform/$(SERVICE_NAME)
IMAGE_TAG := $(IMAGE_NAME):$(VERSION)
IMAGE_LATEST := $(IMAGE_NAME):latest

help: ## Muestra esta ayuda
	@echo "Comandos disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Instala dependencias
	npm ci

build: ## Compila el proyecto
	npm run build

run: ## Ejecuta el servicio en modo desarrollo
	npm run dev

test: ## Ejecuta tests
	npm test

test:watch ## Ejecuta tests en modo watch
	npm test -- --watch

lint: ## Ejecuta linter
	npm run lint

lint:fix ## Corrige problemas de linting
	npm run lint:fix

clean: ## Limpia archivos generados
	rm -rf dist node_modules coverage

docker-build: ## Construye imagen Docker
	docker build -t $(IMAGE_TAG) -t $(IMAGE_LATEST) .

docker-run: ## Ejecuta contenedor Docker
	docker run -p 3003:3003 --env-file .env $(IMAGE_LATEST)

docker-push: docker-build ## Construye y publica imagen Docker
	docker push $(IMAGE_TAG)
	docker push $(IMAGE_LATEST)

docker-compose-up: ## Levanta servicios con docker-compose
	docker-compose up -d

docker-compose-down: ## Detiene servicios docker-compose
	docker-compose down

migrate: ## Ejecuta migraciones de base de datos
	npm run migrate:up

migrate:rollback: ## Revierte última migración
	npm run migrate:down

migrate:status: ## Muestra estado de migraciones
	npm run migrate:status

generate: ## Genera código (si aplica)
	npm run generate
