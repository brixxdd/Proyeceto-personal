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

export default function App() {
  const location = useLocation()

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      <Navbar />
      <div className="flex-1 pb-20 md:pb-0">
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/restaurants" element={<Restaurants />} />
            <Route path="/restaurants/:id" element={<RestaurantDetail />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderTracking />} />
          </Routes>
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  )
}
