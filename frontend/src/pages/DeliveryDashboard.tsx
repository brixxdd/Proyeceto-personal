import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, MapPin, Clock, CheckCircle, Bike, RefreshCw, Navigation } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { slideUp, staggerContainer } from '../lib/animations'

const GET_MY_PROFILE = gql`
  query GetMyDeliveryProfile {
    myDeliveryPerson(userId: "") {
      id
      name
      status
      rating
      vehicleType
    }
  }
`

const GET_MY_DELIVERIES = gql`
  query GetMyDeliveries($deliveryPersonId: ID!) {
    myDeliveries(deliveryPersonId: $deliveryPersonId) {
      id
      orderId
      status
      pickupTime
      deliveryTime
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

const MY_DELIVERY_UPDATES = gql`
  subscription OnMyDeliveryUpdates($deliveryPersonId: ID!) {
    myDeliveryUpdates(deliveryPersonId: $deliveryPersonId) {
      id
      orderId
      status
      pickupTime
      deliveryTime
    }
  }
`

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; next?: string[] }> = {
  PENDING: { label: 'Disponible', color: '#6B7280', bg: '#F3F4F6', next: ['ASSIGNED'] },
  ASSIGNED: { label: 'Asignado', color: '#007AFF', bg: '#DBEAFE', next: ['PICKED_UP'] },
  PICKED_UP: { label: 'Recogido', color: '#F59E0B', bg: '#FEF3C7', next: ['IN_TRANSIT', 'DELIVERED'] },
  IN_TRANSIT: { label: 'En camino', color: '#8B5CF6', bg: '#EDE9FE', next: ['DELIVERED'] },
  DELIVERED: { label: 'Entregado', color: '#10B981', bg: '#D1FAE5', next: [] },
  CANCELLED: { label: 'Cancelado', color: '#EF4444', bg: '#FEE2E2', next: [] },
}

const VEHICLE_ICONS: Record<string, string> = {
  BICYCLE: '🚲',
  MOTORCYCLE: '🏍️',
  CAR: '🚗',
}

export default function DeliveryDashboard() {
  const navigate = useNavigate()
  const client = useApolloClient()
  const [localDeliveries, setLocalDeliveries] = useState<any[]>([])
  const [myDeliveryPersonId, setMyDeliveryPersonId] = useState<string | null>(null)

  const userId = useMemo(() => {
    const token = sessionStorage.getItem('token')
    if (!token) return null
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.userId || payload.sub
    } catch {
      return null
    }
  }, [])

  const { data: profileData, loading: profileLoading } = useQuery<any>(GET_MY_PROFILE, {
    variables: { userId: userId || '' },
    skip: !userId,
  })

  useEffect(() => {
    if (profileData?.myDeliveryPerson) {
      setMyDeliveryPersonId(profileData.myDeliveryPerson.id)
    }
  }, [profileData])

  const { data: deliveriesData, loading: deliveriesLoading, refetch: refetchDeliveries } = useQuery<any>(GET_MY_DELIVERIES, {
    variables: { deliveryPersonId: myDeliveryPersonId },
    skip: !myDeliveryPersonId,
  })

  const [updateStatus] = useMutation<any>(UPDATE_DELIVERY_STATUS)

  useEffect(() => {
    if (deliveriesData?.myDeliveries) {
      setLocalDeliveries(deliveriesData.myDeliveries)
    }
  }, [deliveriesData])

  useEffect(() => {
    if (!myDeliveryPersonId) return

    const observable = client.subscribe<any>({
      query: MY_DELIVERY_UPDATES,
      variables: { deliveryPersonId: myDeliveryPersonId },
    })

    const subscription = observable.subscribe({
      next: ({ data }) => {
        if (data?.myDeliveryUpdates) {
          const updated = data.myDeliveryUpdates
          setLocalDeliveries(prev =>
            prev.map(d => d.id === updated.id ? { ...d, ...updated } : d)
          )
        }
      },
      error: (err) => console.error('[DeliveryDashboard] Subscription error:', err)
    })

    return () => subscription.unsubscribe()
  }, [myDeliveryPersonId, client])

  async function handleStatusUpdate(deliveryId: string, newStatus: string) {
    await updateStatus({ variables: { id: deliveryId, status: newStatus } })
    refetchDeliveries()
  }

  if (!userId) {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-[var(--color-muted-foreground)]">Inicia sesión para ver tus entregas</p>
        </div>
      </PageTransition>
    )
  }

  if (profileLoading) {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto px-4 py-10 pb-28 md:pb-10">
          <div className="h-24 rounded-[20px] animate-pulse bg-[var(--color-border)] mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-[20px] animate-pulse bg-[var(--color-border)] opacity-60" />
            ))}
          </div>
        </div>
      </PageTransition>
    )
  }

  if (!profileData?.myDeliveryPerson) {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-[var(--color-muted-foreground)] mb-4">No tienes un perfil de repartidor registrado</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">Contacta a soporte para registrarte como repartidor</p>
        </div>
      </PageTransition>
    )
  }

  const profile = profileData.myDeliveryPerson
  const deliveries = localDeliveries

  return (
    <PageTransition>
      <main className="max-w-2xl mx-auto px-4 py-6 pb-32 md:pb-8">
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="mb-6">
          <motion.div variants={slideUp} className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-foreground)]">
                🚴 Panel de Repartidor
              </h1>
              <p className="text-[var(--color-muted-foreground)] text-sm mt-1">
                {VEHICLE_ICONS[profile.vehicleType] || '🚴'} {profile.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-muted-foreground)]">
                ⭐ {profile.rating?.toFixed(1) || '5.0'}
              </span>
            </div>
          </motion.div>

          <motion.div variants={slideUp} className="flex gap-2 overflow-x-auto pb-2">
            <span className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              {profile.status === 'AVAILABLE' ? '🟢 Disponible' : profile.status === 'BUSY' ? '🔴 En entrega' : '⚫ Offline'}
            </span>
          </motion.div>
        </motion.div>

        <AnimatePresence mode="wait">
          {deliveriesLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 rounded-[20px] animate-pulse bg-[var(--color-border)] opacity-60" />
              ))}
            </motion.div>
          ) : deliveries.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 rounded-full bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-4">
                <Package size={28} className="text-[var(--color-muted-foreground)]" />
              </div>
              <p className="font-semibold text-[var(--color-foreground)]">No tienes entregas asignadas</p>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1">Recibirás notificaciones cuando te asignen una</p>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              variants={{ animate: { transition: { staggerChildren: 0.07 } } }}
              initial="initial"
              animate="animate"
              className="space-y-4"
            >
              {deliveries.map((delivery: any) => {
                const statusCfg = STATUS_CONFIG[delivery.status] || STATUS_CONFIG.PENDING
                return (
                  <motion.div
                    key={delivery.id}
                    variants={slideUp}
                    className="bg-[var(--color-card)] rounded-[20px] border border-[var(--color-border)] p-5 ios-shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-[13px] font-mono text-[var(--color-muted-foreground)] mb-1">
                          #{delivery.orderId?.slice(0, 8)}
                        </p>
                        <div
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
                          style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
                        >
                          {statusCfg.label}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] text-[var(--color-muted-foreground)]">
                          {new Date(delivery.createdAt).toLocaleString('es-MX', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    {delivery.status === 'ASSIGNED' && (
                      <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] mb-3">
                        <MapPin size={14} />
                        <span>Ubicación del restaurante</span>
                        <Navigation size={12} className="ml-auto" />
                      </div>
                    )}

                    {statusCfg.next && statusCfg.next.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t border-[var(--color-border)]">
                        {statusCfg.next.map(nextStatus => {
                          const nextCfg = STATUS_CONFIG[nextStatus]
                          if (!nextCfg) return null
                          return (
                            <button
                              key={nextStatus}
                              onClick={() => handleStatusUpdate(delivery.id, nextStatus)}
                              className="px-4 py-2 rounded-[12px] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
                              style={{ backgroundColor: nextCfg.color }}
                            >
                              {nextStatus === 'PICKED_UP' && '✓ '}Recoger pedido
                              {nextStatus === 'IN_TRANSIT' && '🚴 '}Ir al cliente
                              {nextStatus === 'DELIVERED' && '✓ '}Marcar entregado
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </PageTransition>
  )
}
