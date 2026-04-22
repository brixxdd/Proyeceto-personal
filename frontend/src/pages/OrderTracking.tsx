import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { motion } from 'framer-motion'
import { CheckCircle, Truck, ChefHat, Package, Clock, ArrowLeft } from 'lucide-react'
import PageTransition from '../components/PageTransition'

const GET_ORDER = gql`
  query GetOrder($id: ID!) {
    order(id: $id) {
      id status totalAmount restaurantId createdAt
      items {
        id menuItemId quantity price subtotal
      }
    }
  }
`

const STEPS = [
  { status: 'PENDING',    label: 'Pedido recibido', icon: Clock },
  { status: 'CONFIRMED',  label: 'Confirmado',       icon: CheckCircle },
  { status: 'PREPARING',  label: 'Preparando',       icon: ChefHat },
  { status: 'READY',      label: 'Listo para envío', icon: Package },
  { status: 'DELIVERING', label: 'En camino',        icon: Truck },
  { status: 'DELIVERED',  label: 'Entregado',        icon: CheckCircle },
]

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>()
  const { data, loading, error } = useQuery<any>(GET_ORDER, {
    variables: { id },
    pollInterval: 5000,
  })

  if (loading) return (
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

  if (error) return (
    <PageTransition>
      <div className="max-w-xl mx-auto px-4 py-12 text-center" style={{ color: 'var(--color-destructive)' }}>
        {error.message}
      </div>
    </PageTransition>
  )

  const order = data?.order as any
  const currentIdx = STEPS.findIndex((s: any) => s.status === order?.status)

  return (
    <PageTransition>
      <main className="max-w-xl mx-auto px-4 py-10 pb-28 md:pb-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-0.5">Seguimiento del pedido</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            #{order?.id?.slice(0, 8)}
          </p>
        </div>

        {/* Stepper */}
        <div
          className="p-5 rounded-3xl mb-6"
          style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}
        >
          {STEPS.map(({ status, label, icon: Icon }, idx) => {
            const done = idx <= currentIdx
            const active = idx === currentIdx
            const isLast = idx === STEPS.length - 1

            return (
              <div key={status} className="flex items-start gap-3">
                {/* Icon column */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="relative">
                    {/* Pulse ring on active */}
                    {active && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                        animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                    <motion.div
                      className="w-10 h-10 rounded-full flex items-center justify-center relative z-10"
                      animate={{
                        backgroundColor: done
                          ? active ? 'var(--color-primary)' : '#C2410C'
                          : 'var(--color-muted)',
                        scale: active ? 1.08 : 1,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25, delay: idx * 0.06 }}
                    >
                      <Icon
                        size={17}
                        style={{ color: done ? '#fff' : '#CBD5E1' }}
                        strokeWidth={done ? 2.5 : 1.8}
                      />
                    </motion.div>
                  </div>

                  {!isLast && (
                    <motion.div
                      className="w-0.5 my-1.5"
                      style={{ height: 22 }}
                      animate={{
                        backgroundColor: idx < currentIdx ? '#C2410C' : 'var(--color-border)',
                      }}
                      transition={{ duration: 0.4, delay: idx * 0.06 }}
                    />
                  )}
                </div>

                {/* Label */}
                <div className="flex items-center gap-2.5 pt-2.5 pb-4">
                  <motion.span
                    className="text-sm font-medium"
                    animate={{
                      color: active
                        ? 'var(--color-primary)'
                        : done
                          ? 'var(--color-foreground)'
                          : '#CBD5E1',
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {label}
                  </motion.span>
                  {active && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                    >
                      Actual
                    </motion.span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Order summary */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28, delay: 0.3 }}
          className="p-5 rounded-3xl mb-6"
          style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}
        >
          <h3 className="font-bold mb-4">Resumen del pedido</h3>
          <div className="flex flex-col gap-2.5">
            {order?.items?.map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-muted-foreground)' }}>
                  {item.quantity}× Artículo
                </span>
                <span className="font-medium">${item.subtotal?.toFixed(2)}</span>
              </div>
            ))}
            <div
              className="flex justify-between font-bold pt-3 mt-1 border-t"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span>Total</span>
              <span style={{ color: 'var(--color-primary)' }}>${order?.totalAmount?.toFixed(2)}</span>
            </div>
          </div>
        </motion.div>

        <Link
          to="/orders"
          className="flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: 'var(--color-primary)' }}
        >
          <ArrowLeft size={15} /> Todos mis pedidos
        </Link>
      </main>
    </PageTransition>
  )
}
