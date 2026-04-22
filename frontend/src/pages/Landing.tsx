import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useSpring, useInView, useMotionValue, useMotionTemplate } from 'framer-motion'
import { ArrowRight, Star, ShieldCheck, ChevronRight, Sparkles, Timer, Clock, Bike, Utensils, Phone, Mail, MapPinned } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { useEffect } from 'react'

const CATEGORIES = [
  { label: 'Pizza', emoji: '🍕', color: '#FFEBEA', accent: '#FF3B30' },
  { label: 'Sushi', emoji: '🍣', color: '#E6F0FF', accent: '#007AFF' },
  { label: 'Tacos', emoji: '🌮', color: '#FFF5E5', accent: '#FF9500' },
  { label: 'Burgers', emoji: '🍔', color: '#FFF9E6', accent: '#FFCC00' },
  { label: 'Healthy', emoji: '🥗', color: '#EAF9EE', accent: '#34C759' },
  { label: 'Desserts', emoji: '🍰', color: '#FCE4EC', accent: '#EC407A' },
]

const FEATURES = [
  {
    icon: Timer,
    title: 'Entrega express',
    desc: 'Promedio de 25 minutos. Tu comida llega caliente y fresca.',
    color: '#FF3B30',
    bg: '#FFEBEA',
  },
  {
    icon: Star,
    title: 'Top restaurantes',
    desc: 'Solo los mejores de la ciudad, verificados por miles.',
    color: '#FF9500',
    bg: '#FFF5E5',
  },
  {
    icon: ShieldCheck,
    title: '100% seguro',
    desc: 'Pagos encriptados y datos protegidos siempre.',
    color: '#34C759',
    bg: '#EAF9EE',
  },
  {
    icon: Bike,
    title: 'Tracking real',
    desc: 'Sigue a tu repartidor en tiempo real en el mapa.',
    color: '#007AFF',
    bg: '#E6F0FF',
  },
]

const STATS = [
  { value: '50K+', label: 'Pedidos entregados' },
  { value: '4.9', label: 'Rating promedio', icon: Star },
  { value: '300+', label: 'Restaurantes' },
  { value: '15min', label: 'Tiempo promedio' },
]

const TESTIMONIALS = [
  { name: 'Ana García', text: 'La mejor app de delivery que he usado. Rápido y la comida siempre llega perfecta.', rating: 5 },
  { name: 'Carlos M.', text: 'Increíble la precisión del tracking. Siempre sé exactamente cuándo llega mi comida.', rating: 5 },
  { name: 'Sofia R.', text: 'Los precios son justos y la calidad de los restaurantes es excelente.', rating: 5 },
]

const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'Pago seguro' },
  { icon: Clock, label: 'Soporte 24/7' },
  { icon: Star, label: 'Calidad garantizada' },
]

const FOOD_EMOJIS = ['🍕', '🍔', '🍜', '🌮', '🍣', '🥗', '🍰', '🥪'] as const

const randomFood = (() => {
  let index = 0
  return () => {
    index = (index + 1) % FOOD_EMOJIS.length
    return FOOD_EMOJIS[index]
  }
})()

function FloatingFood({ delay = 0, emoji }: { delay?: number; emoji?: string }) {
  const food = emoji || randomFood()
  const angle = 45
  
  return (
    <motion.div
      className="absolute text-4xl md:text-5xl select-none pointer-events-none z-10"
      style={{ filter: 'blur(0.5px)' }}
      initial={{ 
        opacity: 0, 
        y: 0, 
        x: 0,
        rotate: -30,
        scale: 0
      }}
      animate={{ 
        opacity: [0, 0.7, 0.5, 0.6, 0],
        y: [0, -30, 60, 120],
        x: [0, Math.sin(angle) * 30, Math.sin(angle) * 60],
        rotate: [-30, 0, 15, 30],
        scale: [0, 1, 1, 0.8],
      }}
      transition={{
        duration: 12,
        delay,
        repeat: Infinity,
        repeatDelay: 5,
        ease: 'easeOut',
      }}
    >
      {food}
    </motion.div>
  )
}

function AnimatedBackground() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 })
  
  const y = useTransform(smoothProgress, [0, 1], ['0%', '40%'])
  const scale = useTransform(smoothProgress, [0, 0.5], [1, 1.1])

  return (
    <motion.div 
      ref={ref}
      className="absolute inset-0 overflow-hidden"
      style={{ y, scale }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-background)]/60 to-[var(--color-background)]" />
      
      <div 
        className="absolute inset-0 opacity-20 dark:opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FF3B30' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      <motion.div 
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full"
        style={{ 
          background: 'radial-gradient(circle, rgba(255,59,48,0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{ 
          scale: [1, 1.2, 1],
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      <motion.div 
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full"
        style={{ 
          background: 'radial-gradient(circle, rgba(255,149,0,0.12) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
        animate={{ 
          scale: [1, 1.3, 1],
          x: [0, -40, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,122,255,0.08) 0%, transparent 60%)',
          filter: 'blur(80px)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.7, 0.5],
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />
    </motion.div>
  )
}

function ParallaxHero() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 })
  
  const y = useTransform(smoothProgress, [0, 1], ['0%', '50%'])
  const opacity = useTransform(smoothProgress, [0, 0.7], [1, 0])
  const scale = useTransform(smoothProgress, [0, 0.5], [1, 0.9])

  const heroImageY = useTransform(smoothProgress, [0, 1], ['0%', '30%'])
  const heroImageScale = useTransform(smoothProgress, [0, 0.8], [1, 1.15])

  return (
    <div ref={ref} className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
      <AnimatedBackground />

      <motion.div 
        className="absolute inset-0 overflow-hidden opacity-30 dark:opacity-20"
        style={{ y: heroImageY, scale: heroImageScale }}
      >
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23FF3B30' fill-opacity='0.08' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}
        />
      </motion.div>

      <motion.div 
        className="absolute inset-0"
        style={{ y, opacity, scale }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[15%] left-[8%]"><FloatingFood delay={0} emoji="🍕" /></div>
          <div className="absolute top-[25%] right-[12%]"><FloatingFood delay={2} emoji="🍔" /></div>
          <div className="absolute bottom-[35%] left-[15%]"><FloatingFood delay={4} emoji="🍜" /></div>
          <div className="absolute bottom-[25%] right-[8%]"><FloatingFood delay={1} emoji="🌮" /></div>
          <div className="absolute top-[45%] left-[3%]"><FloatingFood delay={3} emoji="🍣" /></div>
          <div className="absolute top-[60%] right-[20%]"><FloatingFood delay={5} emoji="🥗" /></div>
          <div className="absolute bottom-[15%] left-[25%]"><FloatingFood delay={6} emoji="🍰" /></div>
          <div className="absolute top-[30%] left-[50%]"><FloatingFood delay={7} emoji="🥪" /></div>
        </div>
      </motion.div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8"
            style={{ 
              backgroundColor: 'rgba(var(--color-primary-rgb, 255,59,48), 0.1)', 
              border: '1px solid var(--color-border)',
              backdropFilter: 'blur(10px)',
            }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.05 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Sparkles size={16} style={{ color: 'var(--color-primary)' }} />
            </motion.div>
            <span className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
              Delivery más rápido de la ciudad
            </span>
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-heading text-[3.5rem] md:text-[5rem] lg:text-[7rem] font-medium leading-[0.95] tracking-tight mb-6"
        >
          <motion.span 
            style={{ color: 'var(--color-foreground)' }}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Comida 
          </motion.span>
          <br />
          <motion.span 
            className="text-gradient"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            increíble
          </motion.span>
          <br />
          <motion.span 
            style={{ color: 'var(--color-foreground)' }}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            a un click
          </motion.span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-lg md:text-xl max-w-xl mx-auto mb-12 leading-relaxed"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          Los mejores restaurantes de tu ciudad, entregados a tu puerta en minutos. 
          <br className="hidden md:block" />
          Sin complicaciones, solo comida deliciosa.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-20"
        >
          <motion.div 
            whileHover={{ scale: 1.05, y: -2 }} 
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Link
              to="/restaurants"
              className="group flex items-center gap-3 px-9 py-4.5 rounded-full font-semibold text-white text-base transition-all shadow-luxury relative overflow-hidden"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <motion.span
                className="absolute inset-0 bg-white/20"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.5 }}
              />
              <span className="relative z-10">Ver restaurantes</span>
              <motion.div
                className="relative z-10"
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </motion.div>
            </Link>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05, y: -2 }} 
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Link
              to="/register"
              className="flex items-center gap-3 px-9 py-4.5 rounded-full font-semibold text-base transition-all glass-card"
              style={{ 
                color: 'var(--color-foreground)'
              }}
            >
              Crear cuenta gratis
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
              >
                <Sparkles size={16} style={{ color: 'var(--color-primary)' }} />
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-10 md:gap-16"
        >
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.9 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.1, y: -5 }}
              className="text-center cursor-default"
            >
              <div className="flex items-center justify-center gap-1.5">
                <motion.p 
                  className="text-3xl md:text-4xl font-bold" 
                  style={{ color: 'var(--color-foreground)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 + i * 0.1 }}
                >
                  {stat.value}
                </motion.p>
                {stat.icon && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 1.2 + i * 0.1, type: 'spring', stiffness: 300 }}
                  >
                    <stat.icon 
                      size={20} 
                      className="text-amber-500 fill-amber-500" 
                      style={{ color: '#FFB800' }}
                    />
                  </motion.div>
                )}
              </div>
              <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div 
          className="w-7 h-11 rounded-full flex items-start justify-center p-2 glass-card"
        >
          <motion.div 
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--color-primary)' }}
            animate={{ y: [0, 14, 0], opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </div>
  )
}

function ScrollReveal({ children, delay = 0, direction = 'up' }: { children: React.ReactNode; delay?: number; direction?: 'up' | 'down' | 'left' | 'right' }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  
  const directionVariants = {
    up: { opacity: 0, y: 60 },
    down: { opacity: 0, y: -60 },
    left: { opacity: 0, x: -60 },
    right: { opacity: 0, x: 60 },
  }
  
  return (
    <motion.div
      ref={ref}
      initial={directionVariants[direction]}
      animate={isInView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function CategoryCard({ cat, index }: { cat: typeof CATEGORIES[0]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-30px' })
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -12, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Link
        to="/restaurants"
        className="block p-5 md:p-7 rounded-3xl text-center relative overflow-hidden group"
        style={{ 
          backgroundColor: cat.color,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `linear-gradient(135deg, ${cat.color} 0%, ${cat.accent}20 100%)`,
          }}
        />
        <div className="relative z-10">
          <motion.span 
            className="text-4xl md:text-5xl block mb-3"
            whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.4 }}
          >
            {cat.emoji}
          </motion.span>
          <span className="text-sm font-bold" style={{ color: cat.accent }}>{cat.label}</span>
        </div>
      </Link>
    </motion.div>
  )
}

function FeatureItem({ feat, index }: { feat: typeof FEATURES[0]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-30px' })
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -40 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ x: 8 }}
      className="flex items-start gap-5 group cursor-default"
    >
      <motion.div
        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110"
        style={{ backgroundColor: feat.bg }}
        whileHover={{ rotate: [0, -5, 5, 0] }}
      >
        <feat.icon size={24} style={{ color: feat.color }} strokeWidth={2} />
      </motion.div>
      <div className="pt-1">
        <h3 className="font-semibold text-lg mb-1.5 group-hover:text-gradient transition-all" style={{ color: 'var(--color-foreground)' }}>
          {feat.title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
          {feat.desc}
        </p>
      </div>
    </motion.div>
  )
}

function TestimonialCard({ t, index }: { t: typeof TESTIMONIALS[0]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-30px' })
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.7, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="p-7 rounded-3xl relative overflow-hidden group"
      style={{ 
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
      }}
    >
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb, 255,59,48), 0.03) 0%, transparent 100%)',
        }}
      />
      
      <div className="relative z-10">
        <div className="flex gap-1 mb-5">
          {[...Array(t.rating)].map((_, j) => (
            <motion.div
              key={j}
              initial={{ scale: 0, rotate: -180 }}
              animate={isInView ? { scale: 1, rotate: 0 } : {}}
              transition={{ duration: 0.4, delay: index * 0.15 + j * 0.05, type: 'spring', stiffness: 300 }}
            >
              <Star size={16} className="fill-amber-400 text-amber-400" />
            </motion.div>
          ))}
        </div>
        <motion.p 
          className="mb-5 leading-relaxed text-base"
          style={{ color: 'var(--color-foreground)' }}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: index * 0.15 + 0.2 }}
        >
          "{t.text}"
        </motion.p>
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: index * 0.15 + 0.3 }}
        >
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {t.name.charAt(0)}
          </div>
          <p className="font-semibold text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            — {t.name}
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}

function CTAButton({ to, children, primary = true }: { to: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -3 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Link
        to={to}
        className={`inline-flex items-center gap-3 px-10 py-5 rounded-full font-bold text-base shadow-luxury transition-all ${
          primary 
            ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white' 
            : 'glass-card'
        }`}
        style={primary ? {} : { color: 'var(--color-foreground)' }}
      >
        {children}
      </Link>
    </motion.div>
  )
}

export default function Landing() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 20)
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 20)
    }
    
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  const bgPosition = useMotionTemplate`${mouseX}px ${mouseY}px`

  return (
    <PageTransition>
      <div>
        <motion.div 
          className="bg-mesh dark:bg-mesh-dark min-h-screen"
          style={{
            backgroundPosition: bgPosition,
          }}
        >
          <ParallaxHero />

          <section className="py-24 md:py-32 max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <ScrollReveal>
                <h2 className="font-heading text-[2.5rem] md:text-[3.5rem] mb-4" style={{ color: 'var(--color-foreground)' }}>
                  ¿Qué想吃?
                </h2>
              </ScrollReveal>
              <ScrollReveal delay={0.1}>
                <p className="text-lg" style={{ color: 'var(--color-muted-foreground)' }}>
                  Elige tu cocina favorita
                </p>
              </ScrollReveal>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-5">
              {CATEGORIES.map((cat, i) => (
                <CategoryCard key={cat.label} cat={cat} index={i} />
              ))}
            </div>
          </section>

          <section className="py-24 md:py-32 max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
              <div>
                <ScrollReveal>
                  <h2 className="font-heading text-[2.5rem] md:text-[3.5rem] mb-6" style={{ color: 'var(--color-foreground)' }}>
                    ¿Por qué elegirnos?
                  </h2>
                </ScrollReveal>
                <ScrollReveal delay={0.1}>
                  <p className="text-lg mb-10 leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
                    No somos solo otra app de delivery. Somos la forma más fácil de acceder a los mejores restaurantes de tu ciudad.
                  </p>
                </ScrollReveal>
                
                <div className="space-y-6">
                  {FEATURES.map((feat, i) => (
                    <FeatureItem key={feat.title} feat={feat} index={i} />
                  ))}
                </div>
              </div>

              <ScrollReveal delay={0.2} direction="right">
                <div 
                  className="relative rounded-[3rem] p-10 md:p-14 overflow-hidden"
                  style={{ backgroundColor: 'var(--color-muted)' }}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: 'radial-gradient(circle at 30% 30%, rgba(var(--color-primary-rgb, 255,59,48), 0.15) 0%, transparent 50%)',
                    }}
                    animate={{ scale: [1, 1.15, 1], rotate: [0, 10, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  
                  <motion.div
                    className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                    animate={{ scale: [1, 1.2, 1], x: [0, -10, 0] }}
                    transition={{ duration: 6, repeat: Infinity }}
                  />
                  
                  <div className="relative z-10 text-center">
                    <motion.div
                      animate={{ 
                        y: [-10, 10, -10],
                        rotate: [-5, 5, -5],
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-9xl md:text-[10rem] mb-6 inline-block"
                    >
                      🚀
                    </motion.div>
                    <motion.p 
                      className="text-2xl font-semibold"
                      style={{ color: 'var(--color-foreground)' }}
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      ¡Pedido en camino!
                    </motion.p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          <section className="py-24 md:py-32">
            <div className="max-w-6xl mx-auto px-6">
              <ScrollReveal>
                <div 
                  className="rounded-[3rem] p-10 md:p-20 text-center relative overflow-hidden"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, #FF6B35 50%, var(--color-secondary) 100%)',
                  }}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 40%)',
                    }}
                    animate={{ scale: [1, 1.1, 1], x: [0, 20, 0] }}
                    transition={{ duration: 10, repeat: Infinity }}
                  />
                  
                  <motion.div
                    className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-white/10"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 8, repeat: Infinity }}
                  />
                  
                  <motion.div
                    className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10"
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                    transition={{ duration: 12, repeat: Infinity }}
                  />

                  <div className="relative z-10">
                    <ScrollReveal>
                      <h2 className="text-white text-[2.5rem] md:text-[3.5rem] font-heading mb-5">
                        ¿Listo para pedir?
                      </h2>
                    </ScrollReveal>
                    <ScrollReveal delay={0.1}>
                      <p className="text-white/90 text-lg mb-10 max-w-lg mx-auto">
                        Más de 300 restaurantes te esperan. Descarga la app y prueba la experiencia.
                      </p>
                    </ScrollReveal>
                    <ScrollReveal delay={0.2}>
                      <CTAButton to="/restaurants" primary>
                        <>
                          <span>Empezar ahora</span>
                          <motion.span
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                          >
                            <ChevronRight size={22} />
                          </motion.span>
                        </>
                      </CTAButton>
                    </ScrollReveal>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          <section className="py-24 md:py-32 max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <ScrollReveal>
                <h2 className="font-heading text-[2.5rem] md:text-[3.5rem] mb-4" style={{ color: 'var(--color-foreground)' }}>
                  Lo que dicen nuestros clientes
                </h2>
              </ScrollReveal>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <TestimonialCard key={t.name} t={t} index={i} />
              ))}
            </div>
          </section>

          <section className="py-20 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div className="max-w-6xl mx-auto px-6">
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 mb-12">
                {TRUST_BADGES.map((badge, i) => (
                  <ScrollReveal key={badge.label} delay={i * 0.1}>
                    <motion.div 
                      className="flex items-center gap-2 text-sm font-medium"
                      style={{ color: 'var(--color-muted-foreground)' }}
                      whileHover={{ scale: 1.05, color: 'var(--color-foreground)' }}
                    >
                      <badge.icon size={16} style={{ color: 'var(--color-primary)' }} />
                      <span>{badge.label}</span>
                    </motion.div>
                  </ScrollReveal>
                ))}
              </div>
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.4 }}
                  >
                    <Utensils size={28} style={{ color: 'var(--color-primary)' }} />
                  </motion.div>
                  <span className="font-heading text-2xl" style={{ color: 'var(--color-foreground)' }}>
                    FoodDash
                  </span>
                </div>
                
                <div className="flex items-center gap-6">
                  <motion.a 
                    href="#" 
                    className="p-3 rounded-full transition-colors"
                    style={{ backgroundColor: 'var(--color-muted)' }}
                    whileHover={{ scale: 1.1, backgroundColor: 'var(--color-primary)', color: 'white' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Phone size={18} />
                  </motion.a>
                  <motion.a 
                    href="#" 
                    className="p-3 rounded-full transition-colors"
                    style={{ backgroundColor: 'var(--color-muted)' }}
                    whileHover={{ scale: 1.1, backgroundColor: 'var(--color-primary)', color: 'white' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Mail size={18} />
                  </motion.a>
                  <motion.a 
                    href="#" 
                    className="p-3 rounded-full transition-colors"
                    style={{ backgroundColor: 'var(--color-muted)' }}
                    whileHover={{ scale: 1.1, backgroundColor: 'var(--color-primary)', color: 'white' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <MapPinned size={18} />
                  </motion.a>
                </div>
              </div>
              
              <div className="mt-10 pt-8 border-t text-center" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  © 2026 FoodDash. Todos los derechos reservados.
                </p>
              </div>
            </div>
          </section>
        </motion.div>
      </div>
    </PageTransition>
  )
}