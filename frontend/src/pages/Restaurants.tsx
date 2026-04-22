import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Clock, Search, X } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { slideUp, staggerContainer, bouncyTransition } from '../lib/animations'

const GET_RESTAURANTS = gql`
  query GetRestaurants {
    restaurants {
      id name description cuisineType rating isOpen address
    }
  }
`

interface Restaurant {
  id: string
  name: string
  description: string
  cuisineType: string
  rating: number
  isOpen: boolean
  address: string
}

function getBannerStyle(cuisineType: string = '') {
  const t = cuisineType.toLowerCase()
  if (t.includes('pizza') || t.includes('ital'))
    return { bg: 'linear-gradient(135deg, #FFEBEA, #FFD8D6)', emoji: '🍕' }
  if (t.includes('sushi') || t.includes('japon'))
    return { bg: 'linear-gradient(135deg, #E6F0FF, #CDE2FF)', emoji: '🍣' }
  if (t.includes('burger') || t.includes('hambur') || t.includes('fast'))
    return { bg: 'linear-gradient(135deg, #FFF5E5, #FFE5B5)', emoji: '🍔' }
  if (t.includes('mexic') || t.includes('taco'))
    return { bg: 'linear-gradient(135deg, #FFEBEA, #FFD8D6)', emoji: '🌮' }
  if (t.includes('chin'))
    return { bg: 'linear-gradient(135deg, #F3EEFF, #E6DDFF)', emoji: '🥡' }
  if (t.includes('ensalad') || t.includes('vegeta'))
    return { bg: 'linear-gradient(135deg, #EAF9EE, #C9F0D6)', emoji: '🥗' }
  if (t.includes('pasta'))
    return { bg: 'linear-gradient(135deg, #FFF0E6, #FFDBC2)', emoji: '🍝' }
  if (t.includes('pollo') || t.includes('chick'))
    return { bg: 'linear-gradient(135deg, #FFF9E6, #FFF0B3)', emoji: '🍗' }
  return { bg: 'var(--color-muted)', emoji: '🍽️' }
}

export default function Restaurants() {
  const { data, loading, error } = useQuery<{ restaurants: Restaurant[] }>(GET_RESTAURANTS)
  const [search, setSearch] = useState('')
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null)

  const cuisines = [...new Set(data?.restaurants?.map(r => r.cuisineType).filter(Boolean))] as string[]

  const filtered = data?.restaurants?.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !search || r.name.toLowerCase().includes(q) || r.cuisineType?.toLowerCase().includes(q)
    const matchCuisine = !activeCuisine || r.cuisineType === activeCuisine
    return matchSearch && matchCuisine
  }) ?? []

  if (loading) return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6 py-10 pb-28 md:pb-10">
        <div className="h-10 w-48 rounded-[12px] animate-pulse mb-6 bg-[var(--color-border)]" />
        <div className="h-14 rounded-[16px] animate-pulse mb-6 bg-[var(--color-border)]" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-[28px] overflow-hidden bg-white border border-[var(--color-border)]">
              <div className="h-40 animate-pulse bg-[var(--color-border)]" style={{ animationDelay: `${i * 60}ms` }} />
              <div className="p-5 flex flex-col gap-3">
                <div className="h-5 w-3/4 rounded-lg animate-pulse bg-[var(--color-border)]" />
                <div className="h-4 w-full rounded-lg animate-pulse bg-[var(--color-border)]" />
                <div className="h-4 w-1/2 rounded-lg animate-pulse bg-[var(--color-border)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  )

  if (error) return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6 py-12 text-center text-[var(--color-destructive)] font-medium">
        Error al cargar restaurantes: {error.message}
      </div>
    </PageTransition>
  )

  return (
    <PageTransition>
      <main className="max-w-6xl mx-auto px-6 py-8 pb-32 md:pb-12 text-[var(--color-foreground)]">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={bouncyTransition}>
            <h1 className="text-[34px] font-bold tracking-tight">Restaurantes</h1>
            {data?.restaurants && (
              <p className="text-[15px] font-medium text-[var(--color-muted-foreground)]">
                {filtered.length} disponibles
              </p>
            )}
          </motion.div>
        </div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...bouncyTransition, delay: 0.1 }}
          className="relative mb-5"
        >
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar restaurantes o cocina..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-11 py-4 rounded-[16px] text-[15px] transition-colors border border-[var(--color-border)] bg-[var(--color-muted)] focus:bg-white"
          />
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-border)] text-[var(--color-muted-foreground)] hover:opacity-80 transition-opacity"
              >
                <X size={16} />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Cuisine filter chips */}
        {cuisines.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="overflow-x-auto scrollbar-none flex gap-2 mb-8 pb-1"
          >
            <button
              onClick={() => setActiveCuisine(null)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-[14px] font-semibold transition-colors"
              style={{
                backgroundColor: !activeCuisine ? 'var(--color-foreground)' : 'var(--color-muted)',
                color: !activeCuisine ? '#fff' : 'var(--color-muted-foreground)',
              }}
            >
              Todos
            </button>
            {cuisines.map(c => (
              <button
                key={c}
                onClick={() => setActiveCuisine(c === activeCuisine ? null : c)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-[14px] font-semibold transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: activeCuisine === c ? 'var(--color-foreground)' : 'var(--color-muted)',
                  color: activeCuisine === c ? '#fff' : 'var(--color-muted-foreground)',
                }}
              >
                {c}
              </button>
            ))}
          </motion.div>
        )}

        {/* Grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {filtered.map((r) => {
            const { bg, emoji } = getBannerStyle(r.cuisineType)
            return (
              <motion.div key={r.id} variants={slideUp}>
                <motion.div
                  whileHover={{ y: -6 }}
                  whileTap={{ scale: 0.96 }}
                  transition={bouncyTransition}
                  className="rounded-[28px] overflow-hidden bg-white border border-[var(--color-border)] ios-shadow"
                >
                  <Link to={`/restaurants/${r.id}`} className="block">
                    {/* Cuisine banner */}
                    <div className="h-40 relative flex items-center justify-center overflow-hidden" style={{ background: bg }}>
                      <span className="text-[90px] opacity-70 select-none leading-none mix-blend-multiply" role="img" aria-hidden="true" style={{ filter: 'blur(2px)' }}>
                        {emoji}
                      </span>
                      <div
                        className="absolute top-4 right-4 text-[12px] font-bold px-3 py-1.5 rounded-full shadow-sm"
                        style={{
                          backgroundColor: r.isOpen ? '#fff' : '#FF3B30',
                          color: r.isOpen ? '#34C759' : '#fff',
                        }}
                      >
                        {r.isOpen ? 'ABIERTO' : 'CERRADO'}
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="p-5 flex flex-col gap-2.5">
                      <h3 className="font-bold text-[19px] tracking-tight">{r.name}</h3>
                      <p className="text-[14px] text-[var(--color-muted-foreground)] line-clamp-2 leading-relaxed font-medium">
                        {r.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                          {r.cuisineType}
                        </span>
                        <div className="flex items-center gap-3 text-[13px] text-[var(--color-muted-foreground)] font-semibold">
                          <span className="flex items-center gap-1 text-[#FF9500]">
                            <Star size={14} className="fill-current" />
                            {r.rating?.toFixed(1) ?? '—'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            30m
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Empty states */}
        {filtered.length === 0 && !loading && (
          <motion.div
            variants={slideUp}
            initial="initial"
            animate="animate"
            className="text-center py-20 flex flex-col items-center gap-4"
          >
            <span className="text-[60px] leading-none" role="img" aria-label="Sin resultados">🍽️</span>
            <p className="font-semibold text-[17px] text-[var(--color-foreground)]">
              {search || activeCuisine ? 'Sin resultados para tu búsqueda' : 'No hay restaurantes disponibles aún.'}
            </p>
            {(search || activeCuisine) && (
              <button
                onClick={() => { setSearch(''); setActiveCuisine(null) }}
                className="text-[15px] font-semibold text-[var(--color-primary)] hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </motion.div>
        )}
      </main>
    </PageTransition>
  )
}
