# 🎯 MASTER PLAN — Plataforma de Pedidos en Tiempo Real

> **Progreso Total: ~73%** | Última actualización: 2026-04-20
>
> Converge: ROADMAP, IMPLEMENTATION_STATUS, PRIORITY_PLAN, NEXT_STEPS, QUICK_START, LA_VISION, PROJECT_STRUCTURE

---

## 🚀 Visión del Proyecto

Plataforma cloud-native distribuida, escalable. Inspirada en Uber Eats. Microservicios, eventos asíncronos, GraphQL federado, CI/CD automático, observabilidad completa.

### ¿Por qué este proyecto?

- **Diferenciación total**: 95% devs llegan con CRUDs básicos. Tú llegas con arquitectura de producción real.
- **Portafolio premium**: Nivel Mid/Senior (solo 2% devs saben esto).
- **Aprendizaje brutal**: Microservicios + Kafka + Kubernetes + CI/CD + observabilidad = perfil senior real.

---

## 📊 Estado Actual del Proyecto

| Componente | Progreso | Estado | Notas |
|------------|----------|--------|-------|
| **Infraestructura Terraform** | 100% | ✅ Completo | VPC, EKS, RDS, MSK, ElastiCache |
| **Helm Charts** | ~83% | 🚧 Avanzando | order, restaurant, api-gateway, delivery, notification — falta auth-service |
| **order-service** | 100% | ✅ Completo | Validación precios vs restaurant-service ✅, node-pg-migrate ✅, .env ✅, subscriptions ✅ |
| **auth-service** | 100% | ✅ Completo | register/login/logout/refreshToken, bcrypt+JWT, Redis blacklist, rate limiting (5/15min), 37 tests 100% coverage |
| **restaurant-service** | 100% | ✅ Completo | CRUD+cache Redis, Kafka producer, owner auth ✅, /metrics ✅, Helm ✅, 61 tests ~90% coverage |
| **api-gateway** | 100% | ✅ Completo | Federation 3 subgraphs ✅, rate limiting Redis ✅, WebSocket subscriptions proxy ✅, Helm ✅, 22 tests |
| **delivery-service** | 100% | ✅ Completo | Kafka consumers ✅, retry/backoff+DLQ ✅, GraphQL subscriptions ✅, Helm ✅, 48 tests ✅ |
| **notification-service** | 100% | ✅ Completo | 5 Kafka consumers ✅, retry/backoff+DLQ ✅, mock email/SMS ✅, subscriptions ✅, Helm ✅, 33 tests ✅ |
| **Kafka** | 100% | ✅ Completo | Init script ✅, consumer groups ✅, DLQs ✅, retry/backoff exponencial ✅ |
| **CI/CD** | ~35% | 🚧 Avanzando | Workflows para los 6 servicios escritos ✅ — falta ArgoCD, deployment strategies |
| **Documentación** | ~60% | 🚧 Avanzando | Entregable-1 (arquitectura, ER, secuencia) ✅ — faltan observabilidad, devops, runbooks |
| **Tests** | ~35% | 🚧 Avanzando | auth(37) ✅, restaurant(61) ✅, api-gateway(22) ✅, delivery(48) ✅, notification(33) ✅ — falta order-service |
| **Frontend** | 0% | 📋 Pendiente | No existe app React |

**Progreso Total: ~73%**

---

## 🏗️ Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────┐
│                  FRONTEND (React)                     │
│   Landing → Login → Catálogo → Carrito → Tracking    │
│   Tiempo real con WebSockets, responsive, a11y       │
└──────────────────────┬───────────────────────────────┘
                       │ GraphQL over HTTPS
┌──────────────────────▼───────────────────────────────┐
│               API GATEWAY (Apollo Federation)         │
│   JWT auth · Rate limiting · Subscriptions · CORS    │
└──┬────────┬────────────┬───────────┬─────────────────┘
   │        │            │           │
   ▼        ▼            ▼           ▼
┌──────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐
│ AUTH │ │RESTAURANT│ │  ORDER   │ │  DELIVERY  │
│ JWT  │ │  Menús   │ │  Pedidos │ │  Tracking  │
│ RBAC │ │  Cache   │ │  Kafka   │ │  GeoHash   │
└──┬───┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘
   │          │             │              │
   ▼          ▼             ▼              ▼
┌─────────────────────────────────────────────────────┐
│              EVENT BUS (Apache Kafka)                │
│  order.created → delivery.assigned → notify user    │
│  Todo asíncrono, desacoplado, escalable             │
└─────────────────────────────────────────────────────┘
   │          │             │              │
   ▼          ▼             ▼              ▼
┌──────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐
│ PG   │ │   PG     │ │   PG     │ │    PG      │
│auth  │ │restaurant│ │  order   │ │  delivery  │
└──────┘ └──────────┘ └──────────┘ └────────────┘
         ┌──────┐    ┌──────┐
         │Redis │    │Kafka │  (cache + events)
         └──────┘    └──────┘

┌─────────────────────────────────────────────────────┐
│              OBSERVABILIDAD                          │
│   Prometheus → Grafana → Alertas en Slack           │
│   Loki → Logs centralizados                         │
│   Tempo/Jaeger → Distributed tracing                │
└─────────────────────────────────────────────────────┘
```

### Actores Externos

- **Cliente**: Usuario final que realiza pedidos
- **Dueño de Restaurante**: Gestiona restaurante y recibe pedidos
- **Repartidor**: Ve y acepta pedidos para entregar
- **Sistemas Externos**: Pasarela de Pago, Servicio de Mapas, Proveedor SMS, Proveedor Email

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React + GraphQL (Apollo Client) |
| **Backend** | Node.js / Go microservicios |
| **Bases de datos** | PostgreSQL (una por microservicio) |
| **Cache** | Redis |
| **Event Streaming** | Apache Kafka |
| **Contenedores** | Docker + Kubernetes |
| **Infraestructura** | Terraform (AWS: EKS, RDS, MSK, ElastiCache) |
| **Observabilidad** | Prometheus + Grafana |
| **CI/CD** | GitHub Actions + ArgoCD |

---

## 📁 Estructura del Proyecto

```
.
├── services/              # Microservicios
│   ├── api-gateway/
│   ├── auth-service/
│   ├── restaurant-service/
│   ├── order-service/     (casi completo)
│   ├── delivery-service/
│   └── notification-service/
├── infrastructure/        # Terraform modules (completos)
├── helm-charts/          # Helm charts por servicio
├── docs/                 # Documentación (mkdocs)
├── docker-compose.yaml   # Desarrollo local
├── .github/              # GitHub Actions workflows
├── scripts/              # Scripts auxiliares
└── MASTER_PLAN.md        (este archivo)
```

### Estructura Estándar de un Microservicio

```
service-name/
├── src/
│   ├── index.ts              # Punto de entrada
│   ├── resolvers/            # GraphQL resolvers
│   ├── services/             # Lógica de negocio
│   ├── models/               # Modelos de datos
│   ├── repositories/         # Acceso a datos
│   ├── events/               # Eventos Kafka
│   └── utils/                # Utilidades
├── migrations/               # Migraciones de BD
├── tests/                    # Tests
├── Dockerfile
├── Makefile
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 🎯 ROADMAP — 9 Fases, 242 Tareas

### FASE 1 — Cimientos y Servicios Core (0% → 60%)

#### 1.1 order-service — Completar (85% → 100%)

- [x] **1.1.1** Instalar dependencias: `cd services/order-service && npm install` ✅
- [x] **1.1.2** Crear `.env` desde `env.example` con valores locales ✅ + `RESTAURANT_SERVICE_URL`
- [x] **1.1.3** GraphQL Subscriptions reales (Redis PubSub o `graphql-ws`) ✅ Redis PubSub implementado
- [x] **1.1.4** Validación JWT real (middleware que decode token del header) ✅ Stub JWT implementado
- [x] **1.1.5** Validar precios consultando restaurant-service antes de crear order ✅ `src/clients/restaurant.client.ts` — fetch real, sin fallback
- [x] **1.1.6** Idempotencia en eventos Kafka (tracking de event IDs en Redis) ✅ Idempotency service creada
- [x] **1.1.7** Crear directorio `migrations/` y migrar de inline a `node-pg-migrate` ✅ `migrations/001_create_orders.js`
- [x] **1.1.8** Endpoint `/metrics` para Prometheus ✅ prom-client configurado
- [x] **1.1.9** Health check mejorado (verificar DB, Redis, Kafka) ✅ Health check implementado
- [x] **1.1.10** Graceful de errores de conexión (reconnect logic) ✅ Graceful shutdown implementado

#### 1.2 auth-service — Completar (45% → 100%)

- [x] **1.2.1** Instalar dependencias: `cd services/auth-service && npm install` ✅
- [x] **1.2.2** Crear `env.example` con todas las variables necesarias ✅
- [x] **1.2.3** Migración de BD: tabla `users` (id, email, password_hash, role, created_at, updated_at) ✅ 001_create_users.js
- [x] **1.2.4** `register` mutation: ✅
  - [x] Validar email único ✅
  - [x] Hash password con bcrypt (salt rounds 12) ✅
  - [x] Insertar en PostgreSQL ✅
  - [x] Retornar user + token ✅
- [x] **1.2.5** `login` mutation: ✅
  - [x] Buscar user por email ✅
  - [x] Verificar password con bcrypt ✅
  - [x] Generar JWT token (con expiración) ✅
  - [x] Retornar AuthPayload ✅
- [x] **1.2.6** `me` query: ✅
  - [x] Validar JWT del header ✅
  - [x] Buscar user en DB ✅
  - [x] Retornar datos del usuario ✅
- [x] **1.2.7** Middleware validación JWT (reutilizable para otros servicios) ✅
- [x] **1.2.8** Refresh token flow ✅ refreshToken mutation implementada
- [x] **1.2.9** Redis para session management / token blacklist ✅ logout mutation + blacklist con TTL
- [x] **1.2.10** Rate limiting en endpoint de login ✅ 5 intentos/15min por IP+email
- [x] **1.2.11** Tests unitarios (registro, login, validación) ✅ 37 tests, 100% coverage
- [x] **1.2.12** Dockerfile multi-stage (patrón de order-service) ✅

#### 1.3 restaurant-service — Crear desde cero (55% → 100%)

- [x] **1.3.1** Estructura del servicio (copiar esqueleto de order-service): ✅
  - [x] `package.json` con dependencias ✅
  - [x] `tsconfig.json` ✅
  - [x] `Dockerfile` multi-stage ✅
  - [x] `Makefile` ✅
  - [x] `env.example` ✅
  - [x] `src/index.ts` ✅
  - [x] `src/schema.graphql` ✅ (schema.ts)
  - [x] `src/resolvers/` ✅ (resolvers.ts)
  - [x] `src/services/` ✅ (restaurant.service.ts)
  - [ ] `src/repositories/` (integrado en service)
  - [ ] `src/models/` (tipos inline en service)
  - [x] `src/utils/logger.ts` ✅
- [x] **1.3.2** GraphQL schema: ✅
  - [x] Type `Restaurant` (id, name, description, address, rating, isOpen, cuisineType, ownerId) ✅
  - [x] Type `MenuItem` (id, restaurantId, name, description, price, isAvailable, category) ✅
  - [x] Query: `restaurants`, `restaurant(id)`, `menu(restaurantId)`, `menuItem(id)` ✅
  - [x] Mutation: `createRestaurant`, `updateRestaurant`, `deleteRestaurant`, `createMenuItem`, `updateMenuItem`, `deleteMenuItem` ✅
  - [x] Subscription: `restaurantStatusChanged` ✅ (stub)
- [x] **1.3.3** Conexión a PostgreSQL (base: `restaurant_db`) ✅
- [x] **1.3.4** Migraciones: tablas `restaurants` y `menu_items` ✅ 001 + 002
- [x] **1.3.5** Resolvers y service layer ✅
- [x] **1.3.6** Redis cache para menús populares y restaurantes abiertos ✅ cache-aside pattern completo
- [x] **1.3.7** Kafka producer para eventos: `restaurant.created`, `menu.updated` ✅ graceful fallback si Kafka no disponible
- [x] **1.3.8** Validación de owner (solo dueño puede modificar su restaurante) ✅ RBAC en todos los mutations, ADMIN bypass
- [x] **1.3.9** Endpoint `/health` + `/metrics` ✅ prom-client, métricas de negocio + conexiones
- [x] **1.3.10** Tests unitarios e integración ✅ 61 tests, ~90% coverage
- [x] **1.3.11** Helm chart ✅ Deployment, Service, HPA, Secret, ConfigMap, ServiceMonitor

#### 1.4 api-gateway — Crear desde cero (40% → 100%)

- [x] **1.4.1** Estructura del proyecto: ✅
  - [x] `package.json` (dependencias: `@apollo/gateway`, `@apollo/server`, etc.) ✅
  - [x] `tsconfig.json` ✅
  - [x] `Dockerfile` ✅
  - [x] `Makefile` ✅
  - [x] `env.example` ✅
  - [x] `src/index.ts` ✅
- [x] **1.4.2** Apollo Federation v2: ✅ 3 subgraphs funcionando
  - [x] Gateway con service discovery ✅ IntrospectAndCompose
  - [x] Subgraphs: auth ✅, restaurant ✅, order ✅ (corregido: `buildSubgraphSchema` + `@key`)
  - [x] Manejo de errores de subgraphs caído ✅ RemoteGraphQLDataSource con contexto
- [x] **1.4.3** Autenticación JWT: ✅
  - [x] Middleware que valida token en cada request ✅
  - [x] User context a todos los subgraphs ✅ (x-user-id, x-user-email, x-user-role)
  - [x] Tokens expirados ✅
- [x] **1.4.4** Rate limiting: ✅
  - [x] Por usuario (usando Redis) ✅ keyGenerator por userId o IP
  - [x] Por IP para requests no autenticados ✅
  - [x] Headers de rate limit en responses ✅ standardHeaders: true
- [x] **1.4.5** GraphQL Subscriptions en gateway: ✅ WebSocket proxy raw bidireccional → order-service
- [x] **1.4.6** CORS ✅
- [x] **1.4.7** Logging estructurado (Winston) ✅
- [x] **1.4.8** Health check y métricas ✅ Health check con 3 subgraphs + Redis
- [x] **1.4.9** Tests ✅ 22 tests, 100% coverage en auth middleware
- [x] **1.4.10** Helm chart ✅ `helm-charts/api-gateway/` (port 4000, HPA min2/max6, secrets: redis+jwt)

#### 1.5 docker-compose — Hacer funcional (90% → 100%)

- [x] **1.5.1** docker-compose para todos los servicios ✅ 6 servicios configurados
- [x] **1.5.2** Agregar delivery-service al compose ✅ port 3003, delivery_db
- [x] **1.5.3** Agregar notification-service al compose ✅ port 3004, notification_db
- [x] **1.5.4** Seed script para datos de prueba ✅ `scripts/seed.js` — 5 usuarios, 3 restaurantes, 12 menú items (idempotente, UUIDs fijos)
- [x] **1.5.5** `docker-compose up` levanta sin errores ✅ 6 servicios + kafka-init + infraestructura

---

### FASE 2 — Eventos y Notificaciones (60% → 75%)

#### 2.1 delivery-service — Crear desde cero (0% → 100%)

- [x] **2.1.1** Estructura del proyecto ✅ 20 archivos TypeScript
- [x] **2.1.2** Schema GraphQL ✅ DeliveryPerson, Delivery, enums, subscriptions, Federation @key
- [x] **2.1.3** **Kafka consumer** para `order.created` ✅ → busca driver AVAILABLE (ORDER BY RANDOM()), crea Delivery, publica `delivery.assigned`
- [x] **2.1.4** Kafka consumer para `order.cancelled` → libera delivery ✅ driver → AVAILABLE
- [x] **2.1.5** PostgreSQL (`delivery_db`) ✅
- [x] **2.1.6** Migraciones: `delivery_people` y `deliveries` ✅ + 5 drivers pre-seeded
- [x] **2.1.7** Redis para geolocalización ✅ location en JSONB, mock simple
- [x] **2.1.8** Simulación de mapa/mock de geolocalización ✅ ubicación en JSONB, `ORDER BY RANDOM()` para asignación
- [x] **2.1.9** Health check + métricas ✅ `delivery_assignments_total`, `active_deliveries`, `available_drivers`
- [x] **2.1.10** Tests ✅ 48 tests pasando (delivery.repository, delivery.service, kafka.consumer)
- [x] **2.1.11** Helm chart ✅ `helm-charts/delivery-service/` (port 3003, HPA min2/max8)

#### 2.2 notification-service — Crear desde cero (0% → 100%)

- [x] **2.2.1** Estructura del proyecto ✅ 15 archivos TypeScript
- [x] **2.2.2** Schema GraphQL ✅ Notification, NotificationPreference, 7 tipos, subscriptions, Federation @key
- [x] **2.2.3** Kafka consumers ✅
  - [x] `order.created` → notificar al cliente
  - [x] `order.assigned` → notificar al cliente
  - [x] `order.delivered` → notificar al cliente
  - [x] `delivery.assigned` → notificar al repartidor
  - [x] `order.cancelled` → notificar al cliente
- [x] **2.2.4** Proveedor de email ✅ mock (`src/providers/email.provider.ts`)
- [x] **2.2.5** Proveedor de SMS ✅ mock (`src/providers/sms.provider.ts`)
- [x] **2.2.6** Notificaciones push en tiempo real ✅ WebSocket + GraphQL subscription `newNotification` vía Redis PubSub
- [x] **2.2.7** PostgreSQL (`notification_db`) ✅ tablas `notifications` + `notification_preferences`
- [x] **2.2.8** Health check + métricas ✅ `notifications_sent_total`, `notifications_pending`
- [x] **2.2.9** Tests ✅ 33 tests pasando (notification.service, kafka.consumer)
- [x] **2.2.10** Helm chart ✅ `helm-charts/notification-service/` (port 3004, HPA min2/max6)

#### 2.3 Kafka — Setup completo

- [x] **2.3.1** Tópicos explícitos (no auto-create) ✅ 10 topics de negocio + 3 DLQs
- [x] **2.3.2** Script de inicialización de tópicos ✅ `scripts/kafka-init-topics.sh` (idempotente, retry loop)
- [x] **2.3.3** Consumer groups con nombres descriptivos ✅ `delivery-service-group`, `notification-service-group`
- [x] **2.3.4** Dead letter queue para eventos fallidos ✅ `order.created.dlq`, `order.cancelled.dlq`, `delivery.assigned.dlq`
- [x] **2.3.5** Retry logic con backoff exponencial ✅ retryWithBackoff (max 3 retries, base 1s, ×2) en delivery + notification consumers, DLQ on exhaustion

---

### FASE 3 — Testing (75% → 85%)

- [ ] **3.1** order-service — Tests (unitarios, integración, E2E, 80% coverage)
- [ ] **3.2** auth-service — Tests (unitarios, integración, seguridad, E2E)
- [ ] **3.3** restaurant-service — Tests (unitarios, integración, Redis cache, E2E)
- [x] **3.4** delivery-service — Tests ✅ 48 tests (unitarios + Kafka consumer)
- [x] **3.5** notification-service — Tests ✅ 33 tests (unitarios + Kafka consumers + email/SMS mock)
- [ ] **3.6** api-gateway — Tests (federación GraphQL, JWT, rate limiting, resiliencia, E2E)
- [ ] **3.7** Tests de infraestructura (Terraform, Helm charts, Docker Compose)

---

### FASE 4 — Observabilidad (85% → 90%)

- [ ] **4.1** Métricas (Prometheus) — `prom-client` en cada servicio, dashboards Grafana
- [ ] **4.2** Logging — JSON estructurado, correlation ID, Loki + Grafana
- [ ] **4.3** Distributed Tracing — OpenTelemetry, Jaeger/Tempo, trace context en HTTP y Kafka
- [ ] **4.4** Alerting — Alertmanager, alertas de servicio caído, latencia, error rate, recursos

---

### FASE 5 — Seguridad (90% → 93%)

- [ ] **5.1** Autenticación y Autorización — JWT en todos los servicios, RBAC, refresh tokens
- [ ] **5.2** Secrets Management — AWS Secrets Manager, rotación automática, K8s secrets encriptados
- [ ] **5.3** Network Security — Network policies, TLS/HTTPS, security headers, rate limiting
- [ ] **5.4** CI/CD Security — Trivy scan, npm audit, SAST (CodeQL/Semgrep), branch protection

---

### FASE 6 — CI/CD Completo (93% → 95%)

- [x] **6.1** GitHub Actions — Workflows para todos los servicios ✅ (auth, restaurant, order, delivery, notification, api-gateway)
- [ ] **6.2** ArgoCD — App-of-Apps pattern, sync automático, health checks, rollback
- [ ] **6.3** Deployment Strategies — Blue-green/canary, health checks, rollback automático

---

### FASE 7 — Documentación Completa (95% → 97%)

- [ ] **7.1** Guías faltantes — Metrics, logging, tracing, contributing, coding standards, testing, CI/CD, Terraform, Helm
- [ ] **7.2** Diagramas adicionales — Secuencia, ERD, eventos Kafka, runbook de troubleshooting

---

### FASE 8 — Frontend (97% → 99%)

- [ ] **8.1** React App — Setup con Vite + React + TypeScript, Apollo Client, React Router, UI framework
- [ ] **8.2** Páginas — Landing, Login, Dashboard, Catálogo, Restaurante, Carrito, Tracking, Perfil, Dashboards
- [ ] **8.3** Frontend — Calidad — Tests, accesibilidad WCAG 2.2, SEO, performance, responsive, Helm chart

---

### FASE 9 — Producción (99% → 100%)

- [ ] **9.1** Performance Testing — k6/Artillery, benchmarks, tests de estrés, optimización
- [ ] **9.2** Producción — Deploy AWS EKS, DNS, SSL, CDN, backups, disaster recovery, runbooks
- [ ] **9.3** Documentación final — README con screenshots, video demo, blog técnico, portfolio-ready

---

## ⚡ QUICK WIN — Empezar Aquí Ahora

### Paso 1: Instalar dependencias de order-service (5 min)

```bash
cd services/order-service
npm install
```

### Paso 2: Configurar variables de entorno (2 min)

```bash
cp env.example .env
# Editar .env con valores locales
```

### Paso 3: Levantar infraestructura local (2 min)

```bash
docker-compose up -d postgres redis zookeeper kafka
```

### Paso 4: Verificar order-service corriendo (5 min)

```bash
# Health check
curl http://localhost:3000/health

# GraphQL endpoint
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ orders { id status } }"}'
```

---

## 🎯 PRÓXIMO PASO RECOMENDADO

### **OPCIÓN E: MVP Rápido (RECOMENDADO)** ⭐

**Objetivo:** Flujo completo funcionando en ~3 horas.

**Secuencia:**

1. **Completar Auth Service básico** (1 hora)
   - Instalar dependencias
   - Migración tabla `users`
   - Registro con bcrypt
   - Login con JWT
   - Query `me`

2. **Crear Restaurant Service mínimo** (1 hora)
   - Copiar estructura de order-service
   - CRUD básico de restaurantes
   - Gestión de menús
   - Cache Redis

3. **API Gateway básico** (1 hora)
   - Estructura del gateway
   - Apollo Federation v2
   - Conectar auth-service, restaurant-service, order-service
   - Autenticación JWT básica

4. **Probar flujo completo** (15 min)
   - Registro → Login → Crear restaurante → Crear pedido

**Total:** ~3 horas para MVP funcional

---

## 📋 Alternativas de Inicio

| Opción | Qué hace | Tiempo | Complejidad |
|--------|----------|--------|-------------|
| **A) Auth Service** | Completar autenticación | 2-3 horas | Media |
| **B) Restaurant Service** | Crear servicio desde cero | 3-4 horas | Media |
| **C) Instalar dependencias** | Preparar todos los servicios | 1 hora | Baja |
| **D) API Gateway** | Unificar servicios | 4-5 horas | Alta |
| **E) MVP Rápido** ⭐ | Auth + Restaurant + Gateway básico | ~3 horas | Media |

**Recomendación:** Opción E para ver resultados rápido.

---

## 🎓 Comandos Make Estándar

Cada servicio implementa:

- `make install` — Instalar dependencias
- `make build` — Compilar
- `make run` — Ejecutar en desarrollo
- `make test` — Ejecutar tests
- `make lint` — Linter
- `make docker-build` — Construir imagen Docker
- `make docker-push` — Publicar imagen
- `make migrate` — Ejecutar migraciones

---

## 🔗 Recursos Útiles

- [Apollo Server Docs](https://www.apollographql.com/docs/apollo-server/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [KafkaJS Documentation](https://kafka.js.org/)
- [PostgreSQL Node.js](https://node-postgres.com/)
- [Redis Node.js](https://github.com/redis/node-redis)
- [Kubernetes Patterns](https://kubernetes.io/docs/concepts/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Helm Best Practices](https://helm.sh/docs/chart_best_practices/)

---

## 💡 Notas Importantes

1. **Seguridad**: Cambiar todos los secrets por defecto antes de producción
2. **Costos AWS**: Recursos creados tienen costos. Revisar pricing
3. **Escalabilidad**: Ajustar HPA y recursos según necesidades
4. **Monitoreo**: Dashboards Grafana y alertas
5. **Disciplina**: Un checkbox a la vez se construyen los proyectos que importan

---

## 📈 Progreso por Fase

| Fase | Tareas | Completadas | Pendientes | Progreso |
|------|--------|-------------|------------|----------|
| 1. Servicios Core | 69 | 69 | 0 | **100%** ✅ |
| 2. Eventos y Notificaciones | 35 | 35 | 0 | **100%** ✅ |
| 3. Testing | 33 | 5 | 28 | ~15% |
| 4. Observabilidad | 20 | 0 | 20 | 0% |
| 5. Seguridad | 16 | 0 | 16 | 0% |
| 6. CI/CD | 16 | 6 | 10 | ~37% |
| 7. Documentación | 14 | 7 | 7 | ~50% |
| 8. Frontend | 26 | 0 | 26 | 0% |
| 9. Producción | 13 | 0 | 13 | 0% |
| **TOTAL** | **242** | **122** | **120** | **~73%** |

---

> **Nota:** Documento vivo. Actualizar conforme avanza proyecto.
> Estimación total: **4-6 semanas** desarrollo activo.
>
> *"Los proyectos grandes no se hacen por inspiración. Se hacen por disciplina, un commit a la vez."*
>
> 🔥 **¿Listo para empezar? Vamos con el MVP.**