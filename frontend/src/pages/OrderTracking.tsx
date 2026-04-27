import { useParams, Link } from 'react-router-dom'
import { useQuery, useApolloClient } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { motion } from 'framer-motion'
import { CheckCircle, Truck, ChefHat, Package, Clock, ArrowLeft, RefreshCw } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { slideUp, staggerContainer } from '../lib/animations'
import { useEffect } from 'react'

const GET_ORDER = gql`
  query GetOrder($id: ID!) {
    order(id: $id) {
      id
      status
      totalAmount
      restaurantId
      createdAt
      items {
        id
        menuItemId
        quantity
        price
        subtotal
      }
    }
  }
`

const ORDER_STATUS_SUBSCRIPTION = gql`
  subscription OnOrderStatusChanged($orderId: ID!) {
    orderStatusChanged(orderId: $orderId) {
      id
      status
      totalAmount
      restaurantId
      createdAt
      updatedAt
      items {
        id
        menuItemId
        quantity
        price
        subtotal
      }
    }
  }
`

const STEPS = [
  { status: 'PENDING', label: 'Pedido recibido', icon: Clock },
  { status: 'CONFIRMED', label: 'Confirmado', icon: CheckCircle },
  { status: 'PREPARING', label: 'Preparando', icon: ChefHat },
  { status: 'READY', label: 'Listo para envío', icon: Package },
  { status: 'ASSIGNED', label: 'Repartidor asignado', icon: Truck },
  { status: 'PICKED_UP', label: 'Recogido', icon: Package },
  { status: 'IN_TRANSIT', label: 'En camino', icon: Truck },
  { status: 'DELIVERED', label: 'Entregado', icon: CheckCircle },
]

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#FF9500',
  CONFIRMED: '#007AFF',
  PREPARING: '#FF9500',
  READY: '#34C759',
  ASSIGNED: '#5856D6',
  PICKED_UP: '#007AFF',
  IN_TRANSIT: '#FF9500',
  DELIVERED: '#34C759',
  CANCELLED: '#FF3B30',
}

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>()
  const client = useApolloClient()

  // Initial order data via query
  const { data, loading, error } = useQuery<any>(GET_ORDER, {
    variables: { id },
  })

  // Set up robust manual subscription
  useEffect(() => {
    if (!id) return

    const observable = client.subscribe<any>({
      query: ORDER_STATUS_SUBSCRIPTION,
      variables: { orderId: id },
    })

    const subscription = observable.subscribe({
      next: ({ data }) => {
        if (data?.orderStatusChanged) {
          const updatedOrder = data.orderStatusChanged

          // Modify cache directly - this guarantees useQuery will trigger a re-render
          client.cache.modify({
            id: client.cache.identify({ __typename: 'Order', id }),
            fields: {
              status() { return updatedOrder.status },
              updatedAt() { return updatedOrder.updatedAt },
              totalAmount() { return updatedOrder.totalAmount },
            }
          })
        }
      },
      error: (err) => {
        console.error('Subscription error:', err)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [id, client])

  const order = data?.order

  if (loading && !order) return (
    <PageTransition>
      <div className="max-w-xl mx-auto px-4 py-10 pb-28 md:pb-10">
        <div className="h-8 w-56 rounded-xl animate-pulse mb-2" style={{ backgroundColor: 'var(--color-border)' }} />
        <div className="h-4 w-32 rounded-lg animate-pulse mb-8" style={{ backgroundColor: 'var(--color-border)' }} />
        <div className="flex flex-col gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full animate-pulse shrink-0" style={{ backgroundColor: 'var(--color-border)', animationDelay: `${i * 60}ms` }} />
              <div className="h-3 rounded-lg animate-pulse flex-1" style={{ backgroundColor: 'var(--color-border)' }} />
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  )

  if (error && !order) return (
    <PageTransition>
      <div className="max-w-xl mx-auto px-4 py-12 text-center" style={{ color: 'var(--color-destructive)' }}>
        {error.message}
      </div>
    </PageTransition>
  )

  if (!order) return (
    <PageTransition>
      <div className="max-w-xl mx-auto px-4 py-12 text-center" style={{ color: 'var(--color-muted-foreground)' }}>
        No se encontró el pedido
      </div>
    </PageTransition>
  )

  const currentIdx = STEPS.findIndex((s) => s.status === order.status)
  const statusColor = STATUS_COLORS[order.status] || '#FF9500'

  return (
    <PageTransition>
      <main className="max-w-xl mx-auto px-4 py-10 pb-28 md:pb-10">
        {/* Header */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="mb-8"
        >
          <motion.div variants={slideUp} className="flex items-center gap-3 mb-2">
            <Link
              to="/orders"
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-muted)' }}
              aria-label="Volver a mis pedidos"
            >
              <ArrowLeft size={18} style={{ color: 'var(--color-foreground)' }} />
            </Link>
            <h1 className="text-2xl font-bold">Seguimiento del pedido</h1>
          </motion.div>

          <motion.div variants={slideUp} className="flex items-center gap-2">
            <p className="text-sm font-mono" style={{ color: 'var(--color-muted-foreground)' }}>
              #{order.id?.slice(0, 8)}
            </p>
            <span className="flex items-center gap-1 text-[12px]" style={{ color: '#34C759' }}>
              <RefreshCw size={12} className="animate-spin-slow" />
              Actualización en vivo
            </span>
          </motion.div>
        </motion.div>

        {/* Stepper */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-3xl mb-6"
          style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}
        >
          {/* Status badge */}
          <div className="flex items-center justify-between mb-6">
            <div
              className="px-3 py-1.5 rounded-full text-[13px] font-semibold"
              style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
            >
              {STEPS.find(s => s.status === order.status)?.label || order.status}
            </div>
            {order.status === 'CANCELLED' && (
              <span className="text-[13px] font-medium" style={{ color: '#FF3B30' }}>
                Tu pedido fue cancelado
              </span>
            )}
          </div>

          {/* Steps */}
          <div className="space-y-0">
            {STEPS.map((step, idx) => {
              const isCompleted = idx < currentIdx
              const isCurrent = idx === currentIdx
              const isPending = idx > currentIdx
              const Icon = step.icon

              return (
                <div key={step.status} className="flex items-start gap-4">
                  {/* Icon + line */}
                  <div className="flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: isCurrent ? 1.1 : 1 }}
                      className={`
                        w-9 h-9 rounded-full flex items-center justify-center shrink-0
                        transition-all duration-300
                      `}
                      style={{
                        backgroundColor: isCompleted || isCurrent ? statusColor : 'var(--color-muted)',
                        color: isCompleted || isCurrent ? 'white' : 'var(--color-muted-foreground)',
                        boxShadow: isCurrent ? `0 0 0 4px ${statusColor}30` : 'none',
                      }}
                    >
                      <Icon size={16} />
                    </motion.div>
                    {idx < STEPS.length - 1 && (
                      <div
                        className="w-0.5 h-8 mt-1 rounded-full transition-colors duration-500"
                        style={{
                          backgroundColor: isCompleted ? statusColor : 'var(--color-border)',
                        }}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1 pb-6">
                    <p
                      className="text-[14px] font-medium transition-colors"
                      style={{
                        color: isPending ? 'var(--color-muted-foreground)' : 'var(--color-foreground)',
                      }}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[12px] mt-0.5"
                        style={{ color: statusColor }}
                      >
                        Estado actual
                      </motion.p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Order summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-3xl mb-4"
          style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--color-foreground)' }}>
            Resumen del pedido
          </h2>
          <div className="space-y-3">
            {order.items?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[14px] font-semibold w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                  >
                    {item.quantity}
                  </span>
                  <span className="text-[14px]" style={{ color: 'var(--color-foreground)' }}>
                    #{item.menuItemId.slice(0, 8)}...
                  </span>
                </div>
                <span className="text-[14px]" style={{ color: 'var(--color-muted-foreground)' }}>
                  ${item.subtotal.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div
            className="mt-4 pt-4 flex justify-between items-center"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <span className="text-[15px] font-semibold" style={{ color: 'var(--color-foreground)' }}>
              Total
            </span>
            <span className="text-[18px] font-bold" style={{ color: 'var(--color-foreground)' }}>
              ${order.totalAmount?.toFixed(2)}
            </span>
          </div>
        </motion.div>

        {/* Timeline */}
        {order.createdAt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-5 rounded-3xl"
            style={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--color-foreground)' }}>
              Información
            </h2>
            <div className="space-y-2 text-[13px]" style={{ color: 'var(--color-muted-foreground)' }}>
              <div className="flex justify-between">
                <span>Pedido realizado</span>
                <span>{new Date(order.createdAt).toLocaleString('es-MX')}</span>
              </div>
              {order.updatedAt && (
                <div className="flex justify-between">
                  <span>Última actualización</span>
                  <span>{new Date(order.updatedAt).toLocaleString('es-MX')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Restaurante</span>
                <span className="font-mono">#{order.restaurantId?.slice(0, 8)}...</span>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </PageTransition>
  )
}
