import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, ShoppingCart, ArrowLeft, Star, Clock } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { slideUp, staggerContainer, bouncyTransition } from '../lib/animations'

const GET_RESTAURANT = gql`
  query GetRestaurant($id: ID!) {
    restaurant(id: $id) {
      id name description cuisineType rating isOpen address
    }
    menu(restaurantId: $id) {
      id name description price isAvailable category
    }
  }
`

const CREATE_ORDER = gql`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id status totalAmount
    }
  }
`

const DEFAULT_ADDRESS = {
  street: 'Calle Demo 123',
  city: 'Ciudad de México',
  state: 'CDMX',
  zipCode: '06600',
  country: 'México',
}

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  isAvailable: boolean
  category: string
}

function getBannerStyle(cuisineType: string = '') {
  const t = cuisineType.toLowerCase()
  if (t.includes('pizza') || t.includes('ital'))
    return { bg: '#FFEBEA', emoji: '🍕' }
  if (t.includes('sushi') || t.includes('japon'))
    return { bg: '#E6F0FF', emoji: '🍣' }
  if (t.includes('burger') || t.includes('hambur') || t.includes('fast'))
    return { bg: '#FFF5E5', emoji: '🍔' }
  if (t.includes('mexic') || t.includes('taco'))
    return { bg: '#FFEBEA', emoji: '🌮' }
  if (t.includes('chin'))
    return { bg: '#F3EEFF', emoji: '🥡' }
  if (t.includes('ensalad') || t.includes('vegeta'))
    return { bg: '#EAF9EE', emoji: '🥗' }
  if (t.includes('pasta'))
    return { bg: '#FFF0E6', emoji: '🍝' }
  if (t.includes('pollo') || t.includes('chick'))
    return { bg: '#FFF9E6', emoji: '🍗' }
  return { bg: 'var(--color-muted)', emoji: '🍽️' }
}

export default function RestaurantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [cart, setCart] = useState<Record<string, number>>({})
  const { data, loading, error } = useQuery<any>(GET_RESTAURANT, { variables: { id } })
  const [createOrder, { loading: ordering }] = useMutation(CREATE_ORDER)

  function addItem(itemId: string) {
    setCart(c => ({ ...c, [itemId]: (c[itemId] ?? 0) + 1 }))
  }

  function removeItem(itemId: string) {
    setCart(c => {
      const next = { ...c }
      if (next[itemId] <= 1) delete next[itemId]
      else next[itemId]--
      return next
    })
  }

  const cartTotal = data?.menu
    ?.filter((i: MenuItem) => cart[i.id])
    .reduce((sum: number, i: MenuItem) => sum + i.price * (cart[i.id] ?? 0), 0) ?? 0

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

  async function handleOrder() {
    if (!localStorage.getItem('token')) { navigate('/login'); return }
    const items = Object.entries(cart).map(([menuItemId, quantity]) => ({ menuItemId, quantity }))
    const result = await createOrder({ variables: { input: { restaurantId: id, items, deliveryAddress: DEFAULT_ADDRESS } } })
    navigate(`/orders/${(result.data as any).createOrder.id}`)
  }

  if (loading) return (
    <PageTransition>
      <div className="pb-32 md:pb-12 min-h-[100dvh] md:min-h-screen">
        <div className="h-56 animate-pulse bg-[var(--color-border)]" />
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="h-10 w-64 rounded-[12px] animate-pulse mb-3 bg-[var(--color-border)]" />
          <div className="h-5 w-full max-w-[500px] rounded-[8px] animate-pulse mb-8 bg-[var(--color-border)]" />
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-[24px] animate-pulse bg-[var(--color-border)] opacity-60" />
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  )

  if (error) return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-6 py-12 text-center font-medium text-[var(--color-destructive)]">
        {error.message}
      </div>
    </PageTransition>
  )

  const { restaurant, menu } = data
  const { bg, emoji } = getBannerStyle(restaurant.cuisineType)

  return (
    <PageTransition>
      <main className="pb-40 md:pb-16 min-h-[100dvh] md:min-h-screen">
        {/* Banner */}
        <div
          className="relative h-56 md:h-[280px] flex items-end overflow-hidden"
          style={{ backgroundColor: bg }}
        >
          <span
            className="absolute inset-0 flex items-center justify-center text-[150px] md:text-[200px] select-none mix-blend-multiply opacity-50"
            role="img"
            aria-hidden="true"
            style={{ filter: 'blur(3px)', lineHeight: 1 }}
          >
            {emoji}
          </span>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

          <div className="relative z-10 w-full px-6 pb-6 flex items-end justify-between">
            <motion.button
              onClick={() => navigate(-1)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              transition={bouncyTransition}
              className="flex items-center justify-center w-11 h-11 rounded-full cursor-pointer bg-white text-[var(--color-foreground)] ios-shadow"
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </motion.button>

            <span
              className="text-[12px] font-bold px-4 py-2 rounded-full ios-shadow shadow-sm"
              style={{
                backgroundColor: restaurant.isOpen ? '#fff' : '#FF3B30',
                color: restaurant.isOpen ? '#34C759' : '#fff',
              }}
            >
              {restaurant.isOpen ? 'ABIERTO' : 'CERRADO'}
            </span>
          </div>
        </div>

        {/* Restaurant info */}
        <div className="max-w-4xl mx-auto px-6 pt-8 pb-4">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-[32px] md:text-[40px] font-bold tracking-tight text-[var(--color-foreground)]">
            {restaurant.name}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-2 text-[16px] leading-relaxed text-[var(--color-muted-foreground)] font-medium max-w-[600px]">
            {restaurant.description}
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap items-center gap-4 mt-5">
            <span className="flex items-center gap-1.5 text-[15px] font-bold text-[#FF9500]">
              <Star size={18} className="fill-current" />
              {restaurant.rating?.toFixed(1)}
            </span>
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--color-muted-foreground)]">
              <Clock size={16} />
              25–35 min
            </span>
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--color-muted-foreground)]">
              📍 {restaurant.address.split(',')[0]}
            </span>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="max-w-4xl mx-auto px-6 my-6">
          <div className="h-[1px] bg-[var(--color-border)]" />
        </div>

        {/* Menu items */}
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-[22px] font-bold tracking-tight mb-6 text-[var(--color-foreground)]">Menú</h2>
          <motion.div
            className="grid md:grid-cols-2 gap-4"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {menu?.map((item: MenuItem) => (
              <motion.div
                key={item.id}
                variants={slideUp}
                className="flex justify-between items-center p-5 rounded-[24px] bg-white border border-[var(--color-border)] ios-shadow-sm transition-opacity"
                style={{ opacity: item.isAvailable ? 1 : 0.45 }}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-bold text-[17px] text-[var(--color-foreground)]">{item.name}</p>
                  <p className="text-[14px] mt-1 line-clamp-2 leading-relaxed text-[var(--color-muted-foreground)] font-medium">
                    {item.description}
                  </p>
                  <p className="text-[16px] font-bold mt-2 text-[var(--color-primary)]">
                    ${item.price.toFixed(2)}
                  </p>
                </div>

                {item.isAvailable && (
                  <div className="flex items-center gap-3 shrink-0">
                    <AnimatePresence mode="popLayout">
                      {cart[item.id] ? (
                         <motion.div
                          className="flex items-center gap-3"
                          initial={{ opacity: 0, scale: 0.8, width: 0 }}
                          animate={{ opacity: 1, scale: 1, width: 'auto' }}
                          exit={{ opacity: 0, scale: 0.8, width: 0 }}
                          transition={bouncyTransition}
                        >
                          <motion.button
                            onClick={() => removeItem(item.id)}
                            whileTap={{ scale: 0.9 }}
                            className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer bg-[var(--color-muted)] text-[var(--color-foreground)] transition-colors active:bg-[var(--color-border)]"
                            aria-label="Quitar uno"
                          >
                            <Minus size={16} strokeWidth={2.5} />
                          </motion.button>
                          <motion.span
                            key={cart[item.id]}
                            initial={{ scale: 1.4 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                            className="w-5 text-center text-[16px] font-bold tracking-tight text-[var(--color-foreground)]"
                          >
                            {cart[item.id]}
                          </motion.span>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                    <motion.button
                      onClick={() => addItem(item.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.9 }}
                      transition={bouncyTransition}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white cursor-pointer bg-[var(--color-foreground)] ios-shadow transition-colors"
                      aria-label={`Añadir ${item.name}`}
                    >
                      <Plus size={18} strokeWidth={2.5} />
                    </motion.button>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Sticky cart button */}
        <AnimatePresence>
          {cartCount > 0 && (
            <motion.div
              className="fixed bottom-6 left-1/2 w-full max-w-sm px-6 z-40 transform-gpu"
              style={{ 
                x: '-50%',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)'
              }}
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              transition={bouncyTransition}
            >
              <div className="absolute inset-0 top-6 -mb-6 bg-white blur-xl opacity-60 rounded-full" />
              <motion.button
                onClick={handleOrder}
                disabled={ordering}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={bouncyTransition}
                className="relative w-full flex items-center justify-between px-6 py-5 rounded-[24px] text-white font-bold cursor-pointer disabled:opacity-60 bg-[var(--color-primary)] ios-shadow-lg"
              >
                <span className="flex items-center gap-2.5 text-[16px]">
                  <ShoppingCart size={20} strokeWidth={2.5} />
                  {cartCount} {cartCount === 1 ? 'item' : 'items'}
                </span>
                <span className="text-[16px] tracking-tight">{ordering ? 'Ordenando...' : `Pedir · $${cartTotal.toFixed(2)}`}</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </PageTransition>
  )
}
