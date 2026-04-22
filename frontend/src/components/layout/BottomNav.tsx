import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, UtensilsCrossed, ShoppingBag, User } from 'lucide-react'

const TABS = [
  { to: '/', icon: Home, label: 'Inicio' },
  { to: '/restaurants', icon: UtensilsCrossed, label: 'Explorar' },
  { to: '/orders', icon: ShoppingBag, label: 'Pedidos' },
  { to: '/login', icon: User, label: 'Cuenta' },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const token = localStorage.getItem('token')

  const tabs = TABS.filter(t => {
    if (t.to === '/login' && token) return false
    if (t.to === '/orders' && !token) return false
    return true
  })

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderTop: '1px solid var(--color-border)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
      }}
    >
      {tabs.map(({ to, icon: Icon, label }) => {
        const active = pathname === to || (to !== '/' && pathname.startsWith(to))
        return (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center justify-center gap-[2px] w-16 h-12"
          >
            <div className="relative flex items-center justify-center">
              <Icon
                size={22}
                className="relative z-10 transition-colors"
                style={{ color: active ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
                strokeWidth={active ? 2.5 : 2}
              />
            </div>
            <span
              className="text-[10px] font-medium transition-colors"
              style={{ color: active ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
