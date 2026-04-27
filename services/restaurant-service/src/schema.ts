export const typeDefs = `#graphql
  extend type Query {
    restaurants(isOpen: Boolean): [Restaurant!]!
    myRestaurants: [Restaurant!]!
    restaurant(id: ID!): Restaurant
    menu(restaurantId: ID!): [MenuItem!]!
    menuItem(id: ID!): MenuItem
    menuItems(ids: [ID!]!): [MenuItem!]!
  }

  extend type Mutation {
    createRestaurant(input: CreateRestaurantInput!): Restaurant!

    updateRestaurant(
      id: ID!
      name: String
      description: String
      address: String
      cuisineType: String
      phone: String
      isOpen: Boolean
      rating: Float
    ): Restaurant!

    deleteRestaurant(id: ID!): Boolean!

    createMenuItem(
      restaurantId: ID!
      name: String!
      description: String
      price: Float!
      category: String
      isAvailable: Boolean
    ): MenuItem!

    updateMenuItem(
      id: ID!
      name: String
      description: String
      price: Float
      category: String
      isAvailable: Boolean
    ): MenuItem!

    deleteMenuItem(id: ID!): Boolean!
  }

  extend type Subscription {
    restaurantStatusChanged(restaurantId: ID!): RestaurantStatusChanged!
  }

  input CreateRestaurantInput {
    name: String!
    description: String
    address: String!
    phone: String
    email: String
    cuisineType: String!
  }

  type Restaurant @key(fields: "id") {
    id: ID!
    name: String!
    description: String
    address: String!
    phone: String
    email: String
    cuisineType: String!
    ownerId: ID!
    isOpen: Boolean!
    rating: Float
    createdAt: String!
    updatedAt: String!
  }

  type MenuItem @key(fields: "id") {
    id: ID!
    restaurantId: ID!
    name: String!
    description: String
    price: Float!
    category: String
    isAvailable: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type RestaurantStatusChanged {
    restaurantId: ID!
    isOpen: Boolean!
  }
`;
