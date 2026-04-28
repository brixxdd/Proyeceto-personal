import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, MapPin, Clock, CheckCircle, Bike, RefreshCw, Navigation, Bell } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { slideUp, staggerContainer } from '../lib/animations'

const GET_MY_PROFILE = gql`
  query GetMyDeliveryProfile($userId: ID!) {
    myDeliveryPerson(userId: $userId) {
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

const GET_AVAILABLE_DELIVERIES = gql`
  query GetAvailableDeliveries {
    availableDeliveries {
      id
      orderId
      status
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

const ACCEPT_DELIVERY = gql`
  mutation AcceptDelivery($orderId: ID!, $deliveryPersonId: ID!) {
    acceptDelivery(orderId: $orderId, deliveryPersonId: $deliveryPersonId) {
      id
      orderId
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

const NEW_AVAILABLE_DELIVERY = gql`
  subscription OnNewAvailableDelivery {
    newAvailableDelivery {
      id
      orderId
      status
      createdAt
    }
  }
`

const CREATE_DELIVERY_PERSON = gql`
  mutation CreateDeliveryPerson($userId: ID!, $name: String!, $vehicleType: VehicleType!) {
    createDeliveryPerson(userId: $userId, name: $name, vehicleType: $vehicleType) {
      id
      name
      status
      vehicleType
      rating
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
  const [localAvailable, setLocalAvailable] = useState<any[]>([])
  const [myDeliveryPersonId, setMyDeliveryPersonId] = useState<string | null>(null)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [newDeliveryCount, setNewDeliveryCount] = useState(0)

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

  const { data: deliveriesData, loading: deliveriesLoading, refetch: refetchMyDeliveries } = useQuery<any>(GET_MY_DELIVERIES, {
    variables: { deliveryPersonId: myDeliveryPersonId },
    skip: !myDeliveryPersonId,
  })

  const { data: availableData, loading: availableLoading, refetch: refetchAvailable } = useQuery<any>(GET_AVAILABLE_DELIVERIES, {
    pollInterval: 8000,
    notifyOnNetworkStatusChange: false,
  })

  const [updateStatus] = useMutation<any>(UPDATE_DELIVERY_STATUS)
  const [acceptDeliveryMutation] = useMutation<any>(ACCEPT_DELIVERY)
  const [createDeliveryPerson, { loading: creatingProfile }] = useMutation<any>(CREATE_DELIVERY_PERSON, {
    update(cache, { data: { createDeliveryPerson } }) {
      cache.writeQuery({
        query: GET_MY_PROFILE,
        variables: { userId: userId || '' },
        data: { myDeliveryPerson: createDeliveryPerson }
      })
    }
  })

  const [profileForm, setProfileForm] = useState({ name: '', vehicleType: 'BICYCLE' })

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !profileForm.name) return
    try {
      await createDeliveryPerson({
        variables: {
          userId,
          name: profileForm.name,
          vehicleType: profileForm.vehicleType
        }
      })
    } catch (err) {
      console.error(err)
      alert('Error al crear perfil')
    }
  }

  // Sync my assigned deliveries
  useEffect(() => {
    if (deliveriesData?.myDeliveries) {
      setLocalDeliveries(deliveriesData.myDeliveries)
    }
  }, [deliveriesData])

  // Sync available deliveries list
  useEffect(() => {
    if (availableData?.availableDeliveries) {
      setLocalAvailable(availableData.availableDeliveries)
    }
  }, [availableData])

  // My assigned deliveries subscription
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
          console.log('[DeliveryDashboard] WS myDeliveryUpdates:', updated.status)
          setLocalDeliveries(prev =>
            prev.map(d => d.id === updated.id ? { ...d, ...updated } : d)
          )
        }
      },
      error: (err) => console.error('[DeliveryDashboard] Subscription error:', err)
    })

    return () => subscription.unsubscribe()
  }, [myDeliveryPersonId, client])

  // New available deliveries subscription — broadcasts to ALL drivers
  useEffect(() => {
    const observable = client.subscribe<any>({
      query: NEW_AVAILABLE_DELIVERY,
    })

    const subscription = observable.subscribe({
      next: ({ data }) => {
        if (data?.newAvailableDelivery) {
          const newDelivery = data.newAvailableDelivery
          console.log('[DeliveryDashboard] WS newAvailableDelivery:', newDelivery.orderId)
          setLocalAvailable(prev => {
            const exists = prev.some(d => d.id === newDelivery.id)
            if (exists) return prev
            setNewDeliveryCount(c => c + 1)
            return [newDelivery, ...prev]
          })
        }
      },
      error: (err) => console.error('[DeliveryDashboard] Available subscription error:', err)
    })

    return () => subscription.unsubscribe()
  }, [client])

  async function handleAcceptDelivery(deliveryId: string, orderId: string) {
    if (!myDeliveryPersonId) return
    setClaimingId(deliveryId)
    try {
      const { data } = await acceptDeliveryMutation({
        variables: { orderId, deliveryPersonId: myDeliveryPersonId },
      })
      const accepted = data?.acceptDelivery
      if (accepted) {
        console.log('[DeliveryDashboard] Claimed delivery:', deliveryId)
        setLocalAvailable(prev => prev.filter(d => d.id !== deliveryId))
        setNewDeliveryCount(0)
        // Add to localDeliveries optimistically and refetch
        setLocalDeliveries(prev => [...prev, { ...accepted }])
        await refetchAvailable()
        await refetchMyDeliveries()
      }
    } catch (err: any) {
      console.error('[DeliveryDashboard] Failed to claim delivery:', err.message)
      alert('Este pedido ya fue tomado por otro repartidor. Se移除 de la lista.')
      setLocalAvailable(prev => prev.filter(d => d.id !== deliveryId))
    } finally {
      setClaimingId(null)
    }
  }

  async function handleStatusUpdate(deliveryId: string, newStatus: string) {
    setLocalDeliveries(prev => prev.map(d =>
      d.id === deliveryId ? { ...d, status: newStatus } : d
    ))
    await updateStatus({ variables: { id: deliveryId, status: newStatus } })
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
        <div className="max-w-xl mx-auto px-4 py-12">
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="bg-[var(--color-card)] p-6 md:p-8 rounded-[24px] border border-[var(--color-border)] text-center ios-shadow-sm">
            <div className="w-16 h-16 rounded-[20px] bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-5">
              <Bike size={32} className="text-[var(--color-primary)]" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold mb-2">Completar perfil de repartidor</h2>
            <p className="text-[14px] text-[var(--color-muted-foreground)] mb-6">
              Para comenzar a recibir pedidos, necesitamos algunos datos adicionales.
            </p>
            <form onSubmit={handleCreateProfile} className="flex flex-col gap-5 text-left">
              <div>
                <label className="text-[13px] font-semibold px-1">Nombre completo</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full mt-1.5 px-4 py-3.5 rounded-[16px] bg-[var(--color-muted)] border border-[var(--color-border)] focus:bg-[var(--color-card)] transition-colors text-[15px]"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold px-1">Tipo de vehículo</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {[
                    { value: 'BICYCLE', label: 'Bicicleta', icon: '🚲' },
                    { value: 'MOTORCYCLE', label: 'Motocicleta', icon: '🏍️' },
                    { value: 'CAR', label: 'Auto', icon: '🚗' },
                  ].map(v => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => setProfileForm(f => ({ ...f, vehicleType: v.value }))}
                      className={`p-3 rounded-[16px] border text-center transition-all ${profileForm.vehicleType === v.value
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                        : 'border-[var(--color-border)] bg-[var(--color-muted)] hover:bg-[var(--color-card)]'
                        }`}
                    >
                      <span className="text-2xl block mb-1">{v.icon}</span>
                      <span className={`text-[12px] font-bold ${profileForm.vehicleType === v.value ? 'text-[var(--color-primary)]' : 'text-[var(--color-foreground)]'
                        }`}>{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={creatingProfile || !profileForm.name}
                className="w-full mt-2 py-4 rounded-[16px] bg-[var(--color-primary)] text-white font-bold text-[15px] hover:opacity-90 transition-opacity disabled:opacity-50 ios-shadow"
              >
                {creatingProfile ? 'Guardando...' : 'Comenzar a repartir'}
              </button>
            </form>
          </motion.div>
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

        {/* ═══════════════ PEDIDOS DISPONIBLES ═══════════════ */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="mb-8">
          <motion.div variants={slideUp} className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-orange-500" />
              <h2 className="text-[16px] font-bold text-[var(--color-foreground)]">Pedidos Disponibles</h2>
              {newDeliveryCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[11px] font-bold">
                  +{newDeliveryCount}
                </span>
              )}
            </div>
            {availableLoading && <RefreshCw size={14} className="animate-spin text-[var(--color-muted-foreground)]" />}
          </motion.div>

          <AnimatePresence mode="wait">
            {availableLoading ? (
              <motion.div key="avail-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="h-20 rounded-[16px] animate-pulse bg-[var(--color-border)] opacity-60" />
                  ))}
                </div>
              </motion.div>
            ) : localAvailable.length === 0 ? (
              <motion.div
                key="avail-empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-[var(--color-card)] rounded-[16px] border border-[var(--color-border)] p-6 text-center"
              >
                <p className="text-sm text-[var(--color-muted-foreground)]">No hay pedidos disponibles en este momento</p>
                <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1">Te notificaremos cuando arrive uno nuevo</p>
              </motion.div>
            ) : (
              <motion.div
                key="avail-list"
                variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
                initial="initial"
                animate="animate"
                className="space-y-3"
              >
                {localAvailable.map((delivery: any) => (
                  <motion.div
                    key={delivery.id}
                    variants={slideUp}
                    className="bg-[var(--color-card)] rounded-[16px] border-2 border-green-200 p-4 ios-shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[13px] font-mono text-[var(--color-muted-foreground)]">
                          #{delivery.orderId?.slice(0, 8)}
                        </p>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700 mt-1">
                          🟢 Disponible
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-[var(--color-muted-foreground)]">
                          {new Date(delivery.createdAt).toLocaleString('es-MX', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAcceptDelivery(delivery.id, delivery.orderId)}
                      disabled={claimingId === delivery.id}
                      className="w-full mt-2 py-2.5 rounded-[12px] bg-green-500 text-white text-[13px] font-bold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {claimingId === delivery.id ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Tomando...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} />
                          Tomar este pedido
                        </>
                      )}
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ═══════════════ MIS ENTREGAS ═══════════════ */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate">
          <motion.div variants={slideUp} className="flex items-center gap-2 mb-3">
            <Package size={18} className="text-[var(--color-primary)]" />
            <h2 className="text-[16px] font-bold text-[var(--color-foreground)]">Mis Entregas</h2>
            <span className="px-2 py-0.5 rounded-full bg-[var(--color-muted)] text-[11px] text-[var(--color-muted-foreground)]">
              {deliveries.length}
            </span>
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
                className="text-center py-16"
              >
                <div className="w-16 h-16 rounded-full bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-4">
                  <Package size={28} className="text-[var(--color-muted-foreground)]" />
                </div>
                <p className="font-semibold text-[var(--color-foreground)]">No tienes entregas asignadas</p>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">Tomate un pedido disponible arriba</p>
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
        </motion.div>
      </main>
    </PageTransition>
  )
}
