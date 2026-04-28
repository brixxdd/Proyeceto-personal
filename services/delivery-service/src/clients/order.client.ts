interface OrderItemInfo {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface AddressInfo {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates: { latitude: number; longitude: number } | null;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

interface OrderData {
  order: {
    id: string;
    customerId: string;
    restaurantId: string;
    items: OrderItemInfo[];
    status: string;
    totalAmount: number;
    deliveryAddress: AddressInfo;
    deliveryPersonId: string | null;
    estimatedDeliveryTime: number | null;
    createdAt: string;
  } | null;
}

export interface OrderDetails {
  id: string;
  customerId: string;
  restaurantId: string;
  items: OrderItemInfo[];
  status: string;
  totalAmount: number;
  deliveryAddress: AddressInfo;
  deliveryPersonId: string | null;
  estimatedDeliveryTime: number | null;
  createdAt: string;
}

export async function fetchOrderDetails(
  orderId: string,
  orderServiceUrl: string,
): Promise<OrderDetails> {
  const query = `
    query GetOrder($id: ID!) {
      order(id: $id) {
        id
        customerId
        restaurantId
        items {
          id
          menuItemId
          quantity
          price
          subtotal
        }
        status
        totalAmount
        deliveryAddress {
          street
          city
          state
          zipCode
          country
          coordinates {
            latitude
            longitude
          }
        }
        deliveryPersonId
        estimatedDeliveryTime
        createdAt
      }
    }
  `;

  const response = await fetch(`${orderServiceUrl}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id: orderId } }),
  });

  if (!response.ok) {
    throw new Error(`Order service returned ${response.status} for order ${orderId}`);
  }

  const body = (await response.json()) as GraphQLResponse<OrderData>;

  if (body.errors?.length) {
    throw new Error(`Order service error: ${body.errors[0].message}`);
  }

  const order = body.data?.order;
  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  return order;
}