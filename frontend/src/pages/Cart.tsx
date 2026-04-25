import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { useCart } from '../context/CartContext'
import { staggerContainer, slideUp } from '../lib/animations'

export default function Cart() {
    const navigate = useNavigate()
    const { items, itemCount, total, updateQuantity, removeItem, clearCart, restaurantName, isEmpty } = useCart()

    function handleCheckout() {
        navigate('/checkout')
    }

    const deliveryFee = total > 0 ? 2.50 : 0
    const serviceFee = total > 0 ? total * 0.05 : 0
    const grandTotal = total + deliveryFee + serviceFee

    if (isEmpty) {
        return (
            <PageTransition>
                <main id="main-content" className="max-w-xl mx-auto px-4 py-8 pb-32 md:pb-8">
                    <motion.div
                        className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4"
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                    >
                        <motion.div variants={slideUp}>
                            <div className="w-20 h-20 rounded-full bg-[var(--color-muted)] flex items-center justify-center mb-4 mx-auto">
                                <ShoppingBag size={32} className="text-[var(--color-muted-foreground)]" />
                            </div>
                            <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">Tu carrito está vacío</h1>
                            <p className="text-[var(--color-muted-foreground)] mb-6">Agrega artículos de un restaurante para comenzar</p>
                            <button
                                onClick={() => navigate('/restaurants')}
                                className="px-6 py-3 rounded-[14px] font-semibold bg-[var(--color-primary)] text-white ios-shadow hover:opacity-90 transition-opacity"
                            >
                                Ver restaurantes
                            </button>
                        </motion.div>
                    </motion.div>
                </main>
            </PageTransition>
        )
    }

    return (
        <PageTransition>
            <main id="main-content" className="max-w-xl mx-auto px-4 py-8 pb-32 md:pb-8">
                {/* Header */}
                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="mb-6"
                >
                    <motion.h1 variants={slideUp} className="text-2xl font-bold text-[var(--color-foreground)] mb-1">
                        Tu carrito
                    </motion.h1>
                    {restaurantName && (
                        <motion.p variants={slideUp} className="text-[15px] text-[var(--color-muted-foreground)]">
                            de {restaurantName}
                        </motion.p>
                    )}
                </motion.div>

                {/* Items List */}
                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="space-y-3 mb-6"
                >
                    {items.map(item => (
                        <motion.div
                            key={item.menuItemId}
                            variants={slideUp}
                            className="flex gap-4 p-4 bg-[var(--color-card)] rounded-[16px] border border-[var(--color-border)] ios-shadow-sm"
                        >
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[15px] font-semibold text-[var(--color-foreground)] truncate">
                                    {item.name}
                                </h3>
                                <p className="text-[13px] text-[var(--color-muted-foreground)] truncate">
                                    {item.description}
                                </p>
                                <p className="text-[14px] font-semibold text-[var(--color-primary)] mt-1">
                                    ${(item.price * item.quantity).toFixed(2)}
                                </p>
                            </div>

                            <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                                <button
                                    onClick={() => removeItem(item.menuItemId)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 transition-colors"
                                    aria-label={`Eliminar ${item.name}`}
                                >
                                    <Trash2 size={16} />
                                </button>

                                <div className="flex items-center gap-2 bg-[var(--color-muted)] rounded-[12px] p-1">
                                    <button
                                        onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                                        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--color-card)] transition-colors"
                                        aria-label="Disminuir cantidad"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="text-[14px] font-semibold w-5 text-center" aria-label={`Cantidad: ${item.quantity}`}>
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                                        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--color-card)] transition-colors"
                                        aria-label="Aumentar cantidad"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Summary */}
                <motion.div
                    variants={slideUp}
                    className="bg-[var(--color-card)] rounded-[20px] border border-[var(--color-border)] p-5 space-y-3 ios-shadow-sm mb-6"
                >
                    <div className="flex justify-between text-[14px]">
                        <span className="text-[var(--color-muted-foreground)]">Subtotal</span>
                        <span className="text-[var(--color-foreground)] font-medium">${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[14px]">
                        <span className="text-[var(--color-muted-foreground)]">Costo de envío</span>
                        <span className="text-[var(--color-foreground)] font-medium">${deliveryFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[14px]">
                        <span className="text-[var(--color-muted-foreground)]">Cargo por servicio</span>
                        <span className="text-[var(--color-foreground)] font-medium">${serviceFee.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-[var(--color-border)] pt-3 flex justify-between">
                        <span className="text-[15px] font-semibold text-[var(--color-foreground)]">Total</span>
                        <span className="text-[15px] font-bold text-[var(--color-primary)]">${grandTotal.toFixed(2)}</span>
                    </div>
                </motion.div>

                {/* Checkout Button */}
                <motion.button
                    variants={slideUp}
                    onClick={handleCheckout}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 rounded-[16px] font-semibold text-white text-[15px] bg-[var(--color-primary)] ios-shadow flex items-center justify-center gap-2"
                >
                    Proceder al pago
                    <ArrowRight size={18} />
                </motion.button>

                <button
                    onClick={clearCart}
                    className="w-full mt-3 py-3 text-[14px] text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] transition-colors text-center"
                >
                    Vaciar carrito
                </button>
            </main>
        </PageTransition>
    )
}
