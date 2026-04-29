import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bike,
  Zap,
  Star,
  MapPin,
  Navigation,
  Clock,
  Package,
  CheckCircle,
  ChevronRight,
  CircleDot,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { slideUp, staggerContainer } from '../lib/animations'

// ─── GraphQL ────────────────────────────────────────────────────────────────────
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

// ─── Configs ────────────────────────────────────────────────────────────────────
const DELIVERY_STATUS: Record<string, { label: string; dot: string; color: string; bg: string; next?: string[] }> = {
  PENDING:    { label: 'Pendiente',   dot: '#6B7280', color: '#6B7280', bg: '#1F2937', next: ['ASSIGNED'] },
  ASSIGNED:   { label: 'Asignado',     dot: '#3B82F6', color: '#3B82F6', bg: '#1E3A5F', next: ['PICKED_UP'] },
  PICKED_UP:  { label: 'Recogido',     dot: '#F59E0B', color: '#F59E0B', bg: '#451A03', next: ['IN_TRANSIT', 'DELIVERED'] },
  IN_TRANSIT: { label: 'En camino',    dot: '#8B5CF6', color: '#8B5CF6', bg: '#2E1065', next: ['DELIVERED'] },
  DELIVERED:  { label: 'Entregado',    dot: '#10B981', color: '#10B981', bg: '#022C22', next: [] },
  CANCELLED:  { label: 'Cancelado',    dot: '#EF4444', color: '#EF4444', bg: '#450A0A', next: [] },
}

const DRIVER_STATUS_CONFIG = {
  AVAILABLE: { label: 'En línea',   color: '#22C55E', bg: '#052E16' },
  BUSY:      { label: 'En entrega',  color: '#F59E0B', bg: '#451A03' },
  OFFLINE:   { label: 'Desconectado', color: '#6B7280', bg: '#1F2937' },
}

const VEHICLE_CONFIG = {
  BICYCLE:    { label: 'Bicicleta',     icon: Bike },
  MOTORCYCLE: { label: 'Motocicleta',   icon: Zap },
  CAR:        { label: 'Automóvil',     icon: Package },
} as const

const NEXT_ACTION: Record<string, string> = {
  PICKED_UP:  'Recoger pedido',
  IN_TRANSIT: 'Ir al cliente',
  DELIVERED:  'Marcar entregado',
}

// ─── Animation ────────────────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
}
const tap = { rest: { scale: 1 }, pressed: { scale: 0.96 } }

// ─── Sub-components ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-[var(--color-muted)] border border-[var(--color-border)] p-5 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-[var(--color-border)]" />
          <div className="h-5 w-28 rounded bg-[var(--color-border)]" />
        </div>
        <div className="h-3 w-16 rounded bg-[var(--color-border)]" />
      </div>
      <div className="h-10 w-full rounded-xl bg-[var(--color-border)]" />
    </div>
  )
}

function DriverAvatar({ vehicleType }: { vehicleType: string }) {
  const Icon = VEHICLE_CONFIG[vehicleType as keyof typeof VEHICLE_CONFIG]?.icon || Bike
  return (
    <div className="w-12 h-12 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center">
      <Icon className="w-6 h-6 text-[#22C55E]" />
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DeliveryDashboard() {
  const client = useApolloClient()

  // ─── Estado local — ÚNICA fuente de verdad para la UI ───────────────────
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
    } catch { return null }
  }, [])

  // ─── Perfil ──────────────────────────────────────────────────────────────
  const { data: profileData, loading: profileLoading } = useQuery<any>(GET_MY_PROFILE, {
    variables: { userId: userId || '' },
    skip: !userId,
  })

  useEffect(() => {
    if (profileData?.myDeliveryPerson) {
      setMyDeliveryPersonId(profileData.myDeliveryPerson.id)
    }
  }, [profileData])

  // ─── Deliveries query — sincroniza estado local UNA SOLA VEZ ─────────────
  // fetchPolicy: 'cache-and-network' → muestra cache inmediatamente, luego refetch en background
  const { data: deliveriesData, loading: deliveriesLoading, refetch: refetchMyDeliveries } = useQuery<any>(GET_MY_DELIVERIES, {
    variables: { deliveryPersonId: myDeliveryPersonId },
    skip: !myDeliveryPersonId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 8000,
  })

  // Sync: solo se ejecuta cuando Apollo retorna datos reales (no cada render).
  // Solo poblamos si localDeliveries esta vacio — la subscription + mutation mantienen el estado.
  useEffect(() => {
    if (deliveriesData?.myDeliveries) {
      setLocalDeliveries((prev) => {
        if (!prev || prev.length === 0) return deliveriesData.myDeliveries
        return prev
      })
    }
  }, [deliveriesData])

  // ─── Available deliveries query ─────────────────────────────────────────
  const { data: availableData, loading: availableLoading, refetch: refetchAvailable } = useQuery<any>(GET_AVAILABLE_DELIVERIES, {
    pollInterval: 8000,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: false,
  })

  useEffect(() => {
    if (availableData?.availableDeliveries) {
      setLocalAvailable(availableData.availableDeliveries)
    }
  }, [availableData])

  // ─── Mutations ──────────────────────────────────────────────────────────
  const [updateStatus] = useMutation<any>(UPDATE_DELIVERY_STATUS)
  const [acceptDeliveryMutation] = useMutation<any>(ACCEPT_DELIVERY)
  const [createDeliveryPerson, { loading: creatingProfile }] = useMutation<any>(CREATE_DELIVERY_PERSON, {
    update(cache, { data: { createDeliveryPerson } }) {
      cache.writeQuery({ query: GET_MY_PROFILE, variables: { userId: userId || '' }, data: { myDeliveryPerson: createDeliveryPerson } })
    },
  })

  const [profileForm, setProfileForm] = useState({ name: '', vehicleType: 'BICYCLE' })

  // ─── Subscription: Mis entregas ─────────────────────────────────────────
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
          setLocalDeliveries(prev => {
            const exists = prev.some(d => d.id === updated.id)
            if (exists) {
              // Merge: actualizar solo campos que vienen en la actualización
              return prev.map(d => d.id === updated.id ? { ...d, ...updated } : d)
            }
            // Prepend: agregar al inicio (más nuevo primero)
            return [updated, ...prev]
          })
        }
      },
      error: (err: any) => console.error('[DD] Sub error:', err),
    })

    return () => subscription.unsubscribe()
  }, [myDeliveryPersonId, client])

  // ─── Subscription: Nuevos pedidos disponibles ──────────────────────────
  useEffect(() => {
    const observable = client.subscribe<any>({ query: NEW_AVAILABLE_DELIVERY })

    const subscription = observable.subscribe({
      next: ({ data }: any) => {
        if (data?.newAvailableDelivery) {
          const nd = data.newAvailableDelivery
          console.log('[DD] WS newAvailableDelivery:', nd.orderId)
          setLocalAvailable(prev => {
            if (prev.some(d => d.id === nd.id)) return prev
            setNewDeliveryCount(c => c + 1)
            return [nd, ...prev]
          })
        }
      },
      error: (err: any) => console.error('[DD] Avail sub error:', err),
    })

    return () => subscription.unsubscribe()
  }, [client])

  // ─── Handlers ────────────────────────────────────────────────────────────
  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !profileForm.name) return
    try {
      await createDeliveryPerson({ variables: { userId, name: profileForm.name, vehicleType: profileForm.vehicleType } })
    } catch (err) {
      console.error(err)
      alert('Error al crear perfil')
    }
  }

  // Accept: NO modifica estado local directamente.
  // El mutation trigger -> subscription -> actualiza el estado.
  // Solo remueve de la lista de disponibles localmente para feedback inmediato.
  async function handleAcceptDelivery(deliveryId: string, orderId: string) {
    if (!myDeliveryPersonId) return
    setClaimingId(deliveryId)
    try {
      const { data: mutationData } = await acceptDeliveryMutation({
        variables: { orderId, deliveryPersonId: myDeliveryPersonId },
      })

      // Actualizar estado local INMEDIATAMENTE — la subscription es backup
      if (mutationData?.acceptDelivery) {
        const accepted = mutationData.acceptDelivery
        setLocalDeliveries(prev => {
          if (prev.some(d => d.id === accepted.id)) return prev
          return [accepted, ...prev]
        })
      }

      setLocalAvailable(prev => prev.filter(d => d.id !== deliveryId))
      setNewDeliveryCount(0)
      await refetchAvailable()
    } catch (err: any) {
      alert('Este pedido ya fue tomado por otro repartidor.')
      setLocalAvailable(prev => prev.filter(d => d.id !== deliveryId))
    } finally {
      setClaimingId(null)
    }
  }

  // Status update: mutation only — la subscription se encarga de sincronizar
  async function handleStatusUpdate(deliveryId: string, newStatus: string) {
    await updateStatus({ variables: { id: deliveryId, status: newStatus } })
  }

  // ─── Auth ───────────────────────────────────────────────────────────────
  if (!userId) return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <AlertCircle className="w-12 h-12 text-[var(--color-muted-foreground)] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-2">Sesión requerida</h2>
        <p className="text-[var(--color-muted-foreground)]">Inicia sesión para acceder al panel.</p>
      </div>
    </PageTransition>
  )

  // ─── Loading skeleton ────────────────────────────────────────────────────
  if (profileLoading) return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-28 rounded-2xl animate-pulse bg-[var(--color-muted)]" />
        <div className="h-40 rounded-2xl animate-pulse bg-[var(--color-muted)]" />
        <SkeletonCard />
      </div>
    </PageTransition>
  )

  // ─── Onboarding ──────────────────────────────────────────────────────────
  if (!profileData?.myDeliveryPerson) return (
    <PageTransition>
      <div className="max-w-xl mx-auto px-4 py-12">
        <motion.div variants={container} initial="hidden" animate="show" className="bg-[var(--color-muted)] p-8 md:p-10 rounded-3xl border border-[var(--color-border)]">
          <motion.div variants={item} className="flex items-center gap-4 mb-8">
            <DriverAvatar vehicleType="BICYCLE" />
            <div>
              <h1 className="text-xl font-bold text-[var(--color-foreground)]">Registro de Repartidor</h1>
              <p className="text-sm text-[var(--color-muted-foreground)]">Completa tu perfil para empezar</p>
            </div>
          </motion.div>

          <motion.form variants={item} onSubmit={handleCreateProfile} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-foreground)] mb-2">Nombre completo</label>
              <input type="text" required value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)] focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all text-[15px]"
                placeholder="Ej. Juan Pérez" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-foreground)] mb-3">Tipo de vehículo</label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(VEHICLE_CONFIG).map(([key, { label, icon: Icon }]) => (
                  <motion.button key={key} type="button" whileTap={tap}
                    onClick={() => setProfileForm(f => ({ ...f, vehicleType: key }))}
                    className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${profileForm.vehicleType === key ? 'border-[#22C55E] bg-[#22C55E]/10' : 'border-[var(--color-border)] hover:border-[var(--color-muted-foreground)]'}`}>
                    <Icon className={`w-7 h-7 mx-auto mb-2 ${profileForm.vehicleType === key ? 'text-[#22C55E]' : 'text-[var(--color-muted-foreground)]'}`} />
                    <span className={`text-[12px] font-semibold ${profileForm.vehicleType === key ? 'text-[#22C55E]' : 'text-[var(--color-foreground)]'}`}>{label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <motion.button type="submit" disabled={creatingProfile || !profileForm.name} whileTap={tap}
              className="w-full py-4 rounded-xl bg-[#22C55E] text-[#052E16] font-bold text-[15px] hover:bg-[#16A34A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {creatingProfile ? <><RefreshCw className="w-4 h-4 animate-spin" />Guardando...</> : <><CheckCircle className="w-4 h-4" />Comenzar a repartir</>}
            </motion.button>
          </motion.form>
        </motion.div>
      </div>
    </PageTransition>
  )

  const profile = profileData.myDeliveryPerson
  const driverStatusCfg = DRIVER_STATUS_CONFIG[profile.status as keyof typeof DRIVER_STATUS_CONFIG] || DRIVER_STATUS_CONFIG.OFFLINE
  const activeDeliveries = localDeliveries.filter(d => !['DELIVERED', 'CANCELLED'].includes(d.status))
  const completedDeliveries = localDeliveries.filter(d => ['DELIVERED', 'CANCELLED'].includes(d.status))

  return (
    <PageTransition>
      <main className="max-w-2xl mx-auto px-4 py-6 pb-36 md:pb-10">

        {/* DRIVER HEADER CARD */}
        <motion.div variants={container} initial="hidden" animate="show" className="mb-6">
          <motion.div variants={item} className="bg-[var(--color-muted)] rounded-2xl p-5 border border-[var(--color-border)]">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <DriverAvatar vehicleType={profile.vehicleType} />
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--color-muted)]"
                  style={{ backgroundColor: driverStatusCfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-[var(--color-foreground)] truncate">{profile.name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ backgroundColor: driverStatusCfg.bg, color: driverStatusCfg.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: driverStatusCfg.color }} />
                    {driverStatusCfg.label}
                  </span>
                  <span className="text-[12px] text-[var(--color-muted-foreground)]">
                    {VEHICLE_CONFIG[profile.vehicleType as keyof typeof VEHICLE_CONFIG]?.label}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-[var(--color-background)] px-3 py-2 rounded-xl border border-[var(--color-border)] shrink-0">
                <Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                <span className="text-sm font-bold text-[var(--color-foreground)]">{profile.rating?.toFixed(1) || '5.0'}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* PEDIDOS DISPONIBLES — horizontal scroll cards */}
        <motion.section variants={container} initial="hidden" animate="show" className="mb-6">
          <motion.div variants={item} className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CircleDot className="w-5 h-5 text-[#22C55E]" />
              <h2 className="text-[15px] font-bold text-[var(--color-foreground)]">Pedidos Disponibles</h2>
              {localAvailable.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[11px] font-bold text-[#22C55E] border border-[#22C55E]/20">
                  {localAvailable.length}
                </span>
              )}
              {newDeliveryCount > 0 && (
                <motion.span key={newDeliveryCount} initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                  className="px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[11px] font-bold text-[#F59E0B] border border-[#F59E0B]/20">
                  +{newDeliveryCount} nuevo
                </motion.span>
              )}
            </div>
            {availableLoading && <RefreshCw className="w-4 h-4 animate-spin text-[var(--color-muted-foreground)]" />}
          </motion.div>

          <AnimatePresence mode="wait">
            {availableLoading && localAvailable.length === 0 ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                <div className="shrink-0 w-[260px] rounded-2xl bg-[var(--color-muted)] border border-[var(--color-border)] p-5 animate-pulse">
                  <div className="h-3 w-20 rounded bg-[var(--color-border)] mb-3" />
                  <div className="h-3 w-16 rounded bg-[var(--color-border)] mb-4" />
                  <div className="h-10 w-full rounded-xl bg-[var(--color-border)]" />
                </div>
              </motion.div>
            ) : localAvailable.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-[var(--color-muted)] rounded-2xl border border-[var(--color-border)] p-8 text-center">
                <CircleDot className="w-8 h-8 text-[var(--color-muted-foreground)] mx-auto mb-3" />
                <p className="text-sm font-semibold text-[var(--color-foreground)]">Sin pedidos disponibles</p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">Te notificaremos cuando llegue uno nuevo</p>
              </motion.div>
            ) : (
              <motion.div key="list" className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
                variants={{ show: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="show">
                {localAvailable.map((delivery: any) => (
                  <motion.div key={delivery.id} variants={item}
                    className="shrink-0 w-[260px] bg-[var(--color-muted)] rounded-2xl border border-[#22C55E]/20 p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-mono font-bold text-[var(--color-foreground)]">#{delivery.orderId?.slice(0, 8)}</span>
                        {newDeliveryCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-[#FF3B30] animate-pulse" />
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-full">NUEVO</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[var(--color-muted-foreground)]">
                      <Clock className="w-3 h-3" />
                      {new Date(delivery.createdAt).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex-1" />
                    <motion.button whileTap={tap}
                      onClick={() => handleAcceptDelivery(delivery.id, delivery.orderId)}
                      disabled={claimingId === delivery.id}
                      className="w-full py-3 rounded-xl bg-[#22C55E] text-[#052E16] font-bold text-[13px] hover:bg-[#16A34A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
                      {claimingId === delivery.id ? (
                        <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Tomando...</>
                      ) : (
                        <><CheckCircle className="w-3.5 h-3.5" />Tomar</>
                      )}
                    </motion.button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ENTREGA ACTIVA */}
        {activeDeliveries.length > 0 && (
          <motion.section variants={container} initial="hidden" animate="show" className="mb-6">
            <motion.div variants={item} className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-[#3B82F6]" />
              <h2 className="text-[15px] font-bold text-[var(--color-foreground)]">Entrega Activa</h2>
              <span className="ml-auto px-2.5 py-0.5 rounded-full bg-[#3B82F6]/10 text-[11px] font-bold text-[#3B82F6] border border-[#3B82F6]/20">
                {activeDeliveries.length}
              </span>
            </motion.div>

            <AnimatePresence>
              {activeDeliveries.map((delivery: any) => {
                const cfg = DELIVERY_STATUS[delivery.status] || DELIVERY_STATUS.PENDING
                const canAdvance = cfg.next && cfg.next.length > 0

                return (
                  <motion.div key={delivery.id} variants={item}
                    className="bg-[var(--color-muted)] rounded-2xl border border-[var(--color-border)] p-5 mb-3 overflow-hidden">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[14px] font-mono font-bold text-[var(--color-foreground)]">#{delivery.orderId?.slice(0, 8)}</span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                            style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[12px] text-[var(--color-muted-foreground)]">
                          <Clock className="w-3 h-3" />
                          {new Date(delivery.createdAt).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {/* Timeline dots */}
                      <div className="flex flex-col items-center gap-1.5 pt-1">
                        {['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].map((s, i) => {
                          const isCurrent = delivery.status === s
                          const isPast = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].indexOf(delivery.status) > i
                          const stepCfg = DELIVERY_STATUS[s]
                          return (
                            <div key={s} className="flex items-center gap-1.5">
                              <div className={`w-2.5 h-2.5 rounded-full border ${isCurrent ? 'border-[var(--color-foreground)]' : 'border-[var(--color-border)]'}`}
                                style={{ backgroundColor: isPast || isCurrent ? stepCfg?.dot : 'transparent' }} />
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {delivery.status === 'ASSIGNED' && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-[#3B82F6]/5 border border-[#3B82F6]/20 mb-4">
                        <MapPin className="w-4 h-4 text-[#3B82F6]" />
                        <span className="text-[13px] text-[#3B82F6] font-medium">Recoge en restaurante</span>
                        <Navigation className="w-4 h-4 text-[#3B82F6] ml-auto" />
                      </div>
                    )}
                    {delivery.status === 'PICKED_UP' && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/20 mb-4">
                        <Package className="w-4 h-4 text-[#F59E0B]" />
                        <span className="text-[13px] text-[#F59E0B] font-medium">Paquete recogido — dirigirte al cliente</span>
                        <Navigation className="w-4 h-4 text-[#F59E0B] ml-auto" />
                      </div>
                    )}
                    {delivery.status === 'IN_TRANSIT' && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-[#8B5CF6]/5 border border-[#8B5CF6]/20 mb-4">
                        <Navigation className="w-4 h-4 text-[#8B5CF6]" />
                        <span className="text-[13px] text-[#8B5CF6] font-medium">En camino al cliente</span>
                      </div>
                    )}

                    {canAdvance && (
                      <div className="flex gap-2 pt-3 border-t border-[var(--color-border)]">
                        {cfg.next!.map(nextStatus => {
                          const nextCfg = DELIVERY_STATUS[nextStatus]
                          return (
                            <motion.button key={nextStatus} whileTap={tap}
                              onClick={() => handleStatusUpdate(delivery.id, nextStatus)}
                              className="flex-1 py-3 rounded-xl text-white text-[13px] font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                              style={{ backgroundColor: nextCfg?.dot }}>
                              {NEXT_ACTION[nextStatus]}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </motion.button>
                          )
                        })}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.section>
        )}

        {/* HISTORIAL */}
        {completedDeliveries.length > 0 && (
          <motion.section variants={container} initial="hidden" animate="show">
            <motion.div variants={item} className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-[var(--color-muted-foreground)]" />
              <h2 className="text-[15px] font-bold text-[var(--color-muted-foreground)]">Historial</h2>
              <span className="ml-auto px-2.5 py-0.5 rounded-full bg-[var(--color-muted)] text-[11px] font-bold text-[var(--color-muted-foreground)] border border-[var(--color-border)]">
                {completedDeliveries.length}
              </span>
            </motion.div>

            <motion.div variants={{ show: { transition: { staggerChildren: 0.05 } } }} initial="hidden" animate="show" className="space-y-2">
              {completedDeliveries.map((delivery: any) => {
                const cfg = DELIVERY_STATUS[delivery.status] || DELIVERY_STATUS.PENDING
                return (
                  <motion.div key={delivery.id} variants={item}
                    className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-muted)] border border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: cfg.bg }}>
                        <CheckCircle className="w-4 h-4" style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <p className="text-[13px] font-mono font-semibold text-[var(--color-foreground)]">#{delivery.orderId?.slice(0, 8)}</p>
                        <p className="text-[11px] text-[var(--color-muted-foreground)]">
                          {new Date(delivery.createdAt).toLocaleString('es-MX', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                  </motion.div>
                )
              })}
            </motion.div>
          </motion.section>
        )}
      </main>
    </PageTransition>
  )
}
