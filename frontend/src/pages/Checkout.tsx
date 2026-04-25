import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { motion } from 'framer-motion'
import { MapPin, CreditCard, Truck, CheckCircle } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { useCart } from '../context/CartContext'
import { staggerContainer, slideUp } from '../lib/animations'

const CREATE_ORDER = gql`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      status
      total
      estimatedDelivery
    }
  }
`

export default function Checkout() {
    const navigate = useNavigate()
    const { items, total, restaurantId, restaurantName, clearCart, isEmpty } = useCart()
    const [step, setStep] = useState<'address' | 'payment' | 'confirmation'>('address')
    const [orderId, setOrderId] = useState<string | null>(null)
    const [estimatedDelivery, setEstimatedDelivery] = useState<string | null>(null)

    const [form, setForm] = useState({
        street: '',
        number: '',
        city: '',
        zip: '',
        notes: '',
    })
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card')

    const [createOrder, { loading }] = useMutation(CREATE_ORDER)

    const deliveryFee = total > 0 ? 2.50 : 0
    const serviceFee = total > 0 ? total * 0.05 : 0
    const grandTotal = total + deliveryFee + serviceFee

    async function handlePlaceOrder() {
        if (isEmpty) return

        try {
            const { data } = await createOrder({
                variables: {
                    input: {
                        restaurantId: restaurantId!,
                        items: items.map(i => ({
                            menuItemId: i.menuItemId,
                            quantity: i.quantity,
                        })),
                        deliveryAddress: `${form.street} ${form.number}, ${form.city}, ${form.zip}`,
                        notes: form.notes,
                    },
                },
            })

            const order = (data as any)?.createOrder
            if (order) {
                setOrderId(order.id)
                setEstimatedDelivery(order.estimatedDelivery)
                setStep('confirmation')
                clearCart()
            }
        } catch (err) {
            console.error('Failed to create order:', err)
        }
    }

    if (isEmpty) {
        return (
            <PageTransition>
                <main id="main-content" className="max-w-xl mx-auto px-4 py-8 pb-32 md:pb-8">
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
                        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Tu carrito está vacío</h1>
                        <button
                            onClick={() => navigate('/restaurants')}
                            className="px-6 py-3 rounded-[14px] font-semibold bg-[var(--color-primary)] text-white ios-shadow"
                        >
                            Ver restaurantes
                        </button>
                    </div>
                </main>
            </PageTransition>
        )
    }

    if (step === 'confirmation') {
        return (
            <PageTransition>
                <main id="main-content" className="max-w-xl mx-auto px-4 py-8 pb-32 md:pb-8">
                    <motion.div
                        className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-5"
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                    >
                        <motion.div variants={slideUp}>
                            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 mx-auto">
                                <CheckCircle size={40} className="text-green-500" />
                            </div>
                            <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">¡Pedido confirmado!</h1>
                            <p className="text-[var(--color-muted-foreground)] mb-1">Tu pedido #{orderId} ha sido creado.</p>
                            {estimatedDelivery && (
                                <p className="text-[14px] text-[var(--color-muted-foreground)]">
                                    Tiempo estimado de entrega:{' '}
                                    <span className="font-semibold text-[var(--color-foreground)]">
                                        {new Date(estimatedDelivery).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </p>
                            )}
                        </motion.div>

                        <motion.button
                            variants={slideUp}
                            onClick={() => navigate('/orders')}
                            className="px-6 py-3 rounded-[14px] font-semibold bg-[var(--color-primary)] text-white ios-shadow"
                        >
                            Ver mis pedidos
                        </motion.button>

                        <motion.button
                            variants={slideUp}
                            onClick={() => navigate('/restaurants')}
                            className="px-6 py-3 rounded-[14px] font-semibold text-[var(--color-foreground)] border border-[var(--color-border)] bg-[var(--color-card)]"
                        >
                            Seguir ordenando
                        </motion.button>
                    </motion.div>
                </main>
            </PageTransition>
        )
    }

    return (
        <PageTransition>
            <main id="main-content" className="max-w-xl mx-auto px-4 py-8 pb-32 md:pb-8">
                {/* Progress steps */}
                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="flex items-center gap-2 mb-8"
                >
                    {['address', 'payment'].map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold ${step === s
                                    ? 'bg-[var(--color-primary)] text-white'
                                    : (i === 0 && step === 'payment')
                                        ? 'bg-green-500 text-white'
                                        : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
                                    }`}
                            >
                                {i === 0 && step === 'payment' ? <CheckCircle size={16} /> : i + 1}
                            </div>
                            <span className={`text-[13px] font-medium ${step === s ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]'}`}>
                                {s === 'address' ? 'Dirección' : 'Pago'}
                            </span>
                            {i === 0 && <div className="flex-1 h-px bg-[var(--color-border)]" />}
                        </div>
                    ))}
                </motion.div>

                {step === 'address' && (
                    <motion.div variants={staggerContainer} initial="initial" animate="animate">
                        <motion.h1 variants={slideUp} className="text-2xl font-bold text-[var(--color-foreground)] mb-6">
                            Dirección de entrega
                        </motion.h1>

                        <div className="space-y-4">
                            <motion.div variants={slideUp}>
                                <label htmlFor="street" className="text-[13px] font-semibold text-[var(--color-foreground)] block mb-1.5">
                                    Calle
                                </label>
                                <input
                                    id="street"
                                    type="text"
                                    value={form.street}
                                    onChange={e => setForm(f => ({ ...f, street: e.target.value }))}
                                    className="w-full px-4 py-3.5 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-muted)] text-[15px] focus:bg-[var(--color-card)] focus:border-[var(--color-primary)] transition-colors"
                                    placeholder="Av. Principal"
                                    required
                                />
                            </motion.div>

                            <motion.div variants={slideUp} className="grid grid-cols-3 gap-3">
                                <div>
                                    <label htmlFor="number" className="text-[13px] font-semibold text-[var(--color-foreground)] block mb-1.5">
                                        Número
                                    </label>
                                    <input
                                        id="number"
                                        type="text"
                                        value={form.number}
                                        onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                                        className="w-full px-4 py-3.5 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-muted)] text-[15px] focus:bg-[var(--color-card)] transition-colors"
                                        placeholder="123"
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label htmlFor="city" className="text-[13px] font-semibold text-[var(--color-foreground)] block mb-1.5">
                                        Ciudad
                                    </label>
                                    <input
                                        id="city"
                                        type="text"
                                        value={form.city}
                                        onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                                        className="w-full px-4 py-3.5 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-muted)] text-[15px] focus:bg-[var(--color-card)] transition-colors"
                                        placeholder="Ciudad de México"
                                        required
                                    />
                                </div>
                            </motion.div>

                            <motion.div variants={slideUp}>
                                <label htmlFor="zip" className="text-[13px] font-semibold text-[var(--color-foreground)] block mb-1.5">
                                    Código postal
                                </label>
                                <input
                                    id="zip"
                                    type="text"
                                    value={form.zip}
                                    onChange={e => setForm(f => ({ ...f, zip: e.target.value }))}
                                    className="w-full px-4 py-3.5 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-muted)] text-[15px] focus:bg-[var(--color-card)] transition-colors"
                                    placeholder="06600"
                                    required
                                />
                            </motion.div>

                            <motion.div variants={slideUp}>
                                <label htmlFor="notes" className="text-[13px] font-semibold text-[var(--color-foreground)] block mb-1.5">
                                    Notas para el repartidor <span className="text-[var(--color-muted-foreground)] font-normal">(opcional)</span>
                                </label>
                                <textarea
                                    id="notes"
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full px-4 py-3.5 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-muted)] text-[15px] focus:bg-[var(--color-card)] transition-colors resize-none"
                                    placeholder="Por favor toca el timbre 3B"
                                    rows={2}
                                />
                            </motion.div>
                        </div>

                        <motion.button
                            variants={slideUp}
                            onClick={() => setStep('payment')}
                            disabled={!form.street || !form.number || !form.city || !form.zip}
                            className="w-full mt-6 py-4 rounded-[16px] font-semibold text-white text-[15px] bg-[var(--color-primary)] ios-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continuar al pago
                        </motion.button>
                    </motion.div>
                )}

                {step === 'payment' && (
                    <motion.div variants={staggerContainer} initial="initial" animate="animate">
                        <motion.h1 variants={slideUp} className="text-2xl font-bold text-[var(--color-foreground)] mb-6">
                            Método de pago
                        </motion.h1>

                        <div className="space-y-3 mb-6">
                            <motion.button
                                variants={slideUp}
                                onClick={() => setPaymentMethod('card')}
                                className={`w-full flex items-center gap-4 p-4 rounded-[16px] border transition-colors ${paymentMethod === 'card'
                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                    : 'border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-muted)]'
                                    }`}
                            >
                                <CreditCard size={20} className={paymentMethod === 'card' ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)]'} />
                                <div className="text-left">
                                    <p className="text-[15px] font-semibold text-[var(--color-foreground)]">Tarjeta de crédito/débito</p>
                                    <p className="text-[13px] text-[var(--color-muted-foreground)]">Visa, Mastercard, AMEX</p>
                                </div>
                                {paymentMethod === 'card' && (
                                    <CheckCircle size={20} className="ml-auto text-[var(--color-primary)]" />
                                )}
                            </motion.button>

                            <motion.button
                                variants={slideUp}
                                onClick={() => setPaymentMethod('cash')}
                                className={`w-full flex items-center gap-4 p-4 rounded-[16px] border transition-colors ${paymentMethod === 'cash'
                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                    : 'border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-muted)]'
                                    }`}
                            >
                                <Truck size={20} className={paymentMethod === 'cash' ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)]'} />
                                <div className="text-left">
                                    <p className="text-[15px] font-semibold text-[var(--color-foreground)]">Efectivo</p>
                                    <p className="text-[13px] text-[var(--color-muted-foreground)]">Paga al recibir tu pedido</p>
                                </div>
                                {paymentMethod === 'cash' && (
                                    <CheckCircle size={20} className="ml-auto text-[var(--color-primary)]" />
                                )}
                            </motion.button>
                        </div>

                        {/* Order Summary */}
                        <motion.div
                            variants={slideUp}
                            className="bg-[var(--color-card)] rounded-[20px] border border-[var(--color-border)] p-5 space-y-3 mb-6"
                        >
                            <p className="text-[13px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide mb-3">
                                Resumen del pedido
                            </p>
                            <div className="flex justify-between text-[14px]">
                                <span className="text-[var(--color-muted-foreground)]">de {restaurantName}</span>
                            </div>
                            {items.map(item => (
                                <div key={item.menuItemId} className="flex justify-between text-[14px]">
                                    <span className="text-[var(--color-muted-foreground)]">{item.quantity}× {item.name}</span>
                                    <span className="text-[var(--color-foreground)]">${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="border-t border-[var(--color-border)] pt-3 flex justify-between text-[14px]">
                                <span className="text-[var(--color-muted-foreground)]">Costo de envío</span>
                                <span className="text-[var(--color-foreground)]">${deliveryFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[14px]">
                                <span className="text-[var(--color-muted-foreground)]">Cargo por servicio</span>
                                <span className="text-[var(--color-foreground)]">${serviceFee.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-[var(--color-border)] pt-3 flex justify-between">
                                <span className="text-[15px] font-semibold text-[var(--color-foreground)]">Total</span>
                                <span className="text-[15px] font-bold text-[var(--color-primary)]">${grandTotal.toFixed(2)}</span>
                            </div>
                        </motion.div>

                        <motion.button
                            variants={slideUp}
                            onClick={handlePlaceOrder}
                            disabled={loading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-4 rounded-[16px] font-semibold text-white text-[15px] bg-[var(--color-primary)] ios-shadow disabled:opacity-50"
                        >
                            {loading ? 'Procesando...' : `Confirmar pedido — $${grandTotal.toFixed(2)}`}
                        </motion.button>

                        <button
                            onClick={() => setStep('address')}
                            className="w-full mt-3 py-3 text-[14px] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition-colors text-center"
                        >
                            ← Volver a dirección
                        </button>
                    </motion.div>
                )}
            </main>
        </PageTransition>
    )
}
