import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, UtensilsCrossed, ShoppingBag, ShoppingCart, User, LogOut, Flame, LayoutDashboard } from 'lucide-react'
import ThemeToggle from '../ui/ThemeToggle'
import { useCart } from '../../context/CartContext'
import { useApolloClient } from '@apollo/client/react'

// Nav link component with active state
function NavLink({
  to,
  icon: Icon,
  label,
  active,
  badge,
}: {
  to: string
  icon: any
  label: string
  active: boolean
  badge?: number
}) {
  return (
    <Link
      to={to}
      className="relative flex items-center gap-1.5 px-3 py-2 rounded-full text-[14px] font-medium transition-all"
      style={{
        color: active ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
        backgroundColor: active ? 'var(--color-muted)' : 'transparent',
      }}
    >
      <Icon size={16} strokeWidth={active ? 2.5 : 2} />
      <span>{label}</span>
      {badge !== undefined && (
        <span className="ml-0.5 w-4 h-4 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-bold flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const token = sessionStorage.getItem('token')
  const role = sessionStorage.getItem('user_role')
  const { itemCount } = useCart()

  const isOwner = role === 'RESTAURANT_OWNER' || role === 'ADMIN'
  const isDelivery = role === 'DELIVERY_PERSON'

  const client = useApolloClient()

  function handleLogout() {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user_role')
    // Limpiar el cache de Apollo: evita que el nuevo usuario
    // vea datos (restaurantes, pedidos) de la sesion anterior
    client.clearStore().finally(() => {
      navigate('/login')
    })
  }

  const ordersLink = isOwner ? '/dashboard' : '/orders'

  // ── Guest nav ─────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <motion.nav
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="sticky top-0 z-50 glass-card"
        style={{
          borderBottom: '1px solid var(--color-border)',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-heading text-xl tracking-tight shrink-0"
            style={{ color: 'var(--color-foreground)', textDecoration: 'none' }}
          >
            <motion.div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary)' }}
              whileHover={{ rotate: 15, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <Flame size={20} color="white" strokeWidth={2.5} />
            </motion.div>
            <span className="hidden sm:inline">FoodDash</span>
          </Link>

          {/* Desktop guest nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/restaurants" icon={UtensilsCrossed} label="Explorar" active={pathname.startsWith('/restaurants')} />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="text-[14px] font-medium transition-colors hover:text-[var(--color-foreground)] px-3 py-2"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                Iniciar sesión
              </Link>
              <motion.div whileTap={{ scale: 0.96 }}>
                <Link
                  to="/register"
                  className="text-[14px] font-semibold px-4 py-2 rounded-full text-white cursor-pointer transition-all hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  Registrarse
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Mobile right */}
          <div className="flex md:hidden items-center gap-2">
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

  // ── Logged-in nav ──────────────────────────────────────────────────────────
  return (
    <motion.nav
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="sticky top-0 z-50 glass-card"
      style={{
        borderBottom: '1px solid var(--color-border)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 font-heading text-xl tracking-tight shrink-0"
          style={{ color: 'var(--color-foreground)', textDecoration: 'none' }}
        >
          <motion.div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-primary)' }}
            whileHover={{ rotate: 15, scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <Flame size={20} color="white" strokeWidth={2.5} />
          </motion.div>
          <span className="hidden sm:inline">FoodDash</span>
        </Link>

        {/* Desktop main nav */}
        <div className="hidden md:flex items-center gap-1">
          {isDelivery ? (
            <>
              <NavLink to="/delivery" icon={LayoutDashboard} label="Entregas" active={pathname.startsWith('/delivery')} />
              <NavLink to="/profile" icon={User} label="Perfil" active={pathname === '/profile'} />
            </>
          ) : (
            <>
              <NavLink to="/restaurants" icon={UtensilsCrossed} label="Explorar" active={pathname.startsWith('/restaurants') || pathname.startsWith('/restaurant')} />
              <NavLink to={ordersLink} icon={isOwner ? LayoutDashboard : ShoppingBag} label={isOwner ? 'Dashboard' : 'Pedidos'} active={pathname === ordersLink || (isOwner && pathname.startsWith('/dashboard'))} />
              {!isOwner && <NavLink to="/cart" icon={ShoppingCart} label="Carrito" active={pathname === '/cart'} badge={itemCount > 0 ? itemCount : undefined} />}
              <NavLink to="/profile" icon={User} label="Perfil" active={pathname === '/profile'} />
            </>
          )}
        </div>

        {/* Right actions — desktop only */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <motion.button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-medium transition-all hover:scale-105"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
            whileTap={{ scale: 0.92 }}
          >
            <LogOut size={15} />
            <span>Salir</span>
          </motion.button>
        </div>

        {/* Mobile right */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          {!isOwner && !isDelivery && itemCount > 0 && (
            <Link
              to="/cart"
              className="relative w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}
              aria-label={`Carrito — ${itemCount} artículos`}
            >
              <ShoppingCart size={18} />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-primary)] text-white text-[9px] font-bold flex items-center justify-center">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            </Link>
          )}
          <Link
            to={isDelivery ? '/delivery' : '/restaurants'}
            className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}
          >
            {isDelivery ? <LayoutDashboard size={18} /> : <UtensilsCrossed size={18} />}
          </Link>
        </div>
      </div>
    </motion.nav>
  )
}
