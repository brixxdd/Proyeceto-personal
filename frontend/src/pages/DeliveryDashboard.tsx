import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bike,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  Navigation,
  Bell,
  RefreshCw,
  Star,
  ChevronRight,
  CircleDot,
  Zap,
  AlertCircle,
} from 'lucide-react'
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

// ─── Status Config ─────────────────────────────────────────────────────────────
type StatusKey = 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'

const STATUS_CONFIG: Record<StatusKey, { label: string; dot: string; bg: string; text: string; border: string; next?: StatusKey[] }> = {
  PENDING:     { label: 'Disponible',  dot: '#22C55E', bg: '#052E16', text: '#22C55E', border: '#166534', next: ['ASSIGNED'] },
  ASSIGNED:    { label: 'Asignado',    dot: '#3B82F6', bg: '#1E3A5F', text: '#60A5FA', border: '#1D4ED8', next: ['PICKED_UP'] },
  PICKED_UP:   { label: 'Recogido',    dot: '#F59E0B', bg: '#451A03', text: '#FBBF24', border: '#D97706', next: ['IN_TRANSIT', 'DELIVERED'] },
  IN_TRANSIT:  { label: 'En camino',   dot: '#8B5CF6', bg: '#2E1065', text: '#C4B5FD', border: '#7C3AED', next: ['DELIVERED'] },
  DELIVERED:   { label: 'Entregado',   dot: '#10B981', bg: '#022C22', text: '#34D399', border: '#059669', next: [] },
  CANCELLED:   { label: 'Cancelado',   dot: '#EF4444', bg: '#450A0A', text: '#FCA5A5', border: '#DC2626', next: [] },
}

const NEXT_ACTION_LABELS: Record<string, string> = {
  PICKED_UP:  'Recoger pedido',
  IN_TRANSIT: 'Ir al cliente',
  DELIVERED:  'Marcar entregado',
}

// ─── Vehicle Config ────────────────────────────────────────────────────────────
const VEHICLE_CONFIG = {
  BICYCLE:    { label: 'Bicicleta',    icon: Bike },
  MOTORCYCLE: { label: 'Motocicleta',  icon: Zap },
  CAR:        { label: 'Automóvil',   icon: Package },
} as const

// ─── Animation variants ───────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const itemSlide = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const cardTap = {
  rest: { scale: 1 },
  pressed: { scale: 0.97 },
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="rounded-2xl bg-[var(--color-muted)] p-5 border border-[var(--color-border)] animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-[var(--color-border)]" />
          <div className="h-6 w-24 rounded bg-[var(--color-border)]" />
        </div>
        <div className="h-3 w-16 rounded bg-[var(--color-border)]" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 w-full rounded bg-[var(--color-border)] mb-2 last:mb-0" />
      ))}
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: StatusKey }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
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
        data: { myDeliveryPerson: createDeliveryPerson },
      })
    },
  })

  const [profileForm, setProfileForm] = useState({ name: '', vehicleType: 'BICYCLE' as string })

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !profileForm.name) return
    try {
      await createDeliveryPerson({
        variables: {
          userId,
          name: profileForm.name,
          vehicleType: profileForm.vehicleType,
        },
      })
    } catch (err) {
      console.error(err)
      alert('Error al crear perfil')
    }
  }

  // Sync my deliveries
  useEffect(() => {
    if (deliveriesData?.myDeliveries) {
      setLocalDeliveries(deliveriesData.myDeliveries)
    }
  }, [deliveriesData])

  // Sync available
  useEffect(() => {
    if (availableData?.availableDeliveries) {
      setLocalAvailable(availableData.availableDeliveries)
    }
  }, [availableData])

  // My deliveries subscription
  useEffect(() => {
    if (!myDeliveryPersonId) return
    const observable = client.subscribe<any>({
      query: MY_DELIVERY_UPDATES,
      variables: { deliveryPersonId: myDeliveryPersonId },
    })
    const subscription = observable.subscribe({
      next: ({ data }: any) => {
        if (data?.myDeliveryUpdates) {
          const updated = data.myDeliveryUpdates
          console.log('[DD] WS myDeliveryUpdates:', updated.status)
          setLocalDeliveries((prev) =>
            prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d))
          )
        }
      },
      error: (err: any) => console.error('[DD] Subscription error:', err),
    })
    return () => subscription.unsubscribe()
  }, [myDeliveryPersonId, client])

  // New available subscription
  useEffect(() => {
    const observable = client.subscribe<any>({ query: NEW_AVAILABLE_DELIVERY })
    const subscription = observable.subscribe({
      next: ({ data }: any) => {
        if (data?.newAvailableDelivery) {
          const newD = data.newAvailableDelivery
          console.log('[DD] WS newAvailableDelivery:', newD.orderId)
          setLocalAvailable((prev) => {
            if (prev.some((d) => d.id === newD.id)) return prev
            setNewDeliveryCount((c) => c + 1)
            return [newD, ...prev]
          })
        }
      },
      error: (err: any) => console.error('[DD] Available sub error:', err),
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
        console.log('[DD] Claimed:', deliveryId)
        setLocalAvailable((prev) => prev.filter((d) => d.id !== deliveryId))
        setNewDeliveryCount(0)
        setLocalDeliveries((prev) => [...prev, { ...accepted }])
        await refetchAvailable()
        await refetchMyDeliveries()
      }
    } catch (err: any) {
      console.error('[DD] Claim failed:', err.message)
      alert('Este pedido ya fue tomado por otro repartidor.')
      setLocalAvailable((prev) => prev.filter((d) => d.id !== deliveryId))
    } finally {
      setClaimingId(null)
    }
  }

  async function handleStatusUpdate(deliveryId: string, newStatus: string) {
    setLocalDeliveries((prev) =>
      prev.map((d) => (d.id === deliveryId ? { ...d, status: newStatus } : d))
    )
    await updateStatus({ variables: { id: deliveryId, status: newStatus } })
  }

  // ─── Auth guard ──────────────────────────────────────────────────────────────
  if (!userId) {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <AlertCircle className="w-12 h-12 text-[var(--color-muted-foreground)] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-2">Sesión requerida</h2>
          <p className="text-[var(--color-muted-foreground)]">Inicia sesión para acceder al panel.</p>
        </div>
      </PageTransition>
    )
  }

  // ─── Loading skeleton ────────────────────────────────────────────────────────
  if (profileLoading) {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="h-32 rounded-2xl animate-pulse bg-[var(--color-muted)] mb-6" />
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </PageTransition>
    )
  }

  // ─── Onboarding ──────────────────────────────────────────────────────────────
  if (!profileData?.myDeliveryPerson) {
    return (
      <PageTransition>
        <div className="max-w-xl mx-auto px-4 py-12">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="bg-[var(--color-muted)] p-8 md:p-10 rounded-3xl border border-[var(--color-border)]"
          >
            <motion.div variants={itemSlide} className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center">
                  <Bike className="w-6 h-6 text-[#22C55E]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[var(--color-foreground)]">Registro de Repartidor</h1>
                  <p className="text-sm text-[var(--color-muted-foreground)]">Completa tu perfil para empezar</p>
                </div>
              </div>
            </motion.div>

            <motion.form variants={itemSlide} onSubmit={handleCreateProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-foreground)] mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)] focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all text-[15px]"
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-foreground)] mb-3">
                  Tipo de vehículo
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(VEHICLE_CONFIG).map(([key, { label, icon: Icon }]) => (
                    <motion.button
                      key={key}
                      type="button"
                      whileTap={cardTap}
                      onClick={() => setProfileForm((f) => ({ ...f, vehicleType: key }))}
                      className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${
                        profileForm.vehicleType === key
                          ? 'border-[#22C55E] bg-[#22C55E]/10'
                          : 'border-[var(--color-border)] hover:border-[var(--color-muted-foreground)]'
                      }`}
                    >
                      <Icon className={`w-8 h-8 mx-auto mb-2 ${profileForm.vehicleType === key ? 'text-[#22C55E]' : 'text-[var(--color-muted-foreground)]'}`} />
                      <span className={`text-[12px] font-semibold ${profileForm.vehicleType === key ? 'text-[#22C55E]' : 'text-[var(--color-foreground)]'}`}>
                        {label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={creatingProfile || !profileForm.name}
                whileTap={cardTap}
                className="w-full py-4 rounded-xl bg-[#22C55E] text-[#052E16] font-bold text-[15px] hover:bg-[#16A34A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creatingProfile ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Comenzar a repartir
                  </>
                )}
              </motion.button>
            </motion.form>
          </motion.div>
        </div>
      </PageTransition>
    )
  }

  const profile = profileData.myDeliveryPerson
  const deliveries = localDeliveries

  return (
    <PageTransition>
      <main className="max-w-2xl mx-auto px-4 py-6 pb-36 md:pb-10">

        {/* ─── Header Card ───────────────────────────────────────────────────── */}
        <motion.div variants={container} initial="hidden" animate="show" className="mb-6">
          <motion.div
            variants={itemSlide}
            className="bg-[var(--color-muted)] rounded-2xl p-6 border border-[var(--color-border)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center">
                    <Bike className="w-7 h-7 text-[#22C55E]" />
                  </div>
                  {/* Online dot */}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[var(--color-muted)]"
                    style={{ backgroundColor: profile.status === 'AVAILABLE' ? '#22C55E' : profile.status === 'BUSY' ? '#EF4444' : '#6B7280' }}
                  />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-foreground)]">{profile.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={profile.status as StatusKey} />
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {VEHICLE_CONFIG[profile.vehicleType as keyof typeof VEHICLE_CONFIG]?.label || profile.vehicleType}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1.5 bg-[var(--color-background)] px-3 py-2 rounded-xl border border-[var(--color-border)]">
                <Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                <span className="text-sm font-bold text-[var(--color-foreground)]">
                  {profile.rating?.toFixed(1) || '5.0'}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* ─── Available Orders Banner ──────────────────────────────────────── */}
        <motion.div variants={container} initial="hidden" animate="show" className="mb-6">
          <motion.div variants={itemSlide}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#F59E0B]" />
                <h2 className="text-[15px] font-bold text-[var(--color-foreground)]">Pedidos Disponibles</h2>
                {newDeliveryCount > 0 && (
                  <motion.span
                    key={newDeliveryCount}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F59E0B] text-[#020617] text-[11px] font-bold"
                  >
                    +{newDeliveryCount}
                  </motion.span>
                )}
              </div>
              {availableLoading && <RefreshCw className="w-4 h-4 animate-spin text-[var(--color-muted-foreground)]" />}
            </div>

            <AnimatePresence mode="wait">
              {availableLoading ? (
                <motion.div key="avail-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  <SkeletonCard lines={1} />
                  <SkeletonCard lines={1} />
                </motion.div>
              ) : localAvailable.length === 0 ? (
                <motion.div
                  key="avail-empty"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-[var(--color-muted)] rounded-2xl border border-[var(--color-border)] p-8 text-center"
                >
                  <CircleDot className="w-8 h-8 text-[var(--color-muted-foreground)] mx-auto mb-3" />
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">Sin pedidos disponibles</p>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1">Te notificaremos cuando llegue uno nuevo</p>
                </motion.div>
              ) : (
                <motion.div
                  key="avail-list"
                  variants={{ show: { transition: { staggerChildren: 0.06 } } }}
                  initial="hidden"
                  animate="show"
                  className="space-y-3"
                >
                  {localAvailable.map((delivery: any) => (
                    <motion.div
                      key={delivery.id}
                      variants={itemSlide}
                      whileTap={cardTap}
                      className="bg-[var(--color-muted)] rounded-2xl border border-[#22C55E]/30 p-5 relative overflow-hidden"
                    >
                      {/* Left accent bar */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#22C55E]" />

                      <div className="flex items-start justify-between pl-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[12px] font-mono text-[var(--color-muted-foreground)]">
                              #{delivery.orderId?.slice(0, 8)}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                              NUEVO
                            </span>
                          </div>
                          <p className="text-[12px] text-[var(--color-muted-foreground)]">
                            {new Date(delivery.createdAt).toLocaleString('es-MX', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--color-muted-foreground)] mt-1" />
                      </div>

                      <motion.button
                        onClick={() => handleAcceptDelivery(delivery.id, delivery.orderId)}
                        disabled={claimingId === delivery.id}
                        whileTap={cardTap}
                        className="w-full mt-4 py-3.5 rounded-xl bg-[#22C55E] text-[#052E16] font-bold text-[14px] hover:bg-[#16A34A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {claimingId === delivery.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Tomando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Tomar este pedido
                          </>
                        )}
                      </motion.button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* ─── My Deliveries ──────────────────────────────────────────────────── */}
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={itemSlide} className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-[15px] font-bold text-[var(--color-foreground)]">Mis Entregas</h2>
            <span className="ml-auto px-2.5 py-0.5 rounded-full bg-[var(--color-muted)] text-[11px] font-bold text-[var(--color-muted-foreground)] border border-[var(--color-border)]">
              {deliveries.length}
            </span>
          </motion.div>

          <AnimatePresence mode="wait">
            {deliveriesLoading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <SkeletonCard lines={2} />
                <SkeletonCard lines={2} />
              </motion.div>
            ) : deliveries.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-[var(--color-muted)] rounded-2xl border border-[var(--color-border)] p-10 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-center mx-auto mb-4">
                  <Package className="w-7 h-7 text-[var(--color-muted-foreground)]" />
                </div>
                <p className="font-semibold text-[var(--color-foreground)]">Sin entregas activas</p>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">Toma un pedido disponible para comenzar</p>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                variants={{ show: { transition: { staggerChildren: 0.07 } } }}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {deliveries.map((delivery: any) => {
                  const statusCfg = STATUS_CONFIG[delivery.status as StatusKey] || STATUS_CONFIG.PENDING
                  const canAdvance = statusCfg.next && statusCfg.next.length > 0

                  return (
                    <motion.div
                      key={delivery.id}
                      variants={itemSlide}
                      className="bg-[var(--color-muted)] rounded-2xl border border-[var(--color-border)] p-5"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[13px] font-mono font-semibold text-[var(--color-foreground)]">
                              #{delivery.orderId?.slice(0, 8)}
                            </span>
                            <StatusBadge status={delivery.status as StatusKey} />
                          </div>
                          <p className="text-[12px] text-[var(--color-muted-foreground)]">
                            {new Date(delivery.createdAt).toLocaleString('es-MX', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>

                        {/* Status timeline dot */}
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className="w-3 h-3 rounded-full border-2 border-[var(--color-background)]"
                            style={{ backgroundColor: statusCfg.dot }}
                          />
                        </div>
                      </div>

                      {/* Pickup hint */}
                      {delivery.status === 'ASSIGNED' && (
                        <div className="flex items-center gap-2 text-[13px] text-[var(--color-muted-foreground)] mb-4 p-3 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
                          <MapPin className="w-4 h-4 text-[#3B82F6]" />
                          <span>Recoge en restaurante</span>
                          <Navigation className="w-3.5 h-3.5 ml-auto text-[#3B82F6]" />
                        </div>
                      )}

                      {delivery.status === 'IN_TRANSIT' && (
                        <div className="flex items-center gap-2 text-[13px] text-[var(--color-muted-foreground)] mb-4 p-3 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
                          <Navigation className="w-4 h-4 text-[#8B5CF6]" />
                          <span>En camino al cliente</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      {canAdvance && (
                        <div className="flex gap-2 flex-wrap mt-2 pt-4 border-t border-[var(--color-border)]">
                          {statusCfg.next!.map((nextStatus) => {
                            const nextCfg = STATUS_CONFIG[nextStatus]
                            return (
                              <motion.button
                                key={nextStatus}
                                whileTap={cardTap}
                                onClick={() => handleStatusUpdate(delivery.id, nextStatus)}
                                className="flex-1 py-3 rounded-xl text-white text-[13px] font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                                style={{ backgroundColor: nextCfg.dot }}
                              >
                                {nextCfg.label}
                                <ChevronRight className="w-3.5 h-3.5" />
                              </motion.button>
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
