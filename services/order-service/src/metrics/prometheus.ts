import client from 'prom-client';

/**
 * Registry global de métricas para Prometheus.
 * Todas las métricas del servicio se registran aquí.
 */
export const register = new client.Registry();

// ── Métricas por defecto de Node.js ────────────────────────────────────────
// Colecta: event loop lag, heap memory, GC, handles activos, etc.
const collectDefaultMetrics = client.collectDefaultMetrics;
register.registerCollector(new collectDefaultMetrics());

// ── Métricas de negocio ────────────────────────────────────────────────────

/** Contador de órdenes creadas */
export const ordersCreatedTotal = new client.Counter({
  name: 'orders_created_total',
  help: 'Total de órdenes creadas',
  labelNames: ['status'] as const,
});

/** Contador de órdenes actualizadas */
export const ordersStatusUpdatedTotal = new client.Counter({
  name: 'orders_status_updated_total',
  help: 'Total de actualizaciones de estado de órdenes',
  labelNames: ['from_status', 'to_status'] as const,
});

/** Contador de órdenes canceladas */
export const ordersCancelledTotal = new client.Counter({
  name: 'orders_cancelled_total',
  help: 'Total de órdenes canceladas',
});

/** Histograma de duración de requests GraphQL (ms) */
export const graphqlRequestDuration = new client.Histogram({
  name: 'graphql_request_duration_ms',
  help: 'Duración de requests GraphQL en milisegundos',
  labelNames: ['operation', 'operationType'] as const,
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
});

/** Contador de errores de GraphQL */
export const graphqlErrorsTotal = new client.Counter({
  name: 'graphql_errors_total',
  help: 'Total de errores en operaciones GraphQL',
  labelNames: ['operation', 'error_type'] as const,
});

/** Contador de eventos Kafka publicados */
export const kafkaEventsPublishedTotal = new client.Counter({
  name: 'kafka_events_published_total',
  help: 'Total de eventos publicados a Kafka',
  labelNames: ['topic', 'event_type'] as const,
});

/** Contador de errores de Kafka */
export const kafkaErrorsTotal = new client.Counter({
  name: 'kafka_errors_total',
  help: 'Total de errores al publicar/consumir eventos de Kafka',
  labelNames: ['topic', 'operation'] as const,
});

/** Gauge del estado de conexiones */
export const connectionStatus = new client.Gauge({
  name: 'connection_status',
  help: 'Estado de conexiones externas (1=conectado, 0=desconectado)',
  labelNames: ['service'] as const,
});

/** Histograma de latencia de queries SQL (ms) */
export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_ms',
  help: 'Duración de queries a la base de datos en milisegundos',
  labelNames: ['operation'] as const,
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
});

/** Histograma de latencia de Redis (ms) */
export const redisCommandDuration = new client.Histogram({
  name: 'redis_command_duration_ms',
  help: 'Duración de comandos Redis en milisegundos',
  labelNames: ['command'] as const,
  buckets: [1, 2, 5, 10, 25, 50, 100, 250],
});

/** Contador de eventos duplicados detectados (idempotencia) */
export const idempotencyDuplicatesTotal = new client.Counter({
  name: 'idempotency_duplicates_total',
  help: 'Total de eventos duplicados detectados y rechazados',
});

// ── Registro de métricas custom ────────────────────────────────────────────
register.registerMetric(ordersCreatedTotal);
register.registerMetric(ordersStatusUpdatedTotal);
register.registerMetric(ordersCancelledTotal);
register.registerMetric(graphqlRequestDuration);
register.registerMetric(graphqlErrorsTotal);
register.registerMetric(kafkaEventsPublishedTotal);
register.registerMetric(kafkaErrorsTotal);
register.registerMetric(connectionStatus);
register.registerMetric(dbQueryDuration);
register.registerMetric(redisCommandDuration);
register.registerMetric(idempotencyDuplicatesTotal);
