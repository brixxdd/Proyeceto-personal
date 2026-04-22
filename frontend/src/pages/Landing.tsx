import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Zap, Star, ShieldCheck, ChevronRight } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { slideUp, staggerContainer, bouncyTransition } from '../lib/animations'

const FEATURES = [
  {
    icon: Zap,
    title: 'Entrega rápida',
    desc: 'Promedio de 30 minutos a tu puerta, con seguimiento en tiempo real.',
    color: '#FF9500',
    bg: '#FFF5E5',
  },
  {
    icon: Star,
    title: 'Mejores restaurantes',
    desc: 'Los favoritos de tu ciudad, curados y calificados por la comunidad.',
    color: '#FF3B30',
    bg: '#FFEBEA',
  },
  {
    icon: ShieldCheck,
    title: 'Seguro y confiable',
    desc: 'Pagos 100% protegidos y datos encriptados en todo momento.',
    color: '#34C759',
    bg: '#EAF9EE',
  },
]

const CATEGORIES = [
  { label: 'Pizza', emoji: '🍕' },
  { label: 'Sushi', emoji: '🍣' },
  { label: 'Tacos', emoji: '🌮' },
  { label: 'Burgers', emoji: '🍔' },
  { label: 'Pasta', emoji: '🍝' },
  { label: 'Ensaladas', emoji: '🥗' },
]

const STATS = [
  { value: '10k+', label: 'Pedidos' },
  { value: '4.9★', label: 'Rating' },
  { value: '200+', label: 'Restaurantes' },
  { value: '30min', label: 'Entrega avg' },
]

export default function Landing() {
  return (
    <PageTransition>
      <main className="pb-10 overflow-x-hidden min-h-[100dvh]">
        {/* Hero Section */}
        <section className="relative pt-12 lg:pt-24 pb-16">
          <div className="relative max-w-6xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-12">
            
            {/* Left — Content */}
            <motion.div
              className="flex-1 flex flex-col gap-5 lg:gap-6 text-center lg:text-left items-center lg:items-start"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <motion.div variants={slideUp}>
                <span className="inline-flex items-center gap-1.5 text-[12px] md:text-[13px] font-semibold px-4 py-1.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                  <Zap size={14} fill="currentColor" />
                  Entrega en 30 minutos
                </span>
              </motion.div>

              <motion.h1
                variants={slideUp}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-[72px] font-bold leading-[1.1] tracking-tight text-[var(--color-foreground)]"
              >
                La mejor comida,{' '}
                <br className="hidden sm:block" />
                <span className="text-[var(--color-primary)]">en minutos</span>
              </motion.h1>

              <motion.p
                variants={slideUp}
                className="text-[16px] md:text-[18px] max-w-lg leading-relaxed text-[var(--color-muted-foreground)] font-medium"
              >
                Los mejores restaurantes de tu ciudad con seguimiento en tiempo real de tu pedido.
              </motion.p>

              <motion.div variants={slideUp} className="flex flex-col sm:flex-row flex-wrap gap-4 pt-2 w-full sm:w-auto">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} transition={bouncyTransition} className="w-full sm:w-auto">
                  <Link
                    to="/restaurants"
                    className="flex items-center justify-center gap-2 px-8 py-3.5 md:py-4 rounded-full font-semibold text-white text-[15px] bg-[var(--color-primary)] ios-shadow w-full"
                  >
                    Ver restaurantes <ArrowRight size={18} />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} transition={bouncyTransition} className="w-full sm:w-auto">
                  <Link
                    to="/register"
                    className="flex items-center justify-center gap-2 px-8 py-3.5 md:py-4 rounded-full font-semibold text-[15px] bg-white text-[var(--color-foreground)] border border-[var(--color-border)] ios-shadow w-full"
                  >
                    Crear cuenta gratis
                  </Link>
                </motion.div>
              </motion.div>

              <motion.div
                variants={slideUp}
                className="flex flex-wrap gap-6 md:gap-8 justify-center lg:justify-start pt-6 lg:pt-8"
              >
                {STATS.map(({ value, label }) => (
                  <div key={label} className="text-center lg:text-left">
                    <p className="text-[24px] md:text-[28px] font-bold text-[var(--color-foreground)] tracking-tight leading-none mb-1">{value}</p>
                    <p className="text-[13px] md:text-[14px] font-medium text-[var(--color-muted-foreground)]">{label}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right — Category Grid, Desktop only */}
            <motion.div
              className="hidden lg:grid grid-cols-3 gap-4 shrink-0"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...bouncyTransition, delay: 0.2 }}
            >
              {CATEGORIES.map(({ label, emoji }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05, ...bouncyTransition }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center justify-center gap-2 w-24 h-24 xl:w-28 xl:h-28 rounded-3xl bg-white border border-[var(--color-border)] ios-shadow cursor-pointer"
                >
                  <span className="text-[28px] xl:text-[32px] select-none leading-none" role="img" aria-hidden="true">{emoji}</span>
                  <span className="text-[12px] xl:text-[13px] font-semibold text-[var(--color-foreground)]">{label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Mobile category scroll strip */}
        <div className="lg:hidden w-full overflow-x-auto scrollbar-none px-6 py-4 flex gap-3">
          {CATEGORIES.map(({ label, emoji }) => (
            <Link
              key={label}
              to="/restaurants"
              className="flex-shrink-0 flex flex-col items-center justify-center gap-2 w-[84px] h-[84px] rounded-[24px] bg-white border border-[var(--color-border)] shadow-sm active:scale-95 transition-transform"
            >
              <span className="text-[28px] select-none leading-none" role="img" aria-hidden="true">{emoji}</span>
              <span className="text-[11px] font-semibold text-[var(--color-foreground)]">
                {label}
              </span>
            </Link>
          ))}
        </div>

        {/* Features section */}
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={bouncyTransition}
            className="text-center mb-10 md:mb-12"
          >
            <h2 className="text-[28px] md:text-[34px] font-bold tracking-tight mb-2 text-[var(--color-foreground)]">¿Por qué FoodDash?</h2>
            <p className="text-[15px] md:text-[17px] text-[var(--color-muted-foreground)] font-medium">
              Todo lo que necesitas para pedir sin estrés
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-5 md:gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
          >
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
              <motion.div
                key={title}
                variants={slideUp}
                whileHover={{ y: -4 }}
                className="flex flex-col gap-4 p-6 md:p-8 rounded-[24px] md:rounded-[32px] bg-white border border-[var(--color-border)] ios-shadow"
              >
                <div
                  className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: bg }}
                >
                  <Icon className="w-5 h-5 md:w-6 md:h-6" style={{ color }} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-bold text-[17px] md:text-[19px] mb-2 tracking-tight text-[var(--color-foreground)]">{title}</h3>
                  <p className="text-[14px] md:text-[15px] leading-relaxed text-[var(--color-muted-foreground)] font-medium">
                    {desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* CTA banner */}
        <section className="px-6 pb-20 md:pb-24 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={bouncyTransition}
            className="rounded-[24px] md:rounded-[36px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 bg-[var(--color-primary)] text-white ios-shadow-lg"
          >
            <div className="text-center md:text-left flex-1 min-w-0">
              <h2 className="text-[26px] md:text-[32px] font-bold mb-1.5 md:mb-2 tracking-tight">¿Listo para pedir?</h2>
              <p className="text-[15px] md:text-[17px] opacity-90 font-medium whitespace-normal">
                Más de 200 restaurantes te esperan
              </p>
            </div>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              transition={bouncyTransition}
              className="shrink-0 w-full md:w-auto"
            >
              <Link
                to="/restaurants"
                className="flex items-center justify-center gap-2 px-6 md:px-8 py-4 rounded-full font-bold text-[15px] bg-white text-[var(--color-primary)] ios-shadow w-full"
              >
                Explorar ahora <ChevronRight size={18} strokeWidth={2.5} />
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>
    </PageTransition>
  )
}
