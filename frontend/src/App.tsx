import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/layout/Navbar'
import BottomNav from './components/layout/BottomNav'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Restaurants from './pages/Restaurants'
import RestaurantDetail from './pages/RestaurantDetail'
import Orders from './pages/Orders'
import OrderTracking from './pages/OrderTracking'
import Profile from './pages/Profile'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import SmoothScroll from './components/layout/SmoothScroll'
import SkipNav from './components/ui/SkipNav'
import ErrorBoundary from './components/ErrorBoundary'
import { CartProvider } from './context/CartContext'
import { RestaurantListSkeleton, OrderListSkeleton } from './components/ui/Skeleton'

/**
 * Code splitting via React.lazy + Suspense
 * Heavy pages loaded on-demand to improve initial bundle size
 */
const LazyRestaurantDetail = lazy(() => import('./pages/RestaurantDetail'))
const LazyOrders = lazy(() => import('./pages/Orders'))
const LazyOrderTracking = lazy(() => import('./pages/OrderTracking'))
const LazyProfile = lazy(() => import('./pages/Profile'))
const LazyCart = lazy(() => import('./pages/Cart'))
const LazyCheckout = lazy(() => import('./pages/Checkout'))
const LazyRestaurantDashboard = lazy(() => import('./pages/RestaurantDashboard'))

/**
 * Skeleton fallback while lazy-loaded chunk is fetching
 * GPU-accelerated pulse animation (only opacity)
 */
function PageSkeleton() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8 pb-32 md:pb-8 animate-pulse">
      <div className="space-y-4">
        <div className="bg-[var(--color-muted)] h-8 w-1/3 rounded-full" />
        <div className="bg-[var(--color-muted)] h-4 w-2/3 rounded-full" />
        <div className="mt-8 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-[var(--color-muted)] h-16 rounded-[16px]" />
          ))}
        </div>
      </div>
    </div>
  )
}

function OrdersSkeleton() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8 pb-32 md:pb-8">
      <OrderListSkeleton count={5} />
    </div>
  )
}

export default function App() {
  const location = useLocation()

  return (
    <CartProvider>
      <ErrorBoundary>
        <SmoothScroll>
          <div className="min-h-dvh flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
            <SkipNav />
            <Navbar />
            <div className="flex-1 pb-20 md:pb-0">
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/restaurants" element={<Restaurants />} />

                  <Route
                    path="/restaurants/:id"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <LazyRestaurantDetail />
                      </Suspense>
                    }
                  />

                  <Route
                    path="/orders"
                    element={
                      <Suspense fallback={<OrdersSkeleton />}>
                        <LazyOrders />
                      </Suspense>
                    }
                  />

                  <Route
                    path="/orders/:id"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <LazyOrderTracking />
                      </Suspense>
                    }
                  />

                  <Route
                    path="/profile"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <LazyProfile />
                      </Suspense>
                    }
                  />

                  <Route
                    path="/cart"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <LazyCart />
                      </Suspense>
                    }
                  />

                  <Route
                    path="/checkout"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <LazyCheckout />
                      </Suspense>
                    }
                  />

                  <Route
                    path="/dashboard"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <LazyRestaurantDashboard />
                      </Suspense>
                    }
                  />
                </Routes>
              </AnimatePresence>
            </div>
            <BottomNav />
          </div>
        </SmoothScroll>
      </ErrorBoundary>
    </CartProvider>
  )
}
