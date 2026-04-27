import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { motion } from 'framer-motion'
import { MapPin, Phone, UtensilsCrossed, Plus, Loader2, ChefHat } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { staggerContainer, slideUp } from '../lib/animations'

interface CreateRestaurantResult {
    createRestaurant: {
        id: string
        name: string
    }
}

interface CreateRestaurantVariables {
    input: {
        name: string
        description?: string
        cuisineType: string
        phone: string
        email?: string
        address: string
    }
}

const CREATE_RESTAURANT = gql`
  mutation CreateRestaurant($input: CreateRestaurantInput!) {
    createRestaurant(input: $input) {
      id
      name
    }
  }
`

const CUISINE_TYPES = [
    'Mexican', 'Japanese', 'Italian', 'American', 'Chinese',
    'Indian', 'Thai', 'French', 'Spanish', 'Korean',
    'Vietnamese', 'Mediterranean', 'Brazilian', 'Peruvian', 'Other'
]

export default function CreateRestaurant() {
    const navigate = useNavigate()
    const [createRestaurant, { loading }] = useMutation<CreateRestaurantResult, CreateRestaurantVariables>(CREATE_RESTAURANT)

    const [form, setForm] = useState({
        name: '',
        description: '',
        cuisineType: '',
        phone: '',
        email: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'México',
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    function validate() {
        const newErrors: Record<string, string> = {}
        if (!form.name.trim()) newErrors.name = 'Nombre requerido'
        if (!form.cuisineType) newErrors.cuisineType = 'Tipo de cocina requerido'
        if (!form.phone.trim()) newErrors.phone = 'Teléfono requerido'
        if (!form.street.trim()) newErrors.street = 'Calle requerida'
        if (!form.city.trim()) newErrors.city = 'Ciudad requerida'
        if (!form.state.trim()) newErrors.state = 'Estado requerido'
        if (!form.zipCode.trim()) newErrors.zipCode = 'Código postal requerido'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!validate()) return

        try {
            const { data } = await createRestaurant({
                variables: {
                    input: {
                        name: form.name,
                        description: form.description || undefined,
                        cuisineType: form.cuisineType,
                        phone: form.phone,
                        email: form.email || undefined,
                        address: `${form.street}, ${form.city}, ${form.state}, ${form.zipCode}, ${form.country}`,
                    },
                },
            })
            if (data?.createRestaurant?.id) {
                navigate('/dashboard')
            }
        } catch (err: any) {
            setErrors({ submit: err.message || 'Error al crear restaurante' })
        }
    }

    function updateField(field: string, value: string) {
        setForm(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    return (
        <PageTransition>
            <main className="min-h-[calc(100dvh-64px)] flex items-center justify-center p-6">
                <motion.div
                    className="w-full max-w-[480px]"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                >
                    <motion.div variants={slideUp}>
                        <div className="flex items-center gap-3 mb-6">
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                style={{ backgroundColor: 'var(--color-primary)' }}
                            >
                                <ChefHat size={28} color="white" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
                                    Crea tu Restaurante
                                </h1>
                                <p className="text-[var(--color-muted-foreground)] text-sm">
                                    Configura tu negocio en minutos
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Basic Info */}
                        <motion.div variants={slideUp} className="bg-[var(--color-card)] rounded-[24px] border border-[var(--color-border)] p-6 ios-shadow-sm">
                            <h2 className="text-[16px] font-bold text-[var(--color-foreground)] mb-4 flex items-center gap-2">
                                <UtensilsCrossed size={18} />
                                Información del restaurante
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[13px] font-semibold text-[var(--color-foreground)] block mb-1.5">
                                        Nombre *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => updateField('name', e.target.value)}
                                        className={`w-full px-4 py-3.5 rounded-[16px] border text-[15px] bg-[var(--color-muted)] transition-colors focus:bg-[var(--color-card)] ${errors.name ? 'border-red-500' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}`}
                                        placeholder="La Cocina de Don Pancho"
                                    />
                                    {errors.name && <p className="text-red-500 text-[12px] mt-1">{errors.name}</p>}
                                </div>

                                <div>
                                    <label className="text-[13px] font-semibold text-[var(--color-foreground)] block mb-1.5">
                                        Tipo de cocina *
                                    </label>
                                    <select
                                        value={form.cuisineType}
                                        onChange={e => updateField('cuisineType', e.target.value)}
                                        className={`w-full px-4 py-3.5 rounded-[16px] border text-[15px] bg-[var(--color-muted)] transition-colors focus:bg-[var(--color-card)] appearance-none ${errors.cuisineType ? 'border-red-500' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}`}
                                        style={{ backgroundColor: 'var(--color-muted)' }}
                                    >
                                        <option value="">Selecciona un tipo</option>
                                        {CUISINE_TYPES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    {errors.cuisineType && <p className="text-red-500 text-[12px] mt-1">{errors.cuisineType}</p>}
                                </div>

                                <div>
                                    <label className="text-[13px] font-semibold text-[var(--color-foreground)] block mb-1.5">
                                        Descripción
                                    </label>
                                    <textarea
                                        value={form.description}
                                        onChange={e => updateField('description', e.target.value)}
                                        className="w-full px-4 py-3.5 rounded-[16px] border border-[var(--color-border)] text-[15px] bg-[var(--color-muted)] transition-colors focus:bg-[var(--color-card)] focus:border-[var(--color-primary)] resize-none"
                                        placeholder="Describe tu restaurante..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </motion.div>

                        {/* Contact */}
                        <motion.div variants={slideUp} className="bg-[var(--color-card)] rounded-[24px] border border-[var(--color-border)] p-6 ios-shadow-sm">
                            <h2 className="text-[16px] font-bold text-[var(--color-foreground)] mb-4 flex items-center gap-2">
                                <Phone size={18} />
                                Contacto
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[13px] font-semibold text-[var(--color-foreground)] block mb-1.5">
                                        Teléfono *
                                    </label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={e => updateField('phone', e.target.value)}
                                        className={`w-full px-4 py-3.5 rounded-[16px] border text-[15px] bg-[var(--color-muted)] transition-colors focus:bg-[var(--color-card)] ${errors.phone ? 'border-red-500' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}`}
                                        placeholder="55 1234 5678"
                                    />
                                    {errors.phone && <p className="text-red-500 text-[12px] mt-1">{errors.phone}</p>}
                                </div>

                                <div>
                                    <label className="text-[13px] font-semibold text-[var(--color-foreground)] block mb-1.5">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={e => updateField('email', e.target.value)}
                                        className="w-full px-4 py-3.5 rounded-[16px] border border-[var(--color-border)] text-[15px] bg-[var(--color-muted)] transition-colors focus:bg-[var(--color-card)] focus:border-[var(--color-primary)]"
                                        placeholder="contacto@turestaurante.com"
                                    />
                                </div>
                            </div>
                        </motion.div>

                        {/* Address */}
                        <motion.div variants={slideUp} className="bg-[var(--color-card)] rounded-[24px] border border-[var(--color-border)] p-6 ios-shadow-sm">
                            <h2 className="text-[16px] font-bold text-[var(--color-foreground)] mb-4 flex items-center gap-2">
                                <MapPin size={18} />
                                Ubicación
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[13px] font-semibold text-[var(--color-foreground)] block mb-1.5">
                                        Calle y número *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.street}
                                        onChange={e => updateField('street', e.target.value)}
                                        className={`w-full px-4 py-3.5 rounded-[16px] border text-[15px] bg-[var(--color-muted)] transition-colors focus:bg-[var(--color-card)] ${errors.street ? 'border-red-500' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}`}
                                        placeholder="Av. Principal 123"
                                    />
                                    {errors.street && <p className="text-red-500 text-[12px] mt-1">{errors.street}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[13px] font-semibold text-[var(--color-foreground)] block mb-1.5">
                                            Ciudad *
                                        </label>
                                        <input
                                            type="text"
                                            value={form.city}
                                            onChange={e => updateField('city', e.target.value)}
                                            className={`w-full px-4 py-3.5 rounded-[16px] border text-[15px] bg-[var(--color-muted)] transition-colors focus:bg-[var(--color-card)] ${errors.city ? 'border-red-500' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}`}
                                            placeholder="CDMX"
                                        />
                                        {errors.city && <p className="text-red-500 text-[12px] mt-1">{errors.city}</p>}
                                    </div>
                                    <div>
                                        <label className="text-[13px] font-semibold text-[var(--color-foreground)] block mb-1.5">
                                            Estado *
                                        </label>
                                        <input
                                            type="text"
                                            value={form.state}
                                            onChange={e => updateField('state', e.target.value)}
                                            className={`w-full px-4 py-3.5 rounded-[16px] border text-[15px] bg-[var(--color-muted)] transition-colors focus:bg-[var(--color-card)] ${errors.state ? 'border-red-500' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}`}
                                            placeholder="CDMX"
                                        />
                                        {errors.state && <p className="text-red-500 text-[12px] mt-1">{errors.state}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[13px] font-semibold text-[var(--color-foreground)] block mb-1.5">
                                            Código postal *
                                        </label>
                                        <input
                                            type="text"
                                            value={form.zipCode}
                                            onChange={e => updateField('zipCode', e.target.value)}
                                            className={`w-full px-4 py-3.5 rounded-[16px] border text-[15px] bg-[var(--color-muted)] transition-colors focus:bg-[var(--color-card)] ${errors.zipCode ? 'border-red-500' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}`}
                                            placeholder="06600"
                                        />
                                        {errors.zipCode && <p className="text-red-500 text-[12px] mt-1">{errors.zipCode}</p>}
                                    </div>
                                    <div>
                                        <label className="text-[13px] font-semibold text-[var(--color-foreground)] block mb-1.5">
                                            País
                                        </label>
                                        <input
                                            type="text"
                                            value={form.country}
                                            onChange={e => updateField('country', e.target.value)}
                                            className="w-full px-4 py-3.5 rounded-[16px] border border-[var(--color-border)] text-[15px] bg-[var(--color-muted)] transition-colors focus:bg-[var(--color-card)] focus:border-[var(--color-primary)]"
                                            placeholder="México"
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {errors.submit && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="p-4 rounded-[16px] bg-red-50 border border-red-200"
                            >
                                <p className="text-red-600 text-[14px] font-medium">{errors.submit}</p>
                            </motion.div>
                        )}

                        <motion.button
                            type="submit"
                            disabled={loading}
                            variants={slideUp}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-4 rounded-[16px] font-bold text-white text-[16px] ios-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                <>
                                    <Plus size={20} />
                                    Crear Restaurante
                                </>
                            )}
                        </motion.button>
                    </form>
                </motion.div>
            </main>
        </PageTransition>
    )
}
