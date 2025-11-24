export const typeDefs = `#graphql
  type Query {
    me: User
  }

  type Mutation {
    register(email: String!, password: String!, name: String!, phone: String, role: UserRole!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
  }

  type User {
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
    user: User!
  }

  enum UserRole {
    CUSTOMER
    RESTAURANT_OWNER
    DELIVERY_PERSON
    ADMIN
  }
`;

