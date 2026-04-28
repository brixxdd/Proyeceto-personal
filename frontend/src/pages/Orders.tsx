import { useQuery, useApolloClient } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { Link } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'
import { Clock, ChevronRight, ShoppingBag } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { useEffect, useState, useRef } from 'react'

const GET_ORDERS = gql`
  query GetOrders {
    orders {
      id status totalAmount restaurantId createdAt
    }
  }
`

const MY_ORDERS_UPDATED = gql`
  subscription OnMyOrdersUpdated {
    myOrdersUpdated {
      id
      status
      totalAmount
      restaurantId
      createdAt
      updatedAt
    }
  }
`

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pendiente', color: '#92400E', bg: '#FEF3C7' },
  CONFIRMED: { label: 'Confirmado', color: '#1D4ED8', bg: '#DBEAFE' },
  PREPARING: { label: 'Preparando', color: '#6D28D9', bg: '#EDE9FE' },
  READY: { label: 'Listo', color: '#065F46', bg: '#D1FAE5' },
  DELIVERING: { label: 'En camino', color: '#9A3412', bg: '#FFF1E8' },
  DELIVERED: { label: 'Entregado', color: '#065F46', bg: '#DCFCE7' },
  CANCELLED: { label: 'Cancelado', color: '#991B1B', bg: '#FEE2E2' },
}

const itemVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 28 } },
}

export default function Orders() {
  const client = useApolloClient()
  const [localOrders, setLocalOrders] = useState<any[]>([])

  const { data, loading, error } = useQuery<any>(GET_ORDERS, {
    fetchPolicy: 'network-only',
    pollInterval: 6000,
    notifyOnNetworkStatusChange: false,
  })

  // Sync query results to local state
  useEffect(() => {
    if (data?.orders) {
      setLocalOrders(data.orders)
    }
  }, [data])

  useEffect(() => {
    const observable = client.subscribe<any>({
      query: MY_ORDERS_UPDATED,
    })

    const subscription = observable.subscribe({
      next: ({ data }) => {
        if (data?.myOrdersUpdated) {
          const updatedOrder = data.myOrdersUpdated
          console.log('[Orders] WS received:', updatedOrder.status)
          setLocalOrders(prev => {
            const exists = prev.some(o => o.id === updatedOrder.id)
            if (exists) {
              return prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o)
            }
            return [updatedOrder, ...prev]
          })
        }
      },
      error: (err) => console.error('[Orders] Subscription error:', err)
    })

    return () => subscription.unsubscribe()
  }, [client])

  const orders = localOrders

  if (loading) return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 py-10 pb-28 md:pb-10">
        <div className="h-9 w-40 rounded-xl animate-pulse mb-8" style={{ backgroundColor: 'var(--color-border)' }} />
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl animate-pulse"
              style={{ backgroundColor: 'var(--color-border)', animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    </PageTransition>
  )

  if (error) return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 py-12 text-center" style={{ color: 'var(--color-destructive)' }}>
        {error.message}
      </div>
    </PageTransition>
  )

  return (
    <PageTransition>
      <main className="max-w-2xl mx-auto px-4 py-10 pb-28 md:pb-10">
        <h1 className="text-3xl font-bold mb-8">Mis pedidos</h1>

        {orders?.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="text-center py-20 flex flex-col items-center gap-4"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-muted)' }}
            >
              <ShoppingBag size={28} style={{ color: 'var(--color-muted-foreground)' }} />
            </div>
            <div>
              <p className="font-semibold mb-1">No tienes pedidos aún</p>
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Explora restaurantes y haz tu primer pedido
              </p>
            </div>
            <Link
              to="/restaurants"
              className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #EA580C, #F97316)' }}
            >
              Ver restaurantes
            </Link>
          </motion.div>
        )}

        <motion.div
          className="flex flex-col gap-3"
          variants={{ animate: { transition: { staggerChildren: 0.07 } } }}
          initial="initial"
          animate="animate"
        >
          {orders?.map((order: any) => {
            const status = STATUS_CONFIG[order.status] ?? { label: order.status, color: '#6B7280', bg: 'var(--color-muted)' }
            return (
              <motion.div key={order.id} variants={itemVariants}>
                <motion.div
                  whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(0,0,0,0.08)' }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
                >
                  <Link
                    to={`/orders/${order.id}`}
                    className="flex items-center justify-between p-4 gap-3"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                    }}
                  >
                    {/* Left */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: status.bg }}
                      >
                        <ShoppingBag size={17} style={{ color: status.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">Pedido #{order.id.slice(0, 8)}</p>
                        <p
                          className="text-xs mt-0.5 flex items-center gap-1"
                          style={{ color: 'var(--color-muted-foreground)' }}
                        >
                          <Clock size={11} />
                          {new Date(order.createdAt).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>
                          ${order.totalAmount?.toFixed(2)}
                        </p>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: status.bg, color: status.color }}
                        >
                          {status.label}
                        </span>
                      </div>
                      <ChevronRight size={16} style={{ color: 'var(--color-border)' }} />
                    </div>
                  </Link>
                </motion.div>
              </motion.div>
            )
          })}
        </motion.div>
      </main>
    </PageTransition>
  )
}
