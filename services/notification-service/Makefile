.PHONY: help install build run migrate migrate:down test lint clean docker-build docker-run docker-push

SERVICE_NAME := notification-service
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

migrate: ## Ejecuta migraciones
	npm run migrate:up

migrate:down: ## Revierte última migración
	npm run migrate:down

test: ## Ejecuta tests
	npm test

lint: ## Ejecuta linter
	npm run lint

clean: ## Limpia archivos generados
	rm -rf dist node_modules coverage

docker-build: ## Construye imagen Docker
	docker build -t $(IMAGE_TAG) -t $(IMAGE_LATEST) .

docker-run: ## Ejecuta contenedor Docker
	docker run -p 3004:3004 --env-file .env $(IMAGE_LATEST)

docker-push: docker-build ## Construye y publica imagen Docker
	docker push $(IMAGE_TAG)
	docker push $(IMAGE_LATEST)
