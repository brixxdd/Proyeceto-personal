# Visión General de la Arquitectura

## Introducción

La Plataforma de Pedidos en Tiempo Real está diseñada siguiendo principios de arquitectura cloud-native y microservicios, permitiendo escalabilidad horizontal, alta disponibilidad y desarrollo independiente de cada componente.

## Principios de Diseño

### 1. Microservicios
Cada servicio es independiente, con su propia base de datos y puede ser desplegado y escalado de forma autónoma.

### 2. Event-Driven Architecture
La comunicación entre servicios se realiza principalmente mediante eventos asíncronos usando Apache Kafka.

### 3. API Gateway Pattern
Un único punto de entrada GraphQL que consolida todos los microservicios.

### 4. Database per Service
Cada microservicio tiene su propia base de datos PostgreSQL, evitando acoplamiento.

### 5. Caching Strategy
Redis se utiliza para cachear datos frecuentemente accedidos como menús y pedidos recientes.

## Componentes Principales

### API Gateway
- **Responsabilidad**: Punto de entrada único, autenticación, rate limiting
- **Tecnología**: Node.js con Apollo Server
- **Comunicación**: gRPC/REST con microservicios

### Auth Service
- **Responsabilidad**: Autenticación JWT, autorización, gestión de usuarios
- **Base de datos**: PostgreSQL (auth_db)
- **Eventos**: Publica eventos de autenticación

### Restaurant Service
- **Responsabilidad**: CRUD de restaurantes, menús y productos
- **Base de datos**: PostgreSQL (restaurant_db)
- **Cache**: Redis para menús populares

### Order Service
- **Responsabilidad**: Ciclo de vida completo de pedidos
- **Base de datos**: PostgreSQL (order_db)
- **Eventos**: Publica `order.created`, `order.assigned`, `order.delivered`
- **Cache**: Redis para pedidos recientes (TTL)

### Delivery Service
- **Responsabilidad**: Gestión de repartidores, asignación de pedidos
- **Base de datos**: PostgreSQL (delivery_db)
- **Eventos**: Consume `order.created`, publica `order.assigned`

### Notification Service
- **Responsabilidad**: Notificaciones push, SMS, email
- **Eventos**: Consume eventos de pedidos y envía notificaciones

## Flujo de Datos

### Creación de Pedido

1. Cliente realiza mutation `createOrder` vía API Gateway
2. API Gateway valida autenticación y enruta a Order Service
3. Order Service:
   - Crea pedido en PostgreSQL
   - Guarda en Redis con TTL
   - Publica evento `order.created` en Kafka
4. Delivery Service consume evento y busca repartidores disponibles
5. Notification Service consume evento y envía notificación al restaurante

### Asignación de Repartidor

1. Repartidor acepta pedido vía GraphQL subscription
2. Delivery Service actualiza estado
3. Publica evento `order.assigned` en Kafka
4. Order Service actualiza estado del pedido
5. Notification Service envía notificaciones a cliente y restaurante

## Patrones de Comunicación

### Síncrona
- API Gateway ↔ Microservicios (gRPC/REST)
- Cliente ↔ API Gateway (GraphQL)

### Asíncrona
- Microservicios ↔ Kafka (Eventos)
- Microservicios ↔ Redis (Cache)

### Tiempo Real
- Cliente ↔ API Gateway (GraphQL Subscriptions)

## Escalabilidad

- **Horizontal**: Cada servicio puede escalarse independientemente
- **Auto-scaling**: HPA configurado en Kubernetes basado en CPU/Memoria
- **Load Balancing**: Kubernetes Service con múltiples pods

## Seguridad

- **Autenticación**: JWT tokens
- **Autorización**: RBAC por servicio
- **Encriptación**: TLS en tránsito, encriptación en reposo
- **Network Policies**: Kubernetes NetworkPolicies para aislar servicios

## Observabilidad

- **Métricas**: Prometheus + Grafana
- **Logs**: Logs estructurados (JSON) → CloudWatch/ELK
- **Tracing**: Distributed tracing con OpenTelemetry
- **Health Checks**: Liveness y readiness probes en cada servicio

