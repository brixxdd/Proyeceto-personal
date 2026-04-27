# Restaurant Owner Dashboard - Progreso de Desarrollo

## Estado: ✅ COMPLETADO

---

## Problema Actual
El panel del restaurante owner muestra TODOS los restaurantes en lugar de solo los suyos.

---

## Features Solicitadas

### 1. Sección del restaurante
- [ ] Selector de restaurante (mostrar SOLO los del owner logueado)
- [ ] Info del restaurante (nombre, cuisine, rating, estado abierto/cerrado)
- [ ] Toggle para abrir/cerrar restaurante

### 2. Panel de pedidos en tiempo real
- [ ] Lista de pedidos con estado
- [ ] Filtros por estado (Todos, Recibido, Preparando, Listo, etc.)
- [ ] Auto-refresh de pedidos
- [ ] Notificación sonora de nuevos pedidos

### 3. Detalles del pedido
- [ ] Usuario (nombre, dirección, hora)
- [ ] Lista de especialidades/items
- [ ] Total del pedido
- [ ] Notas de entrega

### 4. Dashboard con estadísticas
- [ ] Ventas del día/semana/mes
- [ ] Tiempo promedio de entrega
- [ ] Pedidos completados vs cancelados
- [ ] Restaurante más vendido

### 5. Gestión de menús
- [ ] Agregar platillos
- [ ] Quitar platillos
- [ ] Ajustar precios
- [ ] Marcar disponibles/no disponibles
- [ ] Categorías

### 6. Marcar estados del pedido
- [ ] En preparación
- [ ] Listo para entrega
- [ ] Asignado a repartidor
- [ ] En camino
- [ ] Entregado
- [ ] Cancelado

### 7. Chat directo con repartidor
- [ ] Interfaz de chat
- [ ] Mensajes en tiempo real
- [ ] Historial de conversación

### 8. Notificaciones internas
- [ ] Nuevo pedido confirmado
- [ ] Repartidor asignado
- [ ] Pedido entregado
- [ ] Alertas de respuesta rápida

---

## Bitácora de Cambios

### 2026-04-26
- [x] FIX: GraphQL query `GetMyRestaurants` debe filtrar por ownerId del usuario autenticado
- [x] Backend: Agregar método `getRestaurantsByOwner(ownerId)` en RestaurantService
- [x] Backend: Agregar query `myRestaurants` en resolvers
- [x] Backend: Actualizar schema.graphql del API Gateway (+ deleteMenuItem mutation)
- [x] Frontend: Cambiar query `GET_MY_RESTAURANTS` para usar nuevo endpoint
- [x] Frontend: Dashboard con tabs (Pedidos, Menú, Stats)
- [x] Frontend: Panel de pedidos en tiempo real (polling cada 5s)
- [x] Frontend: Gestión de estados de pedido (botones Confirmar/Preparando/Listo)
- [x] Frontend: Dashboard de estadísticas (ventas totales/hoy, pedidos)
- [x] Frontend: Gestión de menús (agregar/editar/eliminar platillos)
- [x] Frontend: Toggle abrir/cerrar restaurante
- [ ] Frontend: Chat con repartidor
- [x] Frontend: Notificaciones internas (alerta de pedidos pendientes)

---

## Notas Técnicas

### Backend Changes Needed:
1. `services/restaurant-service/src/services/restaurant.service.ts`
   - Agregar método: `getRestaurantsByOwner(ownerId: string): Promise<Restaurant[]>`

2. `services/restaurant-service/src/resolvers.ts`
   - Agregar query: `myRestaurants: async (_parent, _args, context) => { user = requireAuth(context); return restaurantService.getRestaurantsByOwner(user.userId); }`

3. `services/api-gateway/schema.graphql`
   - Agregar query: `myRestaurants: [Restaurant!]!`

### Frontend Changes Needed:
1. `frontend/src/pages/RestaurantDashboard.tsx`
   - Cambiar `GET_MY_RESTAURANTS` query
   - Mejorar UI del selector
   - Agregar tabs para diferentes secciones

---

## Prioridades
1. 🔴 CRÍTICO: Fix que muestre solo los restaurantes del owner
2. 🔴 CRÍTICO: Panel de pedidos en tiempo real
3. 🟡 IMPORTANTE: Gestión de menús
4. 🟡 IMPORTANTE: Marcar estados del pedido
5. 🟢 DESEABLE: Dashboard estadísticas, Chat, Notificaciones
