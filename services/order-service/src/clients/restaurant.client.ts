interface MenuItemInfo {
  price: number;
  isAvailable: boolean;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

interface MenuItemData {
  menuItem: { id: string; price: number; isAvailable: boolean } | null;
}

export async function fetchMenuItemPrices(
  menuItemIds: string[],
  restaurantServiceUrl: string,
): Promise<Map<string, MenuItemInfo>> {
  const query = `
    query GetMenuItem($id: ID!) {
      menuItem(id: $id) {
        id
        price
        isAvailable
      }
    }
  `;

  const results = await Promise.all(
    menuItemIds.map(async (id) => {
      const response = await fetch(`${restaurantServiceUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { id } }),
      });

      if (!response.ok) {
        throw new Error(
          `Restaurant service returned ${response.status} for menuItem ${id}`,
        );
      }

      const body = (await response.json()) as GraphQLResponse<MenuItemData>;

      if (body.errors?.length) {
        throw new Error(
          `Restaurant service error for menuItem ${id}: ${body.errors[0].message}`,
        );
      }

      const item = body.data?.menuItem;
      if (!item) {
        throw new Error(`Menu item not found: ${id}`);
      }
      if (!item.isAvailable) {
        throw new Error(`Menu item is not available: ${id}`);
      }

      return { id, price: item.price, isAvailable: item.isAvailable };
    }),
  );

  const map = new Map<string, MenuItemInfo>();
  for (const { id, price, isAvailable } of results) {
    map.set(id, { price, isAvailable });
  }
  return map;
}
