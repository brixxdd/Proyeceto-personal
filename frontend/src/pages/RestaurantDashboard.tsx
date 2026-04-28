import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChefHat, Clock, CheckCircle, XCircle, ArrowRight, Package,
    Plus, Minus, Trash2, Edit2, Save, X, DollarSign, TrendingUp,
    Users, Timer, Bell, RefreshCw, ChevronDown, Menu, AlertCircle
} from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { slideUp, staggerContainer, bouncyTransition } from '../lib/animations'

// Queries
const GET_MY_RESTAURANTS = gql`
  query GetMyRestaurants {
    myRestaurants {
      id
      name
      cuisineType
      isOpen
      rating
    }
  }
`

const GET_RESTAURANT_ORDERS = gql`
  query GetRestaurantOrders($restaurantId: ID!, $status: OrderStatus) {
    restaurantOrders(restaurantId: $restaurantId, status: $status, limit: 50, offset: 0) {
      id
      customerId
      status
      totalAmount
      items { id menuItemId quantity price subtotal }
      deliveryAddress { street city state zipCode }
      createdAt
      updatedAt
    }
  }
`

const GET_MENU = gql`
  query GetMenu($restaurantId: ID!) {
    menu(restaurantId: $restaurantId) {
      id name description price category isAvailable
    }
  }
`

const GET_STATS = gql`
  query GetRestaurantStats($restaurantId: ID!) {
    restaurantOrders(restaurantId: $restaurantId, limit: 100, offset: 0) {
      id status totalAmount createdAt
    }
  }
`

// Subscriptions for real-time updates
// IMPORTANTE: El Gateway es proxy WebSocket PURO — pasa mensajes byte-for-byte
// al order-service. Usar el nombre del campo del ORDER-SERVICE (src/index.ts),
// NO el nombre del supergraph de api-gateway/schema.graphql.
//   order-service resolver: restaurantOrderCreated  ← CORRECTO para subscriptions
//   api-gateway supergraph: newOrder                ← solo para HTTP queries federadas
const RESTAURANT_ORDER_CREATED = gql`
  subscription OnRestaurantOrderCreated($restaurantId: ID!) {
    restaurantOrderCreated(restaurantId: $restaurantId) {
      id customerId status totalAmount
      items { id menuItemId quantity price subtotal }
      deliveryAddress { street city state zipCode }
      createdAt updatedAt
    }
  }
`

// Mutations
const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
    updateOrderStatus(id: $id, status: $status) { id status }
  }
`

// createMenuItem uses flat args (no input type) — matches restaurant-service schema
const CREATE_MENU_ITEM = gql`
  mutation CreateMenuItem(
    $restaurantId: ID!
    $name: String!
    $description: String
    $price: Float!
    $category: String
    $isAvailable: Boolean
  ) {
    createMenuItem(
      restaurantId: $restaurantId
      name: $name
      description: $description
      price: $price
      category: $category
      isAvailable: $isAvailable
    ) {
      id name price isAvailable
    }
  }
`

// updateMenuItem also uses flat args
const UPDATE_MENU_ITEM = gql`
  mutation UpdateMenuItem(
    $id: ID!
    $name: String
    $description: String
    $price: Float
    $category: String
    $isAvailable: Boolean
  ) {
    updateMenuItem(
      id: $id
      name: $name
      description: $description
      price: $price
      category: $category
      isAvailable: $isAvailable
    ) { id name price isAvailable }
  }
`

const DELETE_MENU_ITEM = gql`
  mutation DeleteMenuItem($id: ID!) {
    deleteMenuItem(id: $id) { id }
  }
`

// updateRestaurant also uses flat args — no `input` wrapper
const TOGGLE_RESTAURANT_OPEN = gql`
  mutation ToggleRestaurantOpen($id: ID!, $isOpen: Boolean!) {
    updateRestaurant(id: $id, isOpen: $isOpen) {
      id isOpen
    }
  }
`

// Status config
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; next?: string[] }> = {
    PENDING: { label: 'Recibido', color: '#FF9500', bg: '#FFF5E5', next: ['CONFIRMED', 'CANCELLED'] },
    CONFIRMED: { label: 'Confirmado', color: '#007AFF', bg: '#E6F0FF', next: ['PREPARING', 'CANCELLED'] },
    PREPARING: { label: 'Preparando', color: '#FF9500', bg: '#FFF5E5', next: ['READY', 'CANCELLED'] },
    READY: { label: 'Listo', color: '#34C759', bg: '#EAF9EE', next: [] },
    CANCELLED: { label: 'Cancelado', color: '#FF3B30', bg: '#FFEBEA', next: [] },
    DELIVERED: { label: 'Entregado', color: '#34C759', bg: '#EAF9EE', next: [] },
}

type Tab = 'orders' | 'menu' | 'stats'

export default function RestaurantDashboard() {
    const navigate = useNavigate()
    const client = useApolloClient()
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<Tab>('orders')
    const [filterStatus, setFilterStatus] = useState<string | null>(null)
    const [showNewItemForm, setShowNewItemForm] = useState(false)
    const [editingItem, setEditingItem] = useState<any>(null)

    // Data fetching: subscriptions para actualizaciones instantaneas,
    // pollInterval como red de seguridad si la subscription pierde algun evento.
    const { data: restaurantsData, loading: restaurantsLoading, error: restaurantsError, refetch: refetchRestaurants } = useQuery<any>(GET_MY_RESTAURANTS)
    const { data: ordersData, loading: ordersLoading, error: ordersError, refetch: refetchOrders } = useQuery<any>(GET_RESTAURANT_ORDERS, {
        variables: { restaurantId: selectedRestaurantId, status: filterStatus || undefined },
        skip: !selectedRestaurantId,
        fetchPolicy: 'cache-and-network',
        pollInterval: 8000,                   // red de seguridad: actualiza cada 8s
        notifyOnNetworkStatusChange: false,   // sin skeleton flash en cada poll
    })
    const { data: menuData, loading: menuLoading, refetch: refetchMenu } = useQuery<any>(GET_MENU, {
        variables: { restaurantId: selectedRestaurantId },
        skip: !selectedRestaurantId,
    })
    const { data: statsData } = useQuery<any>(GET_STATS, {
        variables: { restaurantId: selectedRestaurantId },
        skip: !selectedRestaurantId || activeTab !== 'stats',
    })

    // Mutations
    const [updateOrderStatus] = useMutation<any>(UPDATE_ORDER_STATUS)
    const [createMenuItem] = useMutation<any>(CREATE_MENU_ITEM)
    const [updateMenuItem] = useMutation<any>(UPDATE_MENU_ITEM)
    const [deleteMenuItem] = useMutation<any>(DELETE_MENU_ITEM)
    const [toggleOpen] = useMutation<any>(TOGGLE_RESTAURANT_OPEN)

    // Manual subscriptions for real-time updates (replaces polling)
    useEffect(() => {
        if (!selectedRestaurantId) return

        // Subscribe to new orders
        const newOrderObservable = client.subscribe<any>({
            query: RESTAURANT_ORDER_CREATED,
            variables: { restaurantId: selectedRestaurantId },
        })

        const newOrderSubscription = newOrderObservable.subscribe({
            next: ({ data }) => {
                // El proxy pasa el mensaje al order-service que resuelve restaurantOrderCreated
                if (data?.restaurantOrderCreated) {
                    const newOrder = data.restaurantOrderCreated
                    setLocalOrders(prev => {
                        const exists = prev.some(o => o.id === newOrder.id)
                        if (exists) return prev
                        return [newOrder, ...prev]
                    })
                }
            },
            error: (err) => console.error('[RestaurantDashboard] New order subscription error:', err)
        })

        return () => {
            newOrderSubscription.unsubscribe()
        }
    }, [selectedRestaurantId, client])

    // useMemo prevents new array references on every render.
    // Using `|| []` directly creates a NEW [] each render → triggers all effects that depend on it.
    const restaurants = useMemo(
        () => restaurantsData?.myRestaurants ?? [],
        [restaurantsData]
    )
    const menuItems = useMemo(
        () => menuData?.menu ?? [],
        [menuData]
    )

    // Local state for orders — source of truth for the UI
    const [localOrders, setLocalOrders] = useState<any[]>([])

    // Sync query results to local state.
    // Depend on `ordersData` (the Apollo object ref), NOT on `ordersData?.restaurantOrders || []`
    // because `|| []` creates a NEW array on every render → infinite loop.
    useEffect(() => {
        if (ordersData?.restaurantOrders) {
            setLocalOrders(ordersData.restaurantOrders)
        }
    }, [ordersData])

    // Log errors for debugging
    useEffect(() => {
        if (ordersError) {
            console.error('[RestaurantDashboard] Error fetching orders:', ordersError.message)
        }
    }, [ordersError])

    // Use localOrders for display (subscription handles real-time updates)
    const orders = localOrders

    // Detectar cambio de cuenta comparando IDs anteriores vs nuevos.
    // Solo resetear si NO hay ningun ID en comun (usuario completamente diferente).
    // Esto evita limpiar ordenes por refetches normales del mismo usuario.
    const prevRestaurantIdsRef = useRef<Set<string>>(new Set())
    useEffect(() => {
        if (!restaurantsData?.myRestaurants) return
        const newIds = new Set<string>(restaurantsData.myRestaurants.map((r: any) => r.id))
        const prevIds = prevRestaurantIdsRef.current
        const hasOverlap = [...newIds].some(id => prevIds.has(id))
        // Si habia restaurantes previos y ninguno coincide = cambio de cuenta
        if (prevIds.size > 0 && !hasOverlap) {
            setSelectedRestaurantId(null)
            setLocalOrders([])
        }
        prevRestaurantIdsRef.current = newIds
    }, [restaurantsData])

    // Auto-seleccionar el primer restaurante cuando no hay ninguno seleccionado
    useEffect(() => {
        if (!restaurantsLoading && restaurants.length > 0 && !selectedRestaurantId) {
            setSelectedRestaurantId(restaurants[0].id)
        }
    }, [restaurantsLoading, restaurants, selectedRestaurantId])

    // Redirect to create ONLY when the query succeeded and returned 0 restaurants.
    // If the query errored (network, 429, etc.) don't redirect — the restaurant may still exist.
    useEffect(() => {
        if (!restaurantsLoading && !restaurantsError && restaurantsData && restaurants.length === 0) {
            navigate('/create-restaurant', { replace: true })
        }
    }, [restaurantsLoading, restaurantsError, restaurantsData, restaurants, navigate])

    async function handleStatusUpdate(orderId: string, newStatus: string) {
        await updateOrderStatus({ variables: { id: orderId, status: newStatus } })
        await refetchOrders()
    }

    async function handleToggleOpen() {
        if (!selectedRestaurantId) return
        const restaurant = restaurants.find((r: any) => r.id === selectedRestaurantId)
        if (!restaurant) return
        await toggleOpen({ variables: { id: selectedRestaurantId, isOpen: !restaurant.isOpen } })
        refetchRestaurants()
    }

    // Menu item form state
    const [menuForm, setMenuForm] = useState({ name: '', description: '', price: '', category: '', isAvailable: true })

    async function handleSaveMenuItem(e: React.FormEvent) {
        e.preventDefault()
        if (!selectedRestaurantId) return

        // Variables are flat — no `input` wrapper (matches restaurant-service schema)
        const commonVars = {
            name: menuForm.name,
            description: menuForm.description || undefined,
            price: parseFloat(menuForm.price),
            category: menuForm.category || undefined,
            isAvailable: menuForm.isAvailable,
        }

        if (editingItem) {
            await updateMenuItem({ variables: { id: editingItem.id, ...commonVars } })
        } else {
            await createMenuItem({ variables: { restaurantId: selectedRestaurantId, ...commonVars } })
        }

        setShowNewItemForm(false)
        setEditingItem(null)
        setMenuForm({ name: '', description: '', price: '', category: '', isAvailable: true })
        refetchMenu()
    }

    async function handleDeleteMenuItem(id: string) {
        if (!confirm('¿Eliminar este platillo?')) return
        await deleteMenuItem({ variables: { id } })
        refetchMenu()
    }

    function startEdit(item: any) {
        setEditingItem(item)
        setMenuForm({
            name: item.name,
            description: item.description || '',
            price: item.price.toString(),
            category: item.category || '',
            isAvailable: item.isAvailable,
        })
        setShowNewItemForm(true)
    }

    // Stats calculations
    const stats = useMemo(() => {
        if (!statsData?.restaurantOrders) return null
        const allOrders = statsData.restaurantOrders
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const todayOrders = allOrders.filter((o: any) => new Date(o.createdAt) >= today)
        const totalSales = allOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0)
        const todaySales = todayOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0)
        const completedOrders = allOrders.filter((o: any) => o.status === 'DELIVERED').length
        const cancelledOrders = allOrders.filter((o: any) => o.status === 'CANCELLED').length
        const pendingOrders = allOrders.filter((o: any) => ['PENDING', 'CONFIRMED', 'PREPARING'].includes(o.status)).length

        return {
            totalSales,
            todaySales,
            completedOrders,
            cancelledOrders,
            pendingOrders,
            totalOrders: allOrders.length,
        }
    }, [statsData])

    // Group menu by category
    const menuByCategory = useMemo(() => {
        const grouped: Record<string, any[]> = {}
        menuItems.forEach((item: any) => {
            const cat = item.category || 'Sin categoría'
            if (!grouped[cat]) grouped[cat] = []
            grouped[cat].push(item)
        })
        return grouped
    }, [menuItems])

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

    const selectedRestaurant = restaurants.find((r: any) => r.id === selectedRestaurantId)

    return (
        <PageTransition>
            <main className="max-w-4xl mx-auto px-4 py-6 pb-32 md:pb-8">
                {/* Header */}
                <motion.div variants={staggerContainer} initial="initial" animate="animate" className="mb-6">
                    <motion.div variants={slideUp} className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-foreground)]">
                                🏪 Panel del Restaurante
                            </h1>
                            {selectedRestaurant && (
                                <p className="text-[var(--color-muted-foreground)] text-sm mt-1">
                                    {selectedRestaurant.name} · {selectedRestaurant.cuisineType}
                                </p>
                            )}
                        </div>
                        {selectedRestaurant && (
                            <button
                                onClick={handleToggleOpen}
                                className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${selectedRestaurant.isOpen
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : 'bg-red-100 text-red-700 border border-red-200'
                                    }`}
                            >
                                {selectedRestaurant.isOpen ? '🟢 ABIERTO' : '🔴 CERRADO'}
                            </button>
                        )}
                    </motion.div>

                    {/* Restaurant selector */}
                    <motion.div variants={slideUp} className="flex gap-2 overflow-x-auto pb-2 mb-4">
                        {restaurants.map((r: any) => (
                            <button
                                key={r.id}
                                onClick={() => setSelectedRestaurantId(r.id)}
                                className={`shrink-0 px-4 py-2.5 rounded-[14px] border transition-all ${selectedRestaurantId === r.id
                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                    : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)]'
                                    }`}
                            >
                                <p className="font-semibold text-[14px]">{r.name}</p>
                                <p className="text-[11px] opacity-60">{r.cuisineType}</p>
                            </button>
                        ))}
                    </motion.div>

                    {/* Tabs */}
                    <motion.div variants={slideUp} className="flex gap-1 bg-[var(--color-muted)] p-1 rounded-[16px]">
                        {[
                            { id: 'orders', label: 'Pedidos', icon: Package },
                            { id: 'menu', label: 'Menú', icon: Menu },
                            { id: 'stats', label: 'Stats', icon: TrendingUp },
                        ].map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id as Tab)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[14px] font-semibold transition-all ${activeTab === id
                                    ? 'bg-[var(--color-card)] text-[var(--color-foreground)] ios-shadow-sm'
                                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                                    }`}
                            >
                                <Icon size={16} />
                                <span className="hidden sm:inline">{label}</span>
                            </button>
                        ))}
                    </motion.div>
                </motion.div>

                {/* ORDERS TAB */}
                <AnimatePresence mode="wait">
                    {activeTab === 'orders' && (
                        <motion.div
                            key="orders"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {/* Status filters */}
                            <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
                                <button
                                    onClick={() => setFilterStatus(null)}
                                    className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${!filterStatus
                                        ? 'bg-[var(--color-primary)] text-white'
                                        : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
                                        }`}
                                >
                                    Todos {orders.length}
                                </button>
                                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(filterStatus === status ? null : status)}
                                        className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${filterStatus === status
                                            ? 'text-white'
                                            : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
                                            }`}
                                        style={filterStatus === status ? { backgroundColor: config.color } : {}}
                                    >
                                        {config.label}
                                    </button>
                                ))}
                            </div>

                            {/* Live update indicator */}
                            <div className="flex items-center gap-2 mb-4 text-[12px] text-green-600">
                                <RefreshCw size={12} className="animate-spin" style={{ animationDuration: '3s' }} />
                                <span>Actualización en vivo</span>
                            </div>

                            {ordersLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-32 rounded-[20px] animate-pulse bg-[var(--color-border)] opacity-60" />
                                    ))}
                                </div>
                            ) : ordersError ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                                        <AlertCircle size={28} className="text-red-500" />
                                    </div>
                                    <p className="text-red-500 font-medium mb-2">Error cargando pedidos</p>
                                    <p className="text-[var(--color-muted-foreground)] text-[13px]">{ordersError.message}</p>
                                    <button
                                        onClick={() => refetchOrders()}
                                        className="mt-4 px-4 py-2 rounded-[12px] bg-[var(--color-primary)] text-white text-[13px] font-semibold"
                                    >
                                        Reintentar
                                    </button>
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-16 h-16 rounded-full bg-[var(--color-muted)] flex items-center justify-center mb-4">
                                        <Package size={28} className="text-[var(--color-muted-foreground)]" />
                                    </div>
                                    <p className="text-[var(--color-muted-foreground)] font-medium">
                                        No hay pedidos{filterStatus ? ` con estado ${STATUS_CONFIG[filterStatus]?.label}` : ''}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {orders.map((order: any) => {
                                        const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING
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
                                                            {statusCfg.label}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[18px] font-bold text-[var(--color-foreground)]">
                                                            ${order.totalAmount?.toFixed(2)}
                                                        </p>
                                                        <p className="text-[12px] text-[var(--color-muted-foreground)]">
                                                            {new Date(order.createdAt).toLocaleString('es-MX', {
                                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Items */}
                                                <div className="space-y-2 mb-4 pb-4 border-b border-[var(--color-border)]">
                                                    {order.items?.slice(0, 3).map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center text-[14px]">
                                                            <span className="text-[var(--color-foreground)]">
                                                                <span className="font-semibold text-[var(--color-primary)]">{item.quantity}×</span> {item.name || `Item #${idx + 1}`}
                                                            </span>
                                                            <span className="text-[var(--color-muted-foreground)]">
                                                                ${(item.subtotal || item.price * item.quantity)?.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {order.items?.length > 3 && (
                                                        <p className="text-[12px] text-[var(--color-muted-foreground)]">
                                                            +{order.items.length - 3} más...
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Address */}
                                                {order.deliveryAddress && (
                                                    <div className="text-[13px] text-[var(--color-muted-foreground)] mb-4 flex items-center gap-1">
                                                        📍 {order.deliveryAddress.street}, {order.deliveryAddress.city}
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                {statusCfg.next && statusCfg.next.length > 0 && (
                                                    <div className="flex gap-2 flex-wrap">
                                                        {statusCfg.next.map(nextStatus => {
                                                            const nextCfg = STATUS_CONFIG[nextStatus]
                                                            if (!nextCfg) return null
                                                            return (
                                                                <button
                                                                    key={nextStatus}
                                                                    onClick={() => handleStatusUpdate(order.id, nextStatus)}
                                                                    className="px-4 py-2 rounded-[12px] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
                                                                    style={{ backgroundColor: nextCfg.color }}
                                                                >
                                                                    → {nextCfg.label}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </motion.div>
                                        )
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* MENU TAB */}
                    {activeTab === 'menu' && (
                        <motion.div
                            key="menu"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-[18px] font-bold text-[var(--color-foreground)]">Gestión del Menú</h2>
                                <button
                                    onClick={() => { setEditingItem(null); setMenuForm({ name: '', description: '', price: '', category: '', isAvailable: true }); setShowNewItemForm(true) }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[var(--color-primary)] text-white text-[13px] font-semibold"
                                >
                                    <Plus size={16} /> Agregar
                                </button>
                            </div>

                            {/* New/Edit form */}
                            <AnimatePresence>
                                {showNewItemForm && (
                                    <motion.form
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        onSubmit={handleSaveMenuItem}
                                        className="bg-[var(--color-card)] rounded-[20px] border border-[var(--color-border)] p-5 mb-4 ios-shadow-sm overflow-hidden"
                                    >
                                        <h3 className="text-[16px] font-bold text-[var(--color-foreground)] mb-4">
                                            {editingItem ? 'Editar platillo' : 'Nuevo platillo'}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="col-span-2">
                                                <label className="text-[12px] font-semibold text-[var(--color-foreground)] block mb-1">Nombre *</label>
                                                <input
                                                    type="text"
                                                    value={menuForm.name}
                                                    onChange={e => setMenuForm(f => ({ ...f, name: e.target.value }))}
                                                    className="w-full px-3 py-2.5 rounded-[12px] border border-[var(--color-border)] text-[14px] bg-[var(--color-muted)]"
                                                    required
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[12px] font-semibold text-[var(--color-foreground)] block mb-1">Descripción</label>
                                                <input
                                                    type="text"
                                                    value={menuForm.description}
                                                    onChange={e => setMenuForm(f => ({ ...f, description: e.target.value }))}
                                                    className="w-full px-3 py-2.5 rounded-[12px] border border-[var(--color-border)] text-[14px] bg-[var(--color-muted)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[12px] font-semibold text-[var(--color-foreground)] block mb-1">Precio *</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={menuForm.price}
                                                    onChange={e => setMenuForm(f => ({ ...f, price: e.target.value }))}
                                                    className="w-full px-3 py-2.5 rounded-[12px] border border-[var(--color-border)] text-[14px] bg-[var(--color-muted)]"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[12px] font-semibold text-[var(--color-foreground)] block mb-1">Categoría</label>
                                                <input
                                                    type="text"
                                                    value={menuForm.category}
                                                    onChange={e => setMenuForm(f => ({ ...f, category: e.target.value }))}
                                                    className="w-full px-3 py-2.5 rounded-[12px] border border-[var(--color-border)] text-[14px] bg-[var(--color-muted)]"
                                                    placeholder="Ej. Entradas"
                                                />
                                            </div>
                                            <div className="col-span-2 flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    id="isAvailable"
                                                    checked={menuForm.isAvailable}
                                                    onChange={e => setMenuForm(f => ({ ...f, isAvailable: e.target.checked }))}
                                                    className="w-5 h-5 rounded"
                                                />
                                                <label htmlFor="isAvailable" className="text-[14px] text-[var(--color-foreground)]">
                                                    Disponible para ordenar
                                                </label>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                className="flex-1 py-2.5 rounded-[12px] bg-[var(--color-primary)] text-white text-[14px] font-semibold"
                                            >
                                                <Save size={14} className="inline mr-1" /> {editingItem ? 'Guardar cambios' : 'Agregar'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setShowNewItemForm(false); setEditingItem(null) }}
                                                className="px-4 py-2.5 rounded-[12px] bg-[var(--color-muted)] text-[14px] font-semibold"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </motion.form>
                                )}
                            </AnimatePresence>

                            {/* Menu by category */}
                            {menuLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-16 rounded-[16px] animate-pulse bg-[var(--color-border)] opacity-60" />
                                    ))}
                                </div>
                            ) : menuItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-16 h-16 rounded-full bg-[var(--color-muted)] flex items-center justify-center mb-4">
                                        <Menu size={28} className="text-[var(--color-muted-foreground)]" />
                                    </div>
                                    <p className="text-[var(--color-muted-foreground)] font-medium mb-2">
                                        Tu menú está vacío
                                    </p>
                                    <p className="text-[var(--color-muted-foreground)] text-[13px]">
                                        Agrega platillos para que los clientes puedan ordenar
                                    </p>
                                </div>
                            ) : (
                                Object.entries(menuByCategory).map(([category, items]) => (
                                    <div key={category} className="mb-6">
                                        <h3 className="text-[14px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wide mb-2">
                                            {category}
                                        </h3>
                                        <div className="space-y-2">
                                            {items.map((item: any) => (
                                                <div
                                                    key={item.id}
                                                    className={`flex items-center justify-between p-4 rounded-[16px] bg-[var(--color-card)] border border-[var(--color-border)] ${!item.isAvailable ? 'opacity-50' : ''
                                                        }`}
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-[15px] text-[var(--color-foreground)]">{item.name}</p>
                                                        {item.description && (
                                                            <p className="text-[12px] text-[var(--color-muted-foreground)]">{item.description}</p>
                                                        )}
                                                        <p className="text-[14px] font-bold text-[var(--color-primary)] mt-1">
                                                            ${item.price.toFixed(2)}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {!item.isAvailable && (
                                                            <span className="text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-600 font-semibold">
                                                                Agotado
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={() => startEdit(item)}
                                                            className="w-9 h-9 rounded-full bg-[var(--color-muted)] flex items-center justify-center"
                                                        >
                                                            <Edit2 size={14} className="text-[var(--color-muted-foreground)]" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteMenuItem(item.id)}
                                                            className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center"
                                                        >
                                                            <Trash2 size={14} className="text-red-500" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    )}

                    {/* STATS TAB */}
                    {activeTab === 'stats' && (
                        <motion.div
                            key="stats"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <h2 className="text-[18px] font-bold text-[var(--color-foreground)] mb-4">Estadísticas</h2>

                            {stats ? (
                                <>
                                    {/* Sales cards */}
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-[20px] p-5 text-white ios-shadow">
                                            <DollarSign size={20} className="mb-2 opacity-80" />
                                            <p className="text-[12px] opacity-80">Ventas totales</p>
                                            <p className="text-[24px] font-bold">${stats.totalSales.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-[20px] p-5 text-white ios-shadow">
                                            <TrendingUp size={20} className="mb-2 opacity-80" />
                                            <p className="text-[12px] opacity-80">Ventas hoy</p>
                                            <p className="text-[24px] font-bold">${stats.todaySales.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    {/* Orders cards */}
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        <div className="bg-[var(--color-card)] rounded-[20px] border border-[var(--color-border)] p-4 text-center ios-shadow-sm">
                                            <Package size={20} className="mx-auto mb-2 text-[var(--color-primary)]" />
                                            <p className="text-[24px] font-bold text-[var(--color-foreground)]">{stats.totalOrders}</p>
                                            <p className="text-[11px] text-[var(--color-muted-foreground)]">Pedidos</p>
                                        </div>
                                        <div className="bg-[var(--color-card)] rounded-[20px] border border-[var(--color-border)] p-4 text-center ios-shadow-sm">
                                            <CheckCircle size={20} className="mx-auto mb-2 text-green-500" />
                                            <p className="text-[24px] font-bold text-[var(--color-foreground)]">{stats.completedOrders}</p>
                                            <p className="text-[11px] text-[var(--color-muted-foreground)]">Completados</p>
                                        </div>
                                        <div className="bg-[var(--color-card)] rounded-[20px] border border-[var(--color-border)] p-4 text-center ios-shadow-sm">
                                            <XCircle size={20} className="mx-auto mb-2 text-red-500" />
                                            <p className="text-[24px] font-bold text-[var(--color-foreground)]">{stats.cancelledOrders}</p>
                                            <p className="text-[11px] text-[var(--color-muted-foreground)]">Cancelados</p>
                                        </div>
                                    </div>

                                    {/* Pending */}
                                    {stats.pendingOrders > 0 && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-[20px] p-4 flex items-center gap-3">
                                            <Bell size={20} className="text-yellow-600" />
                                            <div>
                                                <p className="font-semibold text-[14px] text-yellow-800">Tienes {stats.pendingOrders} pedido(s) pendiente(s)</p>
                                                <button
                                                    onClick={() => setActiveTab('orders')}
                                                    className="text-[12px] text-yellow-700 underline"
                                                >
                                                    Ver pedidos →
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-16 h-16 rounded-full bg-[var(--color-muted)] flex items-center justify-center mb-4">
                                        <TrendingUp size={28} className="text-[var(--color-muted-foreground)]" />
                                    </div>
                                    <p className="text-[var(--color-muted-foreground)] font-medium">
                                        Cargando estadísticas...
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </PageTransition>
    )
}
