# Diagrama de Contenedores C4

## Descripción

El diagrama de contenedores muestra los microservicios principales y cómo interactúan entre sí.

## Diagrama Mermaid

```mermaid
C4Container
    title Diagrama de Contenedores - Plataforma de Pedidos

    Person(customer, "Cliente")
    Person(restaurant_owner, "Dueño de Restaurante")
    Person(delivery_person, "Repartidor")
    
    System_Boundary(platform, "Plataforma de Pedidos") {
        Container(api_gateway, "API Gateway", "GraphQL Gateway", "Consolida queries y mutations de todos los servicios")
        Container(auth_service, "Auth Service", "Node.js/Go", "Autenticación y autorización JWT")
        Container(restaurant_service, "Restaurant Service", "Node.js/Go", "Gestión de restaurantes y menús")
        Container(order_service, "Order Service", "Node.js/Go", "Gestión del ciclo de vida de pedidos")
        Container(delivery_service, "Delivery Service", "Node.js/Go", "Asignación y seguimiento de repartidores")
        Container(notification_service, "Notification Service", "Node.js/Go", "Notificaciones push, SMS, email")
        
        ContainerDb(postgres_auth, "PostgreSQL", "Base de datos", "Usuarios y tokens")
        ContainerDb(postgres_restaurant, "PostgreSQL", "Base de datos", "Restaurantes y menús")
        ContainerDb(postgres_order, "PostgreSQL", "Base de datos", "Pedidos")
        ContainerDb(postgres_delivery, "PostgreSQL", "Base de datos", "Repartidores y asignaciones")
        
        Container(redis, "Redis", "Cache", "Cache de pedidos recientes, menús, sesiones")
        Container(kafka, "Apache Kafka", "Event Streaming", "Eventos: order.created, order.assigned, order.delivered")
    }
    
    System_Ext(payment_gateway, "Pasarela de Pago")
    System_Ext(maps_service, "Servicio de Mapas")
    System_Ext(sms_provider, "Proveedor SMS")
    System_Ext(email_provider, "Proveedor Email")
    
    Rel(customer, api_gateway, "GraphQL Queries/Mutations")
    Rel(restaurant_owner, api_gateway, "GraphQL Queries/Mutations")
    Rel(delivery_person, api_gateway, "GraphQL Queries/Subscriptions")
    
    Rel(api_gateway, auth_service, "Autenticación", "gRPC/REST")
    Rel(api_gateway, restaurant_service, "Datos de restaurantes", "gRPC/REST")
    Rel(api_gateway, order_service, "Gestión de pedidos", "gRPC/REST")
    Rel(api_gateway, delivery_service, "Datos de repartidores", "gRPC/REST")
    
    Rel(auth_service, postgres_auth, "Lee/Escribe")
    Rel(restaurant_service, postgres_restaurant, "Lee/Escribe")
    Rel(order_service, postgres_order, "Lee/Escribe")
    Rel(delivery_service, postgres_delivery, "Lee/Escribe")
    
    Rel(order_service, redis, "Cache de pedidos")
    Rel(restaurant_service, redis, "Cache de menús")
    
    Rel(order_service, kafka, "Publica eventos")
    Rel(delivery_service, kafka, "Consume/Publica eventos")
    Rel(notification_service, kafka, "Consume eventos")
    
    Rel(notification_service, sms_provider, "Envía SMS")
    Rel(notification_service, email_provider, "Envía Email")
    Rel(notification_service, customer, "Push Notifications")
    
    Rel(order_service, payment_gateway, "Procesa pago")
    Rel(delivery_service, maps_service, "Obtiene rutas")
    
    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Descripción de Contenedores

### API Gateway
- Punto de entrada único para todas las peticiones GraphQL
- Consolida schemas de todos los microservicios
- Maneja autenticación y rate limiting

### Microservicios

1. **Auth Service**: Gestiona autenticación, autorización y tokens JWT
2. **Restaurant Service**: CRUD de restaurantes, menús y productos
3. **Order Service**: Ciclo de vida completo de pedidos (creación, asignación, entrega)
4. **Delivery Service**: Gestión de repartidores y asignación de pedidos
5. **Notification Service**: Envía notificaciones a través de múltiples canales

### Almacenamiento

- **PostgreSQL**: Una base de datos por microservicio (patrón Database per Service)
- **Redis**: Cache distribuido para mejorar latencia
- **Kafka**: Event streaming para comunicación asíncrona entre servicios

## Patrones de Comunicación

- **Síncrona**: API Gateway → Microservicios (gRPC/REST)
- **Asíncrona**: Eventos Kafka entre microservicios
- **Tiempo Real**: GraphQL Subscriptions para actualizaciones en vivo

