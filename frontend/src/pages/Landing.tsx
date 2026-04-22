import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Zap, Star, ShieldCheck, ChevronRight, Sparkles, Timer, MapPin, Clock, Users, Utensils, Bike } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import ThemeToggle from '../components/ui/ThemeToggle'

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

function FloatingFood({ delay = 0, className = '' }: { delay?: number; className?: string }) {
  const foods = ['🍕', '🍔', '🍜', '🌮', '🍣', '🥗']
  const food = foods[Math.floor(Math.random() * foods.length)]
  
  return (
    <motion.div
      className={`absolute text-4xl select-none pointer-events-none ${className}`}
      style={{ filter: 'blur(1px)' }}
      initial={{ opacity: 0, y: 100, rotate: -20 }}
      animate={{ 
        opacity: [0, 0.6, 0.3, 0.5, 0],
        y: [100, 0, -20, -100],
        rotate: [-20, 10, -5, 20],
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        repeatDelay: Math.random() * 5,
        ease: 'easeOut',
      }}
    >
      {food}
    </motion.div>
  )
}

function ScrollReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function ParallaxHero() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%'])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8])

  return (
    <div ref={ref} className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
      <motion.div 
        className="absolute inset-0"
        style={{ y, opacity, scale }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--color-background)]" />
        <div className="absolute inset-0 overflow-hidden">
          <FloatingFood delay={0} className="top-[20%] left-[10%]" />
          <FloatingFood delay={2} className="top-[30%] right-[15%]" />
          <FloatingFood delay={4} className="bottom-[30%] left-[20%]" />
          <FloatingFood delay={1} className="bottom-[20%] right-[10%]" />
          <FloatingFood delay={3} className="top-[50%] left-[5%]" />
        </div>
        
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-30"
          style={{ 
            background: 'radial-gradient(circle, var(--color-primary-light) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.4, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </motion.div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8"
            style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles size={16} style={{ color: 'var(--color-primary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
              Delivery más rápido de la ciudad
            </span>
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-heading text-[3.5rem] md:text-[5rem] lg:text-[6.5rem] font-medium leading-[0.95] tracking-tight mb-6"
        >
          <span style={{ color: 'var(--color-foreground)' }}>Comida </span>
          <span className="text-gradient">increíble</span>
          <br />
          <span style={{ color: 'var(--color-foreground)' }}>a un click</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          Los mejores restaurantes de tu ciudad, entregados a tu puerta en minutos. 
          Sin complicaciones, solo comida deliciosa.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/restaurants"
              className="group flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-white text-base transition-all shadow-luxury"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <span>Ver restaurantes</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/register"
              className="flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-base transition-all"
              style={{ 
                backgroundColor: 'var(--color-card)', 
                border: '1px solid var(--color-border)',
                color: 'var(--color-foreground)'
              }}
            >
              Crear cuenta gratis
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-8 md:gap-12"
        >
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-1">
                <p className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--color-foreground)' }}>
                  {stat.value}
                </p>
                {stat.icon && (
                  <stat.icon size={18} className="text-amber-500 fill-amber-500" style={{ color: '#FFB800' }} />
                )}
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full flex items-start justify-center p-2" style={{ border: '2px solid var(--color-border)' }}>
          <motion.div 
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--color-primary)' }}
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </div>
  )
}

export default function Landing() {
  return (
    <PageTransition>
      <div className="noise-overlay">
        <div className="bg-mesh dark:bg-mesh-dark min-h-[100dvh]">
          <ThemeToggle className="fixed top-4 right-4 z-50" />
          
          <ParallaxHero />

          <ScrollReveal>
            <section className="py-24 md:py-32 max-w-6xl mx-auto px-6">
              <div className="text-center mb-16">
                <h2 className="font-heading text-[2.5rem] md:text-[3.5rem] mb-4" style={{ color: 'var(--color-foreground)' }}>
                  ¿Qué想吃?
                </h2>
                <p className="text-lg" style={{ color: 'var(--color-muted-foreground)' }}>
                  Elige tu cocina favorita
                </p>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
                {CATEGORIES.map((cat, i) => (
                  <motion.div
                    key={cat.label}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      to="/restaurants"
                      className="block p-4 md:p-6 rounded-3xl text-center transition-all"
                      style={{ 
                        backgroundColor: cat.color,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                      }}
                    >
                      <span className="text-3xl md:text-4xl block mb-2">{cat.emoji}</span>
                      <span className="text-sm font-semibold" style={{ color: cat.accent }}>{cat.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <section className="py-24 md:py-32 max-w-6xl mx-auto px-6">
              <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
                <div>
                  <h2 className="font-heading text-[2.5rem] md:text-[3.5rem] mb-6" style={{ color: 'var(--color-foreground)' }}>
                    ¿Por qué elegirnos?
                  </h2>
                  <p className="text-lg mb-8 leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
                    No somos solo otra app de delivery. Somos la forma más fácil de acceder a los mejores restaurantes de tu ciudad.
                  </p>
                  
                  <div className="space-y-6">
                    {FEATURES.map((feat, i) => (
                      <motion.div
                        key={feat.title}
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-4"
                      >
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: feat.bg }}
                        >
                          <feat.icon size={22} style={{ color: feat.color }} strokeWidth={2} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--color-foreground)' }}>
                            {feat.title}
                          </h3>
                          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                            {feat.desc}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <motion.div
                  className="relative"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                >
                  <div 
                    className="aspect-square rounded-[3rem] p-8 flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: 'var(--color-muted)' }}
                  >
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background: 'radial-gradient(circle at 30% 30%, var(--color-primary-light) 0%, transparent 50%)',
                      }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 4, repeat: Infinity }}
                    />
                    
                    <div className="relative z-10 text-center">
                      <motion.div
                        animate={{ y: [-5, 5, -5] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="text-8xl md:text-9xl mb-4"
                      >
                        🚀
                      </motion.div>
                      <p className="text-xl font-semibold" style={{ color: 'var(--color-foreground)' }}>
                        ¡Pedido en camino!
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <section className="py-24 md:py-32">
              <div className="max-w-6xl mx-auto px-6">
                <div 
                  className="rounded-[3rem] p-8 md:p-16 text-center relative overflow-hidden"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, #FF6B35 100%)',
                  }}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 40%)',
                    }}
                  />
                  
                  <div className="relative z-10">
                    <h2 className="text-white text-[2.5rem] md:text-[3.5rem] font-heading mb-4">
                      ¿Listo para pedir?
                    </h2>
                    <p className="text-white/90 text-lg mb-8 max-w-lg mx-auto">
                      Más de 300 restaurantes te esperan. Descarga la app y prueba la experiencia.
                    </p>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link
                        to="/restaurants"
                        className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-[var(--color-primary)] font-bold text-base shadow-lg"
                      >
                        <span>Empezar ahora</span>
                        <ChevronRight size={20} />
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </div>
            </section>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <section className="py-24 md:py-32 max-w-6xl mx-auto px-6">
              <div className="text-center mb-16">
                <h2 className="font-heading text-[2.5rem] md:text-[3.5rem] mb-4" style={{ color: 'var(--color-foreground)' }}>
                  Lo que dicen nuestros clientes
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {TESTIMONIALS.map((t, i) => (
                  <motion.div
                    key={t.name}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 rounded-3xl"
                    style={{ 
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div className="flex gap-1 mb-4">
                      {[...Array(t.rating)].map((_, j) => (
                        <Star key={j} size={16} className="fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="mb-4 leading-relaxed" style={{ color: 'var(--color-foreground)' }}>
                      "{t.text}"
                    </p>
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                      — {t.name}
                    </p>
                  </motion.div>
                ))}
              </div>
            </section>
          </ScrollReveal>

          <footer className="py-12 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div className="max-w-6xl mx-auto px-6 text-center">
              <p className="font-heading text-xl mb-2" style={{ color: 'var(--color-foreground)' }}>
                FoodDash
              </p>
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                © 2026 FoodDash. Todos los derechos reservados.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </PageTransition>
  )
}