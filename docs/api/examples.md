# Ejemplos de Uso de la API GraphQL

## Autenticación

### Registro de usuario

```graphql
mutation {
  register(
    email: "cliente@example.com"
    password: "securePassword123"
    name: "Juan Pérez"
    phone: "+34612345678"
    role: CUSTOMER
  ) {
    token
    user {
      id
      email
      name
    }
  }
}
```

### Login

```graphql
mutation {
  login(
    email: "cliente@example.com"
    password: "securePassword123"
  ) {
    token
    user {
      id
      email
      name
      role
    }
  }
}
```

## Gestión de Restaurantes

### Crear restaurante

```graphql
mutation {
  createRestaurant(input: {
    name: "Pizzeria Italiana"
    description: "Auténtica pizza italiana"
    address: {
      street: "Calle Gran Vía 45"
      city: "Madrid"
      state: "Madrid"
      zipCode: "28013"
      country: "España"
      coordinates: {
        latitude: 40.4168
        longitude: -3.7038
      }
    }
    phone: "+34912345678"
    email: "info@pizzeriaitaliana.com"
    cuisineType: "Italian"
  }) {
    id
    name
    address {
      city
    }
  }
}
```

### Agregar item al menú

```graphql
mutation {
  createMenuItem(
    restaurantId: "rest-123"
    input: {
      name: "Pizza Margherita"
      description: "Tomate, mozzarella y albahaca"
      price: 12.50
      category: "Pizzas"
      imageUrl: "https://example.com/margherita.jpg"
    }
  ) {
    id
    name
    price
  }
}
```

## Gestión de Pedidos

### Flujo completo de pedido

#### 1. Cliente crea pedido

```graphql
mutation {
  createOrder(input: {
    restaurantId: "rest-123"
    items: [
      { menuItemId: "item-1", quantity: 2 }
      { menuItemId: "item-2", quantity: 1 }
    ]
    deliveryAddress: {
      street: "Avenida de la Paz 10"
      city: "Madrid"
      state: "Madrid"
      zipCode: "28028"
      country: "España"
      coordinates: {
        latitude: 40.4378
        longitude: -3.6795
      }
    }
  }) {
    id
    status
    totalAmount
    estimatedDeliveryTime
  }
}
```

#### 2. Cliente se suscribe a cambios de estado

```graphql
subscription {
  orderStatusChanged(orderId: "order-123") {
    id
    status
    estimatedDeliveryTime
    deliveryPerson {
      user {
        name
        phone
      }
      vehicleType
    }
  }
}
```

#### 3. Restaurante se suscribe a nuevos pedidos

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
        price
      }
      quantity
      subtotal
    }
    totalAmount
    deliveryAddress {
      street
      city
    }
  }
}
```

#### 4. Restaurante actualiza estado

```graphql
mutation {
  updateOrderStatus(id: "order-123", status: PREPARING) {
    id
    status
    updatedAt
  }
}
```

#### 5. Repartidor acepta pedido

```graphql
mutation {
  acceptOrder(orderId: "order-123") {
    id
    status
    deliveryPerson {
      user {
        name
      }
    }
  }
}
```

## Gestión de Repartidores

### Actualizar ubicación

```graphql
mutation {
  updateDeliveryPersonLocation(
    latitude: 40.4168
    longitude: -3.7038
  ) {
    id
    currentLocation {
      latitude
      longitude
    }
    isAvailable
  }
}
```

### Ver pedidos disponibles

```graphql
subscription {
  availableOrders {
    id
    restaurant {
      name
      address {
        street
        city
      }
    }
    deliveryAddress {
      street
      city
      coordinates {
        latitude
        longitude
      }
    }
    totalAmount
    estimatedDeliveryTime
  }
}
```

## Consultas Avanzadas

### Listar pedidos con filtros

```graphql
query {
  orders(status: PENDING, limit: 20, offset: 0) {
    id
    status
    restaurant {
      name
    }
    customer {
      name
    }
    totalAmount
    createdAt
  }
}
```

### Buscar restaurantes por ubicación

```graphql
query {
  restaurants(city: "Madrid", cuisineType: "Italian") {
    id
    name
    rating
    address {
      coordinates {
        latitude
        longitude
      }
    }
    menu {
      name
      price
    }
  }
}
```

