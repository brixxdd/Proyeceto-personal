import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Flame } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { staggerContainer, slideUp, bouncyTransition } from '../lib/animations'

const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user { id email role }
    }
  }
`

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [login, { loading, error }] = useMutation<any>(LOGIN)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { data } = await login({ variables: form })
      if (data?.login?.token) {
        sessionStorage.setItem('token', data.login.token)
        sessionStorage.setItem('user_role', data.login.user?.role || '')
        // Role-based redirect
        const role = data.login.user?.role
        if (role === 'RESTAURANT_OWNER' || role === 'ADMIN') {
          navigate('/dashboard')
        } else {
          navigate('/restaurants')
        }
      }
    } catch { /* error state handled by Apollo */ }
  }

  return (
    <PageTransition>
      <div className="min-h-[calc(100dvh-64px)] md:min-h-[calc(100vh-64px)] flex items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          <motion.div
            className="p-8 md:p-10 rounded-[32px] border border-[var(--color-border)] ios-shadow-lg"
            style={{ backgroundColor: 'var(--color-card)' }}
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.div variants={slideUp} className="flex justify-center mb-6">
              <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-[var(--color-foreground)]">
                <div
                  className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Flame size={22} color="white" strokeWidth={2.5} />
                </div>
              </Link>
            </motion.div>

            <motion.div variants={slideUp} className="text-center mb-8">
              <h2 className="text-[26px] font-bold tracking-tight text-[var(--color-foreground)] mb-1">
                Bienvenido de vuelta
              </h2>
              <p className="text-[15px] font-medium text-[var(--color-muted-foreground)]">
                Ingresa a tu cuenta para continuar
              </p>
            </motion.div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden mb-6"
                >
                  <p className="text-[14px] font-medium p-3.5 rounded-[14px] bg-[var(--color-primary-light)] text-[var(--color-destructive)] text-center">
                    {error.message}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <motion.div variants={slideUp} className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-[13px] font-semibold text-[var(--color-foreground)] px-1">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="px-4 py-3.5 rounded-[16px] text-[15px] transition-colors border border-[var(--color-border)] bg-[var(--color-muted)] w-full focus:bg-[var(--color-card)]"
                  placeholder="tu@email.com"
                />
              </motion.div>

              <motion.div variants={slideUp} className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-[13px] font-semibold text-[var(--color-foreground)] px-1">Contraseña</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-4 py-3.5 pr-12 rounded-[16px] text-[15px] transition-colors border border-[var(--color-border)] bg-[var(--color-muted)] focus:bg-[var(--color-card)]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer transition-opacity hover:opacity-70 text-[var(--color-muted-foreground)]"
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </motion.div>

              <motion.div variants={slideUp} className="pt-2">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  transition={bouncyTransition}
                  className="w-full py-4 rounded-[16px] font-semibold text-white text-[15px] bg-[var(--color-primary)] ios-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Ingresando...' : 'Iniciar sesión'}
                </motion.button>
              </motion.div>
            </form>

            <motion.p
              variants={slideUp}
              className="mt-8 text-[15px] font-medium text-center text-[var(--color-muted-foreground)]"
            >
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="font-semibold text-[var(--color-primary)] hover:underline">
                Regístrate gratis
              </Link>
            </motion.p>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  )
}
