---
name: graphql-realtime
description: Safely integrate GraphQL subscriptions and polling in React + Apollo Client. Use when asked to add real-time updates, useSubscription, pollInterval, live dashboards, or WebSocket-backed queries. Prevents the classic infinite-loop and 400 errors caused by misusing Apollo hooks.
---

This skill prevents the most common bugs when adding real-time GraphQL features to a React + Apollo Client app:

1. **Infinite re-render loop** from `|| []` in `useEffect` dependencies
2. **400 Bad Request** from subscription field-name mismatches between the frontend and the API Gateway schema
3. **Double polling** from combining `pollInterval` with a manual `setInterval`
4. **429 Too Many Requests** from `|| []` used in render scope with `useEffect` that navigates or fetches

---

## Bug 1 — Infinite Loop from `|| []` in useEffect

### Why it happens

```typescript
// ❌ WRONG — creates a NEW array reference on every render
const orders = data?.orders || []

useEffect(() => {
    setLocalOrders(orders)   // fires every render → setState → re-render → loop
}, [orders])
```

`|| []` evaluates to a **brand-new `[]` object** on every render when `data` is falsy.
React sees a new reference each time → runs the effect → calls `setState` → triggers another render → infinite loop.

### The Fix

```typescript
// ✅ CORRECT — depend on the Apollo data object, read the array INSIDE the effect
useEffect(() => {
    if (data?.orders) {
        setLocalOrders(data.orders)   // only fires when Apollo returns real data
    }
}, [data])   // ← stable Apollo reference, not the || [] shorthand
```

**Rule:** Never use `someArray || []` as a `useEffect` dependency. Always depend on the parent object and guard with `if (data?.field)` inside the effect.

---

## Bug 2 — 400 Bad Request on Subscriptions (field name mismatch)

### Why it happens

In a federated/gateway architecture, the **API Gateway schema** is the source of truth for field names — not the individual microservice schema.

```
Frontend calls:  restaurantOrderCreated(restaurantId: ID!)   ← ❌ microservice name
Gateway exposes: newOrder(restaurantId: ID!)                  ← ✅ gateway name
```

The gateway returns 400 because it doesn't recognize the operation name.

### The Fix

**Always verify the field name against the API Gateway schema** before writing the frontend `gql` document.

```typescript
// ✅ CORRECT — use the gateway field name, not the microservice field name
const SUBSCRIPTION = gql`
  subscription OnNewOrder($restaurantId: ID!) {
    newOrder(restaurantId: $restaurantId) {   // ← matches api-gateway/schema.graphql
      id status totalAmount
    }
  }
`
```

Then consume the data using the **gateway field name**:

```typescript
const { data } = useSubscription(SUBSCRIPTION, { variables: { restaurantId } })

useEffect(() => {
    const newOrder = data?.newOrder   // ← same name as the gateway field
    if (!newOrder) return
    setLocalOrders(prev => {
        if (prev.some(o => o.id === newOrder.id)) return prev
        return [newOrder, ...prev]
    })
}, [data])
```

---

## Bug 3 — Double Polling (silent performance issue)

Apollo's `pollInterval` option already handles background refetches automatically.
Adding a manual `setInterval(() => refetch(), n)` on top creates duplicated requests.

```typescript
// ❌ WRONG — Apollo polls + manual interval = 2x requests
const { refetch } = useQuery(QUERY, { pollInterval: 5000 })

useEffect(() => {
    const id = setInterval(() => refetch(), 5000)   // duplicated!
    return () => clearInterval(id)
}, [refetch])

// ✅ CORRECT — just use pollInterval, nothing else
const { data } = useQuery(QUERY, {
    pollInterval: 5000,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: false,  // prevents loading=true on background polls (no UI flash)
})
```

---

## Complete Safe Pattern: Polling + Subscription Hybrid

Use this pattern when you need both an initial data load (polling) and live push updates (subscription):

```typescript
// 1. Polling query — loads data and keeps it fresh in background (no UI flash)
const { data: queryData } = useQuery(GET_ORDERS, {
    variables: { restaurantId },
    skip: !restaurantId,
    pollInterval: 10_000,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: false,
})

// 2. Subscription — receives real-time push events
const { data: subData } = useSubscription(ON_NEW_ORDER, {
    variables: { restaurantId },
    skip: !restaurantId,
})

// 3. Local state — single source of truth for the UI
const [orders, setOrders] = useState<Order[]>([])

// 4. Sync polling results (stable ref dependency, NOT || [])
useEffect(() => {
    if (queryData?.restaurantOrders) {
        setOrders(queryData.restaurantOrders)
    }
}, [queryData])

// 5. Prepend new subscription events without duplicates
useEffect(() => {
    const newOrder = subData?.newOrder   // ← use the GATEWAY field name
    if (!newOrder) return
    setOrders(prev => {
        if (prev.some(o => o.id === newOrder.id)) return prev
        return [newOrder, ...prev]
    })
}, [subData])
```

---

## Bug 4 — 429 Too Many Requests from `|| []` in render scope

### Why it happens

`|| []` used to derive arrays in the component body (not inside effects) also creates new references
every render. If any `useEffect` that depends on this array does a `navigate()` or triggers a
GraphQL fetch, it will fire on every render — causing a navigation/request storm and a 429.

```typescript
// ❌ WRONG — new [] on every render when data is undefined
const restaurants = data?.myRestaurants || []

useEffect(() => {
    if (restaurants.length === 0) navigate('/create-restaurant')  // fires every render!
}, [restaurants])  // ← always a new reference → infinite navigations + 429
```

### The Fix

Wrap with `useMemo` depending on the Apollo data object:

```typescript
// ✅ CORRECT — stable reference, only changes when Apollo returns new data
const restaurants = useMemo(
    () => data?.myRestaurants ?? [],
    [data]  // ← Apollo object is stable between renders
)

useEffect(() => {
    if (!loading && restaurants.length === 0) navigate('/create-restaurant')
}, [loading, restaurants, navigate])  // only fires when data truly changes
```

**Rule:** Any array derived from Apollo data that is used in a `useEffect` dependency **must** be
wrapped in `useMemo`. Use `useMemo(() => data?.field ?? [], [data])` — never `data?.field || []`.

---

## Checklist Before Implementing Real-Time Features

- [ ] Subscription field name matches `api-gateway/schema.graphql`, **not** the microservice schema
- [ ] `useEffect` dependencies do NOT use `|| []` — depend on the Apollo data object
- [ ] Arrays derived from Apollo data used in effects are wrapped with `useMemo(() => data?.field ?? [], [data])`
- [ ] If polling: only `pollInterval` in `useQuery`, no manual `setInterval`
- [ ] `notifyOnNetworkStatusChange: false` when polling to prevent skeleton flashes
- [ ] Subscription data accessed via gateway field name (e.g. `data?.newOrder`, not `data?.restaurantOrderCreated`)
- [ ] New items checked for duplicates before prepending (`prev.some(o => o.id === item.id)`)
