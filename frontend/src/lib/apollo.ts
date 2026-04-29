import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_API_URL || '/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = sessionStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// WebSocket link for subscriptions (graphql-ws protocol)
const wsLink = new GraphQLWsLink(
  createClient({
    url: import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/graphql`,
    connectionParams: () => {
      const token = sessionStorage.getItem('token');
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
  })
);

// Split traffic: subscriptions go through WS, queries/mutations go through HTTP
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink)
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
