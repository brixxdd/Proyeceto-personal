import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import { ChefHat, Clock, CheckCircle, XCircle, ArrowRight, Package } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { slideUp, staggerContainer } from '../lib/animations'

const GET_MY_RESTAURANTS = gql`
  query GetMyRestaurants {
    restaurants {
      id
      name
      cuisineType
      isOpen
      rating
      address
    }
  }
`

const GET_RESTAURANT_ORDERS = gql`
  query GetRestaurantOrders($restaurantId: ID!, $status: OrderStatus, $limit: Int, $offset: Int) {
    restaurantOrders(restaurantId: $restaurantId, status: $status, limit: $limit, offset: $offset) {
      id
      customerId
      status
      totalAmount
      items {
        id
        menuItemId
        quantity
        price
        subtotal
      }
      deliveryAddress {
        street
        city
      }
      createdAt
      updatedAt
    }
  }
`

const GET_MENU_ITEM_NAMES = gql`
  query GetMenuItemNames($menuItemIds: [ID!]!) {
    menuItems(ids: $menuItemIds) {
      id
      name
    }
  }
`

const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
    updateOrderStatus(id: $id, status: $status) {
      id
      status
    }
  }
`

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    PENDING: { label: 'Recibido', color: '#FF9500', bg: '#FFF5E5', icon: Clock },
    CONFIRMED: { label: 'Confirmado', color: '#007AFF', bg: '#E6F0FF', icon: CheckCircle },
    PREPARING: { label: 'Preparando', color: '#FF9500', bg: '#FFF5E5', icon: ChefHat },
    READY: { label: 'Listo', color: '#34C759', bg: '#EAF9EE', icon: CheckCircle },
    ASSIGNED: { label: 'Asignado', color: '#5856D6', bg: '#F3EEFF', icon: Package },
    PICKED_UP: { label: 'Recogido', color: '#007AFF', bg: '#E6F0FF', icon: ArrowRight },
    IN_TRANSIT: { label: 'En camino', color: '#FF9500', bg: '#FFF5E5', icon: ArrowRight },
    DELIVERED: { label: 'Entregado', color: '#34C759', bg: '#EAF9EE', icon: CheckCircle },
    CANCELLED: { label: 'Cancelado', color: '#FF3B30', bg: '#FFEBEA', icon: XCircle },
}

export default function RestaurantDashboard() {
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState<string | null>(null)

    const { data: restaurantsData, loading: restaurantsLoading } = useQuery<any>(GET_MY_RESTAURANTS)
    const { data: ordersData, loading: ordersLoading, refetch } = useQuery<any>(GET_RESTAURANT_ORDERS, {
        variables: {
            restaurantId: selectedRestaurantId,
            status: filterStatus || undefined,
            limit: 50,
            offset: 0,
        },
        skip: !selectedRestaurantId,
    })

    const [updateStatus] = useMutation<any>(UPDATE_ORDER_STATUS)

    const restaurants = restaurantsData?.restaurants || []
    const orders = ordersData?.restaurantOrders || []

    // Extract all unique menu item IDs from orders for batch fetching
    const allMenuItemIds = useMemo(() => {
        const ids = new Set<string>()
        orders.forEach((order: any) => {
            order.items?.forEach((item: any) => {
                if (item.menuItemId) ids.add(item.menuItemId)
            })
        })
        return Array.from(ids)
    }, [orders])

    // Fetch menu item names in batch
    const { data: menuItemsData } = useQuery<any>(GET_MENU_ITEM_NAMES, {
        variables: { menuItemIds: allMenuItemIds },
        skip: allMenuItemIds.length === 0,
    })

    // Build a map of menu item names by ID for O(1) lookup
    const menuItemNameMap = useMemo(() => {
        const map = new Map<string, string>()
        menuItemsData?.menuItems?.forEach((item: any) => {
            map.set(item.id, item.name)
        })
        return map
    }, [menuItemsData])

    async function handleStatusUpdate(orderId: string, newStatus: string) {
        await updateStatus({ variables: { id: orderId, status: newStatus } })
        refetch()
    }

    if (restaurantsLoading) {
        return (
            <PageTransition>
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="h-8 w-64 rounded-[12px] animate-pulse mb-6 bg-[var(--color-border)]" />
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 rounded-[16px] animate-pulse bg-[var(--color-border)] opacity-60" />
                        ))}
                    </div>
                </div>
            </PageTransition>
        )
    }

    return (
        <PageTransition>
            <main className="max-w-4xl mx-auto px-4 py-8 pb-32 md:pb-8">
                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                >
                    {/* Header */}
                    <motion.div variants={slideUp} className="mb-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-foreground)] mb-2">
                            🏪 Panel del Restaurante
                        </h1>
                        <p className="text-[var(--color-muted-foreground)]">
                            Gestiona los pedidos de tu local
                        </p>
                    </motion.div>

                    {/* Restaurant selector */}
                    <motion.div variants={slideUp} className="mb-6">
                        <label className="text-[14px] font-semibold text-[var(--color-foreground)] mb-2 block">
                            Selecciona tu restaurante
                        </label>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {restaurants.length === 0 ? (
                                <p className="text-[var(--color-muted-foreground)] text-sm">
                                    No tienes restaurantes registrados
                                </p>
                            ) : restaurants.map((r: any) => (
                                <button
                                    key={r.id}
                                    onClick={() => setSelectedRestaurantId(r.id)}
                                    className={`shrink-0 px-4 py-3 rounded-[16px] border transition-all ${selectedRestaurantId === r.id
                                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                                        : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)]'
                                        }`}
                                >
                                    <div className="text-left">
                                        <p className="font-semibold text-[15px]">{r.name}</p>
                                        <p className="text-xs opacity-60">{r.cuisineType}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Status filter */}
                    {selectedRestaurantId && (
                        <motion.div variants={slideUp} className="mb-6">
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                <button
                                    onClick={() => setFilterStatus(null)}
                                    className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${!filterStatus
                                        ? 'bg-[var(--color-primary)] text-white'
                                        : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
                                        }`}
                                >
                                    Todos
                                </button>
                                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status)}
                                        className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${filterStatus === status
                                            ? 'text-white'
                                            : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
                                            }`}
                                        style={filterStatus === status ? { backgroundColor: config.color } : {}}
                                    >
                                        {config.label}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Orders list */}
                    {selectedRestaurantId && (
                        <AnimatePresence mode="wait">
                            {ordersLoading ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-4"
                                >
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-32 rounded-[20px] animate-pulse bg-[var(--color-border)] opacity-60" />
                                    ))}
                                </motion.div>
                            ) : orders.length === 0 ? (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center justify-center py-16 text-center"
                                >
                                    <div className="w-16 h-16 rounded-full bg-[var(--color-muted)] flex items-center justify-center mb-4">
                                        <Package size={28} className="text-[var(--color-muted-foreground)]" />
                                    </div>
                                    <p className="text-[var(--color-muted-foreground)] font-medium">
                                        No hay pedidos{filterStatus ? ` con estado ${STATUS_CONFIG[filterStatus]?.label}` : ''}
                                    </p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="orders"
                                    variants={staggerContainer}
                                    initial="initial"
                                    animate="animate"
                                    className="space-y-4"
                                >
                                    {orders.map((order: any) => {
                                        const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING
                                        const StatusIcon = statusCfg.icon
                                        return (
                                            <motion.div
                                                key={order.id}
                                                variants={slideUp}
                                                className="bg-[var(--color-card)] rounded-[20px] border border-[var(--color-border)] p-5 ios-shadow-sm"
                                            >
                                                {/* Order header */}
                                                <div className="flex items-start justify-between mb-4">
                                                    <div>
                                                        <p className="text-[13px] font-mono text-[var(--color-muted-foreground)] mb-1">
                                                            #{order.id.slice(0, 8)}
                                                        </p>
                                                        <div
                                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
                                                            style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
                                                        >
                                                            <StatusIcon size={12} />
                                                            {statusCfg.label}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[18px] font-bold text-[var(--color-foreground)]">
                                                            ${order.totalAmount.toFixed(2)}
                                                        </p>
                                                        <p className="text-[12px] text-[var(--color-muted-foreground)]">
                                                            {new Date(order.createdAt).toLocaleString('es-MX', {
                                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Order items */}
                                                <div className="space-y-2 mb-4">
                                                    {order.items?.map((item: any, idx: number) => {
                                                        const itemName = menuItemNameMap.get(item.menuItemId) || `Producto #${idx + 1}`
                                                        return (
                                                            <div key={item.id || idx} className="flex justify-between items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[14px] font-semibold text-[var(--color-primary)]">
                                                                        {item.quantity}×
                                                                    </span>
                                                                    <span className="text-[14px] text-[var(--color-foreground)]">
                                                                        {itemName}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[14px] text-[var(--color-muted-foreground)]">
                                                                    ${item.subtotal.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                {/* Delivery address */}
                                                {order.deliveryAddress && (
                                                    <div className="text-[13px] text-[var(--color-muted-foreground)] mb-4 pb-4 border-b border-[var(--color-border)]">
                                                        📍 {order.deliveryAddress.street}, {order.deliveryAddress.city}
                                                    </div>
                                                )}

                                                {/* Quick actions */}
                                                <div className="flex gap-2 flex-wrap">
                                                    {order.status === 'PENDING' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(order.id, 'CONFIRMED')}
                                                            className="px-4 py-2 rounded-[12px] bg-[#007AFF] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
                                                        >
                                                            ✓ Confirmar
                                                        </button>
                                                    )}
                                                    {(order.status === 'CONFIRMED' || order.status === 'PENDING') && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(order.id, 'PREPARING')}
                                                            className="px-4 py-2 rounded-[12px] bg-[#FF9500] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
                                                        >
                                                            🍳 Preparando
                                                        </button>
                                                    )}
                                                    {order.status === 'PREPARING' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(order.id, 'READY')}
                                                            className="px-4 py-2 rounded-[12px] bg-[#34C759] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
                                                        >
                                                            ✓ Listo
                                                        </button>
                                                    )}
                                                    {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(order.id, 'CANCELLED')}
                                                            className="px-4 py-2 rounded-[12px] bg-[var(--color-destructive)] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
                                                        >
                                                            ✕ Cancelar
                                                        </button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </motion.div>
            </main>
        </PageTransition>
    )
}
