# 🚀 FRONTEND COMPLETION PLAN — Phase 8.3

> **Objetivo:** Completar el 25% restante del Frontend (Tests, A11y, SEO, Performance, Responsive, Profile, Checkout, Helm)
>
> **Estado Actual:** ~75% — Landing, Login, Register, Restaurants, RestaurantDetail, Orders, OrderTracking ✅ — ThemeContext ✅ — BottomNav ✅
>
> **Tiempo estimado:** ~8-10 horas de trabajo

---

## 📋 PRIORITY CHECKLIST

- [ ] **8.3.1** Testing — Vitest + React Testing Library
- [ ] **8.3.2** Accesibilidad — WCAG 2.2 Audit + Fixes
- [ ] **8.3.3** SEO — Meta tags + Open Graph + Structured Data
- [ ] **8.3.4** Performance — Core Web Vitals + Bundle Optimization
- [ ] **8.3.5** Responsive QA — Multi-device validation
- [ ] **8.3.6** Profile Page — Missing user profile page
- [ ] **8.3.7** Checkout Flow — Missing cart → checkout → confirmation
- [ ] **8.3.8** Helm Chart — Deployment config for frontend
- [ ] **8.3.9** Final Polish — Loading states, error boundaries, transitions

---

## 8.3.1 TESTING — Vitest + React Testing Library (~2 hrs)

### Dependencias

```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

### Configuración

**`vite.config.ts`** — agregar plugin Vitest:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), vitest({
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts'
  })]
})
```

### Archivos de test por crear

| Archivo | Qué testear | Prioridad |
|---------|-------------|-----------|
| `src/test/setup.ts` | mocks globales (Apollo, router, localStorage) | 🔴 |
| `src/test/mocks/handlers.ts` | Apollo Client mock | 🔴 |
| `src/pages/__tests__/Login.test.tsx` | Login form validation + submit | 🔴 |
| `src/pages/__tests__/Register.test.tsx` | Register form + validation | 🔴 |
| `src/pages/__tests__/Restaurants.test.tsx` | Restaurant list + filtering | 🟡 |
| `src/pages/__tests__/RestaurantDetail.test.tsx` | Menu render + add to cart | 🟡 |
| `src/pages/__tests__/Orders.test.tsx` | Order list + status | 🟡 |
| `src/components/__tests__/Navbar.test.tsx` | Navigation + auth state | 🟡 |
| `src/components/__tests__/BottomNav.test.tsx` | Mobile nav links | 🟡 |
| `src/context/__tests__/ThemeContext.test.tsx` | Theme toggle + persistence | 🟡 |

### Cobertura objetivo: 80%

---

## 8.3.2 ACCESIBILIDAD — WCAG 2.2 Audit + Fixes (~2 hrs)

### Auditoría con accessibility skill

```bash
# Instalar axe-core para testing
npm install -D @axe-core/react
```

### Checklist WCAG 2.2 AA

#### Perceptual
- [ ] **1.1.1** — Imágenes con `alt` text (no decorative images skip)
- [ ] **1.2.1** — Video/audio grabado tiene captions/transcripts
- [ ] **1.3.1** — Info/structure conveyed through structure markup
- [ ] **1.3.2** — Meaningful reading sequence
- [ ] **1.3.3** — Sensory characteristics not only visual
- [ ] **1.4.1** — Color not only means of conveying info
- [ ] **1.4.3** — Contrast ratio ≥ 4.5:1 (text), ≥ 3:1 (UI components)
- [ ] **1.4.4** — Text resizable up to 200% without loss of content
- [ ] **1.4.11** — Non-text contrast ≥ 3:1 for UI components

#### Operable
- [ ] **2.1.1** — All functionality keyboard accessible
- [ ] **2.1.2** — No keyboard trap
- [ ] **2.4.1** — Skip to main content link
- [ ] **2.4.2** — Page titled meaningfully
- [ ] **2.4.3** — Focus order logical
- [ ] **2.4.4** — Link purpose clear in context
- [ ] **2.4.6** — Headings and labels descriptive
- [ ] **2.4.7** — Focus indicator visible (currently uses Tailwind `focus-visible:ring`)

#### Understandable
- [ ] **3.1.1** — Page language declared (`<html lang="es">`)
- [ ] **3.2.1** — On focus no context change automatically
- [ ] **3.2.2** — On input no context change automatically
- [ ] **3.3.1** — Error identification
- [ ] **3.3.2** — Labels/instructions for input
- [ ] **3.3.3** — Error suggestion
- [ ] **3.3.4** — Error prevention (legal/data) — confirm/cancel checkout

#### Robust
- [ ] **4.1.1** — No parsing errors (valid HTML)
- [ ] **4.1.2** — Name, role, value for all UI components
- [ ] **4.1.3** — Status messages programmatically determinable

### Archivos a auditar

| Archivo | Issues esperados | Fix |
|---------|-----------------|-----|
| `src/components/layout/Navbar.tsx` | aria-labels, keyboard nav | Add `aria-label` + `tabIndex` |
| `src/components/layout/BottomNav.tsx` | aria-current, focus | aria-current for active route |
| `src/pages/Login.tsx` | `autocomplete`, error messages | `aria-describedby` for errors |
| `src/pages/Register.tsx` | `autocomplete`, labels | Form field labels |
| `src/pages/Landing.tsx` | `alt` on images, skip link | Alt text + skip-nav |
| `src/pages/RestaurantDetail.tsx` | Menu item labels, button accessibility | aria-label on icon buttons |
| `src/App.tsx` | `lang` attribute | Already in index.html |

### Implementación de skip-nav

**`src/components/SkipNav.tsx`**:

```tsx
export default function SkipNav() {
  return (
    <a 
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg"
    >
      Saltar al contenido principal
    </a>
  )
}
```

Agregar `id="main-content"` al `<main>` wrapper en `App.tsx`.

---

## 8.3.3 SEO — Meta Tags + Open Graph + Structured Data (~1.5 hrs)

### index.html

**`frontend/index.html`** — actualizar con SEO completo:

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Plataforma de delivery en tiempo real. Ordena de tus restaurantes favoritos y recibe en minutos." />
    <meta name="keywords" content="delivery, comida, restaurantes, pedidos, tiempo real" />
    <meta name="author" content="Food Delivery Platform" />
    <meta name="robots" content="index, follow" />
    
    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="FoodDash — Delivery en Tiempo Real" />
    <meta property="og:description" content="Ordena de tus restaurantes favoritos y recibe en minutos. Plataforma cloud-native distribuida." />
    <meta property="og:image" content="/og-image.png" />
    <meta property="og:url" content="https://fooddash.dev" />
    <meta property="og:locale" content="es_MX" />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="FoodDash — Delivery en Tiempo Real" />
    <meta name="twitter:description" content="Ordena de tus restaurantes favoritos y recibe en minutos." />
    <meta name="twitter:image" content="/og-image.png" />
    
    <!-- Canonical -->
    <link rel="canonical" href="https://fooddash.dev" />
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/icons.svg" />
    
    <title>FoodDash — Delivery en Tiempo Real</title>
  </head>
```

### Dynamic meta para rutas

Crear hook **`src/hooks/useSeo.ts`**:

```ts
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SEO_DATA: Record<string, { title: string; description: string }> = {
  '/': { title: 'FoodDash — Delivery en Tiempo Real', description: '...' },
  '/login': { title: 'Iniciar Sesión — FoodDash', description: '...' },
  '/register': { title: 'Crear Cuenta — FoodDash', description: '...' },
  '/restaurants': { title: 'Restaurantes — FoodDash', description: '...' },
  '/orders': { title: 'Mis Pedidos — FoodDash', description: '...' },
}

export function useSeo() {
  const { pathname } = useLocation()
  const seo = SEO_DATA[pathname] ?? SEO_DATA['/']
  
  useEffect(() => {
    document.title = seo.title
  }, [seo.title])
}
```

### Structured Data (JSON-LD)

**`frontend/src/components/SeoSchema.tsx`** — Organization + WebSite schema:

```tsx
const OrganizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "FoodDash",
  "url": "https://fooddash.dev",
  "logo": "https://fooddash.dev/logo.png",
  "sameAs": [
    "https://twitter.com/fooddash",
    "https://github.com/fooddash"
  ]
}
```

Inject en el root via `ThemeContext.tsx` o un `SeoProvider`.

---

## 8.3.4 PERFORMANCE — Core Web Vitals + Bundle Optimization (~1.5 hrs)

### Bundle Analysis

```bash
npm install -D rollup-plugin-visualizer
```

**`vite.config.ts`** — agregar visualizer:

```ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [react(), visualizer({
    open: true,
    gzipSize: true,
    filename: 'bundle-stats.html'
  })]
})
```

### Lighthouse targets

| Metric | Target | Current estimate |
|--------|--------|-----------------|
| LCP | < 2.5s | ~3.5s (hero image) |
| FID/INP | < 100ms | ~50ms |
| CLS | < 0.1 | ~0.05 |
| FCP | < 1.8s | ~2.0s |
| TTFB | < 800ms | ~200ms (local) |

### Optimizations

#### 8.3.4.1 — Image optimization (LCP)

- `Landing.tsx` hero image: usar `<img loading="lazy" decoding="async" fetchpriority="high">` + preload link en index.html
- Generar `public/og-image.png` (1200x630px) para Open Graph
- Considerar WebP para hero image

#### 8.3.4.2 — Code splitting

**`src/App.tsx`** — lazy load pages:

```tsx
import { lazy, Suspense } from 'react'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
// ... others

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
```

#### 8.3.4.3 — Prefetching

```tsx
// En Navbar/BottomNav links
<Link to="/restaurants" prefetch="intent">Restaurantes</Link>
```

#### 8.3.4.4 — Font optimization

- Usar `font-display: swap` si cargan fonts custom
- Considerar `preconnect` para Google Fonts

#### 8.3.4.5 — Apollo Client caching

- Ya tienen caching configurado — verificar `cache-first` para queries estáticas (restaurants list)
- `network-only` solo para orders tracking

---

## 8.3.5 RESPONSIVE QA — Multi-device Validation (~1 hr)

### Breakpoints del proyecto (Tailwind)

| Breakpoint | Rango | Layout strategy |
|-----------|-------|-----------------|
| **sm** (640px) | Móvil vertical | Single column, BottomNav visible |
| **md** (768px) | Tablet | 2-column grid donde aplique |
| **lg** (1024px) | Laptop | 3-column bento grid |
| **xl** (1280px) | Desktop | Full bento layout |
| **2xl** (1536px) | Ultra-wide | Max-width container |

### Validación por página

| Página | sm | md | lg | xl |
|--------|----|----|----|----|
| **Landing** | Parallax ok? CTA legible? | Hero text size | Bento grid columns | Max-width constraint |
| **Login** | Form centered? Inputs full width? | — | 2-column (left: form, right: branding) | — |
| **Register** | Form centered? | — | 2-column | — |
| **Restaurants** | Cards 1 col? Grid 2 cols md+? | 2-col grid | 3-col grid | 4-col grid |
| **RestaurantDetail** | Menu items stacked? | 2-col (menu + restaurant info) | Same + sidebar | Sidebar sticky |
| **Orders** | List stacked? | — | — | — |
| **OrderTracking** | Map visible? Status text readable? | — | Map + status side-by-side | — |
| **Navbar** | Hamburger menu? | Logo + nav links | Full nav visible | — |
| **BottomNav** | 5 icons visible? | Hidden (md+) | Hidden | Hidden |

### Herramientas de validación

1. **Chrome DevTools** — Device toolbar (iPhone SE, iPad, MacBook Pro)
2. **BrowserStack** — Real devices si es posible
3. **Responsively** — App para ver todos los breakpoints en paralelo

### Known responsive issues to check

- [ ] `Landing.tsx` — Parallax effect no rompe en móvil
- [ ] `RestaurantDetail.tsx` — Menu long list: no overflow horizontal
- [ ] `OrderTracking.tsx` — Map embed responsive (aspect ratio)
- [ ] Form inputs — Full width en móvil, no overflow
- [ ] BottomNav — Safe area `pb-[env(safe-area-inset-bottom)]` si iPhone con notch

---

## 8.3.6 PROFILE PAGE — Missing User Profile (~1 hr)

### Ruta: `/profile`

### GraphQL Queries

```graphql
query GetProfile {
  me {
    id
    email
    role
    createdAt
  }
}

mutation UpdateProfile($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
    id
    email
  }
}
```

### Estructura de página

**`src/pages/Profile.tsx`**:

```
┌─────────────────────────────────────────┐
│  [Avatar]                               │
│  Nombre Apellido                        │
│  email@ejemplo.com                      │
│  Miembro desde: Enero 2025              │
├─────────────────────────────────────────┤
│  🔐 Cambiar Contraseña                  │
│  📍 Direcciones guardadas               │
│  🔔 Preferencias de notificación        │
│  📦 Historial de pedidos                │
│  💳 Métodos de pago                     │
├─────────────────────────────────────────┤
│  [Cerrar Sesión]                        │
└─────────────────────────────────────────┘
```

### Sub-componentes

| Componente | Descripción |
|-----------|-------------|
| `ProfileHeader` | Avatar ( initials fallback), name, email, member since |
| `ProfileMenuItem` | Reusable row: icon + label + chevron → route |
| `ChangePasswordModal` | Modal con form old/new password |
| `AddressList` | Lista de direcciones (CRUD) |
| `NotificationPreferences` | Toggle switches para email/SMS/push |
| `PaymentMethods` | Lista de métodos de pago (mock) |

---

## 8.3.7 CHECKOUT FLOW — Cart → Checkout → Confirmation (~2 hrs)

### Rutas

| Ruta | Descripción |
|------|-------------|
| `/cart` | Carrito de compras (actual: integrado en RestaurantDetail) |
| `/checkout` | Formulario de entrega + pago |
| `/checkout/confirmation` | Confirmación de pedido |

### Estructura del flujo

```
RestaurantDetail → "Agregar al carrito" → Badge en Navbar
    ↓
Cart Page (/cart) → Lista items + total + "Proceder al pago"
    ↓
Checkout (/checkout) → Address form + payment (mock) + order summary
    ↓
Confirmation → Order ID + status + ETA + tracking link
```

### Cart State

**`src/context/CartContext.tsx`** — si no existe, crear:

```ts
interface CartItem {
  menuItemId: string
  restaurantId: string
  name: string
  price: number
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  total: number
  addItem: (item: CartItem) => void
  removeItem: (menuItemId: string) => void
  updateQuantity: (menuItemId: string, qty: number) => void
  clearCart: () => void
}
```

### GraphQL Mutations

```graphql
mutation CreateOrder($input: CreateOrderInput!) {
  createOrder(input: $input) {
    id
    status
    estimatedDelivery
    total
  }
}
```

### Checkout Components

| Componente | Descripción |
|-----------|-------------|
| `CartSummary` | Lista de items + subtotal + fees + total |
| `DeliveryAddressForm` | Street, number, city, zip + save checkbox |
| `PaymentMethodSelector` | Mock: Credit card (stripe-like UI), Cash |
| `OrderConfirmation` | Success state + order ID + animation |

### Validaciones checkout

- [ ] Campos requeridos en address form
- [ ] Cantidad > 0
- [ ] Impedir checkout si cart vacío
- [ ] Confirm before close session

---

## 8.3.8 HELM CHART — Frontend Kubernetes Deployment (~0.5 hr)

### Estructura

```
helm-charts/frontend/
├── Chart.yaml
├── values.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    ├── configmap.yaml      (env vars publicas)
    ├── secret.yaml         (API URLs, etc)
    ├── hpa.yaml
    └── servicemonitor.yaml (metrics si expuesto)
```

### values.yaml key configs

```yaml
replicaCount: 2

image:
  repository: ghcr.io/yourorg/fooddash-frontend
  tag: latest

env:
  VITE_API_URL: "https://api.fooddash.dev/graphql"
  VITE_WS_URL: "wss://api.fooddash.dev/graphql"
  VITE_APP_ENV: "production"

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 75

ingress:
  enabled: true
  className: nginx
  host: fooddash.dev
  path: /
  tls:
    - secretName: fooddash-tls
      hosts:
        - fooddash.dev
```

---

## 8.3.9 FINAL POLISH (~0.5 hr)

### Error Boundaries

**`src/components/ErrorBoundary.tsx`**:

```tsx
import { ComponentProps } from 'react'
import { Route, useNavigate } from 'react-router-dom'

class ErrorBoundary extends Component<any, { hasError: boolean }> {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
          <h1 className="text-2xl font-bold">Algo salió mal</h1>
          <p className="text-muted">Lo sentimos, hubo un error al cargar esta página.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Recargar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

### Loading States (skeleton screens)

Crear **`src/components/ui/Skeleton.tsx`**:

```tsx
export function RestaurantCardSkeleton() {
  return (
    <div className="animate-pulse bg-card border border-border rounded-xl p-4">
      <div className="bg-muted h-40 rounded-lg mb-4" />
      <div className="bg-muted h-5 w-3/4 rounded mb-2" />
      <div className="bg-muted h-4 w-1/2 rounded" />
    </div>
  )
}

export function OrderSkeleton() {
  return (
    <div className="animate-pulse flex gap-4 p-4 border-b border-border">
      <div className="bg-muted w-12 h-12 rounded-full" />
      <div className="flex-1">
        <div className="bg-muted h-5 w-1/3 rounded mb-2" />
        <div className="bg-muted h-4 w-1/2 rounded" />
      </div>
    </div>
  )
}
```

Usar en `Restaurants.tsx`, `Orders.tsx` en estado de loading.

### Toast Notifications

```bash
npm install sonner
```

**`src/components/ui/Toast.tsx`** — wrapper around Sonner para notifications.

---

## 📊 TIEMPO ESTIMADO POR TAREA

| # | Tarea | Tiempo | Prioridad |
|---|-------|--------|-----------|
| 8.3.1 | Testing (Vitest + RTL) | 2 hrs | 🔴 Alta |
| 8.3.2 | WCAG 2.2 Accessibility | 2 hrs | 🔴 Alta |
| 8.3.3 | SEO | 1.5 hrs | 🟡 Media |
| 8.3.4 | Performance optimization | 1.5 hrs | 🟡 Media |
| 8.3.5 | Responsive QA | 1 hr | 🟡 Media |
| 8.3.6 | Profile Page | 1 hr | 🟡 Media |
| 8.3.7 | Checkout Flow | 2 hrs | 🟡 Media |
| 8.3.8 | Helm Chart | 0.5 hr | 🟢 Baja |
| 8.3.9 | Final Polish | 0.5 hr | 🟢 Baja |
| **Total** | | **~11.5 hrs** | |

---

## 🔄 ACTUALIZACIÓN MASTER_PLAN.md

Cuando se complete Phase 8.3:

```markdown
| **Frontend** | 100% | ✅ Completo | Landing ✅, Login ✅, Register ✅, Restaurants ✅, RestaurantDetail ✅, Orders ✅, OrderTracking ✅, Profile ✅, Cart/Checkout ✅, 246 tests ✅, WCAG 2.2 ✅, SEO ✅, Helm ✅, responsive ✅ |
```

---

## 📁 ARCHIVOS A CREAR/MODIFICAR

### Nuevos archivos

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── SkipNav.tsx
│   │   └── ErrorBoundary.tsx
│   ├── context/
│   │   └── CartContext.tsx
│   ├── hooks/
│   │   └── useSeo.ts
│   ├── pages/
│   │   ├── Profile.tsx
│   │   ├── Cart.tsx
│   │   ├── Checkout.tsx
│   │   └── CheckoutConfirmation.tsx
│   ├── test/
│   │   ├── setup.ts
│   │   └── mocks/
│   │       └── handlers.ts
│   └── pages/__tests__/
│       ├── Login.test.tsx
│       ├── Register.test.tsx
│       ├── Restaurants.test.tsx
│       ├── RestaurantDetail.test.tsx
│       └── Orders.test.tsx
├── public/
│   └── og-image.png
├── index.html (update)
├── vite.config.ts (update)
└── tsconfig.json (update for test paths)

helm-charts/frontend/
├── Chart.yaml
├── values.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    ├── configmap.yaml
    ├── secret.yaml
    ├── hpa.yaml
    └── servicemonitor.yaml
```

### Archivos a modificar

- `frontend/src/App.tsx` — agregar Profile, Cart, Checkout rutas + ErrorBoundary + SkipNav
- `frontend/src/components/layout/Navbar.tsx` — agregar Profile link + Cart badge
- `frontend/src/components/layout/BottomNav.tsx` — agregar Profile + Cart tabs
- `frontend/index.html` — SEO meta tags + lang + preloads
- `frontend/vite.config.ts` — Vitest + visualizer plugins
- `frontend/package.json` — agregar dependencias testing
