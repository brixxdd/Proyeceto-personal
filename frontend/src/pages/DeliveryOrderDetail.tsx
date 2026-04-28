import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, Store, Package, Navigation, CheckCircle, Clock, Phone, Zap, Star, Map } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { slideUp, staggerContainer, bouncyTransition } from '../lib/animations'

const GET_DELIVERY_ORDER_DETAILS = gql`
  query GetDeliveryOrderDetails($orderId: ID!) {
    deliveryOrderDetails(orderId: $orderId) {
      orderId
      status
      totalAmount
      items {
        id
        name
        quantity
        price
        subtotal
      }
      customerAddress {
        street
        city
        state
        zipCode
        country
        coordinates {
          latitude
          longitude
        }
      }
      restaurantInfo {
        id
        name
        address
      }
      createdAt
    }
  }
`

const UPDATE_DELIVERY_STATUS = gql`
  mutation UpdateDeliveryStatus($id: ID!, $status: DeliveryStatus!) {
    updateDeliveryStatus(id: $id, status: $status) {
      id
      status
    }
  }
`

const GET_DELIVERY_BY_ORDER = gql`
  query GetDeliveryByOrder($orderId: ID!) {
    deliveries(orderId: $orderId) {
      id
      status
    }
  }
`

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; next?: string[]; icon: string }> = {
  PENDING:    { label: 'Disponible',   color: '#71717A', bg: '#F4F4F5', dot: '#A1A1AA', icon: '⏳', next: ['ASSIGNED'] },
  CONFIRMED:  { label: 'Confirmado',  color: '#1D4ED8', bg: '#EFF6FF', dot: '#3B82F6', icon: '✓', next: ['PREPARING'] },
  PREPARING:  { label: 'Preparando',  color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B', icon: '👨‍🍳', next: ['READY'] },
  READY:      { label: 'Listo',       color: '#059669', bg: '#ECFDF5', dot: '#10B981', icon: '🍽️', next: ['ASSIGNED'] },
  ASSIGNED:   { label: 'Asignado',    color: '#1D4ED8', bg: '#EFF6FF', dot: '#3B82F6', icon: '🏍️', next: ['PICKED_UP'] },
  PICKED_UP:  { label: 'Recogido',    color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B', icon: '📦', next: ['IN_TRANSIT', 'DELIVERED'] },
  IN_TRANSIT: { label: 'En camino',   color: '#7C3AED', bg: '#F5F3FF', dot: '#8B5CF6', icon: '🚴', next: ['DELIVERED'] },
  DELIVERED:  { label: 'Entregado',   color: '#059669', bg: '#ECFDF5', dot: '#10B981', icon: '✅', next: [] },
  CANCELLED:  { label: 'Cancelado',   color: '#DC2626', bg: '#FEF2F2', dot: '#EF4444', icon: '❌', next: [] },
}

const STEPS = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']

export default function DeliveryOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const orderId = id || ''

  const { data: detailsData, loading: detailsLoading, error: detailsError } = useQuery<any>(
    GET_DELIVERY_ORDER_DETAILS,
    { variables: { orderId } }
  )

  const { data: deliveryData, loading: deliveryLoading } = useQuery<any>(
    GET_DELIVERY_BY_ORDER,
    { variables: { orderId } }
  )

  const [updateStatus, { loading: updating }] = useMutation(UPDATE_DELIVERY_STATUS)

  const delivery = deliveryData?.deliveries?.[0]
  const details = detailsData?.deliveryOrderDetails
  const statusCfg = delivery ? (STATUS_CONFIG[delivery.status] || STATUS_CONFIG.PENDING) : null

  const currentStepIdx = STEPS.indexOf(delivery?.status || 'ASSIGNED')

  async function handleStatusUpdate(newStatus: string) {
    if (!delivery) return
    await updateStatus({ variables: { id: delivery.id, status: newStatus } })
    window.location.reload()
  }

  if (detailsLoading || deliveryLoading) return (
    <PageTransition>
      <div className="max-w-xl mx-auto px-4 py-10 pb-32 md:pb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl animate-pulse bg-[var(--color-border)]" />
          <div className="h-6 w-48 rounded-xl animate-pulse bg-[var(--color-border)]" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-2xl animate-pulse bg-[var(--color-card)] border border-[var(--color-border)]" />
          ))}
        </div>
      </div>
    </PageTransition>
  )

  if (detailsError) return (
    <PageTransition>
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <p className="font-bold text-red-600 text-[15px] mb-1">Error al cargar el pedido</p>
        <p className="text-sm text-[var(--color-muted-foreground)]">{detailsError.message}</p>
      </div>
    </PageTransition>
  )

  if (!details) return (
    <PageTransition>
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-4">
          <Package size={28} className="text-[var(--color-muted-foreground)]" />
        </div>
        <p className="font-bold text-[var(--color-foreground)] text-[15px]">Pedido no encontrado</p>
      </div>
    </PageTransition>
  )

  const hasCoords = details.customerAddress.coordinates != null

  return (
    <PageTransition>
      <main className="max-w-xl mx-auto px-4 py-6 pb-36 md:pb-8">

        {/* ── Header ─────────────────────────────────── */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="mb-6"
        >
          <motion.div variants={slideUp} className="flex items-center gap-3 mb-5">
            <Link
              to="/delivery"
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-95 active:scale-90"
              style={{ backgroundColor: 'var(--color-muted)' }}
            >
              <ArrowLeft size={18} style={{ color: 'var(--color-foreground)' }} />
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-black text-[var(--color-foreground)] tracking-tight">Detalle de entrega</h1>
              <p className="font-mono text-[12px] text-[var(--color-muted-foreground)] tracking-widest">
                #{orderId.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </motion.div>

          {/* Status badge + time */}
          {delivery && statusCfg && (
            <motion.div variants={slideUp} className="flex items-center gap-3 flex-wrap">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-bold shadow-sm"
                style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
              >
                <span className="text-base">{statusCfg.icon}</span>
                {statusCfg.label}
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-muted-foreground)]">
                <Clock size={12} />
                {new Date(details.createdAt).toLocaleString('es-MX', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ── Progress Tracker ───────────────────────── */}
        {delivery && currentStepIdx >= 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm"
          >
            <p className="text-[11px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest mb-3">Progreso</p>
            <div className="flex items-center gap-1">
              {STEPS.map((step, idx) => {
                const cfg = STATUS_CONFIG[step]
                const done = idx < currentStepIdx
                const active = idx === currentStepIdx
                return (
                  <div key={step} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        done
                          ? 'bg-[#22C55E] text-white shadow-md shadow-green-100'
                          : active
                            ? 'bg-[var(--color-primary)] text-white shadow-md shadow-primary/20'
                            : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
                      }`}
                    >
                      {done ? <CheckCircle size={16} /> : cfg.icon}
                    </div>
                    <p className={`text-[10px] font-semibold text-center leading-tight ${
                      active ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)]'
                    }`}>
                      {step === 'PICKED_UP' && 'Recogido'}
                      {step === 'IN_TRANSIT' && 'En camino'}
                      {step === 'DELIVERED' && 'Entregado'}
                    </p>
                    {idx < STEPS.length - 1 && (
                      <div className={`absolute h-0.5 w-full top-4 left-1/2 ${done ? 'bg-[#22C55E]' : 'bg-[var(--color-border)]'}`} style={{ display: 'none' }} />
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── Restaurant Card ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="group mb-3 p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/20 transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <Store size={20} className="text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[var(--color-foreground)] text-[15px] truncate">
                {details.restaurantInfo.name}
              </p>
              <div className="flex items-start gap-1.5 mt-1.5 text-[12px] text-[var(--color-muted-foreground)]">
                <MapPin size={12} className="mt-0.5 shrink-0" />
                <span className="leading-relaxed">{details.restaurantInfo.address}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Delivery Address Card ──────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="group mb-3 p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-red-300/30 transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <MapPin size={20} className="text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[var(--color-foreground)] text-[15px]">Dirección de entrega</p>
              <div className="mt-2 text-[13px] leading-relaxed">
                <p className="text-[var(--color-foreground)] font-medium">{details.customerAddress.street}</p>
                <p className="text-[var(--color-muted-foreground)]">
                  {details.customerAddress.city}, {details.customerAddress.state} {details.customerAddress.zipCode}
                </p>
              </div>
            </div>
          </div>

          {/* Google Maps button */}
          {hasCoords && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${details.customerAddress.coordinates.latitude},${details.customerAddress.coordinates.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-white text-[14px] font-bold hover:shadow-lg active:scale-[0.99] transition-all"
              style={{ background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)', boxShadow: '0 4px 14px rgba(66,133,244,0.35)' }}
            >
              <Navigation size={16} />
              Abrir en Google Maps
              <Map size={14} className="ml-1 opacity-70" />
            </a>
          )}
        </motion.div>

        {/* ── Order Items Card ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-3 p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)]"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Package size={20} className="text-[var(--color-primary)]" />
            </div>
            <p className="font-bold text-[var(--color-foreground)] text-[15px]">Items del pedido</p>
            <span className="ml-auto text-[11px] font-bold text-[var(--color-muted-foreground)] bg-[var(--color-muted)] px-2 py-1 rounded-full">
              {details.items.length} items
            </span>
          </div>

          <div className="space-y-3">
            {details.items.map((item: any, idx: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.22 + idx * 0.04 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-[13px] text-white"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #F59E0B 100%)' }}>
                  {item.quantity}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--color-foreground)] truncate">
                    {item.name || `Item #${idx + 1}`}
                  </p>
                  {item.name && (
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      ${item.price.toFixed(2)} c/u
                    </p>
                  )}
                </div>
                <p className="text-[14px] font-bold text-[var(--color-foreground)] shrink-0">
                  ${item.subtotal.toFixed(2)}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-5 pt-4 flex items-center justify-between border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-[var(--color-primary)]" />
              <span className="font-bold text-[var(--color-foreground)] text-[15px]">Total</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[var(--color-muted-foreground)] font-medium">MXN</span>
              <span className="text-2xl font-black text-[var(--color-foreground)]">
                ${details.totalAmount?.toFixed(2)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Action Card ─────────────────────────────── */}
        {delivery && statusCfg?.next && statusCfg.next.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-5 rounded-2xl bg-[var(--color-card)] border-2 border-[var(--color-border)] shadow-lg"
            style={{ borderColor: statusCfg.color + '40' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: statusCfg.bg }}
              >
                <CheckCircle size={20} style={{ color: statusCfg.color }} />
              </div>
              <div>
                <p className="font-bold text-[var(--color-foreground)] text-[15px]">Actualizar estado</p>
                <p className="text-[11px] text-[var(--color-muted-foreground)]">
                  {statusCfg.label} → {STATUS_CONFIG[statusCfg.next[0]]?.label}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {statusCfg.next.map(nextStatus => {
                const nextCfg = STATUS_CONFIG[nextStatus]
                if (!nextCfg) return null
                return (
                  <button
                    key={nextStatus}
                    onClick={() => handleStatusUpdate(nextStatus)}
                    disabled={updating}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-[14px] font-bold hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: nextCfg.color,
                      boxShadow: `0 4px 12px ${nextCfg.color}40`
                    }}
                  >
                    {updating ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {nextStatus === 'PICKED_UP' && <Package size={16} />}
                        {nextStatus === 'IN_TRANSIT' && <Navigation size={16} />}
                        {nextStatus === 'DELIVERED' && <CheckCircle size={16} />}
                        {nextStatus === 'PICKED_UP' && 'Recoger pedido'}
                        {nextStatus === 'IN_TRANSIT' && 'Ir al cliente'}
                        {nextStatus === 'DELIVERED' && 'Marcar entregado'}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </main>
    </PageTransition>
  )
}
