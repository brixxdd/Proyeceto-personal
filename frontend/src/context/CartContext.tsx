import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export interface CartItem {
    menuItemId: string
    restaurantId: string
    restaurantName: string
    name: string
    description: string
    price: number
    quantity: number
    category: string
}

interface CartContextType {
    items: CartItem[]
    itemCount: number
    total: number
    restaurantId: string | null
    restaurantName: string | null
    addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
    removeItem: (menuItemId: string) => void
    updateQuantity: (menuItemId: string, quantity: number) => void
    clearCart: () => void
    isEmpty: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'fooddash_cart'

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([])
    const [isHydrated, setIsHydrated] = useState(false)

    // Hydrate from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved) as CartItem[]
                if (Array.isArray(parsed)) {
                    setItems(parsed)
                }
            }
        } catch {
            // Corrupted data, ignore
        }
        setIsHydrated(true)
    }, [])

    // Persist to localStorage on change
    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
        }
    }, [items, isHydrated])

    function addItem(item: Omit<CartItem, 'quantity'>, quantity = 1) {
        setItems(prev => {
            const existing = prev.find(i => i.menuItemId === item.menuItemId)
            if (existing) {
                return prev.map(i =>
                    i.menuItemId === item.menuItemId
                        ? { ...i, quantity: i.quantity + quantity }
                        : i
                )
            }
            return [...prev, { ...item, quantity }]
        })
    }

    function removeItem(menuItemId: string) {
        setItems(prev => prev.filter(i => i.menuItemId !== menuItemId))
    }

    function updateQuantity(menuItemId: string, quantity: number) {
        if (quantity <= 0) {
            removeItem(menuItemId)
            return
        }
        setItems(prev =>
            prev.map(i =>
                i.menuItemId === menuItemId ? { ...i, quantity } : i
            )
        )
    }

    function clearCart() {
        setItems([])
    }

    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const restaurantId = items[0]?.restaurantId ?? null
    const restaurantName = items[0]?.restaurantName ?? null
    const isEmpty = items.length === 0

    return (
        <CartContext.Provider
            value={{
                items,
                itemCount,
                total,
                restaurantId,
                restaurantName,
                addItem,
                removeItem,
                updateQuantity,
                clearCart,
                isEmpty,
            }}
        >
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const context = useContext(CartContext)
    if (!context) throw new Error('useCart must be used within CartProvider')
    return context
}
