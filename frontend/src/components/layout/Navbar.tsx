import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingBag, LogOut, Flame } from 'lucide-react'

const LINKS = [
  { to: '/restaurants', label: 'Restaurantes' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const token = localStorage.getItem('token')

  function handleLogout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <motion.nav
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="sticky top-0 z-50 glass"
      style={{ 
        borderBottom: '1px solid var(--color-border)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)'
      }}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold text-xl tracking-tight"
          style={{ color: 'var(--color-foreground)', textDecoration: 'none' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Flame size={18} color="white" strokeWidth={2.5} />
          </div>
          FoodDash
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {LINKS.map(({ to, label }) => {
            const active = pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className="relative text-[15px] font-medium transition-colors hover:text-[var(--color-foreground)]"
                style={{ color: active ? 'var(--color-foreground)' : 'var(--color-muted-foreground)' }}
              >
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

          {token ? (
            <div className="flex items-center gap-3">
              <Link
                to="/orders"
                aria-label="Mis pedidos"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[15px] font-medium transition-transform active:scale-95"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}
              >
                <ShoppingBag size={18} />
                Pedidos
              </Link>
              <button
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                className="w-8 h-8 flex items-center justify-center rounded-full transition-transform active:scale-95"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-[15px] font-medium transition-colors hover:text-[var(--color-foreground)]"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                Iniciar sesión
              </Link>
              <motion.div whileTap={{ scale: 0.96 }}>
                <Link
                  to="/register"
                  className="text-[15px] font-semibold px-5 py-2 rounded-full text-white cursor-pointer ios-shadow transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  Registrarse
                </Link>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  )
}
