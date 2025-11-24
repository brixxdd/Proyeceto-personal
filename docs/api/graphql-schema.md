# GraphQL Schema - Especificación Completa

## Introducción

Este documento describe el schema GraphQL completo de la Plataforma de Pedidos en Tiempo Real. El schema está diseñado siguiendo las mejores prácticas de GraphQL y permite operaciones de lectura (queries), escritura (mutations) y suscripciones en tiempo real.

## Endpoint

```
http://localhost:4000/graphql
```

## Tipos Principales

### User

Representa un usuario del sistema (cliente, dueño de restaurante, repartidor).

```graphql
type User {
  id: ID!
  email: String!
  name: String!
  phone: String
  role: UserRole!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum UserRole {
  CUSTOMER
  RESTAURANT_OWNER
  DELIVERY_PERSON
  ADMIN
}
```

### Restaurant

Representa un restaurante en la plataforma.

```graphql
type Restaurant {
  id: ID!
  name: String!
  description: String
  address: Address!
  phone: String!
  email: String
  cuisineType: String!
  rating: Float
  isActive: Boolean!
  owner: User!
  menu: [MenuItem!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### Order

Representa un pedido realizado por un cliente.

```graphql
type Order {
  id: ID!
  customer: User!
  restaurant: Restaurant!
  items: [OrderItem!]!
  status: OrderStatus!
  totalAmount: Float!
  deliveryAddress: Address!
  deliveryPerson: DeliveryPerson
  estimatedDeliveryTime: Int
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  READY
  ASSIGNED
  PICKED_UP
  IN_TRANSIT
  DELIVERED
  CANCELLED
}
```

## Queries

### Obtener información del usuario actual

```graphql
query {
  me {
    id
    email
    name
    role
  }
}
```

### Listar restaurantes

```graphql
query {
  restaurants(city: "Madrid", cuisineType: "Italian", limit: 10) {
    id
    name
    description
    rating
    address {
      street
      city
    }
  }
}
```

### Obtener un pedido

```graphql
query {
  order(id: "order-123") {
    id
    status
    totalAmount
    items {
      menuItem {
        name
        price
      }
      quantity
    }
  }
}
```

## Mutations

### Crear pedido

```graphql
mutation {
  createOrder(input: {
    restaurantId: "rest-123"
    items: [
      { menuItemId: "item-1", quantity: 2 }
      { menuItemId: "item-2", quantity: 1 }
    ]
    deliveryAddress: {
      street: "Calle Principal 123"
      city: "Madrid"
      state: "Madrid"
      zipCode: "28001"
      country: "España"
    }
  }) {
    id
    status
    totalAmount
  }
}
```

### Actualizar estado de pedido

```graphql
mutation {
  updateOrderStatus(id: "order-123", status: PREPARING) {
    id
    status
    updatedAt
  }
}
```

## Subscriptions

### Suscripción a cambios de estado de pedido

```graphql
subscription {
  orderStatusChanged(orderId: "order-123") {
    id
    status
    estimatedDeliveryTime
  }
}
```

### Suscripción a nuevos pedidos (para restaurantes)

```graphql
subscription {
  newOrder(restaurantId: "rest-123") {
    id
    customer {
      name
      phone
    }
    items {
      menuItem {
        name
      }
      quantity
    }
    totalAmount
  }
}
```

## Ejemplos de Uso

Ver [Ejemplos de API](examples.md) para más casos de uso completos.

