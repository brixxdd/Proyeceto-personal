import client, { collectDefaultMetrics } from 'prom-client';

export const register = new client.Registry();

collectDefaultMetrics({ register });

export const restaurantsCreatedTotal = new client.Counter({
  name: 'restaurants_created_total',
  help: 'Total de restaurantes creados',
});

export const menuItemsCreatedTotal = new client.Counter({
  name: 'menu_items_created_total',
  help: 'Total de items de menú creados',
});

export const cacheHitsTotal = new client.Counter({
  name: 'restaurant_cache_hits_total',
  help: 'Total de aciertos de cache Redis',
  labelNames: ['resource'] as const,
});

export const cacheMissesTotal = new client.Counter({
  name: 'restaurant_cache_misses_total',
  help: 'Total de fallos de cache Redis',
  labelNames: ['resource'] as const,
});

export const graphqlRequestDuration = new client.Histogram({
  name: 'graphql_request_duration_ms',
  help: 'Duración de requests GraphQL en milisegundos',
  labelNames: ['operation', 'operationType'] as const,
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
});

export const graphqlErrorsTotal = new client.Counter({
  name: 'graphql_errors_total',
  help: 'Total de errores en operaciones GraphQL',
  labelNames: ['operation', 'error_type'] as const,
});

export const kafkaEventsPublishedTotal = new client.Counter({
  name: 'kafka_events_published_total',
  help: 'Total de eventos publicados a Kafka',
  labelNames: ['topic', 'event_type'] as const,
});

export const connectionStatus = new client.Gauge({
  name: 'connection_status',
  help: 'Estado de conexiones externas (1=conectado, 0=desconectado)',
  labelNames: ['service'] as const,
});

register.registerMetric(restaurantsCreatedTotal);
register.registerMetric(menuItemsCreatedTotal);
register.registerMetric(cacheHitsTotal);
register.registerMetric(cacheMissesTotal);
register.registerMetric(graphqlRequestDuration);
register.registerMetric(graphqlErrorsTotal);
register.registerMetric(kafkaEventsPublishedTotal);
register.registerMetric(connectionStatus);
