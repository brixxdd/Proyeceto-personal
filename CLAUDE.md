# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cloud-native food delivery platform (Uber Eats-inspired). Portfolio project targeting mid/senior-level architecture. ~68% complete as of 2026-04-13.

## Development Setup

### Start all infrastructure locally
```bash
docker-compose up -d
```
This starts: PostgreSQL (5432), Redis (6379), Kafka (9092), Zookeeper (2181), and all 6 services. Databases are auto-created via `scripts/init-databases.sql`.

### Per-service development (inside any service directory)
```bash
npm run dev          # ts-node-dev with hot reload
npm run build        # tsc compile → dist/
npm test             # jest
npm run lint         # eslint src --ext .ts
npm run migrate:up   # node-pg-migrate up
npm run migrate:down # node-pg-migrate down
make help            # shows all Makefile targets
```

### Run a single test file
```bash
npm test -- tests/path/to/file.test.ts
```

### Run tests with coverage
```bash
npm test -- --coverage
```

## Service Ports

| Service             | Port |
|---------------------|------|
| api-gateway         | 4000 |
| order-service       | 3000 |
| restaurant-service  | 3001 |
| auth-service        | 3002 |
| delivery-service    | 3003 |
| notification-service| 3004 |

## Architecture

### Request Flow
```
Client → API Gateway (Apollo Federation v2, port 4000)
       → auth-service / restaurant-service / order-service subgraphs
       → Kafka events → delivery-service / notification-service consumers
```

- **API Gateway**: Apollo Federation v2 (`@apollo/gateway`). Federates 3 subgraphs (auth, restaurant, order). JWT validation middleware, Redis rate limiting, WebSocket subscription proxy via `graphql-ws`.
- **Each microservice**: Express + Apollo Server (`@apollo/server`) + `buildSubgraphSchema`. Own PostgreSQL DB, own Redis namespace. Prometheus `/metrics` endpoint via `prom-client`.
- **Auth flow**: JWT (access + refresh tokens). Redis token blacklist for logout. Rate limiting 5 attempts/15min per IP+email.
- **Events**: Kafka (Confluent 7.5 image, Zookeeper mode). 13 topics + 3 DLQs initialized via `scripts/kafka-init-topics.sh`. Key flows: `order.created → delivery-service assigns rider → notification-service notifies user`.

### Standard Microservice Layout
```
service-name/src/
├── index.ts          # Express + Apollo server bootstrap
├── schema.ts         # GraphQL schema (or schema.graphql)
├── resolvers/        # GraphQL resolvers
├── services/         # Business logic
├── repositories/     # DB access (pg Pool queries)
├── models/           # TypeScript interfaces/types
├── events/           # Kafka producer/consumer
├── middleware/       # Auth middleware, etc.
├── metrics/          # Prometheus setup
├── pubsub/           # Redis PubSub for subscriptions
└── utils/            # Logger (winston), helpers
migrations/           # node-pg-migrate JS migration files
tests/                # Jest tests (ts-jest preset)
```

### Infrastructure (Terraform)
AWS target: `infrastructure/terraform/` — modules for VPC, EKS, RDS, MSK (Kafka), ElastiCache (Redis). All complete and not actively being modified.

### Helm Charts
`helm-charts/<service-name>/` — one chart per service. auth-service chart is the only one missing.

## Key Implementation Details

- **GraphQL subscriptions**: Redis PubSub (not in-memory). order-service uses `src/pubsub/` with Redis client.
- **Price validation**: order-service calls restaurant-service via HTTP before creating an order (`src/clients/restaurant.client.ts`). No fallback — fails hard if restaurant-service is down.
- **Kafka idempotency**: order-service tracks event IDs in Redis to prevent duplicate processing.
- **Owner authorization**: restaurant-service mutations verify `ownerId` from JWT context matches restaurant owner.
- **Migration tool**: `node-pg-migrate` in all services. Migration files in `migrations/` as plain JS (not TS).
- **Env vars**: Each service has `.env.example`. Copy to `.env` for local dev. `DATABASE_URL` follows pattern `postgresql://postgres:postgres@localhost:5432/<service>_db`.

## CI/CD

Only `order-service` has a GitHub Actions workflow (`.github/workflows/order-service-ci.yml`). Pattern: lint → test (with real Postgres + Redis services) → build → security scan → Docker push to GHCR → deploy. Remaining services need CI added following this same pattern.

## What's Missing / In Progress

- **Tests**: delivery-service and notification-service have zero tests. order-service tests also absent.
- **auth-service Helm chart**: only missing chart.
- **Kafka retry/backoff**: exponential retry not yet implemented in consumers.
- **CI/CD**: only order-service has a workflow.
- **Frontend**: React app does not exist yet.
- **Docs**: observability, devops, and runbook docs pending.
