export const typeDefs = `#graphql
  extend type Query {
    me: User
  }

  extend type Mutation {
    register(email: String!, password: String!, name: String!, phone: String, role: UserRole!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    refreshToken(refreshToken: String!): TokenPayload!
  }

  type User @key(fields: "id") {
    id: ID!
    email: String!
    name: String!
    phone: String
    role: UserRole!
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
  }

  type TokenPayload {
    token: String!
    refreshToken: String!
  }

  enum UserRole {
    CUSTOMER
    RESTAURANT_OWNER
    DELIVERY_PERSON
    ADMIN
  }
`;

