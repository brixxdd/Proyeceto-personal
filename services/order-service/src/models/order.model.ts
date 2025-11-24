export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: Coordinates;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  deliveryAddress: Address;
  deliveryPersonId?: string;
  estimatedDeliveryTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderInput {
  restaurantId: string;
  items: OrderItemInput[];
  deliveryAddress: Address;
}

export interface OrderItemInput {
  menuItemId: string;
  quantity: number;
  price?: number; // Optional, can be fetched from restaurant service
  subtotal?: number; // Optional, can be calculated
}

