import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, UtensilsCrossed, ShoppingBag, User, ShoppingCart, LayoutDashboard } from 'lucide-react'
import { useCart } from '../../context/CartContext'

const TABS = [
  { to: '/', icon: Home, label: 'Inicio' },
  { to: '/restaurants', icon: UtensilsCrossed, label: 'Explorar' },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const token = sessionStorage.getItem('token')
  const role = sessionStorage.getItem('user_role')
  const { itemCount } = useCart()

  const showProfile = !!token
  const isOwner = role === 'RESTAURANT_OWNER' || role === 'ADMIN'

  // Owner sees orders dashboard, regular users see /orders
  const mainTab = isOwner
    ? { to: '/dashboard', icon: LayoutDashboard, label: 'Pedidos' }
    : { to: '/orders', icon: ShoppingBag, label: 'Pedidos' }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
        borderTop: '1px solid var(--color-border)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
      }}
      aria-label="Navegación principal"
    >
      {TABS.map(({ to, icon: Icon, label }) => {
        const active = pathname === to || (to !== '/' && pathname.startsWith(to))
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? 'page' : undefined}
            className="flex flex-col items-center justify-center gap-[2px] w-16 h-12"
          >
            <motion.div
              className="relative flex items-center justify-center"
              animate={active ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Icon
                size={22}
                className="relative z-10 transition-colors"
                style={{ color: active ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
                strokeWidth={active ? 2.5 : 2}
              />
              {active && (
                <motion.div
                  layoutId="bottomNavDot"
                  className="absolute -bottom-1 w-1 h-1 rounded-full"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                />
              )}
            </motion.div>
            <span
              className="text-[10px] font-medium transition-colors"
              style={{ color: active ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
            >
              {label}
            </span>
          </Link>
        )
      })}

      {/* Main tab (Pedidos) */}
      {(() => {
        const { to, icon: Icon, label } = mainTab
        const active = pathname === to || pathname.startsWith(to)
        return (
          <Link
            to={to}
            aria-current={active ? 'page' : undefined}
            className="flex flex-col items-center justify-center gap-[2px] w-16 h-12"
          >
            <motion.div
              className="relative flex items-center justify-center"
              animate={active ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Icon
                size={22}
                className="transition-colors"
                style={{ color: active ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
                strokeWidth={active ? 2.5 : 2}
              />
              {active && (
                <motion.div
                  layoutId="bottomNavDot"
                  className="absolute -bottom-1 w-1 h-1 rounded-full"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                />
              )}
            </motion.div>
            <span
              className="text-[10px] font-medium transition-colors"
              style={{ color: active ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
            >
              {label}
            </span>
          </Link>
        )
      })()}

      {/* Cart tab (non-owner only) */}
      {!isOwner && (
        <Link
          to="/cart"
          aria-current={pathname === '/cart' ? 'page' : undefined}
          className="flex flex-col items-center justify-center gap-[2px] w-16 h-12 relative"
        >
          <motion.div
            className="relative flex items-center justify-center"
            animate={pathname === '/cart' ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <div className="relative">
              <ShoppingCart
                size={22}
                className="transition-colors"
                style={{ color: pathname === '/cart' ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
                strokeWidth={pathname === '/cart' ? 2.5 : 2}
              />
              {itemCount > 0 && (
                <span
                  className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[var(--color-primary)] text-white text-[9px] font-bold flex items-center justify-center"
                  aria-label={`${itemCount} artículos en carrito`}
                >
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </div>
            {pathname === '/cart' && (
              <motion.div
                layoutId="bottomNavDot"
                className="absolute -bottom-1 w-1 h-1 rounded-full"
                style={{ backgroundColor: 'var(--color-primary)' }}
              />
            )}
          </motion.div>
          <span
            className="text-[10px] font-medium transition-colors"
            style={{ color: pathname === '/cart' ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
          >
            Carrito
          </span>
        </Link>
      )}

      {/* Profile / Login tab */}
      <Link
        to={showProfile ? '/profile' : '/login'}
        aria-current={pathname === '/profile' || pathname === '/login' ? 'page' : undefined}
        className="flex flex-col items-center justify-center gap-[2px] w-16 h-12"
      >
        <motion.div
          className="relative flex items-center justify-center"
          animate={pathname === '/profile' || pathname === '/login' ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <User
            size={22}
            className="transition-colors"
            style={{ color: pathname === '/profile' || pathname === '/login' ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
            strokeWidth={pathname === '/profile' || pathname === '/login' ? 2.5 : 2}
          />
          {pathname === '/profile' || pathname === '/login' ? (
            <motion.div
              layoutId="bottomNavDot"
              className="absolute -bottom-1 w-1 h-1 rounded-full"
              style={{ backgroundColor: 'var(--color-primary)' }}
            />
          ) : null}
        </motion.div>
        <span
          className="text-[10px] font-medium transition-colors"
          style={{ color: pathname === '/profile' || pathname === '/login' ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
        >
          {showProfile ? 'Perfil' : 'Cuenta'}
        </span>
      </Link>
    </nav>
  )
}
