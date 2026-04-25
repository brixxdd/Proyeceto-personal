import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { motion } from 'framer-motion'
import { User, Key, MapPin, Bell, ShoppingBag, CreditCard, ChevronRight, LogOut, Moon, Sun } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { staggerContainer, slideUp } from '../lib/animations'
import { useTheme } from '../context/ThemeContext'

const GET_PROFILE = gql`
  query GetProfile {
    me {
      id
      email
      name
      role
      createdAt
    }
  }
`

const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`

interface MenuItemProps {
    icon: React.ReactNode
    label: string
    description?: string
    onClick: () => void
    variant?: 'default' | 'danger'
}

function ProfileMenuItem({ icon, label, description, onClick, variant = 'default' }: MenuItemProps) {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-4 p-4 rounded-[16px] transition-colors text-left
                ${variant === 'default'
                    ? 'bg-[var(--color-card)] hover:bg-[var(--color-muted)] border border-[var(--color-border)]'
                    : 'bg-[var(--color-destructive)]/5 hover:bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)]/20'
                }
            `}
        >
            <div
                className={`
                    w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0
                    ${variant === 'default'
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                        : 'bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]'
                    }
                `}
            >
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-[15px] font-semibold ${variant === 'default' ? 'text-[var(--color-foreground)]' : 'text-[var(--color-destructive)]'}`}>
                    {label}
                </p>
                {description && (
                    <p className="text-[13px] text-[var(--color-muted-foreground)] truncate">
                        {description}
                    </p>
                )}
            </div>
            <ChevronRight size={18} className="text-[var(--color-muted-foreground)] shrink-0" />
        </button>
    )
}

export default function Profile() {
    const navigate = useNavigate()
    const { isDark, toggleTheme } = useTheme()
    const [showThemeToggle, setShowThemeToggle] = useState(false)

    const { data, loading } = useQuery<{ me: { id: string; email: string; name: string; role: string; createdAt: string } }>(GET_PROFILE)
    const [logout] = useMutation<any>(LOGOUT_MUTATION)
    const user = data?.me

    async function handleLogout() {
        try {
            await logout()
        } catch (e) {
            // Token might already be invalid, continue anyway
        }
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('user_role')
        navigate('/')
    }

    function handleOrders() {
        navigate('/orders')
    }

    return (
        <PageTransition>
            <main id="main-content" className="max-w-xl mx-auto px-4 py-8 pb-32 md:pb-8">
                {/* Profile Header */}
                <motion.div
                    className="flex flex-col items-center mb-10"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                >
                    <motion.div variants={slideUp} className="relative mb-4">
                        <div
                            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white ios-shadow-lg"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                            aria-label={`Avatar de ${user?.name ?? 'Usuario'}`}
                        >
                            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                        </div>
                        <button
                            onClick={toggleTheme}
                            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--color-card)] border-2 border-[var(--color-border)] flex items-center justify-center text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                        >
                            {isDark ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                    </motion.div>

                    <motion.h1
                        variants={slideUp}
                        className="text-2xl font-bold text-[var(--color-foreground)] text-center mb-1"
                    >
                        {loading ? (
                            <span className="bg-[var(--color-muted)] h-7 w-40 rounded-full animate-pulse inline-block" />
                        ) : (
                            user?.name ?? 'Usuario'
                        )}
                    </motion.h1>

                    <motion.p
                        variants={slideUp}
                        className="text-[15px] text-[var(--color-muted-foreground)] text-center"
                    >
                        {loading ? (
                            <span className="bg-[var(--color-muted)] h-5 w-48 rounded-full animate-pulse inline-block" />
                        ) : (
                            <>
                                {user?.email}
                                {user?.createdAt && (
                                    <span className="block text-[13px] mt-1">
                                        Miembro desde {new Date(user.createdAt).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                                    </span>
                                )}
                            </>
                        )}
                    </motion.p>
                </motion.div>

                {/* Menu Items */}
                <motion.div
                    className="space-y-3"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                >
                    <motion.div variants={slideUp}>
                        <h2 className="text-[13px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide px-1 mb-2">
                            Cuenta
                        </h2>
                        <div className="space-y-2">
                            <ProfileMenuItem
                                icon={<Key size={20} />}
                                label="Cambiar contraseña"
                                description="Actualiza tu contraseña de seguridad"
                                onClick={() => { }}
                            />
                            <ProfileMenuItem
                                icon={<User size={20} />}
                                label="Editar perfil"
                                description="Actualiza tu información personal"
                                onClick={() => { }}
                            />
                        </div>
                    </motion.div>

                    <motion.div variants={slideUp}>
                        <h2 className="text-[13px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide px-1 mb-2 mt-4">
                            Preferencias
                        </h2>
                        <div className="space-y-2">
                            <ProfileMenuItem
                                icon={<MapPin size={20} />}
                                label="Direcciones guardadas"
                                description="Gestiona tus direcciones de entrega"
                                onClick={() => { }}
                            />
                            <ProfileMenuItem
                                icon={<Bell size={20} />}
                                label="Notificaciones"
                                description="Configura cómo quieres recibir alertas"
                                onClick={() => { }}
                            />
                        </div>
                    </motion.div>

                    <motion.div variants={slideUp}>
                        <h2 className="text-[13px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide px-1 mb-2 mt-4">
                            Historial
                        </h2>
                        <div className="space-y-2">
                            <ProfileMenuItem
                                icon={<ShoppingBag size={20} />}
                                label="Mis pedidos"
                                description="Ver todos tus pedidos anteriores"
                                onClick={handleOrders}
                            />
                            <ProfileMenuItem
                                icon={<CreditCard size={20} />}
                                label="Métodos de pago"
                                description="Gestiona tus tarjetas y métodos de pago"
                                onClick={() => { }}
                            />
                        </div>
                    </motion.div>

                    <motion.div variants={slideUp} className="pt-4">
                        <ProfileMenuItem
                            icon={<LogOut size={20} />}
                            label="Cerrar sesión"
                            onClick={handleLogout}
                            variant="danger"
                        />
                    </motion.div>
                </motion.div>
            </main>
        </PageTransition>
    )
}
