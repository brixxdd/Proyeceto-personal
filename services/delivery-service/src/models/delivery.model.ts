export interface Location {
  latitude: number;
  longitude: number;
}

export type DriverStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';
export type DeliveryStatus = 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type VehicleType = 'BICYCLE' | 'MOTORCYCLE' | 'CAR';

export interface DeliveryPerson {
  id: string;
  userId: string | null;
  name: string;
  status: DriverStatus;
  currentLocation: Location | null;
  rating: number;
  vehicleType: VehicleType;
  createdAt: Date;
  updatedAt: Date;
}

export interface Delivery {
  id: string;
  orderId: string;
  deliveryPersonId: string;
  status: DeliveryStatus;
  orderStatus: string;
  pickupTime: Date | null;
  deliveryTime: Date | null;
  currentLocation: Location | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Row as returned by pg (snake_case) */
export interface DeliveryPersonRow {
  id: string;
  user_id: string | null;
  name: string;
  status: string;
  current_location: Location | null;
  rating: number;
  vehicle_type: string;
  created_at: Date;
  updated_at: Date;
}

export interface DeliveryRow {
  id: string;
  order_id: string;
  delivery_person_id: string;
  status: string;
  order_status: string;
  pickup_time: Date | null;
  delivery_time: Date | null;
  current_location: Location | null;
  created_at: Date;
  updated_at: Date;
}

export function mapDeliveryPerson(row: DeliveryPersonRow): DeliveryPerson {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    status: row.status as DriverStatus,
    currentLocation: row.current_location,
    rating: row.rating,
    vehicleType: row.vehicle_type as VehicleType,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDelivery(row: DeliveryRow): Delivery {
  return {
    id: row.id,
    orderId: row.order_id,
    deliveryPersonId: row.delivery_person_id,
    status: row.status as DeliveryStatus,
    orderStatus: row.order_status,
    pickupTime: row.pickup_time,
    deliveryTime: row.delivery_time,
    currentLocation: row.current_location,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
