# Diagrama de Contexto C4

## Descripción

El diagrama de contexto muestra el sistema de pedidos en tiempo real y sus interacciones con usuarios externos y sistemas externos.

## Diagrama Mermaid

```mermaid
C4Context
    title Diagrama de Contexto - Plataforma de Pedidos en Tiempo Real

    Person(customer, "Cliente", "Usuario que realiza pedidos de comida")
    Person(restaurant_owner, "Dueño de Restaurante", "Gestiona restaurante y recibe pedidos")
    Person(delivery_person, "Repartidor", "Entrega pedidos a clientes")
    
    System(platform, "Plataforma de Pedidos", "Sistema que permite realizar pedidos de comida en tiempo real")
    
    System_Ext(payment_gateway, "Pasarela de Pago", "Procesa pagos de pedidos")
    System_Ext(maps_service, "Servicio de Mapas", "Proporciona geolocalización y rutas")
    System_Ext(sms_provider, "Proveedor SMS", "Envía notificaciones SMS")
    System_Ext(email_provider, "Proveedor Email", "Envía notificaciones por email")
    
    Rel(customer, platform, "Realiza pedidos", "GraphQL")
    Rel(restaurant_owner, platform, "Gestiona restaurante y recibe pedidos", "GraphQL")
    Rel(delivery_person, platform, "Ve y acepta pedidos", "GraphQL")
    
    Rel(platform, payment_gateway, "Procesa pagos", "REST API")
    Rel(platform, maps_service, "Obtiene rutas y ubicaciones", "REST API")
    Rel(platform, sms_provider, "Envía notificaciones SMS", "REST API")
    Rel(platform, email_provider, "Envía notificaciones email", "SMTP")
    
    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Descripción de Actores

### Usuarios

- **Cliente**: Usuario final que realiza pedidos de comida a través de la aplicación móvil o web.
- **Dueño de Restaurante**: Gestiona su restaurante, actualiza menús y recibe notificaciones de nuevos pedidos.
- **Repartidor**: Ve pedidos disponibles y acepta entregas.

### Sistemas Externos

- **Pasarela de Pago**: Procesa transacciones de pago de forma segura.
- **Servicio de Mapas**: Proporciona geolocalización, cálculo de rutas y estimaciones de tiempo.
- **Proveedor SMS**: Envía notificaciones SMS a usuarios.
- **Proveedor Email**: Envía notificaciones por correo electrónico.

## Flujos Principales

1. **Cliente realiza pedido**: El cliente selecciona productos, realiza el pedido a través de GraphQL, y el sistema procesa el pago.
2. **Restaurante recibe pedido**: El restaurante recibe una notificación en tiempo real del nuevo pedido.
3. **Asignación de repartidor**: Los repartidores disponibles ven el pedido y pueden aceptarlo.
4. **Seguimiento en tiempo real**: Todos los actores pueden seguir el estado del pedido en tiempo real.

