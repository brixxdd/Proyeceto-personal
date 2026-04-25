import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingBag, LogOut, Flame, UtensilsCrossed } from 'lucide-react'
import ThemeToggle from '../ui/ThemeToggle'

const LINKS = [
  { to: '/restaurants', label: 'Explorar', icon: UtensilsCrossed },
]

export default function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const token = sessionStorage.getItem('token')

  function handleLogout() {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user_role')
    navigate('/login')
  }

  return (
    <motion.nav
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="sticky top-0 z-50 glass-card"
      style={{
        borderBottom: '1px solid var(--color-border)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)'
      }}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 font-heading text-xl tracking-tight"
          style={{ color: 'var(--color-foreground)', textDecoration: 'none' }}
        >
          <motion.div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--color-primary)' }}
            whileHover={{ rotate: 15, scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <Flame size={20} color="white" strokeWidth={2.5} />
          </motion.div>
          <span className="hidden sm:inline">FoodDash</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {LINKS.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className="relative text-[15px] font-medium transition-colors flex items-center gap-2"
                style={{ color: active ? 'var(--color-foreground)' : 'var(--color-muted-foreground)' }}
              >
                <Icon size={16} />
                {label}
                {active && (
                  <motion.div
                    layoutId="navUnderline"
                    className="absolute -bottom-[21px] left-0 right-0 h-[3px] rounded-t-full"
                    style={{ backgroundColor: 'var(--color-foreground)' }}
                  />
                )}
              </Link>
            )
          })}

          <ThemeToggle />

          {token ? (
            <div className="flex items-center gap-3">
              <Link
                to="/orders"
                aria-label="Mis pedidos"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[15px] font-medium transition-all hover:scale-105"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}
              >
                <ShoppingBag size={18} />
                <span className="hidden sm:inline">Mis pedidos</span>
              </Link>
              <motion.button
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                className="w-9 h-9 flex items-center justify-center rounded-full transition-all hover:scale-105"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
                whileTap={{ scale: 0.92 }}
              >
                <LogOut size={16} />
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-[15px] font-medium transition-colors hover:text-[var(--color-foreground)] px-3 py-2"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                Iniciar sesión
              </Link>
              <motion.div whileTap={{ scale: 0.96 }}>
                <Link
                  to="/register"
                  className="text-[15px] font-semibold px-5 py-2.5 rounded-full text-white cursor-pointer shadow-luxury transition-all hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  Registrase
                </Link>
              </motion.div>
            </div>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Link
            to="/restaurants"
            className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}
          >
            <UtensilsCrossed size={18} />
          </Link>
        </div>
      </div>
    </motion.nav>
  )
}