# Plataforma de Pedidos en Tiempo Real
## Entregable 1 — Definición del Problema y Diseño de Arquitectura

**Fecha:** Abril 2026  
**Alumno:** brixxdd  
**Período:** 08 – 13 Abril 2026

---

## 1. Definición del Problema

### 1.1 Contexto

El comercio de alimentos a domicilio en ciudades intermedias de México —como Tapachula, Chiapas— carece de plataformas digitales locales que ofrezcan seguimiento en tiempo real, integración con negocios locales y una experiencia comparable a Uber Eats o Rappi. Los restaurantes dependen de llamadas telefónicas y mensajería informal, generando demoras, pedidos perdidos y clientes insatisfechos.

### 1.2 Problema Central

**¿Cómo construir una plataforma de pedidos distribuida, escalable y en tiempo real que conecte clientes, restaurantes y repartidores de forma confiable?**

Problemas específicos que se resuelven:

| Problema | Impacto |
|----------|---------|
| Sin seguimiento en tiempo real del pedido | Clientes sin visibilidad generan llamadas de soporte |
| Gestión manual de menús y disponibilidad | Pedidos de items agotados, cancelaciones frecuentes |
| Sin asignación automática de repartidores | Demoras, pedidos sin atender |
| Sin notificaciones automáticas | Restaurantes y repartidores desinformados |
| Sistemas monolíticos frágiles | Un fallo tumba toda la operación |

### 1.3 Solución Propuesta

Una **plataforma cloud-native distribuida** basada en microservicios con:
- API GraphQL federada como punto único de acceso
- Eventos asíncronos vía Apache Kafka para desacoplar servicios
- Seguimiento en tiempo real con WebSocket + GraphQL Subscriptions
- Observabilidad completa (métricas, logs, trazas)

---

## 2. Requerimientos del Sistema

### 2.1 Requerimientos Funcionales

#### RF-01 Autenticación y Autorización
- RF-01.1: Registro de usuario con email y contraseña (bcrypt, salt 12)
- RF-01.2: Login con JWT (access token 1h + refresh token 7d)
- RF-01.3: Logout con blacklist Redis
- RF-01.4: RBAC: roles CUSTOMER, RESTAURANT_OWNER, DELIVERY_PERSON, ADMIN
- RF-01.5: Rate limiting: máx. 5 intentos de login por IP/15 min

#### RF-02 Gestión de Restaurantes
- RF-02.1: CRUD de restaurantes (solo el propietario puede modificar el suyo)
- RF-02.2: CRUD de ítems del menú con precio y disponibilidad
- RF-02.3: Cache de menús populares en Redis (TTL configurable)
- RF-02.4: Búsqueda por tipo de cocina y estado (abierto/cerrado)

#### RF-03 Gestión de Pedidos
- RF-03.1: Crear pedido — valida precios con restaurant-service en tiempo real
- RF-03.2: Ciclo de vida: PENDING → CONFIRMED → PREPARING → READY → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED
- RF-03.3: Cancelación de pedido
- RF-03.4: Seguimiento en tiempo real vía GraphQL Subscription

#### RF-04 Gestión de Entregas
- RF-04.1: Asignación automática de repartidor disponible al recibir evento `order.created`
- RF-04.2: Actualización de estado de entrega y ubicación del repartidor
- RF-04.3: Liberación de repartidor al cancelar pedido

#### RF-05 Notificaciones
- RF-05.1: Notificación al cliente al crear pedido, asignar repartidor, entregar y cancelar
- RF-05.2: Notificación al repartidor al ser asignado a un pedido
- RF-05.3: Historial de notificaciones por usuario
- RF-05.4: Preferencias de notificación (email, SMS, push)

### 2.2 Requerimientos No Funcionales

| ID | Requerimiento | Métrica |
|----|--------------|---------|
| RNF-01 | Disponibilidad | 99.9% uptime (< 8.7 h/año downtime) |
| RNF-02 | Latencia | P95 < 200ms en operaciones de lectura |
| RNF-03 | Escalabilidad | Horizontal vía Kubernetes HPA |
| RNF-04 | Seguridad | JWT firmado, bcrypt, rate limiting, secrets en K8s Secrets |
| RNF-05 | Observabilidad | Métricas Prometheus, logs estructurados JSON, trazas distribuidas |
| RNF-06 | Resiliencia | Graceful degradation si Kafka no disponible; circuit breaker por servicio |
| RNF-07 | Idempotencia | Eventos Kafka con deduplicación vía Redis (event ID tracking) |

---

## 3. Arquitectura Propuesta

### 3.1 Estilo Arquitectónico

**Microservicios con Event-Driven Architecture (EDA)**

- Cada servicio tiene su propia base de datos (Database per Service pattern)
- Comunicación sincrónica vía GraphQL (Federation v2)
- Comunicación asincrónica vía Apache Kafka
- API Gateway como único punto de entrada externo

### 3.2 Diagrama de Arquitectura

```mermaid
graph TB
    subgraph Clients["Clientes"]
        WEB["React Web App\n(Apollo Client)"]
        MOB["Mobile App\n(futuro)"]
    end

    subgraph Gateway["API Gateway — Puerto 4000"]
        GW["Apollo Federation Gateway\nJWT Auth · Rate Limiting\nWebSocket Proxy · CORS"]
    end

    subgraph Services["Microservicios"]
        AUTH["auth-service\n:3002\nPostgreSQL auth_db"]
        REST["restaurant-service\n:3001\nPostgreSQL restaurant_db\nRedis Cache"]
        ORD["order-service\n:3000\nPostgreSQL order_db"]
        DEL["delivery-service\n:3003\nPostgreSQL delivery_db"]
        NOT["notification-service\n:3004\nPostgreSQL notification_db"]
    end

    subgraph Infra["Infraestructura"]
        KAFKA["Apache Kafka\nEvent Bus\n10 topics + 3 DLQs"]
        REDIS["Redis\nCache · PubSub\nSession Blacklist\nRate Limiting"]
        PG["PostgreSQL\n5 bases de datos\naisladas"]
    end

    subgraph Observability["Observabilidad"]
        PROM["Prometheus\n/metrics en cada servicio"]
        GRAF["Grafana\nDashboards"]
    end

    WEB -->|"GraphQL HTTPS\nWebSocket WSS"| GW
    MOB -->|"GraphQL HTTPS"| GW

    GW -->|"Federation"| AUTH
    GW -->|"Federation"| REST
    GW -->|"Federation"| ORD
    GW -->|"Federation"| DEL
    GW -->|"Federation"| NOT

    ORD -->|"order.created\norder.cancelled\norder.delivered"| KAFKA
    REST -->|"restaurant.created\nmenu.updated"| KAFKA
    DEL -->|"delivery.assigned"| KAFKA

    KAFKA -->|"order.created"| DEL
    KAFKA -->|"order.cancelled"| DEL
    KAFKA -->|"order.created\norder.assigned\norder.delivered\norder.cancelled\ndelivery.assigned"| NOT

    AUTH --- REDIS
    REST --- REDIS
    ORD --- REDIS
    DEL --- REDIS
    NOT --- REDIS

    AUTH --- PG
    REST --- PG
    ORD --- PG
    DEL --- PG
    NOT --- PG

    AUTH --- PROM
    REST --- PROM
    ORD --- PROM
    DEL --- PROM
    NOT --- PROM
    PROM --- GRAF

    style Gateway fill:#1a365d,color:#fff
    style Services fill:#2d3748,color:#fff
    style Infra fill:#744210,color:#fff
    style Observability fill:#1a4731,color:#fff
    style Clients fill:#44337a,color:#fff
```

### 3.3 Flujo de un Pedido (Secuencia de Eventos)

```mermaid
sequenceDiagram
    actor Cliente
    participant GW as API Gateway
    participant OS as order-service
    participant RS as restaurant-service
    participant Kafka
    participant DS as delivery-service
    participant NS as notification-service

    Cliente->>GW: mutation createOrder(items, address)
    GW->>OS: GraphQL (con JWT context)
    OS->>RS: HTTP — fetchMenuItemPrices(menuItemIds)
    RS-->>OS: { id, price, isAvailable }
    OS->>OS: Valida precios y disponibilidad
    OS->>OS: Persiste pedido en order_db
    OS->>Kafka: Publica order.created
    OS-->>GW: Order { id, status: PENDING }
    GW-->>Cliente: Order creado ✓

    Kafka->>DS: Consume order.created
    DS->>DS: Busca driver AVAILABLE
    DS->>DS: Crea Delivery, driver → BUSY
    DS->>Kafka: Publica delivery.assigned
    DS-->>Cliente: Subscription driverAssigned (WebSocket)

    Kafka->>NS: Consume order.created
    NS->>NS: Crea notificación → cliente
    NS-->>Cliente: Subscription newNotification (WebSocket)

    Kafka->>NS: Consume delivery.assigned
    NS->>NS: Crea notificación → repartidor
```

### 3.4 Componentes del Sistema

| Componente | Responsabilidad | Puerto |
|-----------|----------------|--------|
| **api-gateway** | Punto único de entrada, JWT, rate limiting, WS proxy | 4000 |
| **auth-service** | Registro, login, JWT, blacklist, refresh tokens | 3002 |
| **restaurant-service** | CRUD restaurantes y menús, cache Redis | 3001 |
| **order-service** | Ciclo de vida de pedidos, subscriptions, Kafka producer | 3000 |
| **delivery-service** | Asignación de repartidores, Kafka consumer | 3003 |
| **notification-service** | Notificaciones multi-canal, Kafka consumer | 3004 |

---

## 4. Tecnologías a Utilizar

### 4.1 Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Frontend** | React 18 + TypeScript + Apollo Client | Componentes reactivos, GraphQL integrado nativamente |
| **API** | GraphQL (Apollo Federation v2) | API unificada, cada servicio expone su subgraph |
| **Backend** | Node.js 20 + TypeScript (strict) | Tipado fuerte, ecosistema maduro para microservicios |
| **Base de datos** | PostgreSQL 15 | ACID, JSONB para datos semiestructurados, UUID |
| **Cache** | Redis 7 | Cache aside, PubSub para subscriptions, blacklist JWT |
| **Mensajería** | Apache Kafka 3.5 | Alta throughput, durabilidad de eventos, consumer groups |
| **Contenedores** | Docker + Kubernetes (EKS) | Orquestación, auto-scaling, rolling deployments |
| **Infraestructura** | Terraform (AWS: EKS, RDS, MSK, ElastiCache) | IaC reproducible |
| **Observabilidad** | Prometheus + Grafana + Winston | Métricas, alertas, logs estructurados JSON |
| **CI/CD** | GitHub Actions + ArgoCD | Pipeline automatizado, GitOps |
| **Helm** | Helm 3 | Templates K8s parametrizables por servicio |

### 4.2 Patrones Arquitectónicos

- **Database per Service** — aislamiento total de datos entre servicios
- **Event Sourcing parcial** — estado del pedido reconstruible desde eventos Kafka
- **Cache-Aside** — Redis como capa de caché en restaurant-service y order-service
- **Saga (coreografía)** — transacciones distribuidas vía eventos (sin coordinador central)
- **Idempotent Consumer** — deduplicación de eventos con Redis SET NX
- **Dead Letter Queue** — eventos fallidos a topics `.dlq` para reproceso manual

---

## 5. Modelo de Datos

### 5.1 Diagrama Entidad-Relación

```mermaid
erDiagram
    %% auth_db
    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar role
        varchar name
        timestamp created_at
        timestamp updated_at
    }

    %% restaurant_db
    RESTAURANTS {
        uuid id PK
        varchar name
        text description
        varchar address
        varchar phone
        varchar cuisine_type
        uuid owner_id FK
        boolean is_open
        float rating
        timestamp created_at
        timestamp updated_at
    }

    MENU_ITEMS {
        uuid id PK
        uuid restaurant_id FK
        varchar name
        text description
        numeric price
        boolean is_available
        varchar category
        timestamp created_at
        timestamp updated_at
    }

    %% order_db
    ORDERS {
        uuid id PK
        uuid customer_id FK
        uuid restaurant_id FK
        varchar status
        decimal total_amount
        jsonb delivery_address
        uuid delivery_person_id
        integer estimated_delivery_time
        timestamp created_at
        timestamp updated_at
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid menu_item_id FK
        integer quantity
        decimal price
        decimal subtotal
        timestamp created_at
    }

    %% delivery_db
    DELIVERY_PEOPLE {
        uuid id PK
        varchar name
        varchar status
        jsonb current_location
        float rating
        varchar vehicle_type
        timestamp created_at
        timestamp updated_at
    }

    DELIVERIES {
        uuid id PK
        uuid order_id UK
        uuid delivery_person_id FK
        varchar status
        timestamp pickup_time
        timestamp delivery_time
        jsonb current_location
        timestamp created_at
        timestamp updated_at
    }

    %% notification_db
    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        varchar type
        varchar title
        text message
        boolean read
        jsonb metadata
        timestamp created_at
    }

    NOTIFICATION_PREFERENCES {
        uuid user_id PK
        boolean email_enabled
        boolean sms_enabled
        boolean push_enabled
        timestamp updated_at
    }

    USERS ||--o{ RESTAURANTS : "es propietario de"
    RESTAURANTS ||--o{ MENU_ITEMS : "tiene"
    ORDERS ||--o{ ORDER_ITEMS : "contiene"
    MENU_ITEMS ||--o{ ORDER_ITEMS : "referenciado en"
    DELIVERY_PEOPLE ||--o{ DELIVERIES : "realiza"
    USERS ||--o{ NOTIFICATIONS : "recibe"
    USERS ||--o| NOTIFICATION_PREFERENCES : "configura"
```

### 5.2 Descripción de Bases de Datos

| Base de Datos | Servicio | Tablas Principales |
|--------------|---------|-------------------|
| `auth_db` | auth-service | `users` |
| `restaurant_db` | restaurant-service | `restaurants`, `menu_items` |
| `order_db` | order-service | `orders`, `order_items` |
| `delivery_db` | delivery-service | `delivery_people`, `deliveries` |
| `notification_db` | notification-service | `notifications`, `notification_preferences` |

### 5.3 Decisiones de Diseño del Modelo

- **UUID como PK** — evita colisiones en entornos distribuidos, no expone secuencias
- **JSONB para datos semiestructurados** — `delivery_address`, `current_location`, `metadata` son flexibles por naturaleza
- **Bases de datos aisladas** — ningún servicio accede a la BD de otro; comunicación solo vía API o eventos
- **`order_id` UNIQUE en `deliveries`** — un pedido tiene exactamente una entrega activa
- **`pgmigrations` por BD** — cada servicio gestiona sus propias migraciones con node-pg-migrate

---

## 6. Conclusiones

La plataforma propuesta resuelve el problema de gestión de pedidos en tiempo real mediante:

1. **Desacoplamiento total** entre servicios vía Kafka — si el delivery-service falla, los pedidos siguen creándose
2. **Escalabilidad horizontal** — cada microservicio escala independientemente según su carga (HPA en K8s)
3. **Tiempo real nativo** — GraphQL Subscriptions sobre WebSocket en todos los servicios con estado dinámico
4. **Resiliencia** — DLQs para eventos fallidos, graceful shutdown, rate limiting, token blacklist
5. **Portafolio diferenciador** — arquitectura de nivel Mid/Senior que demuestra dominio de sistemas distribuidos en producción

---

*Documento generado como parte del proyecto académico de la plataforma de pedidos en tiempo real.*
