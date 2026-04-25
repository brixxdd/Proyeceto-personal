import { vi } from 'vitest'
import { HttpResponse, delay } from 'msw'
import { setupServer } from 'msw/node'

export const mockUser = {
    id: 'user-1',
    email: 'test@fooddash.dev',
    role: 'CUSTOMER',
    createdAt: '2025-01-15T10:00:00Z',
}

export const mockRestaurant = {
    id: 'rest-1',
    name: 'Taco Loco',
    description: 'Auténticos tacos mexicanos',
    address: 'Av. Principal 123',
    rating: 4.5,
    isOpen: true,
    cuisineType: 'MEXICAN',
    ownerId: 'owner-1',
}

export const mockMenuItems = [
    {
        id: 'menu-1',
        restaurantId: 'rest-1',
        name: 'Taco de Carnitas',
        description: 'Carne de cerdo deshilachada',
        price: 3.50,
        isAvailable: true,
        category: 'TACOS',
    },
    {
        id: 'menu-2',
        restaurantId: 'rest-1',
        name: 'Taco de Birria',
        description: 'Birria de res con queso',
        price: 4.50,
        isAvailable: true,
        category: 'TACOS',
    },
]

export const mockOrder = {
    id: 'order-1',
    userId: 'user-1',
    restaurantId: 'rest-1',
    status: 'PREPARING',
    total: 12.50,
    estimatedDelivery: '2025-01-15T12:30:00Z',
    items: [
        { menuItemId: 'menu-1', name: 'Taco de Carnitas', price: 3.50, quantity: 2 },
        { menuItemId: 'menu-2', name: 'Taco de Birria', price: 4.50, quantity: 1 },
    ],
    createdAt: '2025-01-15T11:00:00Z',
}

// Handlers for Apollo Client GraphQL mocks
// Note: Apollo Client 4 uses link-based architecture.
// For testing, you typically mock at the ApolloClient level or use msw for HTTP-level mocking.
// These handlers are designed to work with msw in a node test environment.
export const graphqlHandlers = {
    login: () => HttpResponse.json({
        data: {
            login: {
                token: 'mock-jwt-token',
                user: mockUser,
            },
        },
    }),
    register: () => HttpResponse.json({
        data: {
            register: {
                token: 'mock-jwt-token',
                user: mockUser,
            },
        },
    }),
    me: () => HttpResponse.json({
        data: {
            me: mockUser,
        },
    }),
    restaurants: () => HttpResponse.json({
        data: {
            restaurants: [mockRestaurant],
        },
    }),
    restaurant: () => HttpResponse.json({
        data: {
            restaurant: mockRestaurant,
            menu: mockMenuItems,
        },
    }),
    orders: () => HttpResponse.json({
        data: {
            orders: [mockOrder],
        },
    }),
    createOrder: () => HttpResponse.json({
        data: {
            createOrder: {
                id: 'order-new',
                status: 'PENDING',
                total: 12.50,
                estimatedDelivery: '2025-01-15T12:30:00Z',
            },
        },
    }),
}
