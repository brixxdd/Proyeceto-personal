interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

interface RestaurantData {
  restaurant: {
    id: string;
    name: string;
    address: string;
  } | null;
}

export interface RestaurantInfo {
  id: string;
  name: string;
  address: string;
}

export async function fetchRestaurantInfo(
  restaurantId: string,
  restaurantServiceUrl: string,
): Promise<RestaurantInfo> {
  const query = `
    query GetRestaurant($id: ID!) {
      restaurant(id: $id) {
        id
        name
        address
      }
    }
  `;

  const response = await fetch(`${restaurantServiceUrl}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id: restaurantId } }),
  });

  if (!response.ok) {
    throw new Error(`Restaurant service returned ${response.status} for restaurant ${restaurantId}`);
  }

  const body = (await response.json()) as GraphQLResponse<RestaurantData>;

  if (body.errors?.length) {
    throw new Error(`Restaurant service error: ${body.errors[0].message}`);
  }

  const restaurant = body.data?.restaurant;
  if (!restaurant) {
    throw new Error(`Restaurant not found: ${restaurantId}`);
  }

  return restaurant;
}