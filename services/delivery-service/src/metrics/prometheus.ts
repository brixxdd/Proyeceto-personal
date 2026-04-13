import client, { collectDefaultMetrics } from 'prom-client';

/**
 * Registry global de métricas para Prometheus.
 * Todas las métricas del servicio se registran aquí.
 */
export const register = new client.Registry();

// ── Métricas por defecto de Node.js ────────────────────────────────────────
collectDefaultMetrics({ register });

// ── Métricas de negocio ────────────────────────────────────────────────────

/** Contador de asignaciones de entregas */
export const deliveryAssignmentsTotal = new client.Counter({
  name: 'delivery_assignments_total',
  help: 'Total de entregas asignadas a conductores',
  labelNames: ['status'] as const,
});

/** Gauge de entregas activas (no terminadas ni canceladas) */
export const activeDeliveries = new client.Gauge({
  name: 'active_deliveries',
  help: 'Número de entregas actualmente en curso',
});

/** Gauge de conductores disponibles */
export const availableDrivers = new client.Gauge({
  name: 'available_drivers',
  help: 'Número de conductores disponibles',
});

/** Gauge del estado de conexiones */
export const connectionStatus = new client.Gauge({
  name: 'connection_status',
  help: 'Estado de conexiones externas (1=conectado, 0=desconectado)',
  labelNames: ['service'] as const,
});

/** Histograma de duración de requests GraphQL (ms) */
export const graphqlRequestDuration = new client.Histogram({
  name: 'graphql_request_duration_ms',
  help: 'Duración de requests GraphQL en milisegundos',
  labelNames: ['operation', 'operationType'] as const,
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
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

// ── Registro de métricas custom ────────────────────────────────────────────
register.registerMetric(deliveryAssignmentsTotal);
register.registerMetric(activeDeliveries);
register.registerMetric(availableDrivers);
register.registerMetric(connectionStatus);
register.registerMetric(graphqlRequestDuration);
register.registerMetric(kafkaEventsPublishedTotal);
register.registerMetric(kafkaErrorsTotal);
