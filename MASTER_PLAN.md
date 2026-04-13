# 🎯 MASTER PLAN — Plataforma de Pedidos en Tiempo Real

> **Progreso Total: ~35%** | Última actualización: 2026-04-12
>
> Documento único que converge: ROADMAP, IMPLEMENTATION_STATUS, PRIORITY_PLAN, NEXT_STEPS, QUICK_START, LA_VISION, PROJECT_STRUCTURE

---

## 🚀 Visión del Proyecto

Plataforma cloud-native distribuida y escalable inspirada en Uber Eats, con arquitectura de microservicios, eventos asíncronos, GraphQL federado, CI/CD automático y observabilidad completa.

### ¿Por qué este proyecto?

- **Diferenciación total**: El 95% de devs llegan con CRUDs básicos. Tú llegas con arquitectura de producción real.
- **Portafolio premium**: Demuestras habilidades de nivel Mid/Senior (solo 2% de devs saben esto).
- **Aprendizaje brutal**: Microservicios + Kafka + Kubernetes + CI/CD + observabilidad = perfil senior real.

---

## 📊 Estado Actual del Proyecto

| Componente | Progreso | Estado | Notas |
|------------|----------|--------|-------|
| **Infraestructura Terraform** | 100% | ✅ Completo | VPC, EKS, RDS, MSK, ElastiCache |
| **Helm Charts** | ~17% | 🚧 Parcial | Solo order-service |
| **order-service** | ~85% | 🚧 Casi listo | Código sólido, sin tests, auth JWT stub, precio hardcodeado |
| **auth-service** | ~45% | 🚧 Avanzando | Resolvers con lógica real (register/login con bcrypt+JWT), sin Redis blacklist |
| **restaurant-service** | ~45% | 🚧 Avanzando | CRUD completo con cache Redis, migraciones completas, sin auth en resolvers |
| **api-gateway** | ~10% | 🚧 Mínimo | 2 subgraphs activos (auth, restaurant), order-service comentado |
| **delivery-service** | 0% | 📋 Pendiente | No existe |
| **notification-service** | 0% | 📋 Pendiente | No existe |
| **CI/CD** | ~17% | 🚧 Parcial | Solo order-service (lint, test, build, security, deploy) |
| **Documentación** | ~50% | 🚧 Parcial | Faltan observabilidad, devops, runbooks, despliegue |
| **Tests** | 0% | 📋 Pendiente | Cero archivos de test |
| **Frontend** | 0% | 📋 Pendiente | No existe app React |

**Progreso Total: ~35%**

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
- [ ] **1.1.2** Crear `.env` desde `env.example` con valores locales
- [x] **1.1.3** Implementar GraphQL Subscriptions reales (Redis PubSub o `graphql-ws`) ✅ Redis PubSub implementado
- [x] **1.1.4** Implementar validación JWT real (middleware que decode token del header) ✅ Stub JWT implementado
- [ ] **1.1.5** Validar precios consultando restaurant-service antes de crear order
- [x] **1.1.6** Implementar idempotencia en eventos Kafka (tracking de event IDs en Redis) ✅ Idempotency service creada
- [ ] **1.1.7** Crear directorio `migrations/` y migrar de inline a `node-pg-migrate`
- [x] **1.1.8** Agregar endpoint `/metrics` para Prometheus ✅ prom-client configurado
- [x] **1.1.9** Agregar health check mejorado (verificar DB, Redis, Kafka) ✅ Health check implementado
- [x] **1.1.10** Manejo graceful de errores de conexión (reconnect logic) ✅ Graceful shutdown implementado

#### 1.2 auth-service — Completar (45% → 100%)

- [x] **1.2.1** Instalar dependencias: `cd services/auth-service && npm install` ✅
- [x] **1.2.2** Crear `env.example` con todas las variables necesarias ✅
- [x] **1.2.3** Crear migración de BD: tabla `users` (id, email, password_hash, role, created_at, updated_at) ✅ 001_create_users.js
- [x] **1.2.4** Implementar `register` mutation: ✅
  - [x] Validar email único ✅
  - [x] Hash password con bcrypt (salt rounds 12) ✅
  - [x] Insertar en PostgreSQL ✅
  - [x] Retornar user + token ✅
- [x] **1.2.5** Implementar `login` mutation: ✅
  - [x] Buscar user por email ✅
  - [x] Verificar password con bcrypt ✅
  - [x] Generar JWT token (con expiración) ✅
  - [x] Retornar AuthPayload ✅
- [x] **1.2.6** Implementar `me` query: ✅
  - [x] Validar JWT del header ✅
  - [x] Buscar user en DB ✅
  - [x] Retornar datos del usuario ✅
- [x] **1.2.7** Crear middleware de validación JWT (reutilizable para otros servicios) ✅
- [x] **1.2.8** Implementar refresh token flow ✅ refreshToken mutation implementada
- [ ] **1.2.9** Agregar Redis para session management / token blacklist
- [ ] **1.2.10** Agregar rate limiting en el endpoint de login
- [ ] **1.2.11** Agregar tests unitarios (registro, login, validación)
- [x] **1.2.12** Agregar Dockerfile multi-stage (siguiendo patrón de order-service) ✅

#### 1.3 restaurant-service — Crear desde cero (45% → 100%)

- [x] **1.3.1** Crear estructura del servicio (copiar esqueleto de order-service): ✅
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
  - [ ] `src/models/` (tipos inline)
  - [x] `src/utils/logger.ts` ✅
- [x] **1.3.2** Definir GraphQL schema: ✅
  - [x] Type `Restaurant` (id, name, description, address, rating, isOpen, cuisineType, ownerId) ✅
  - [x] Type `MenuItem` (id, restaurantId, name, description, price, isAvailable, category) ✅
  - [x] Query: `restaurants`, `restaurant(id)`, `menu(restaurantId)`, `menuItem(id)` ✅
  - [x] Mutation: `createRestaurant`, `updateRestaurant`, `createMenuItem`, `updateMenuItem` ✅
  - [x] Subscription: `restaurantStatusChanged` ✅ (stub)
- [x] **1.3.3** Implementar conexión a PostgreSQL (base: `restaurant_db`) ✅
- [x] **1.3.4** Crear migraciones: tablas `restaurants` y `menu_items` ✅ 001 + 002
- [x] **1.3.5** Implementar resolvers y service layer ✅
- [x] **1.3.6** Integrar Redis cache para menús populares y restaurantes abiertos ✅ cache-aside pattern
- [ ] **1.3.7** Integrar Kafka producer para eventos: `restaurant.created`, `menu.updated`
- [ ] **1.3.8** Implementar validación de owner (solo el dueño puede modificar su restaurante)
- [ ] **1.3.9** Endpoint `/health` + `/metrics` (health check básico sin /metrics)
- [ ] **1.3.10** Tests unitarios e integración
- [ ] **1.3.11** Helm chart para deployment

#### 1.4 api-gateway — Crear desde cero (10% → 100%)

- [x] **1.4.1** Crear estructura del proyecto: ✅
  - [x] `package.json` (dependencias: `@apollo/gateway`, `@apollo/server`, etc.) ✅
  - [x] `tsconfig.json` ✅
  - [x] `Dockerfile` ✅
  - [x] `Makefile` ✅
  - [x] `env.example` ✅
  - [x] `src/index.ts` ✅
- [x] **1.4.2** Implementar Apollo Federation v2: ✅ (parcial - 2 de 3+ subgraphs)
  - [x] Configurar gateway con service discovery ✅ IntrospectAndCompose
  - [x] Subgraphs: auth ✅, restaurant ✅, order (❌ comentado)
  - [ ] Manejo de errores de subgraphs caídos
- [x] **1.4.3** Implementar autenticación JWT: ✅ (básico)
  - [x] Middleware que valida token en cada request ✅
  - [ ] Pasar user context a todos los subgraphs
  - [ ] Manejo de tokens expirados
- [ ] **1.4.4** Implementar rate limiting:
  - [ ] Por usuario (usando Redis)
  - [ ] Por IP para requests no autenticados
  - [ ] Headers de rate limit en responses
- [ ] **1.4.5** Implementar GraphQL Subscriptions en el gateway:
  - [ ] WebSocket server
  - [ ] Forward subscriptions a los servicios correctos
- [ ] **1.4.6** Configurar CORS apropiadamente
- [x] **1.4.7** Logging estructurado (Winston) ✅
- [ ] **1.4.8** Health check y métricas (health check básico existe)
- [ ] **1.4.9** Tests
- [ ] **1.4.10** Helm chart

#### 1.5 docker-compose — Hacer funcional (80% → 100%)

- [x] **1.5.1** Actualizar docker-compose para que todos los servicios builden ✅ 4 servicios configurados
- [ ] **1.5.2** Agregar delivery-service al compose (placeholder por ahora)
- [ ] **1.5.3** Agregar notification-service al compose (placeholder por ahora)
- [ ] **1.5.4** Crear seed script para datos de prueba
- [ ] **1.5.5** Verificar que `docker-compose up` levanta todo sin errores

---

### FASE 2 — Eventos y Notificaciones (60% → 75%)

#### 2.1 delivery-service — Crear desde cero (0% → 100%)

- [ ] **2.1.1** Crear estructura del proyecto
- [ ] **2.1.2** Definir schema GraphQL:
  - [ ] Type `DeliveryPerson` (id, name, status, currentLocation, rating, vehicleType)
  - [ ] Type `Delivery` (id, orderId, deliveryPersonId, status, pickupTime, deliveryTime, location)
  - [ ] Query: `availableDrivers`, `deliveries`, `delivery(id)`
  - [ ] Mutation: `updateDriverStatus`, `assignDelivery`, `updateDeliveryStatus`
  - [ ] Subscription: `deliveryStatusChanged`, `driverAssigned`
- [ ] **2.1.3** Implementar **Kafka consumer** para evento `order.created`:
  - [ ] Consumir evento
  - [ ] Buscar repartidor disponible más cercano
  - [ ] Asignar delivery
  - [ ] Publicar evento `delivery.assigned`
- [ ] **2.1.4** Implementar Kafka consumer para `order.cancelled` → liberar delivery
- [ ] **2.1.5** Conexión a PostgreSQL (`delivery_db`)
- [ ] **2.1.6** Migraciones: tablas `delivery_people` y `deliveries`
- [ ] **2.1.7** Redis para geolocalización en tiempo real (GeoHash)
- [ ] **2.1.8** Simulación de mapa/mock de geolocalización
- [ ] **2.1.9** Health check + métricas
- [ ] **2.1.10** Tests
- [ ] **2.1.11** Helm chart

#### 2.2 notification-service — Crear desde cero (0% → 100%)

- [ ] **2.2.1** Crear estructura del proyecto
- [ ] **2.2.2** Definir schema GraphQL (para gestionar preferencias de notificación):
  - [ ] Type `NotificationPreference` (userId, email, sms, push)
  - [ ] Type `Notification` (id, userId, type, message, read, createdAt)
  - [ ] Query: `notifications(userId)`, `notificationPreferences(userId)`
  - [ ] Mutation: `updateNotificationPreferences`, `markNotificationRead`
  - [ ] Subscription: `newNotification`
- [ ] **2.2.3** Implementar Kafka consumers:
  - [ ] `order.created` → notificar al restaurante
  - [ ] `order.assigned` → notificar al cliente
  - [ ] `order.delivered` → notificar al cliente
  - [ ] `delivery.assigned` → notificar al repartidor
  - [ ] `order.cancelled` → notificar a todas las partes
- [ ] **2.2.4** Integrar proveedor de email (SendGrid, AWS SES, o mock)
- [ ] **2.2.5** Integrar proveedor de SMS (Twilio, o mock)
- [ ] **2.2.6** Implementar notificaciones push en tiempo real:
  - [ ] WebSocket server o Server-Sent Events (SSE)
  - [ ] GraphQL subscriptions para `newNotification`
- [ ] **2.2.7** PostgreSQL para historial de notificaciones
- [ ] **2.2.8** Health check + métricas
- [ ] **2.2.9** Tests
- [ ] **2.2.10** Helm chart

#### 2.3 Kafka — Setup completo

- [ ] **2.3.1** Crear tópicos explícitamente (no depender de auto-create):
  - [ ] `order.created`, `order.assigned`, `order.delivered`, `order.cancelled`
  - [ ] `delivery.assigned`, `delivery.status_changed`
  - [ ] `restaurant.created`, `menu.updated`
  - [ ] `notification.email`, `notification.sms`
- [ ] **2.3.2** Crear script de inicialización de tópicos
- [ ] **2.3.3** Configurar consumer groups con nombres descriptivos
- [ ] **2.3.4** Implementar dead letter queue para eventos fallidos
- [ ] **2.3.5** Implementar retry logic con backoff exponencial

---

### FASE 3 — Testing (75% → 85%)

- [ ] **3.1** order-service — Tests (unitarios, integración, E2E, 80% coverage)
- [ ] **3.2** auth-service — Tests (unitarios, integración, seguridad, E2E)
- [ ] **3.3** restaurant-service — Tests (unitarios, integración, Redis cache, E2E)
- [ ] **3.4** delivery-service — Tests (unitarios, Kafka consumer, asignación, E2E)
- [ ] **3.5** notification-service — Tests (unitarios, Kafka consumers, email/SMS mock, WebSocket)
- [ ] **3.6** api-gateway — Tests (federación GraphQL, JWT, rate limiting, resiliencia, E2E)
- [ ] **3.7** Tests de infraestructura (Terraform, Helm charts, Docker Compose)

---

### FASE 4 — Observabilidad (85% → 90%)

- [ ] **4.1** Métricas (Prometheus) — `prom-client` en cada servicio, dashboards Grafana
- [ ] **4.2** Logging — Formato JSON estructurado, correlation ID, Loki + Grafana
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

- [ ] **6.1** GitHub Actions — Workflows para todos los servicios (lint, test, build, push)
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

**Objetivo:** Ver un flujo completo funcionando en ~3 horas.

**Secuencia:**

1. **Completar Auth Service básico** (1 hora)
   - Instalar dependencias
   - Crear migración de tabla `users`
   - Implementar registro con bcrypt
   - Implementar login con JWT
   - Implementar query `me`

2. **Crear Restaurant Service mínimo** (1 hora)
   - Copiar estructura de order-service
   - Implementar CRUD básico de restaurantes
   - Implementar gestión de menús
   - Integrar cache Redis

3. **API Gateway básico** (1 hora)
   - Crear estructura del gateway
   - Implementar Apollo Federation v2
   - Conectar auth-service, restaurant-service, order-service
   - Implementar autenticación JWT básica

4. **Probar flujo completo** (15 min)
   - Registro → Login → Crear restaurante → Crear pedido

**Total:** ~3 horas para un MVP funcional

---

## 📋 Alternativas de Inicio

| Opción | Qué hace | Tiempo | Complejidad |
|--------|----------|--------|-------------|
| **A) Auth Service** | Completar autenticación | 2-3 horas | Media |
| **B) Restaurant Service** | Crear servicio desde cero | 3-4 horas | Media |
| **C) Instalar dependencias** | Preparar todos los servicios | 1 hora | Baja |
| **D) API Gateway** | Unificar servicios | 4-5 horas | Alta |
| **E) MVP Rápido** ⭐ | Auth + Restaurant + Gateway básico | ~3 horas | Media |

**Recomendación:** Opción E para ver resultados rápido y mantener motivación.

---

## 🎓 Comandos Make Estándar

Cada servicio debe implementar:

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
2. **Costos AWS**: Los recursos creados tienen costos. Revisar pricing
3. **Escalabilidad**: Ajustar HPA y recursos según necesidades
4. **Monitoreo**: Implementar dashboards de Grafana y alertas
5. **Disciplina**: Un checkbox a la vez se construyen los proyectos que importan

---

## 📈 Progreso por Fase

| Fase | Tareas | Completadas | Pendientes | Progreso |
|------|--------|-------------|------------|----------|
| 1. Servicios Core | 69 | 34 | 35 | ~49% |
| 2. Eventos y Notificaciones | 35 | 0 | 35 | 0% |
| 3. Testing | 33 | 0 | 33 | 0% |
| 4. Observabilidad | 20 | 0 | 20 | 0% |
| 5. Seguridad | 16 | 0 | 16 | 0% |
| 6. CI/CD | 16 | 5 | 11 | ~31% |
| 7. Documentación | 14 | 6 | 8 | ~43% |
| 8. Frontend | 26 | 0 | 26 | 0% |
| 9. Producción | 13 | 0 | 13 | 0% |
| **TOTAL** | **242** | **45** | **197** | **~35%** |

---

> **Nota:** Este es un documento vivo. Se actualiza conforme avanza el proyecto.
> Estimación total: **4-6 semanas** de desarrollo activo.
>
> *"Los proyectos grandes no se hacen por inspiración. Se hacen por disciplina, un commit a la vez."*
>
> 🔥 **¿Listo para empezar? Vamos con el MVP.**
