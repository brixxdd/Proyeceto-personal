# 🚀 FoodDash — Plataforma de Pedidos en Tiempo Real

> **Sistema distribuido cloud-native de delivery de comida, inspirado en Uber Eats.**
>
> *Microservicios · Eventos Asíncronos · GraphQL Federado · Observabilidad Completa*

<div align="center">

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![GraphQL](https://img.shields.io/badge/GraphQL-Federation_v2-E10098?logo=graphql&logoColor=white)](https://graphql.org)
[![Kafka](https://img.shields.io/badge/Apache_Kafka-7.5-231F20?logo=apachekafka&logoColor=white)](https://kafka.apache.org)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Helm_Charts-326CE5?logo=kubernetes&logoColor=white)](https://kubernetes.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Tests](https://img.shields.io/badge/Tests-246_passing-brightgreen)](.)
[![Progress](https://img.shields.io/badge/Progress-96%25-97D700)](.)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

</div>

---

## 🎯 Overview

Plataforma cloud-native de pedidos de comida en tiempo real. Inspirada en **Uber Eats**. Demuestra **ingeniería de backend de nivel producción** — no es un CRUD app. Cada decisión arquitectural refleja desafíos reales de sistemas distribuidos: aislamiento de servicios, procesamiento de eventos asíncronos, tolerancia a fallos y observabilidad.

> **Target:** Mid/Senior Backend Engineer · Distributed Systems · Platform Engineering

---

## ⚡ Lo Nuevo (v2 — 2026-04-25)

| Feature | Descripción |
|----------|-------------|
| **Restaurant Owner Dashboard** | Dashboard exclusivo donde el owner ve los pedidos de su restaurante, cambia estados (Confirmar → Preparando → Listo), con verificación de ownership. |
| **Modelo 1:1 Usuario-Restaurante** | Cada `RESTAURANT_OWNER` tiene exactamente un restaurante. Sin selectores ambiguos. |
| **Menu Item Names en Dashboard** | Los pedidos muestran nombres reales de productos (batch fetch via `menuItems(ids)` query). |
| **sessionStorage para Auth** | Tokens JWT en `sessionStorage` (no `localStorage`) — se invalidan al cerrar el navegador. |
| **Logout con Blacklist** | "Cerrar sesión" blacklista el token en Redis — si alguien copia el token, no sirve. |
| **BottomNav Role-Based** | Owners ven 📦 Pedidos (→ /dashboard), clientes ven 🛒 Carrito. |
| **Role-Based Login Redirect** | Owner/Admin → `/dashboard`, Customer → `/restaurants`. |

---

## 🏗️ Arquitectura

```
                              ┌─────────────────┐
                              │  React Frontend  │  ✅ Completo
                              │  Landing · Login · Restaurants · Cart · Orders
                              │  Restaurant Dashboard (Owner) · Profile
                              └────────┬───────────────────────────────┘
                                       │  GraphQL + WebSocket (Apollo Client)
                          ┌────────────▼────────────────────────────┐
                          │         API GATEWAY  :4000             │
                          │  Apollo Federation v2                   │
                          │  JWT Auth · Rate Limiting (Redis)       │
                          │  WebSocket Subscription Proxy           │
                          └─────┬──────────┬──────────┬────────────┘
                                │          │          │
                    ┌───────────▼──┐  ┌────▼────┐  ┌─▼──────────┐
                    │    AUTH      │  │RESTAURANT│  │   ORDER    │
                    │    :3002     │  │  :3001  │  │   :3000    │
                    │ JWT + Redis  │  │Redis    │  │ Redis      │
                    │ bcrypt·salt12│  │Cache    │  │ PubSub     │
                    │ Token BLM    │  │Kafka    │  │ Kafka      │
                    └──────────────┘  └────┬────┘  └─────┬──────┘
                                           │             │
                          ┌────────────────▼─────────────▼──────────┐
                          │            Apache Kafka                   │
                          │   10 topics · 3 DLQs · 5 consumer groups │
                          │   Retry + exponential backoff (1s-2s-4s)  │
                          └──────────────────┬───────────────────────┘
                                             │
                        ┌────────────────────┴────────────────────┐
                        │                                         │
              ┌─────────▼──────────┐              ┌──────────────▼─────────┐
              │    DELIVERY       │              │     NOTIFICATION        │
              │      :3003        │              │        :3004            │
              │ Auto-assign driver│              │  Email · SMS · Push WS  │
              │ GeoHash (mock)    │              │  5 Kafka consumers      │
              └───────────────────┘              └─────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                            OBSERVABILIDAD                                     │
│  Prometheus :9090  ·  Grafana :3010  ·  Loki :3100  ·  Jaeger :16686         │
│  6 servicios instrumentados · OTel SDK · Dashboards auto-provisioned          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Modelo de Datos — Relación 1:1 Usuario-Restaurante

```
USERS (auth_db)                         RESTAURANTS (restaurant_db)
┌─────────────────────┐                  ┌──────────────────────────────┐
│ id (PK)             │◄──────────────────│ owner_id (FK) UNIQUE ─────┐  │
│ email               │    1:1           │ id (PK)                  │  │
│ password_hash       │                  │ name                      │  │
│ name                │                  │ address                   │  │
│ role ───────────────┼────→ CUSTOMER / RESTAURANT_OWNER / DELIVERY_PERSON / ADMIN
│ created_at          │                  │ is_open · rating          │  │
└─────────────────────┘                  │ menu_items (child table) │  │
                                         └──────────────────────────────┘
```

**Clave del modelo:** `UNIQUE(owner_id)` en `restaurants` garantiza que cada owner tiene exactamente un restaurante. El dashboard del owner muestra SIEMPRE su restaurante único — sin selectores, sin ambigüedad.

---

## 🔄 Flujo de Eventos (Kafka)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ORDER LIFECYCLE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  Customer
    │  createOrder()
    ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  order-service                                              │
  │  → Valida precios vs restaurant-service (HTTP, sin fallback)│
  │  → Crea order en PostgreSQL                                │
  │  → Publishes: order.created                                 │
  └──────────────────────────────────────────────────────────────┘
                      │
            ┌─────────┴──────────────┐
            ▼                        ▼
   ┌────────────────┐        ┌──────────────────┐
   │ delivery-service│        │notification-service│
   │ Kafka consumer  │        │ Kafka consumer      │
   │ → Asigna driver │        │ → Email "Order     │
   │   (ORDER BY      │        │   confirmed"       │
   │   RANDOM())     │        └──────────────────┘
   │ → Publishes:     │                │
   │   delivery.assigned                │
   └────────────────┘                │
           │                        ▼
           │          ┌────────────────────┐
           └─────────►│notification-service│
                      │ Kafka consumer      │
                      │ → SMS/Email al      │
                      │   driver             │
                      └────────────────────┘
                              │
                              ▼
                   ┌──────────────────┐
                   │order.delivered   │  → notification-service
                   └──────────────────┘  → "Entrega completada ✓"
```

### Tópicos Kafka

| Topic | Producer | Consumers | DLQ |
|-------|----------|-----------|-----|
| `order.created` | order-service | delivery, notification | `order.created.dlq` |
| `delivery.assigned` | delivery-service | notification | `delivery.assigned.dlq` |
| `order.cancelled` | order-service | delivery, notification | `order.cancelled.dlq` |
| `order.confirmed` | order-service | notification | — |
| `order.preparing` | order-service | notification | — |
| `order.ready` | order-service | notification | — |

---

## 📡 Servicios

| Servicio | Puerto | Responsabilidad | Tecnologías |
|----------|--------|-----------------|-------------|
| **api-gateway** | 4000 | Federation gateway, JWT auth, rate limiting, WS proxy | Apollo Federation v2, Redis |
| **auth-service** | 3002 | Register · Login · Logout · Refresh · RBAC · Token blacklist | JWT, bcrypt (salt 12), Redis |
| **restaurant-service** | 3001 | Restaurant + menu CRUD, owner authorization 1:1 | Redis cache-aside, Kafka producer, `menuItems(ids)` batch |
| **order-service** | 3000 | Order lifecycle, price validation vs restaurant-service, ownership verification | Redis pub/sub, Kafka, `restaurantOrders` query |
| **delivery-service** | 3003 | Auto-assign drivers, track deliveries | Kafka consumer, PostgreSQL, GeoHash mock |
| **notification-service** | 3004 | Multi-channel (email, SMS, push WebSocket) | 5 Kafka consumers, Redis PubSub |

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 18 + Vite + TypeScript, Apollo Client, React Router, Framer Motion, Lucide Icons, Tailwind-free CSS |
| **API** | GraphQL, Apollo Federation v2, WebSocket subscriptions |
| **Backend** | Node.js 20, TypeScript 5.3, Express, node-pg-migrate |
| **Bases de datos** | PostgreSQL 15 (aislada por servicio), Redis 7 |
| **Mensajería** | Apache Kafka (Confluent 7.5), 10 topics, 3 DLQs |
| **Auth** | JWT (access + refresh, 1h / 7d), bcrypt salt 12, Redis blacklist para logout |
| **Contenedores** | Docker, Docker Compose |
| **Kubernetes** | Helm charts (6 servicios), HPA, ServiceMonitor, Prometheus operator |
| **Infraestructura** | Terraform — AWS EKS, RDS PostgreSQL, MSK Kafka, ElastiCache Redis |
| **Observabilidad** | Prometheus + Grafana + Loki + Promtail + Tempo/Jaeger + OpenTelemetry |
| **CI/CD** | GitHub Actions (6 workflows), ArgoCD app-of-apps, Trivy, npm audit |
| **Testing** | Jest + ts-jest, 246 tests, 0 failures |

---

## 🏆 Engineering Highlights

### Tolerancia a Fallos
- **Backoff exponencial + DLQ** — Todos los consumers Kafka reintentan 3× (1s, 2s, 4s) antes de publicar a dead-letter queue. Cero fallos silenciosos.
- **Idempotencia de eventos** — Redis `SET NX` con TTL 24h evita procesamiento duplicado de órdenes ante reinicios de consumer.
- **Validación de precios hard** — order-service llama a restaurant-service via HTTP antes de crear cualquier orden. Sin fallback — precios desactualizados son rechazados.

### Tiempo Real
- **GraphQL Subscriptions** respaldadas por Redis pub/sub — escala horizontalmente entre réplicas del servicio.
- **WebSocket proxy** en api-gateway reenvía tráfico de subscriptions a order-service sin terminar la conexión.

### Seguridad
- **JWT + refresh token rotation** con blacklist en Redis para invalidación instantánea al logout.
- **Rate limiting** — 5 intentos de login por IP+email por 15 minutos.
- **sessionStorage** para auth tokens — se invalidan al cerrar el navegador (vs localStorage).
- **Logout con blacklist** — el backend guarda el token en Redis hasta su expiración, así que tokens copiados no sirven.
- **Owner authorization** — mutations de restaurante verifican que JWT `userId` coincida con `ownerId`. ADMIN bypass.

### Observabilidad
- Cada servicio expone `/metrics` (prom-client). Prometheus scrapea cada 10s. Dashboards Grafana cargan automáticamente al primer boot.

---

## 🚀 Quick Start

```bash
# Clonar
git clone https://github.com/brixxdd/Proyeceto-personal.git
cd Proyeceto-personal

# Levantar stack completo (infra + servicios)
docker-compose up -d

# Esperar que Kafka esté listo
./scripts/start-cluster.sh

# Seed datos de demo
node scripts/seed.js

# Abrir frontend
# http://localhost:5173
```

### 🔐 Credenciales de Prueba

| Rol | Email | Password |
|-----|-------|----------|
| ADMIN | admin@fooddelivery.com | Admin123! |
| RESTAURANT_OWNER | owner1@test.com | Owner123! |
| RESTAURANT_OWNER | owner2@test.com | Owner123! |
| CUSTOMER | customer1@test.com | Customer123! |
| CUSTOMER | customer2@test.com | Customer123! |

> También en [`scripts/test-credentials.txt`](scripts/test-credentials.txt)

### 🧪 Endpoints de Acceso

| Servicio | URL | Notas |
|----------|-----|-------|
| **Frontend** | http://localhost:5173 | React + Apollo Client |
| **GraphQL Playground** | http://localhost:4000/graphql | Todos los subgraphs federados |
| **Grafana** | http://localhost:3010 | admin / admin |
| **Prometheus** | http://localhost:9090 | Métricas crudas |
| **Jaeger** | http://localhost:16686 | Distributed tracing |
| **Loki** | http://localhost:3100 | Logs centralizados |
| **Adminer** | http://localhost:8080 | postgres / postgres |

### Desarrollo por Servicio

```bash
cd services/order-service
npm install
cp env.example .env
npm run dev          # hot reload (ts-node-dev)
npm test             # jest
npm run test:coverage
npm run migrate:up
```

---

## 🧪 Tests

```bash
# Todos los servicios
for s in auth-service restaurant-service order-service delivery-service notification-service api-gateway; do
  echo "=== $s ===" && cd services/$s && npm test && cd ../..
done
```

| Servicio | Tests | Cobertura |
|----------|-------|-----------|
| auth-service | 37 | 100% |
| restaurant-service | 61 | ~90% |
| order-service | 45 | — |
| delivery-service | 48 | — |
| notification-service | 33 | — |
| api-gateway | 22 | 100% |
| **Total** | **246** | **0 failures** |

---

## 🔒 Seguridad

| Feature | Implementación |
|---------|---------------|
| **Auth tokens** | JWT en `sessionStorage` (expira al cerrar navegador) |
| **Logout** | Token blacklisted en Redis hasta expiración natural |
| **Passwords** | bcrypt con salt rounds 12 |
| **Rate limiting** | 5 login attempts / IP+email / 15min |
| **RBAC** | JWT `role` claims propagados a todos los subgraphs |
| **Owner verification** | Cross-db query a `restaurant_db` para verificar `owner_id` |
| **CI Security** | Trivy image scan, npm audit, dependency-review |

---

## 📁 Estructura del Proyecto

```
.
├── services/                    # 6 microservicios Node.js/TypeScript
│   ├── api-gateway/             # Apollo Federation gateway
│   ├── auth-service/            # Users, JWT, bcrypt, Redis blacklist
│   ├── restaurant-service/      # Restaurants, menus, owner 1:1 auth
│   ├── order-service/           # Orders, price validation, ownership
│   ├── delivery-service/        # Driver assignment, delivery tracking
│   └── notification-service/    # Email, SMS, push via Kafka consumers
├── frontend/                    # React app
│   ├── src/
│   │   ├── pages/               # Landing, Login, Register, Restaurants,
│   │   │   ├── RestaurantDashboard.tsx  # Owner dashboard (nuevo)
│   │   │   └── Profile.tsx              # Perfil + logout con blacklist
│   │   ├── components/layout/    # Navbar, BottomNav (role-based)
│   │   ├── components/ui/        # Skeleton, ThemeToggle, SkipNav
│   │   ├── context/              # CartContext, ThemeContext
│   │   └── lib/                  # Apollo client, animations
│   └── helm/                     # Helm chart para K8s
├── infrastructure/              # Terraform modules (VPC, EKS, RDS, MSK)
├── helm-charts/                 # 6 Helm charts production-ready
├── observability/               # Prometheus, Grafana, Loki, Alertmanager
├── argocd/                      # ArgoCD app-of-apps, production overlays
├── scripts/                     # seed.js, start-cluster.sh, init-db
├── docker-compose.yaml          # Desarrollo local completo
├── .github/                    # 6 GitHub Actions workflows
└── README.md
```

---

## 🎯 Roadmap

| Fase | Estado | Detalle |
|------|--------|---------|
| 1. Servicios Core (auth, restaurant, order, gateway) | ✅ 100% | 75 tareas |
| 2. Eventos y Notificaciones (Kafka) | ✅ 100% | delivery + notification services |
| 3. Testing | ✅ 100% | 246 tests |
| 4. Observabilidad | ✅ 100% | Prometheus, Grafana, Loki, Jaeger |
| 5. Seguridad | 🚧 ~56% | JWT ✅, blacklist ✅, sessionStorage ✅ |
| 6. CI/CD | 🚧 ~88% | GitHub Actions ✅, ArgoCD ✅ |
| 7. Documentación | 🚧 ~79% | README ✅, falta runbooks |
| 8. Frontend | 🚧 99% | Dashboard owner ✅, falta useAuth hook |
| 9. Producción | 🚧 ~38% | Deploy script ✅, falta AWS EKS |
| **Total** | **~96%** | |

---

## 📊 Progreso por Fase

```
███████████████████████████████  100%  FASE 1 — Servicios Core
███████████████████████████████  100%  FASE 2 — Eventos y Notif.
███████████████████████████████  100%  FASE 3 — Testing
███████████████████████████████  100%  FASE 4 — Observabilidad
███████████████████░░░░░░░░░░░  ~56%  FASE 5 — Seguridad
████████████████████████░░░░░░  ~88%  FASE 6 — CI/CD
██████████████████████░░░░░░░░░  ~79%  FASE 7 — Documentación
██████████████████████████████░  99%  FASE 8 — Frontend
███████████░░░░░░░░░░░░░░░░░░░  ~38%  FASE 9 — Producción
════════════════════════════════  ~96%  TOTAL
```

---

> *"Los proyectos grandes no se hacen por inspiración. Se hacen por disciplina, un commit a la vez."*
>
> 🔥 **¿Listo? Start: `docker-compose up -d && ./scripts/start-cluster.sh`**
